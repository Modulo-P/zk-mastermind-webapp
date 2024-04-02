import {
  addUTxOInputs,
  dataCost,
  slotToUnix,
  toValue,
  txBuilderConfig,
  unixToSlot,
} from "@/services/blockchain-utils";
import { MastermindDatum, MastermindGame } from "@/services/mastermind";
import { Game, GameSecret, Row } from "@/types/game";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import {
  UTxO,
  keepRelevant,
  resolvePaymentKeyHash,
  resolvePlutusScriptAddress,
} from "@meshsdk/core";
import { useCallback } from "react";
import useHydra from "./use-hydra";
import useHydraWallet from "./use-hydra-wallet";

export default function useGameTransaction() {
  const plutusScript = MastermindGame.plutusScript;
  const { hydraWallet, hydraWalletAddress, hydraProvider, hydraUtxos } =
    useHydraWallet();
  const { findHydraUtxo } = useHydra();

  const createNewGame = useCallback(
    async ({
      secretCode,
      adaAmount,
      randomSalt,
    }: {
      secretCode: Array<number>;
      adaAmount: number;
      randomSalt: string;
    }) => {
      if (
        hydraWalletAddress &&
        !secretCode.some((s) => s === undefined) &&
        hydraWallet &&
        adaAmount > 0 &&
        plutusScript
      ) {
        const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

        const assetMap = new Map();
        assetMap.set(
          process.env.NEXT_PUBLIC_HYDRA_ASSET_ID!,
          BigInt(adaAmount * 1000000)
        );
        const utxos = keepRelevant(
          assetMap,
          hydraUtxos.filter(
            (u) =>
              u.output.amount.find((a) => a.unit === "lovelace")?.quantity !==
              "5000000"
          ),
          "2000000"
        );

        utxos.forEach((utxo: UTxO) => {
          txBuilder.add_regular_input(
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

        // Template of a MastermindDatum
        const datum = new MastermindDatum(
          resolvePaymentKeyHash(hydraWalletAddress),
          "",
          BigInt(0),
          [0, 0, 0, 0],
          0,
          0,
          0,
          0
        );

        await datum.calculateProof(secretCode, randomSalt);

        const gameSecret: GameSecret = {
          secretCode: secretCode,
          secretSalt: randomSalt,
        };

        localStorage.setItem(
          "game_" + datum.hashSol.toString(),
          JSON.stringify(gameSecret)
        );

        const transactionOutputBuilder = CSL.TransactionOutputBuilder.new();

        const txOut = transactionOutputBuilder
          .with_data_hash(CSL.hash_plutus_data(await datum.toCSL()))
          .with_address(
            CSL.Address.from_bech32(resolvePlutusScriptAddress(plutusScript, 0))
          )
          .next()
          .with_asset_and_min_required_coin_by_utxo_cost(
            toValue([
              {
                unit: process.env.NEXT_PUBLIC_HYDRA_ASSET_ID!,
                quantity: (adaAmount * 1000000).toString(),
              },
            ]).multiasset()!,
            dataCost
          )
          .build();

        txBuilder.add_output(txOut);

        txBuilder.add_change_if_needed(
          CSL.Address.from_bech32(hydraWalletAddress)
        );

        //console.log("Tx ", txBuilder.build().to_hex());

        if (txBuilder.build_tx().is_valid()) {
          console.log("Transaction is valid");
        } else {
          console.log("Transaction is not valid");
        }

        const txUnsigned = txBuilder.build_tx().to_hex();
        const txSigned = await hydraWallet.signTx(txUnsigned);
        const txHash = await hydraProvider.submitTx(txSigned);
        alert("Game created with txHash " + txHash);

        return { datum, txHash };
      } else {
        throw new Error("Invalid parameters");
      }
    },
    [hydraProvider, hydraUtxos, hydraWallet, hydraWalletAddress, plutusScript]
  );

  const end = useCallback(
    async ({
      game,
      priorGameRow,
    }: {
      game: Game;
      priorGameRow?: Row | undefined;
    }) => {
      if (
        !hydraWallet ||
        !hydraWalletAddress ||
        !game.currentDatum ||
        !game.rows ||
        !plutusScript
      )
        throw new Error("Invalid parameters");

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

      let lowerBound = unixToSlot(Date.now() - 5 * 60 * 1000);
      let upperBound = (lowerBound + 10 * 60).toString();
      txBuilder.set_validity_start_interval_bignum(
        CSL.BigNum.from_str(lowerBound.toString())
      );
      txBuilder.set_ttl_bignum(CSL.BigNum.from_str(upperBound));

      const script = CSL.PlutusScript.from_hex_with_version(
        plutusScript.code,
        CSL.Language.new_plutus_v2()
      );

      const redeemer = CSL.Redeemer.new(
        CSL.RedeemerTag.new_spend(),
        CSL.BigNum.from_str("0"),
        CSL.PlutusData.new_empty_constr_plutus_data(CSL.BigNum.from_str("2")),
        CSL.ExUnits.new(
          CSL.BigNum.from_str("14000000000000"),
          CSL.BigNum.from_str("10000000000000000")
        )
      );

      const plutusWitness = CSL.PlutusWitness.new(
        script,
        datum.toCSL(),
        redeemer
      );

      txBuilder.add_plutus_script_input(
        plutusWitness,
        scriptTxInput,
        toValue(scriptUtxo.output.amount)
      );

      if (priorGameRow) {
        let winnerAddress = "";

        if (game.currentTurn === 20 && priorGameRow.blackPegs < 4) {
          winnerAddress = game.codeMaster;
        } else if (
          game.codeBreakerAddress === hydraWalletAddress &&
          priorGameRow.blackPegs === 4
        ) {
          winnerAddress = game.codeBreakerAddress;
        }
        const value = toValue(scriptUtxo.output.amount);

        const winnerValue = CSL.Value.new_with_assets(
          value.coin().div_floor(CSL.BigNum.from_str("2")),
          value.multiasset()!
        );
        const loserValue = CSL.Value.new_with_assets(
          value.coin().div_floor(CSL.BigNum.from_str("2")),
          CSL.MultiAsset.new()
        );

        let codeMasterValue: CSL.Value | null = null;
        let codeBreakerValue: CSL.Value | null = null;
        if (game.codeMaster === winnerAddress) {
          codeMasterValue = winnerValue;
          codeBreakerValue = loserValue;
        } else {
          codeMasterValue = loserValue;
          codeBreakerValue = winnerValue;
        }

        const txOutputBuilder = CSL.TransactionOutputBuilder.new();

        const txOutCodeMaster = txOutputBuilder
          .with_address(CSL.Address.from_bech32(game.codeMasterAddress))
          .next()
          .with_value(codeMasterValue)
          .build();

        txBuilder.add_output(txOutCodeMaster);

        const txOutCodeBreaker = txOutputBuilder
          .with_address(CSL.Address.from_bech32(game.codeBreakerAddress!))
          .next()
          .with_value(codeBreakerValue)
          .build();

        txBuilder.add_output(txOutCodeBreaker);
      }

      txBuilder.add_change_if_needed(
        CSL.Address.from_bech32(hydraWalletAddress)
      );

      txBuilder.add_required_signer(
        CSL.Ed25519KeyHash.from_hex(resolvePaymentKeyHash(hydraWalletAddress))
      );

      txBuilder.calc_script_data_hash(
        CSL.TxBuilderConstants.plutus_default_cost_models()
      );

      const cslTx = txBuilder.build_tx();

      try {
        const unsignedTx = cslTx.to_hex();
        const signedTx = await hydraWallet.signTx(unsignedTx, true);
        // console.log("Tx ", txBuilder.build().to_hex());
        const txHash = await hydraWallet.submitTx(signedTx);

        return { txHash, datum };
      } catch (e) {
        console.log(e);
        throw e;
      }
    },
    [findHydraUtxo, hydraUtxos, hydraWallet, hydraWalletAddress, plutusScript]
  );

  const guess = useCallback(
    async ({ game, currentGameRow }: { game: Game; currentGameRow: Row }) => {
      if (
        !hydraWallet ||
        !hydraWalletAddress ||
        !game.currentDatum ||
        !game.rows ||
        !currentGameRow ||
        !plutusScript
      )
        throw new Error("Invalid parameters");

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
        "2000000"
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
        CSL.Language.new_plutus_v2()
      );

      const redeemer = CSL.Redeemer.new(
        CSL.RedeemerTag.new_spend(),
        CSL.BigNum.from_str("0"),
        CSL.PlutusData.new_empty_constr_plutus_data(
          CSL.BigNum.from_str(game.currentTurn === 0 ? "0" : "3")
        ),
        CSL.ExUnits.new(
          CSL.BigNum.from_str("14000000000000"),
          CSL.BigNum.from_str("10000000000000000")
        )
      );

      const plutusWitness = CSL.PlutusWitness.new(
        script,
        datum.toCSL(),
        redeemer
      );

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
        let lowerBound = unixToSlot(Date.now() - 5 * 60 * 1000);
        let upperBound = (lowerBound + 15 * 60).toString();
        txBuilder.set_validity_start_interval_bignum(
          CSL.BigNum.from_str(lowerBound.toString())
        );
        txBuilder.set_ttl_bignum(CSL.BigNum.from_str(upperBound));
        datum.expirationTime =
          slotToUnix(Number(upperBound) + 20 * 60) - 19 * 24 * 60 * 60 * 1000;
      } else {
        // If turn is of type "Guess" then just update the expiration time by 20 min
        datum.expirationTime += 1200000;
      }

      const txOut = txOutputBuilder
        .with_data_hash(CSL.hash_plutus_data(await datum.toCSL()))
        .with_address(
          CSL.Address.from_bech32(resolvePlutusScriptAddress(plutusScript, 0))
        )
        .next()
        .with_coin_and_asset(
          CSL.BigNum.from_str(
            scriptUtxo.output.amount.find((a) => a.unit === "lovelace")
              ?.quantity!
          ).checked_mul(
            CSL.BigNum.from_str(game.currentTurn === 0 ? "2" : "1")
          ),
          toValue([
            {
              unit: process.env.NEXT_PUBLIC_HYDRA_ASSET_ID!,
              quantity: (Number(game.adaAmount) * 2).toString(),
            },
          ]).multiasset()!
        )
        .build();

      txBuilder.add_output(txOut);
      txBuilder.add_extra_witness_datum(await datum.toCSL());

      txBuilder.add_change_if_needed(
        CSL.Address.from_bech32(hydraWalletAddress)
      );

      txBuilder.add_required_signer(
        CSL.Ed25519KeyHash.from_hex(resolvePaymentKeyHash(hydraWalletAddress))
      );

      txBuilder.calc_script_data_hash(
        CSL.TxBuilderConstants.plutus_default_cost_models()
      );

      const cslTx = txBuilder.build_tx();

      try {
        const unsignedTx = cslTx.to_hex();
        const signedTx = await hydraWallet.signTx(unsignedTx, true);
        // console.log("Tx ", txBuilder.build().to_hex());
        const txHash = await hydraWallet.submitTx(signedTx);

        return { txHash, datum };
      } catch (e) {
        console.log(e);
        throw e;
      }
    },
    [findHydraUtxo, hydraUtxos, hydraWallet, hydraWalletAddress, plutusScript]
  );

  const clue = useCallback(
    async ({
      game,
      currentGameRow,
      gameSecret,
    }: {
      game: Game;
      currentGameRow: Row;
      gameSecret: GameSecret;
    }) => {
      if (
        !hydraWallet ||
        !hydraUtxos ||
        !game ||
        !game.rows ||
        !hydraWalletAddress ||
        !currentGameRow ||
        !plutusScript
      )
        throw new Error("Invalid parameters");

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
              "5000000"
          ),
          "2000000"
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
          CSL.Language.new_plutus_v2()
        );

        const redeemer = CSL.Redeemer.new(
          CSL.RedeemerTag.new_spend(),
          CSL.BigNum.from_str("0"),
          CSL.PlutusData.new_empty_constr_plutus_data(CSL.BigNum.from_str("1")),
          CSL.ExUnits.new(
            CSL.BigNum.from_str("14000000000000"),
            CSL.BigNum.from_str("10000000000000000")
          )
        );

        const plutusWitness = CSL.PlutusWitness.new(
          script,
          datum.toCSL(),
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
        datum.expirationTime += 1200000;

        // Time expiration condition

        // When the turn is of type "Start" two conditions have to be met:
        // (1) ValidTime range has to be lesser or equal than 20 minutes (1200000 miliseconds)
        // (2) Expiration time has to be greater or equal than the UpperBound of the Validity range + 20 min

        let lowerBound = unixToSlot(Date.now() - 5 * 60 * 1000);
        let upperBound = (lowerBound + 10 * 60).toString();
        txBuilder.set_validity_start_interval_bignum(
          CSL.BigNum.from_str(lowerBound.toString())
        );
        txBuilder.set_ttl_bignum(CSL.BigNum.from_str(upperBound));

        await datum.calculateProof(
          gameSecret.secretCode,
          gameSecret.secretSalt.toString()
        );

        const txOut = txOutputBuilder
          .with_data_hash(CSL.hash_plutus_data(await datum.toCSL()))
          .with_address(
            CSL.Address.from_bech32(resolvePlutusScriptAddress(plutusScript, 0))
          )
          .next()
          .with_value(toValue(scriptUtxo.output.amount))
          .build();

        txBuilder.add_output(txOut);
        txBuilder.add_extra_witness_datum(await datum.toCSL());

        txBuilder.add_change_if_needed(
          CSL.Address.from_bech32(hydraWalletAddress)
        );

        txBuilder.add_required_signer(
          CSL.Ed25519KeyHash.from_hex(resolvePaymentKeyHash(hydraWalletAddress))
        );

        txBuilder.calc_script_data_hash(
          CSL.TxBuilderConstants.plutus_default_cost_models()
        );

        if (txBuilder.build_tx().is_valid()) {
          console.log("Transaction is valid");
        } else {
          console.log("Transaction is not valid");
        }

        const unsignedTx = txBuilder.build_tx().to_hex();
        const signedTx = await hydraWallet.signTx(unsignedTx, true);
        const txHash = await hydraWallet.submitTx(signedTx);

        return { txHash, datum };
      } catch (e) {
        console.log(e);
        throw e;
      }
    },
    [findHydraUtxo, hydraUtxos, hydraWallet, hydraWalletAddress, plutusScript]
  );

  return { createNewGame, end, guess, clue };
}
