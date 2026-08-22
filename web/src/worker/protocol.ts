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
  /** 各方向(有効な手のみ)の評価値。Action Values 表示に使う (SPEC.md #14.2) */
  actionValues: Partial<Record<Direction, number>>;
  /** Dynamic Depth 適用後、実際に探索へ使った深度。 */
  depth: number;
  nodes: number;
  cacheHits: number;
  elapsedMs: number;
}
