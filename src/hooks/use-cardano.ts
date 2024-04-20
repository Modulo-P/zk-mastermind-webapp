import useHydraWallet from "@/hooks/use-hydra-wallet";
import { Transaction } from "@meshsdk/core";
import { useWallet } from "@meshsdk/react";
import { useCallback } from "react";

export default function useCardano() {
  const { wallet } = useWallet();
  const { hydraWalletAddress } = useHydraWallet();

  const depositFundsToHydra = useCallback(
    async (depositAmount: number) => {
      const tx = new Transaction({ initiator: wallet });

      tx.sendLovelace(
        {
          address: process.env.NEXT_PUBLIC_CARDANO_BRIDGE_ADDRESS!,
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
