import { useCallback, useState } from "react";
import useHydraWallet from "./use-hydra-wallet";

export default function useTransactionLifecycle() {
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | undefined>(undefined);
  const { hydraProvider } = useHydraWallet();

  const reset = useCallback(() => {
    setLoading(false);
    setMessage("");
    setError(undefined);
  }, []);

  const waitTransactionConfirmation = useCallback(
    async (txHash: string) => {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject("Transaction timed out");
        }, 100_000);
        hydraProvider.onTxConfirmed(txHash, async () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    },
    [hydraProvider]
  );

  return {
    loading,
    setLoading,
    message,
    setMessage,
    error,
    setError,
    reset,
    waitTransactionConfirmation,
  };
}
