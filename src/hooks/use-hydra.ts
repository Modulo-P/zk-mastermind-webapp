import { coalesceAssets } from "@/services/blockchain-utils";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { Action, PlutusScript, Transaction } from "@meshsdk/core";
import { useWallet } from "@meshsdk/react";
import { useCallback } from "react";
import useHydraWallet from "./use-hydra-wallet";

export default function useHydra() {
  const { wallet } = useWallet();
  const { hydraUtxos, hydraWallet, hydraProvider, hydraWalletAddress } =
    useHydraWallet();

  const withdrawFundsFromHydra = useCallback(async () => {
    if (!hydraUtxos || !hydraWallet) {
      return;
    }

    const assets = coalesceAssets(hydraUtxos);

    const tx = new Transaction({
      initiator: hydraWallet,
    });

    const script: PlutusScript = {
      version: "V2",
      code: process.env.NEXT_PUBLIC_MINTING_CONTRACT!,
    };

    const redeemer: Partial<Action> = {
      tag: "MINT",
      data: await wallet.getChangeAddress(),
    };

    const asset = assets.find(
      (asset) => asset.unit === process.env.NEXT_PUBLIC_HYDRA_ASSET_ID!
    );

    tx.setCollateral([
      hydraUtxos.filter(
        (utxo) =>
          utxo.output.amount.length === 1 &&
          utxo.output.amount[0].unit === "lovelace" &&
          utxo.output.amount[0].quantity === "5000000"
      )[0],
    ]);

    const utxos = await hydraProvider.fetchAddressUTxOs(hydraWalletAddress!);

    tx.setTxInputs(utxos);
    tx.burnAsset(script, asset, redeemer);
    tx.setChangeAddress(process.env.NEXT_PUBLIC_CARDANO_FUNDS_1_ADDRESS!);

    const unsignedTx = await tx.build();
    const signedTx = await hydraWallet.signTx(unsignedTx);
    const txHash = await hydraWallet.submitTx(signedTx);
    alert(`Tx submitted: ${txHash}`);
    console.log("Tx", CSL.Transaction.from_hex(unsignedTx).to_json());
  }, [hydraUtxos, hydraWallet, wallet, hydraProvider, hydraWalletAddress]);

  const findHydraUtxo = useCallback(
    async (txHash: string, outputIndex: number) => {
      return (await hydraProvider.fetchUTxOs(txHash)).find(
        (u) => u.input.outputIndex === outputIndex
      );
    },
    [hydraProvider]
  );

  return {
    withdrawFundsFromHydra,
    findHydraUtxo,
  };
}
