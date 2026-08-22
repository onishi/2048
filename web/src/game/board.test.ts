import { describe, expect, it } from "vitest";
import { cloneBoard, createEmptyBoard, getEmptyCells, getMaxTile } from "./board";
import type { Board } from "./types";

describe("board utilities", () => {
  it("createEmptyBoard は16マスすべて0", () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(16);
    expect(board.every((v) => v === 0)).toBe(true);
  });

  it("getEmptyCells は空きマスのインデックスを返す", () => {
    const board: Board = [2, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(getEmptyCells(board)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it("getMaxTile は最大値を返す", () => {
    const board: Board = [2, 0, 1024, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4];
    expect(getMaxTile(board)).toBe(1024);
  });

  it("cloneBoard は独立した配列を返す", () => {
    const board = createEmptyBoard();
    const clone = cloneBoard(board);
    clone[0] = 2;
    expect(board[0]).toBe(0);
  });
});
