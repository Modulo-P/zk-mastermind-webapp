import useConfetti from "@/hooks/use-confetti";
import useGame from "@/hooks/use-game";
import useGameTransaction from "@/hooks/use-game-transaction";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import useTransactionLifecycle from "@/hooks/use-transaction-lifecyle";
import { MastermindGame } from "@/services/mastermind";
import { Game, Turn } from "@/types/game";
import axios, { AxiosError } from "axios";
import { Button } from "flowbite-react";
import { useCallback, useEffect, useState } from "react";

type Props = {
  game: Game;
  setInfoMessage: (message: string) => void;
};

export default function GuessButton({ game, setInfoMessage }: Props) {
  const { hydraWallet, hydraWalletAddress } = useHydraWallet();

  const [buttonText, setButtonText] = useState<string>("Submit guess");
  const { setConfetti } = useConfetti();
  const { currentGameRow, priorGameRow } = useGame({ id: game.id });
  const { guess } = useGameTransaction();
  const {
    loading,
    setLoading,
    message,
    setMessage,
    waitTransactionConfirmation,
    reset,
  } = useTransactionLifecycle();

  const handleClick = useCallback(async () => {
    if (
      !hydraWallet ||
      !hydraWalletAddress ||
      !game.currentDatum ||
      !game.rows ||
      !currentGameRow
    )
      return;

    try {
      setLoading(true);

      setMessage("Submitting guess...");

      const { txHash, datum } = await guess({ game, currentGameRow });

      setMessage("Waiting for confirmation...");

      await waitTransactionConfirmation(txHash);

      setMessage("Registering turn...");

      const turn: Partial<Turn & { codeBreaker: string }> = {
        gameId: game.id,
        codeBreaker: hydraWalletAddress,
        guessSequence: currentGameRow.colorSequence,
        blackPegs: 0,
        whitePegs: 0,
        turnNumber: datum.currentTurn,
        txHash,
        outputIndex: 0,
        player: "CODEBREAKER",
        datum: (await datum.toCSL()).to_hex(),
        expirationTime: datum.expirationTime.toString(),
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/games/turns`,
        turn
      );
      setButtonText("Waiting for a clue");
    } catch (e) {
      if (e instanceof AxiosError) {
        console.error(e.response?.data);
      } else {
        console.error(e);
      }
      alert("Error submitting guess \n" + e);
    } finally {
      reset();
    }
  }, [
    currentGameRow,
    game,
    guess,
    hydraWallet,
    hydraWalletAddress,
    reset,
    setLoading,
    setMessage,
    waitTransactionConfirmation,
  ]);

  useEffect(() => {
    if (priorGameRow?.blackPegs === 4) {
      setButtonText("You win!");
      setConfetti(true);
    } else if (game.currentTurn === 20 && priorGameRow?.blackPegs !== 4) {
      setButtonText("You lose!");
    } else if (game.currentTurn % 2 === 0) {
      setButtonText("Submit guess");
    } else {
      setButtonText("Waiting for a clue");
    }
  }, [game, priorGameRow?.blackPegs, setConfetti, setInfoMessage]);
  return (
    <Button
      color="teal"
      onClick={handleClick}
      disabled={
        !hydraWallet ||
        !hydraWalletAddress ||
        !game.currentDatum ||
        !game.rows ||
        !currentGameRow ||
        loading ||
        buttonText !== "Submit guess" ||
        !MastermindGame.plutusScript
      }
    >
      {loading ? message : buttonText}
    </Button>
  );
}
