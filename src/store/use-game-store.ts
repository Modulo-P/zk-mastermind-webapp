import { Game, Row } from "@/types/game";
import { devtools } from "zustand/middleware";
import { create } from "zustand";

interface GameStore {
  activeGames: Game[];
  currentGames: Game[];
  setActiveGames: (games: Game[]) => void;
  upsertCurrentGame: (game: Game) => void;
  updateGameRow: (gameId: number, rowIndex: number, row: Row) => void;
}

export const useGameStore = create<GameStore>()(
  devtools((set, get) => ({
    activeGames: [],
    currentGames: [],

    setActiveGames: (games: Game[]) => set({ activeGames: games }),
    upsertCurrentGame: (game: Game) => {
      set((state) => ({
        currentGames: [
          ...state.currentGames.filter((g) => g.id !== game.id),
          game,
        ],
      }));
    },
    updateGameRow: (gameId: number, rowIndex: number, row: Row) => {
      set((state) => {
        const game = state.currentGames.find((g) => g.id === gameId);
        if (!game || !game.rows) return state;
        game.rows[rowIndex] = row;
        return { currentGames: [...state.currentGames] };
      });
    },
  }))
);
