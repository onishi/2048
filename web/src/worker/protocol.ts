import type { Board, Direction } from "../game/types";

/** メインスレッド → Worker (SPEC.md #13.1) */
export interface AIRequest {
  type: "choose-move";
  id: string;
  board: Board;
  depth: number;
}

/** Worker → メインスレッド (SPEC.md #13.1) */
export interface AIResponse {
  type: "move-result";
  id: string;
  direction: Direction;
  evaluation: number;
  nodes: number;
  elapsedMs: number;
}
