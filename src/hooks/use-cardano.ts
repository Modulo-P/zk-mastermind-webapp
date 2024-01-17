import useHydraWallet from "@/hooks/use-hydra-wallet";
import { Transaction } from "@meshsdk/core";
import { useWallet } from "@meshsdk/react";
import { useCallback, useState } from "react";

export default function useCardano() {
  const { wallet } = useWallet();
  const { hydraWalletAddress } = useHydraWallet();

  const depositFundsToHydra = useCallback(
    async (depositAmount: number) => {
      const tx = new Transaction({ initiator: wallet });

      tx.sendLovelace(
        {
          address:
            "addr_test1wz0c73j3czfd77gtg58jtm2dz8fz7yrxzylv7dc67kew5tqk4uqc9",
          datum: {
            value: hydraWalletAddress,
            inline: true,
          },
        },
        (depositAmount * 1000000).toString()
      );

      tx.setChangeAddress(await wallet.getChangeAddress());

      const unsignedTx = await tx.build();
      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);

      alert("The transaction was submitted with hash: " + txHash);
    },
    [wallet, hydraWalletAddress]
  );

  return { depositFundsToHydra };
}
