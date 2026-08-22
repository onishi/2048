/** 4x4 の盤面。16 要素の一次元配列（row-major）。空きマスは 0。SPEC.md #9.1 */
export type Board = number[];

export type Direction = "up" | "down" | "left" | "right";

export interface GameState {
  board: Board;
  score: number;
  moveCount: number;
  gameOver: boolean;
}

export interface MoveResult {
  board: Board;
  moved: boolean;
  scoreDelta: number;
}
