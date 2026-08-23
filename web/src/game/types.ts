/**
 * N x N の盤面。N*N 要素の一次元配列（row-major）。空きマスは 0。SPEC.md #9.1
 * 盤面サイズは可変(issue #16, #17)。一辺のマス数は `boardSizeOf()` で求める。
 */
export type Board = number[];

export type Direction = "up" | "down" | "left" | "right";

export interface GameState {
  board: Board;
  score: number;
  moveCount: number;
  gameOver: boolean;
  /** タイル生成の基準値。既定は2 (SPEC.md #10.4)。3から始めるモードでは3 (issue #20) */
  startTile: number;
}

export interface MoveResult {
  board: Board;
  moved: boolean;
  scoreDelta: number;
}
