import { useGameStore } from "@/store/use-game-store";
import { Game, Row } from "@/types/game";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo } from "react";

export default function useGame({ id }: { id: number }) {
  const MAX_TURNS = 20;

  const { currentGames, upsertCurrentGame, updateGameRow } = useGameStore();

  const game = useMemo(
    () => currentGames.find((g) => g.id === id),
    [currentGames, id]
  );
  const updateGameRowWrapper = (rowIndex: number, row: Row) =>
    updateGameRow(id, rowIndex, row);
  const currentGameRow =
    game?.rows && game.rows[Math.floor(game.currentTurn / 2)];
  const priorGameRow =
    game?.rows && game.rows.length > 1
      ? game.rows[Math.floor(game.currentTurn / 2) - 1]
      : undefined;

  const { data } = useQuery({
    queryKey: ["game", id],
    queryFn: async () => {
      if (!id) return Promise.resolve(null);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/games/?id=${id}`
      );

      const dbGame = response.data;

      return dbGame as Game;
    },
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!data) return;

    const result: Game = {
      id: data.id,
      codeMaster: data.codeMaster,
      codeMasterAddress: data.codeMasterAddress,
      codeBreaker: data.codeBreaker,
      codeBreakerAddress: data.codeBreakerAddress,
      solutionHash: data.solutionHash,
      adaAmount: data.adaAmount,
      txHash: data.txHash,
      outputIndex: data.outputIndex,
      currentTurn: data.currentTurn,
      currentDatum: data.currentDatum,
      state: data.state,
      turns: data.turns,
      expirationTime: data.expirationTime,
    };

    result.rows = new Array<Row>(MAX_TURNS / 2);

    for (let i = 0; i < MAX_TURNS + 1; i++) {
      let row: Row;
      if (i < result.turns.length) {
        const turn = result.turns[i];
        if (i % 2 === 0 && i !== MAX_TURNS) {
          let priorRow: Row | null = null;
          if (i > 0) {
            priorRow = result.rows[i / 2 - 1];
            priorRow.blackPegs = turn.blackPegs;
            priorRow.whitePegs = turn.whitePegs;
            priorRow.datum = turn.datum;
          }

          row = {
            colorSequence: [0, 0, 0, 0],
            selectedArray: [],
            blocked:
              Math.floor(result.turns.length / 2) === Math.floor(i / 2) &&
              priorRow?.blackPegs !== 4
                ? false
                : true,
            selected:
              Math.floor(result.turns.length / 2) === Math.floor(i / 2) &&
              priorRow?.blackPegs !== 4
                ? true
                : false,
            blackPegs: 0,
            whitePegs: 0,
            datum: null,
          };
          result.rows[i / 2] = row;
        } else if (i !== MAX_TURNS) {
          result.rows[Math.floor(i / 2)] = {
            colorSequence: turn.guessSequence,
            selectedArray: [],
            blocked: true,
            selected:
              result.turns.length === i + 1 && turn.blackPegs !== 4
                ? true
                : false,
            blackPegs: turn.blackPegs,
            whitePegs: turn.whitePegs,
            datum: null,
          };
        } else {
          const priorRow = result.rows[i / 2 - 1];
          priorRow.blackPegs = turn.blackPegs;
          priorRow.whitePegs = turn.whitePegs;
          priorRow.datum = turn.datum;
        }
      } else {
        if (i % 2 === 0 && i !== MAX_TURNS) {
          result.rows[i / 2] = {
            colorSequence: [0, 0, 0, 0],
            selectedArray: [],
            blocked: true,
            selected: false,
            blackPegs: 0,
            whitePegs: 0,
            datum: null,
          };
        }
      }
    }

    upsertCurrentGame(result);
  }, [data, upsertCurrentGame]);

  return {
    game,
    updateGameRow: updateGameRowWrapper,
    updateCurrentGameRow: (row: Row) =>
      game && updateGameRowWrapper(Math.floor(game.currentTurn / 2), row),
    currentGameRow,
    priorGameRow,
  };
}
