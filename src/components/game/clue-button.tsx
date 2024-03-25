import useConfetti from "@/hooks/use-confetti";
import useGame from "@/hooks/use-game";
import useGameTransaction from "@/hooks/use-game-transaction";
import useHydra from "@/hooks/use-hydra";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import {
  addUTxOInputs,
  toValue,
  txBuilderConfig,
  unixToSlot,
} from "@/services/blockchain-utils";
import { MastermindDatum, plutusScript } from "@/services/mastermind";
import { GameSecret, Turn } from "@/types/game";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import {
  UTxO,
  keepRelevant,
  resolvePaymentKeyHash,
  resolvePlutusScriptAddress,
} from "@meshsdk/core";
import axios, { AxiosError, AxiosResponse } from "axios";
import { Button } from "flowbite-react";
import { useEffect, useState } from "react";

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
  const { findHydraUtxo } = useHydra();

  const { game, currentGameRow, priorGameRow } = useGame({ id });
  const { setConfetti } = useConfetti();

  const [buttonText, setButtonText] = useState<string>("Submit clue");
  const gameSecret = JSON.parse(
    localStorage.getItem("game_" + game?.solutionHash)!
  ) as GameSecret;
  const { clue } = useGameTransaction();

  useEffect(() => {
    if (!game) return;

    if (priorGameRow?.blackPegs === 4) {
      setButtonText("You lose!");
    } else if (game.currentTurn === 0) {
      setButtonText("Waiting for a game...");
    } else if (game.currentTurn === 10 && priorGameRow?.blackPegs !== 4) {
      setButtonText("You win!");
      setInfoMessage("You win!");
      setConfetti(true);
    } else if (game.currentTurn % 2 === 1) {
      setButtonText("Submit clue");
    } else {
      setButtonText("Waiting for opponent...");
    }
  }, [game, priorGameRow?.blackPegs, setConfetti, setInfoMessage]);

  const handleClick = async () => {
    // setButtonText("Submitting clue...");
    if (
      !hydraWallet ||
      !hydraUtxos ||
      !game ||
      !game.rows ||
      !hydraWalletAddress ||
      !currentGameRow
    )
      return;
    try {
      const { txHash, datum } = await clue({
        game,
        currentGameRow,
        gameSecret,
      });
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
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/games/turns`,
        turn
      );
    } catch (e) {
      if (e instanceof Error && e.message === "Not proof") {
        setButtonText("Error calculating proof");
        console.log("Error calculating proof set message");
        setErrorMessage("Error calculating proof");
        setTimeout(() => {
          setButtonText("Submit clue");
        }, 3000);
      } else if (e instanceof AxiosError) {
        console.log(e.response?.data);
      }
      return;
    }
  };

  return (
    <Button
      type="button"
      color="blue"
      onClick={handleClick}
      disabled={!game?.currentDatum || buttonText !== "Submit clue"}
    >
      {buttonText}
    </Button>
  );
}
