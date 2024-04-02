import useGameTransaction from "@/hooks/use-game-transaction";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import useTransactionLifecycle from "@/hooks/use-transaction-lifecyle";
import { MastermindGame } from "@/services/mastermind";
import { Game, Row } from "@/types/game";
import axios from "axios";
import { Button } from "flowbite-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

export default function ClaimButton({
  game,
  currentGameRow,
}: {
  game: Game;
  currentGameRow: Row;
}) {
  const router = useRouter();

  const { end: cancel } = useGameTransaction();
  const {
    loading,
    setLoading,
    message,
    setMessage,
    reset,
    waitTransactionConfirmation,
  } = useTransactionLifecycle();
  const { hydraWallet, hydraUtxos, hydraWalletAddress } = useHydraWallet();

  const [buttonMessage, setButtonMessage] = useState("Claim funds");
  const [countDownDate, setCountDownDate] = useState(
    new Date().getTime() + 5000
  );
  const [countDown, setCountDown] = useState(
    countDownDate - new Date().getTime()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCountDown(countDownDate - new Date().getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [countDownDate]);

  const getReturnValues = (countDown: number) => {
    // calculate time left
    const days = Math.floor(countDown / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (countDown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((countDown % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  const waitingForTurn =
    game &&
    game.currentTurn % 2 ==
      (game.codeBreakerAddress === hydraWalletAddress ? 1 : 0);

  useEffect(() => {
    if (waitingForTurn) {
      setCountDownDate(
        new Date(
          Number(game.expirationTime) + 19 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000
        ).getTime()
      );
    }
  }, [game, game.expirationTime, waitingForTurn]);

  useEffect(() => {
    if (waitingForTurn) {
      if (countDown > 0) {
        const { minutes, seconds, hours } = getReturnValues(countDown);
        setButtonMessage(
          `${hours}:${minutes.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })}:${seconds.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })} remaining to claim funds`
        );
      } else {
        setButtonMessage("Claim funds");
      }
    } else {
      setButtonMessage("Your turn is not over yet");
    }
  }, [countDown, waitingForTurn]);

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

      const { txHash } = await cancel({
        game,
      });

      setMessage("Waiting for confirmation...");

      await waitTransactionConfirmation(txHash);

      setMessage("Registering turn...");

      game.state = "FINISHED";
      await axios.patch(process.env.NEXT_PUBLIC_HYDRA_BACKEND + "/games", game);

      router.push("/lobby");
    } catch (e) {
      console.error(e);
      alert("Error submitting clue \n" + e);
    } finally {
      reset();
    }
  }, [
    cancel,
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
        game.currentTurn === 0 ||
        !waitingForTurn ||
        countDown > 0
      }
    >
      {loading ? message : buttonMessage}
    </Button>
  );
}
