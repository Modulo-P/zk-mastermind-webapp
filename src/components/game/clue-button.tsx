import useConfetti from "@/hooks/use-confetti";
import useGame from "@/hooks/use-game";
import useHydra from "@/hooks/use-hydra";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import { toValue, txBuilderConfig } from "@/services/blockchain-utils";
import { MastermindDatum, plutusScript } from "@/services/mastermind";
import { GameSecret, Turn } from "@/types/game";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import {
  UTxO,
  keepRelevant,
  resolvePaymentKeyHash,
  resolvePlutusScriptAddress,
} from "@meshsdk/core";
import axios from "axios";
import { Button } from "flowbite-react";
import { useEffect, useState } from "react";

type ClueButtonProps = {
  id: number;
  setErrorMessage: (message: string) => void;
  setInfoMessage: (message: string) => void;
};

export default function ClueButton({
  id,
  setErrorMessage,
  setInfoMessage,
}: ClueButtonProps) {
  const { hydraWallet, hydraUtxos, hydraWalletAddress } = useHydraWallet();
  const { findHydraUtxo } = useHydra();

  const { game, currentGameRow, priorGameRow } = useGame({ id });
  const { setConfetti } = useConfetti();

  const [buttonText, setButtonText] = useState<string>("Submit clue");
  const gameSecret = JSON.parse(
    localStorage.getItem("game_" + game?.solutionHash)!
  ) as GameSecret;

  useEffect(() => {
    if (!game) return;

    if (priorGameRow?.blackPegs === 4) {
      setButtonText("You lose!");
    } else if (game.currentTurn === 0) {
      setButtonText("Waiting for a game...");
    } else if (game.currentTurn === 10 && priorGameRow?.blackPegs !== 4) {
      setButtonText("You win!");
      setInfoMessage("You win!");
      setConfetti(true);
    } else if (game.currentTurn % 2 === 1) {
      setButtonText("Submit clue");
    } else {
      setButtonText("Waiting for opponent...");
    }
  }, [game, priorGameRow?.blackPegs, setConfetti, setInfoMessage]);

  const handleClick = async () => {
    // setButtonText("Submitting clue...");
    if (
      !hydraWallet ||
      !hydraUtxos ||
      !game ||
      !game.rows ||
      !hydraWalletAddress ||
      !currentGameRow
    )
      return;
    try {
      const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

      const scriptUtxo = await findHydraUtxo(game.txHash, game.outputIndex);

      if (!scriptUtxo) throw new Error("No game utxo found");

      const datum = MastermindDatum.fromCsl(
        CSL.PlutusData.from_hex(game.currentDatum)
      );

      const assetMap = new Map();
      const utxos = keepRelevant(
        assetMap,
        hydraUtxos.filter(
          (u) =>
            u.output.amount.find((a) => a.unit === "lovelace")?.quantity !==
            "1000000"
        )
      );

      utxos.forEach((utxo: UTxO) => {
        txBuilder.add_input(
          CSL.Address.from_bech32(utxo.output.address),
          CSL.TransactionInput.new(
            CSL.TransactionHash.from_bytes(
              Buffer.from(utxo.input.txHash, "hex")
            ),
            utxo.input.outputIndex
          ),
          toValue(utxo.output.amount)
        );
      });

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
        CSL.PlutusData.new_empty_constr_plutus_data(CSL.BigNum.from_str("1")),
        CSL.ExUnits.new(
          CSL.BigNum.from_str("14000000"),
          CSL.BigNum.from_str("10000000000")
        )
      );

      const plutusWitness = CSL.PlutusWitness.new_without_datum(
        script,
        redeemer
      );

      txBuilder.add_plutus_script_input(
        plutusWitness,
        scriptTxInput,
        toValue(scriptUtxo.output.amount)
      );

      const txOutputBuilder = CSL.TransactionOutputBuilder.new();

      datum.currentTurn++;
      datum.blackPegs = currentGameRow.blackPegs || 0;
      datum.whitePegs = currentGameRow.whitePegs || 0;
      datum.guesses = currentGameRow.colorSequence;

      // setButtonText("Calculating proof...");

      await datum.calculateProof(
        gameSecret.secretCode,
        gameSecret.secretSalt.toString()
      );

      const txOut = txOutputBuilder
        .with_plutus_data(datum.toCSL())
        .with_address(
          CSL.Address.from_bech32(resolvePlutusScriptAddress(plutusScript, 0))
        )
        .next()
        .with_value(toValue(scriptUtxo.output.amount))
        .build();

      txBuilder.add_output(txOut);

      txBuilder.add_change_if_needed(
        CSL.Address.from_bech32(hydraWalletAddress)
      );

      txBuilder.add_required_signer(
        CSL.Ed25519KeyHash.from_hex(resolvePaymentKeyHash(hydraWalletAddress))
      );

      txBuilder.calc_script_data_hash(
        CSL.TxBuilderConstants.plutus_default_cost_models()
      );

      const unsignedTx = txBuilder.build_tx().to_hex();
      const signedTx = await hydraWallet.signTx(unsignedTx, true);
      const txHash = await hydraWallet.submitTx(signedTx);

      const turn: Partial<Turn> = {
        gameId: game.id,
        guessSequence: datum.guesses,
        blackPegs: datum.blackPegs,
        whitePegs: datum.whitePegs,
        turnNumber: datum.currentTurn,
        txHash,
        outputIndex: 0,
        player: "CODEMASTER",
        datum: datum.toCSL().to_hex(),
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/games/turns`,
        turn
      );
    } catch (e) {
      if (e instanceof Error && e.message === "Not proof") {
        setButtonText("Error calculating proof");
        console.log("Error calculating proof set message");
        setErrorMessage("Error calculating proof");
        setTimeout(() => {
          setButtonText("Submit clue");
        }, 3000);
      }
      return;
    }
  };

  return (
    <Button
      type="button"
      color="blue"
      onClick={handleClick}
      disabled={!game?.currentDatum || buttonText !== "Submit clue"}
    >
      {buttonText}
    </Button>
  );
}
