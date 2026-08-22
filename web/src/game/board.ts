import type { Board } from "./types";

export const BOARD_SIZE = 4;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export function createEmptyBoard(): Board {
  return new Array(CELL_COUNT).fill(0);
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
