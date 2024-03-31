import useConfetti from "@/hooks/use-confetti";
import useGame from "@/hooks/use-game";
import useGameTransaction from "@/hooks/use-game-transaction";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import useTransactionLifecycle from "@/hooks/use-transaction-lifecyle";
import { MastermindGame } from "@/services/mastermind";
import { GameSecret, Turn } from "@/types/game";
import axios, { AxiosError } from "axios";
import { Button } from "flowbite-react";
import { useCallback, useEffect, useState } from "react";

type ClueButtonProps = {
  id: number;
  setErrorMessage: (message: string) => void;
  setInfoMessage: (message: string) => void;
};

export default function ClueButton({
  id,
  setErrorMessage,
  setInfoMessage,
}: ClueButtonProps) {
  const { hydraWallet, hydraUtxos, hydraWalletAddress } = useHydraWallet();

  const { game, currentGameRow, priorGameRow } = useGame({ id });
  const { setConfetti } = useConfetti();

  const [buttonText, setButtonText] = useState<string>("Submit clue");
  const gameSecret = JSON.parse(
    localStorage.getItem("game_" + game?.solutionHash)!
  ) as GameSecret;
  const { clue } = useGameTransaction();
  const {
    loading,
    setLoading,
    message,
    setMessage,
    reset,
    waitTransactionConfirmation,
  } = useTransactionLifecycle();

  useEffect(() => {
    if (!game) return;

    if (priorGameRow?.blackPegs === 4) {
      setButtonText("You lose!");
    } else if (game.currentTurn === 0) {
      setButtonText("Waiting for a game...");
    } else if (game.currentTurn === 20 && priorGameRow?.blackPegs !== 4) {
      setButtonText("You win!");
      setInfoMessage("You win!");
      setConfetti(true);
    } else if (game.currentTurn % 2 === 1) {
      setButtonText("Submit clue");
    } else {
      setButtonText("Waiting for opponent...");
    }
  }, [game, priorGameRow?.blackPegs, setConfetti, setInfoMessage]);

  const handleClick = useCallback(async () => {
    // setButtonText("Submitting clue...");
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

      setMessage("Submitting clue...");

      const { txHash, datum } = await clue({
        game,
        currentGameRow,
        gameSecret,
      });

      setMessage("Waiting for confirmation...");

      await waitTransactionConfirmation(txHash);

      setMessage("Registering turn...");

      const turn: Partial<Turn> = {
        gameId: game.id,
        guessSequence: datum.guesses,
        blackPegs: datum.blackPegs,
        whitePegs: datum.whitePegs,
        turnNumber: datum.currentTurn,
        txHash,
        outputIndex: 0,
        player: "CODEMASTER",
        datum: (await datum.toCSL()).to_hex(),
        expirationTime: datum.expirationTime.toString(),
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/games/turns`,
        turn
      );

      setButtonText("Waiting for opponent...");
    } catch (e) {
      if (e instanceof Error && e.message === "Not proof") {
        setButtonText("Error calculating proof");
        console.error("Error calculating proof set message");
        setErrorMessage("Error calculating proof");
        setTimeout(() => {
          setButtonText("Submit clue");
        }, 3000);
      } else if (e instanceof AxiosError) {
        console.error(e.response?.data);
      }
      alert("Error submitting clue \n" + e);
    } finally {
      reset();
    }
  }, [
    clue,
    currentGameRow,
    game,
    gameSecret,
    hydraUtxos,
    hydraWallet,
    hydraWalletAddress,
    reset,
    setErrorMessage,
    setLoading,
    setMessage,
    waitTransactionConfirmation,
  ]);

  return (
    <Button
      type="button"
      color="blue"
      onClick={handleClick}
      disabled={
        !game?.currentDatum ||
        !hydraWallet ||
        !hydraUtxos ||
        !game ||
        !game.rows ||
        !hydraWalletAddress ||
        !currentGameRow ||
        loading ||
        buttonText !== "Submit clue"
      }
    >
      {loading ? message : buttonText}
    </Button>
  );
}
