import { Label, TextInput } from "flowbite-react";
import React, { useEffect } from "react";
import ClueButton from "./clue-button";
import useGame from "@/hooks/use-game";
import { GameSecret } from "@/types/game";
import ColorRow from "../mastermind/color-row";

type ClueFormProps = {
  id: number;
};

export default function ClueForm({ id }: ClueFormProps) {
  const { game, updateCurrentGameRow, currentGameRow } = useGame({ id });

  const [whitePegs, setWhitePegs] = React.useState<number | null>(0);
  const [blackPegs, setBlackPegs] = React.useState<number | null>(0);

  const secretCode = JSON.parse(
    localStorage.getItem("game_" + game?.solutionHash)!
  ) as GameSecret;

  useEffect(() => {
    if (game && game.currentTurn % 2 === 0 && game.currentTurn !== 10) {
      setWhitePegs(null);
      setBlackPegs(null);
    }
  }, [game, game?.currentTurn]);

  useEffect(() => {
    if (!currentGameRow) return;

    if (
      (currentGameRow.whitePegs !== (whitePegs ?? 0) ||
        currentGameRow.blackPegs !== (blackPegs ?? 0)) &&
      game?.currentTurn !== 10
    ) {
      updateCurrentGameRow({
        ...currentGameRow,
        whitePegs: whitePegs ?? 0,
        blackPegs: blackPegs ?? 0,
      });
    }
  }, [
    whitePegs,
    blackPegs,
    updateCurrentGameRow,
    currentGameRow,
    game?.currentTurn,
  ]);

  return (
    <div className="flex flex-col">
      <p>Your secret sequence is:</p>
      <ColorRow colorSequence={secretCode.secretCode} blocked={true} />
      <form className="flex flex-col items-center gap-2">
        <div className="flex flex-row gap-2">
          <Label>White pegs</Label>
          <TextInput
            type="number"
            value={whitePegs ?? ""}
            onChange={(evt) =>
              setWhitePegs(evt.target.value ? Number(evt.target.value) : null)
            }
          />
          <Label>Black pegs</Label>
          <TextInput
            type="number"
            value={blackPegs ?? ""}
            onChange={(evt) =>
              setBlackPegs(evt.target.value ? Number(evt.target.value) : null)
            }
          />
        </div>
        {game && (
          <ClueButton
            id={game.id}
            setErrorMessage={(message) => console.error(message)}
            setInfoMessage={(message) => console.log(message)}
          />
        )}
      </form>
    </div>
  );
}
