import ColorRow from "./color-row";
import { use, useEffect, useState } from "react";
import { ColorSchema, MastermindDatum } from "@/services/mastermind";
import { Row } from "@/types/game";

type Props = {
  row: Row;
  updateGameRow: (row: Row) => void;
};

export default function GameRow({ row, updateGameRow }: Props) {
  const [pegSquence, setPegSequence] = useState<Array<string | null>>(
    Array(4).fill(null)
  );

  useEffect(() => {
    let pegIndex = 0;
    const newPegSequence = Array(4).fill(null);

    for (pegIndex; pegIndex < row.blackPegs; pegIndex++) {
      newPegSequence[pegIndex] = "bg-gray-900";
    }
    for (pegIndex; pegIndex < row.whitePegs + row.blackPegs; pegIndex++) {
      newPegSequence[pegIndex] = "bg-gray-300";
    }
    setPegSequence(newPegSequence);
  }, [row.blackPegs, row.whitePegs]);

  const onChangeColor = (colorSequence: Array<number>) => {
    row.colorSequence = colorSequence;
    updateGameRow(row);
  };

  return (
    <div
      className={`flex flex-row m-2 items-center ${
        row.selected ? "border" : ""
      }`}
    >
      <ColorRow
        colorSequence={row.colorSequence}
        blocked={row.blocked}
        onChange={onChangeColor}
      />
      <div className="flex flex-col w-12 h-full my-2 mx-1 justify-around ">
        <div className="flex flex-row justify-around">
          <div>
            <Peg color={pegSquence[0]} />
          </div>
          <div>
            <Peg color={pegSquence[1]} />
          </div>
        </div>
        <div className="flex flex-row justify-around">
          <div>
            <Peg color={pegSquence[2]} />
          </div>
          <div>
            <Peg color={pegSquence[3]} />
          </div>
        </div>
      </div>
      <div className="flex items-center">
        {/* <ProofCheckerModal datum={rowState.datum} /> */}
      </div>
    </div>
  );
}

function Peg({ color }: { color: string | null }) {
  return (
    <div
      className={`w-4 h-4 border rounded-full ${
        color ? color : "bg-gray-200 dark:bg-gray-600"
      }`}
    />
  );
}
