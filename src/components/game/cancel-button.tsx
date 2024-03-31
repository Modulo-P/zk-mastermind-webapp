import useGameTransaction from "@/hooks/use-game-transaction";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import useTransactionLifecycle from "@/hooks/use-transaction-lifecyle";
import { MastermindGame } from "@/services/mastermind";
import { Game, Row } from "@/types/game";
import axios from "axios";
import { Button } from "flowbite-react";
import { useRouter } from "next/router";
import { useCallback } from "react";

export default function CancelButton({
  game,
  currentGameRow,
}: {
  game: Game;
  currentGameRow: Row;
}) {
  const router = useRouter();

  const { end } = useGameTransaction();
  const {
    loading,
    setLoading,
    message,
    setMessage,
    reset,
    waitTransactionConfirmation,
  } = useTransactionLifecycle();
  const { hydraWallet, hydraUtxos, hydraWalletAddress } = useHydraWallet();

  const handleClick = useCallback(async () => {
    if (
      !hydraWallet ||
      !hydraUtxos ||
      !game ||
      !game.rows ||
      !hydraWalletAddress ||
      !currentGameRow ||
      !MastermindGame.plutusScript
    )
      return;

    try {
      setLoading(true);

      setMessage("Cancelling game");

      const { txHash } = await end({
        game,
      });

      setMessage("Waiting for confirmation...");

      await waitTransactionConfirmation(txHash);

      setMessage("Registering turn...");

      game.state = "FINISHED";
      const response = await axios.patch(
        process.env.NEXT_PUBLIC_HYDRA_BACKEND + "/games",
        game
      );

      router.push("/lobby");
    } catch (e) {
      console.error(e);
      alert("Error submitting clue \n" + e);
    } finally {
      reset();
    }
  }, [
    end,
    currentGameRow,
    game,
    hydraUtxos,
    hydraWallet,
    hydraWalletAddress,
    reset,
    router,
    setLoading,
    setMessage,
    waitTransactionConfirmation,
  ]);

  return (
    <Button
      color="warning"
      onClick={() => handleClick()}
      disabled={
        !hydraWallet ||
        !hydraUtxos ||
        !game ||
        !game.rows ||
        !hydraWalletAddress ||
        !currentGameRow ||
        game.currentTurn !== 0
      }
    >
      {loading ? message : "Cancel game"}
    </Button>
  );
}
