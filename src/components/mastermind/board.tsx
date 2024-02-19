import { Game, Row } from "@/types/game";
import { useEffect, useState } from "react";
import GameRow from "./game-row";
import Selector from "./selector";
import useGame from "@/hooks/use-game";

type Props = {
  id: number;
  readonly: boolean;
};

export default function Board({ id, readonly }: Props) {
  const { game, updateGameRow } = useGame({ id });

  return (
    <div className="flex flex-row">
      <div className="flex flex-col border rounded-md bg-gray-400 dark:bg-transparent">
        <div className="flex flex-col">
          {game &&
            game.rows &&
            game.rows.map((row, index) => {
              return (
                <GameRow
                  key={index}
                  row={row}
                  updateGameRow={(row: Row) => updateGameRow(index, row)}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
