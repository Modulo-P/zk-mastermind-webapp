import useConfetti from "@/hooks/use-confetti";
import useGame from "@/hooks/use-game";
import useGameTransaction from "@/hooks/use-game-transaction";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import { Game, Turn } from "@/types/game";
import axios, { AxiosError } from "axios";
import { Button } from "flowbite-react";
import { useEffect, useState } from "react";

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
  const handleClick = async () => {
    if (
      !hydraWallet ||
      !hydraWalletAddress ||
      !game.currentDatum ||
      !game.rows ||
      !currentGameRow
    )
      return;

    try {
      const { txHash, datum } = await guess({ game, currentGameRow });

      const turn: Partial<Turn & { codeBreaker: string }> = {
        gameId: game.id,
        codeBreaker: hydraWalletAddress,
        guessSequence: currentGameRow.colorSequence,
        blackPegs: datum.blackPegs,
        whitePegs: datum.whitePegs,
        turnNumber: datum.currentTurn,
        txHash,
        outputIndex: 0,
        player: "CODEBREAKER",
        datum: (await datum.toCSL()).to_hex(),
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/games/turns`,
        turn
      );
    } catch (e) {
      if (e instanceof AxiosError) {
        console.log(e.response?.data);
      } else {
        console.log(e);
      }
    }
  };

  useEffect(() => {
    if (priorGameRow?.blackPegs === 4) {
      setButtonText("You win!");
      setConfetti(true);
    } else if (game.currentTurn === 10 && priorGameRow?.blackPegs !== 4) {
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
      disabled={!game.currentDatum || buttonText !== "Submit guess"}
    >
      {buttonText}
    </Button>
  );
}
