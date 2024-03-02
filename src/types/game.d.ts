import { ColorSchema } from "@/services/mastermind";

export interface Game {
  id: number;
  codeMaster: string;
  codeBreaker: string;
  solutionHash: string;
  adaAmount: string;
  txHash: string;
  outputIndex: number;
  currentTurn: number;
  currentDatum: MastermindDatum | null;
  state: "CREATED" | "STARTED" | "FINISHED";
  turns: Array<Turn>;
  rows?: Array<Row>;
}

export type Turn = {
  id: number;
  gameId: number;
  turnNumber: number;
  player: "CODEBREAKER" | "CODEMASTER";
  guessSequence: Array<number>;
  blackPegs: number;
  whitePegs: number;
  datum: string;
  txHash: string;
  outputIndex: number;
};

export type Row = {
  colorSequence: Array<number>;
  selectedArray: Array<boolean>;
  blocked: boolean;
  selected: boolean;
  blackPegs: number;
  whitePegs: number;
  datum: MastermindDatum | null;
};

export type GameSecret = {
  secretCode: Array<number>;
  secretSalt: string;
};
