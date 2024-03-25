import ClueForm from "@/components/game/clue-form";
import GuessButton from "@/components/game/guess-button";
import Layout from "@/components/layout";
import Board from "@/components/mastermind/board";
import useGame from "@/hooks/use-game";
import useHydra from "@/hooks/use-hydra";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import {
  addUTxOInputs,
  toValue,
  txBuilderConfig,
  unixToSlot,
} from "@/services/blockchain-utils";
import { plutusScript } from "@/services/mastermind";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { UTxO, keepRelevant, resolvePaymentKeyHash } from "@meshsdk/core";
import { useRouter } from "next/router";
import { ReactElement, useEffect } from "react";
import axios, { AxiosError } from "axios";

export default function Game() {
  const router = useRouter();
  const { hydraWalletAddress, hydraWallet, hydraUtxos } = useHydraWallet();
  const { findHydraUtxo } = useHydra();
  const { game, priorGameRow } = useGame({
    id: Number(router.query.id),
  });

  useEffect(() => {
    const endGame = async () => {
      let winnerAddress = "";

      if (
        game &&
        priorGameRow &&
        game.codeMasterAddress === hydraWalletAddress &&
        game.currentTurn === 10 &&
        priorGameRow.blackPegs < 4
      ) {
        winnerAddress = game.codeMaster;
      } else if (
        game &&
        priorGameRow &&
        game.codeBreakerAddress === hydraWalletAddress &&
        priorGameRow.blackPegs === 4
      ) {
        winnerAddress = game.codeBreakerAddress;
      }

      if (
        !winnerAddress ||
        (hydraWalletAddress !== winnerAddress && game?.state !== "STARTED")
      )
        return;

      if (
        !hydraWallet ||
        !hydraUtxos ||
        !game ||
        !game.rows ||
        !hydraWalletAddress
      )
        return;
      try {
        await setTimeout(() => {}, 5000);

        const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

        const scriptUtxo = await findHydraUtxo(game.txHash, game.outputIndex);

        if (!scriptUtxo) throw new Error("No game utxo found");

        const assetMap = new Map();
        const utxos = keepRelevant(
          assetMap,
          hydraUtxos.filter(
            (u) =>
              u.output.amount.find((a) => a.unit === "lovelace")?.quantity !==
              "5000000"
          ),
          "30000000"
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
          CSL.PlutusData.new_empty_constr_plutus_data(CSL.BigNum.from_str("2")),
          CSL.ExUnits.new(
            CSL.BigNum.from_str("14000000"),
            CSL.BigNum.from_str("10000000000")
          )
        );

        const plutusWitness = CSL.PlutusWitness.new(
          script,
          CSL.PlutusData.from_hex(game.currentDatum),
          redeemer
        );

        txBuilder.add_plutus_script_input(
          plutusWitness,
          scriptTxInput,
          toValue(scriptUtxo.output.amount)
        );

        const txOutputBuilder = CSL.TransactionOutputBuilder.new();

        // Time expiration condition

        // When the turn is of type "Start" two conditions have to be met:
        // (1) ValidTime range has to be lesser or equal than 20 minutes (1200000 miliseconds)
        // (2) Expiration time has to be greater or equal than the UpperBound of the Validity range + 20 min

        let lowerBound = unixToSlot(Date.now() - 60 * 1000);
        let upperBound = (lowerBound + 15 * 60).toString();
        txBuilder.set_validity_start_interval_bignum(
          CSL.BigNum.from_str(lowerBound.toString())
        );
        txBuilder.set_ttl_bignum(CSL.BigNum.from_str(upperBound));

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
        await hydraWallet.submitTx(signedTx);

        try {
          game.state = "FINISHED";
          const response = await axios.patch(
            process.env.NEXT_PUBLIC_HYDRA_BACKEND + "/games",
            game
          );
          console.log(response.data);

          router.push("/lobby");
        } catch (e) {
          if (e instanceof AxiosError) {
            console.log(e.response?.data);
          }
          console.log(e);
        }
      } catch (e) {
        console.log(e);
      }
    };
    endGame();
  }, [
    findHydraUtxo,
    game,
    game?.rows,
    hydraUtxos,
    hydraWallet,
    hydraWalletAddress,
    priorGameRow,
    router,
  ]);

  return (
    <div className="flex flex-col max-w-4xl mx-auto">
      <div className="shadow border-2 ring-gray-200 dark:ring-gray-700 rounded-lg w-full flex flex-col backdrop-blur bg-gray-100 dark:bg-gray-800 px-10 py-8 mb-8">
        <div className="prose dark:prose-invert text-center max-w-2xl mx-auto">
          🚨IMPORTANT!!!🚨 If you like what we are doing!! Please consider
          support us in Catalyst: 🚦
          <a href="https://cardano.ideascale.com/c/idea/113249" target="_blank">
            Semaphore protocol
          </a>
          🚦
        </div>
      </div>
      <div className="shadow border-2 ring-gray-200 dark:ring-gray-700 rounded-lg w-full flex flex-col backdrop-blur bg-gray-100 dark:bg-gray-800 px-10 py-8">
        <div className="flex flex-row gap-8 ">
          <div className="flex flex-col prose dark:prose-invert">
            <h2 className="text-center mb-2">Board</h2>
            <p className="text-center my-2">
              {game?.codeBreakerAddress && (
                <>
                  {game.codeMaster.nickname} 🆚 {game.codeBreaker.nickname}
                </>
              )}
            </p>
            <p className="text-xs">TIP: click to change the color</p>
            {game?.rows && <Board id={game.id} readonly={false} />}
          </div>
          <div className="flex flex-col flex-grow prose dark:prose-invert text-sm">
            <h2 className="text-center ">Smart contract control</h2>
            <p>
              Modulo-P brings you the first-ever game to experience the speed of
              Hydra and ZK proofs on Cardano.
            </p>
            {game &&
              (hydraWalletAddress === game.codeBreakerAddress ||
                (game.state === "CREATED" &&
                  game.codeMasterAddress !== hydraWalletAddress)) && (
                <div>
                  <p>
                    You are the code breaker 🥷. Select a sequence and send your
                    guess to the code master. Wait until the code master give
                    you back a clue. This clue is shield by a ZK Proof and it
                    can&apos;t be incorrect.
                  </p>
                  <GuessButton
                    game={game}
                    setInfoMessage={(message) =>
                      console.log("guess button", message)
                    }
                  />
                </div>
              )}
            {game && hydraWalletAddress === game.codeMasterAddress && (
              <div>
                <p>
                  You are the code master 🧙🏻‍♀️. Wait for the code breaker. When
                  you recieve a guess, remember to give back the correct clue.
                  Else you won&apos;t be able to continue the game.{" "}
                </p>
                <ClueForm id={game.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Game.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
