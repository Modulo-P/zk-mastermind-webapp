import useConfetti from "@/hooks/use-confetti";
import useGame from "@/hooks/use-game";
import useHydra from "@/hooks/use-hydra";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import {
  addUTxOInputs,
  slotToUnix,
  toValue,
  txBuilderConfig,
  unixToSlot,
} from "@/services/blockchain-utils";
import { MastermindDatum, plutusScript } from "@/services/mastermind";
import { Game, Turn } from "@/types/game";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import {
  keepRelevant,
  resolvePaymentKeyHash,
  resolvePlutusScriptAddress,
  resolveTxHash,
} from "@meshsdk/core";
import axios, { AxiosError } from "axios";
import { Button } from "flowbite-react";
import { useEffect, useState } from "react";

type Props = {
  game: Game;
  setInfoMessage: (message: string) => void;
};

export default function GuessButton({ game, setInfoMessage }: Props) {
  const { hydraUtxos, hydraWallet, hydraWalletAddress, hydraPrivateKey } =
    useHydraWallet();
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

    txColBuilder.add_regular_input(
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
      CSL.Language.new_plutus_v3()
    );

    const redeemer = CSL.Redeemer.new(
      CSL.RedeemerTag.new_spend(),
      CSL.BigNum.from_str("0"),
      CSL.PlutusData.new_empty_constr_plutus_data(
        CSL.BigNum.from_str(game.currentTurn === 0 ? "0" : "1")
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

    // Time expiration condition

    // When the turn is of type "Start" two conditions have to be met:
    // (1) ValidTime range has to be lesser or equal than 20 minutes (1200000 miliseconds)
    // (2) Expiration time has to be greater or equal than the UpperBound of the Validity range + 20 min
    if (game.currentTurn === 0) {
      let lowerBound = unixToSlot(Date.now() - 60 * 1000);
      let upperBound = (lowerBound + 15 * 60).toString();
      txBuilder.set_validity_start_interval_bignum(
        CSL.BigNum.from_str(lowerBound.toString())
      );
      txBuilder.set_ttl_bignum(CSL.BigNum.from_str(upperBound));
      datum.expirationTime = slotToUnix(Number(upperBound) + 1200);
    } else {
      // If turn is of type "Guess" then just update the expiration time by 20 min
      datum.expirationTime += 1200000;
    }

    const txOut = txOutputBuilder
      .with_plutus_data(await datum.toCSL())
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
            quantity: (Number(game.adaAmount) * 2).toString(),
          },
        ]).multiasset()!
      )
      .build();

    txBuilder.add_output(txOut);

    txBuilder.add_change_if_needed(CSL.Address.from_bech32(hydraWalletAddress));

    txBuilder.add_required_signer(
      CSL.Ed25519KeyHash.from_hex(resolvePaymentKeyHash(hydraWalletAddress))
    );

    const costModels = CSL.TxBuilderConstants.plutus_default_cost_models();

    costModels.insert(
      CSL.Language.new_plutus_v3(),
      CSL.CostModel.from_json(
        JSON.stringify([
          "205665",
          "812",
          "1",
          "1",
          "1000",
          "571",
          "0",
          "1",
          "1000",
          "24177",
          "4",
          "1",
          "1000",
          "32",
          "117366",
          "10475",
          "4",
          "117366",
          "10475",
          "4",
          "1046420",
          "18",
          "3387741",
          "6",
          "545063",
          "1",
          "66311195",
          "23097",
          "18",
          "292890",
          "18",
          "94607019",
          "87060",
          "18",
          "16598737",
          "18",
          "2359410",
          "36",
          "3973992",
          "12",
          "1102635",
          "1",
          "204557793",
          "23271",
          "36",
          "307813",
          "36",
          "190191402",
          "85902",
          "36",
          "33191512",
          "36",
          "388656972",
          "1",
          "402099373",
          "72",
          "2544991",
          "72",
          "23000",
          "100",
          "23000",
          "100",
          "23000",
          "100",
          "23000",
          "100",
          "23000",
          "100",
          "23000",
          "100",
          "23000",
          "100",
          "23000",
          "100",
          "100",
          "100",
          "23000",
          "100",
          "19537",
          "32",
          "175354",
          "32",
          "46417",
          "4",
          "221973",
          "511",
          "0",
          "1",
          "89141",
          "32",
          "497525",
          "14068",
          "4",
          "2",
          "196500",
          "453240",
          "220",
          "0",
          "1",
          "1",
          "1000",
          "28662",
          "4",
          "2",
          "245000",
          "216773",
          "62",
          "1",
          "1060367",
          "12586",
          "1",
          "208512",
          "421",
          "1",
          "187000",
          "1000",
          "52998",
          "1",
          "80436",
          "32",
          "43249",
          "32",
          "1000",
          "32",
          "80556",
          "1",
          "57667",
          "4",
          "1927926",
          "82523",
          "4",
          "1000",
          "10",
          "197145",
          "156",
          "1",
          "197145",
          "156",
          "1",
          "204924",
          "473",
          "1",
          "208896",
          "511",
          "1",
          "52467",
          "32",
          "64832",
          "32",
          "65493",
          "32",
          "22558",
          "32",
          "16563",
          "32",
          "76511",
          "32",
          "196500",
          "453240",
          "220",
          "0",
          "1",
          "1",
          "69522",
          "11687",
          "0",
          "1",
          "60091",
          "32",
          "196500",
          "453240",
          "220",
          "0",
          "1",
          "1",
          "196500",
          "453240",
          "220",
          "0",
          "1",
          "1",
          "1159724",
          "392670",
          "0",
          "2",
          "806990",
          "30482",
          "4",
          "1927926",
          "82523",
          "4",
          "265318",
          "0",
          "4",
          "0",
          "85931",
          "32",
          "205665",
          "812",
          "1",
          "1",
          "41182",
          "32",
          "212342",
          "32",
          "31220",
          "32",
          "32696",
          "32",
          "43357",
          "32",
          "32247",
          "32",
          "38314",
          "32",
          "35190005",
          "10",
          "57996947",
          "18975",
          "10",
          "39121781",
          "32260",
          "10",
        ])
      )
    );

    txBuilder.calc_script_data_hash(costModels);

    if (txBuilder.build_tx().is_valid()) {
      console.log("Transaction is valid");
    } else {
      console.log("Transaction is not valid");
    }

    try {
      const unsignedTx = txBuilder.build_tx();
      const transactionHash = CSL.hash_transaction(unsignedTx.body());
      const Vkeywitnesses = signTx(hydraPrivateKey!, transactionHash);

      const witnessSet = unsignedTx.witness_set();
      witnessSet.set_vkeys(Vkeywitnesses);

      const txSigned = CSL.Transaction.new(unsignedTx.body(), witnessSet);
      const txHash = await hydraWallet.submitTx(txSigned.to_hex());

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
        datum: (await datum.toCSL()).to_hex(),
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/games/turns`,
        turn
      );
    } catch (e) {
      if (e instanceof AxiosError) {
        console.log(e.response?.data);
      } else {
        console.log(e);
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

function signTx(
  hydraPrivateKey: string,
  transactionHash: CSL.TransactionHash
): CSL.Vkeywitnesses {
  try {
    const signatures = CSL.Vkeywitnesses.new();

    const paymentKey = CSL.PrivateKey.from_hex(hydraPrivateKey.slice(4));

    signatures.add(CSL.make_vkey_witness(transactionHash, paymentKey));

    return signatures;
  } catch (error) {
    throw new Error(`An error occurred during signTx: ${error}.`);
  }
}
