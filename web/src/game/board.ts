import type { Board } from "./types";

/** 盤面サイズは可変 (issue #16, #17)。既定は従来通りの 4x4。 */
export const DEFAULT_BOARD_SIZE = 4;
export const MIN_BOARD_SIZE = 3;
export const MAX_BOARD_SIZE = 5;

/** 一次元配列の長さから一辺のマス数を求める */
export function boardSizeOf(board: Board): number {
  return Math.round(Math.sqrt(board.length));
}

export function createEmptyBoard(size: number = DEFAULT_BOARD_SIZE): Board {
  return new Array(size * size).fill(0);
}

export function cloneBoard(board: Board): Board {
  return board.slice();
}

/** 空きマスのインデックス一覧を返す (SPEC.md #10.1) */
export function getEmptyCells(board: Board): number[] {
  const cells: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 0) cells.push(i);
  }
  return cells;
}

/** 盤面中の最大タイル値を返す (SPEC.md #10.1) */
export function getMaxTile(board: Board): number {
  let max = 0;
  for (const value of board) {
    if (value > max) max = value;
  }
  return max;
}

/** キャッシュキー生成等に使う文字列表現 (SPEC.md #11.8) */
export function serializeBoard(board: Board): string {
  return board.join(",");
}

export function boardsEqual(a: Board, b: Board): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
