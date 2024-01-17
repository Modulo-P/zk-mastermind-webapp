import useConfetti from "@/hooks/use-confetti";
import useGame from "@/hooks/use-game";
import useHydra from "@/hooks/use-hydra";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import {
  addUTxOInputs,
  toValue,
  txBuilderConfig,
} from "@/services/blockchain-utils";
import {
  MastermindDatum,
  colorSchema,
  plutusScript,
} from "@/services/mastermind";
import { Game, Turn } from "@/types/game";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import {
  UTxO,
  keepRelevant,
  resolvePaymentKeyHash,
  resolvePlutusScriptAddress,
} from "@meshsdk/core";
import axios, { AxiosError } from "axios";
import { Button } from "flowbite-react";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useWindowSize } from "usehooks-ts";

type Props = {
  game: Game;
  setInfoMessage: (message: string) => void;
};

export default function GuessButton({ game, setInfoMessage }: Props) {
  const { hydraUtxos, hydraWallet, hydraWalletAddress } = useHydraWallet();
  const { findHydraUtxo } = useHydra();

  const [buttonText, setButtonText] = useState<string>("Submit guess");
  const { setConfetti } = useConfetti();
  const { currentGameRow, priorGameRow } = useGame({ id: game.id });

  const handleClick = async () => {
    if (
      !hydraWallet ||
      !hydraWalletAddress ||
      !game.currentDatum ||
      !game.rows ||
      !currentGameRow
    )
      return;

    const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);
    const scriptUtxo = await findHydraUtxo(game.txHash, game.outputIndex);

    if (!scriptUtxo) throw new Error("No game utxo found");

    const datum = MastermindDatum.fromCsl(
      CSL.PlutusData.from_hex(game.currentDatum)
    );

    const assetMap = new Map();

    if (game.currentTurn === 0) {
      assetMap.set(
        process.env.NEXT_PUBLIC_HYDRA_ASSET_ID!,
        (Number(game.adaAmount) * 2).toString()
      );
    }

    const utxos = keepRelevant(
      assetMap,
      hydraUtxos.filter(
        (u) =>
          u.output.amount.find((a) => a.unit === "lovelace")?.quantity !==
          "5000000"
      ),
      "10000000"
    );

    addUTxOInputs(utxos, txBuilder);

    const txColBuilder = CSL.TxInputsBuilder.new();
    const collateralUTxo = hydraUtxos.find(
      (utxo) =>
        utxo.output.amount.find((a) => a.unit === "lovelace")?.quantity ===
        "5000000"
    );

    if (!collateralUTxo) throw new Error("No collateral utxo found");

    txColBuilder.add_input(
      CSL.Address.from_bech32(collateralUTxo.output.address),
      CSL.TransactionInput.new(
        CSL.TransactionHash.from_bytes(
          Buffer.from(collateralUTxo.input.txHash, "hex")
        ),
        collateralUTxo.input.outputIndex
      ),
      toValue(collateralUTxo.output.amount)
    );

    txBuilder.set_collateral(txColBuilder);

    const scriptTxInput = CSL.TransactionInput.new(
      CSL.TransactionHash.from_bytes(
        Buffer.from(scriptUtxo.input.txHash, "hex")
      ),
      scriptUtxo.input.outputIndex
    );

    const script = CSL.PlutusScript.from_hex_with_version(
      plutusScript.code,
      CSL.Language.new_plutus_v2()
    );

    const redeemer = CSL.Redeemer.new(
      CSL.RedeemerTag.new_spend(),
      CSL.BigNum.from_str("0"),
      CSL.PlutusData.new_empty_constr_plutus_data(
        CSL.BigNum.from_str(game.currentTurn === 0 ? "0" : "3")
      ),
      CSL.ExUnits.new(
        CSL.BigNum.from_str("14000000"),
        CSL.BigNum.from_str("10000000000")
      )
    );

    const plutusWitness = CSL.PlutusWitness.new_without_datum(script, redeemer);

    txBuilder.add_plutus_script_input(
      plutusWitness,
      scriptTxInput,
      toValue(scriptUtxo.output.amount)
    );

    const txOutputBuilder = CSL.TransactionOutputBuilder.new();

    datum.currentTurn++;
    datum.codeBreaker = resolvePaymentKeyHash(hydraWalletAddress);
    datum.guesses = currentGameRow.colorSequence;

    const txOut = txOutputBuilder
      .with_plutus_data(datum.toCSL())
      .with_address(
        CSL.Address.from_bech32(resolvePlutusScriptAddress(plutusScript, 0))
      )
      .next()
      .with_coin_and_asset(
        CSL.BigNum.from_str(
          scriptUtxo.output.amount.find((a) => a.unit === "lovelace")?.quantity!
        ).checked_mul(CSL.BigNum.from_str(game.currentTurn === 0 ? "2" : "1")),
        toValue([
          {
            unit: process.env.NEXT_PUBLIC_HYDRA_ASSET_ID!,
            quantity: (
              Number(game.adaAmount) * (game.currentTurn === 0 ? 2 : 1)
            ).toString(),
          },
        ]).multiasset()!
      )
      .build();

    txBuilder.add_output(txOut);

    txBuilder.add_change_if_needed(CSL.Address.from_bech32(hydraWalletAddress));

    txBuilder.add_required_signer(
      CSL.Ed25519KeyHash.from_hex(resolvePaymentKeyHash(hydraWalletAddress))
    );

    txBuilder.calc_script_data_hash(
      CSL.TxBuilderConstants.plutus_default_cost_models()
    );

    try {
      const unsignedTx = txBuilder.build_tx().to_hex();
      const signedTx = await hydraWallet.signTx(unsignedTx, true);
      const txHash = await hydraWallet.submitTx(signedTx);

      const turn: Partial<Turn & { codeBreaker: string }> = {
        gameId: game.id,
        codeBreaker: hydraWalletAddress,
        guessSequence: currentGameRow.colorSequence,
        blackPegs: datum.blackPegs,
        whitePegs: datum.whitePegs,
        turnNumber: datum.currentTurn,
        txHash,
        outputIndex: 0,
        player: "CODEBREAKER",
        datum: datum.toCSL().to_hex(),
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/games/turns`,
        turn
      );
    } catch (e) {
      if (e instanceof AxiosError) {
        console.log(e.response?.data);
      }
    }
  };

  useEffect(() => {
    if (priorGameRow?.blackPegs === 4) {
      setButtonText("You win!");
      setConfetti(true);
    } else if (game.currentTurn === 10 && priorGameRow?.blackPegs !== 4) {
      setButtonText("You lose!");
    } else if (game.currentTurn % 2 === 0) {
      setButtonText("Submit guess");
    } else {
      setButtonText("Waiting for a clue");
    }
  }, [game, priorGameRow?.blackPegs, setConfetti, setInfoMessage]);
  return (
    <Button
      color="teal"
      onClick={handleClick}
      disabled={!game.currentDatum || buttonText !== "Submit guess"}
    >
      {buttonText}
    </Button>
  );
}
