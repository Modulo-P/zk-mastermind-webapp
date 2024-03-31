import useGameTransaction from "@/hooks/use-game-transaction";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import useTransactionLifecycle from "@/hooks/use-transaction-lifecyle";
import { MastermindGame } from "@/services/mastermind";
import { Game } from "@/types/game";
import axios, { AxiosError } from "axios";
import { Button } from "flowbite-react";
import { useRouter } from "next/router";
import { useCallback } from "react";

export default function CreateGameButton({
  secretCode,
  randomSalt,
  adaAmount,
  onClose,
  ...props
}: {
  secretCode: Array<number>;
  randomSalt: string;
  adaAmount: number;
  onClose: () => void;
} & React.ComponentProps<typeof Button>) {
  const { hydraWalletAddress } = useHydraWallet();
  const router = useRouter();
  const { createNewGame } = useGameTransaction();
  const {
    loading,
    setLoading,
    message,
    setMessage,
    waitTransactionConfirmation,
    reset,
  } = useTransactionLifecycle();

  const createNewGameHandler = useCallback(async () => {
    if (
      hydraWalletAddress &&
      !secretCode.some((s) => s === undefined) &&
      adaAmount > 0
    ) {
      try {
        setLoading(true);
        setMessage("Creating game...");
        const { datum, txHash } = await createNewGame({
          secretCode,
          randomSalt,
          adaAmount,
        });
        setMessage("Waiting for confirmation...");

        await waitTransactionConfirmation(txHash);

        setMessage("Registering game...");

        const game: Partial<Game> = {
          codeMasterAddress: hydraWalletAddress,
          solutionHash: datum.hashSol.toString(),
          adaAmount: (adaAmount * 1000000).toString(),
          txHash: txHash,
          outputIndex: 0,
          currentDatum: (await datum.toCSL()).to_hex(),
          expirationTime: "0",
        };

        const response = await axios.post(
          process.env.NEXT_PUBLIC_HYDRA_BACKEND + "/games",
          game
        );

        router.push("/games/" + response.data.data.id);
      } catch (e) {
        if (e instanceof AxiosError) {
          console.error(e.response?.data);
        } else {
          console.error(e);
        }
        alert("Error creating game \n" + e);
      } finally {
        reset();
        onClose();
      }
    }
  }, [
    hydraWalletAddress,
    secretCode,
    adaAmount,
    setLoading,
    setMessage,
    createNewGame,
    randomSalt,
    waitTransactionConfirmation,
    router,
    reset,
    onClose,
  ]);

  return (
    <Button
      {...props}
      onClick={() => createNewGameHandler()}
      disabled={
        loading ||
        secretCode.some((s) => s === undefined) ||
        adaAmount <= 0 ||
        hydraWalletAddress === undefined ||
        !MastermindGame.plutusScript
      }
    >
      {loading ? message : "Create new game"}
    </Button>
  );
}
