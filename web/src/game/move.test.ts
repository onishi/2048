import { describe, expect, it } from "vitest";
import { createEmptyBoard } from "./board";
import { getValidMoves, isGameOver, move } from "./move";
import type { Board } from "./types";

/** 1行のパターンを4x4盤面の1行目に埋め込み、残りは0で埋める */
function boardFromRow(row: number[]): Board {
  return [...row, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

describe("move (LEFT) — SPEC.md #10.3", () => {
  it("基本マージ: 2 2 0 0 -> 4 0 0 0", () => {
    const result = move(boardFromRow([2, 2, 0, 0]), "left");
    expect(result.board.slice(0, 4)).toEqual([4, 0, 0, 0]);
    expect(result.moved).toBe(true);
    expect(result.scoreDelta).toBe(4);
  });

  it("2組同時マージ: 2 2 2 2 -> 4 4 0 0", () => {
    const result = move(boardFromRow([2, 2, 2, 2]), "left");
    expect(result.board.slice(0, 4)).toEqual([4, 4, 0, 0]);
    expect(result.scoreDelta).toBe(8);
  });

  it("異なる値の2組同時マージ: 4 4 8 8 -> 8 16 0 0", () => {
    const result = move(boardFromRow([4, 4, 8, 8]), "left");
    expect(result.board.slice(0, 4)).toEqual([8, 16, 0, 0]);
    expect(result.scoreDelta).toBe(24);
  });

  it("No Double Merge: 2 2 4 0 -> 4 4 0 0 (8 0 0 0 にはならない)", () => {
    const result = move(boardFromRow([2, 2, 4, 0]), "left");
    expect(result.board.slice(0, 4)).toEqual([4, 4, 0, 0]);
    expect(result.board.slice(0, 4)).not.toEqual([8, 0, 0, 0]);
  });

  it("有効な移動がない場合 moved は false", () => {
    const result = move(boardFromRow([2, 4, 8, 16]), "left");
    expect(result.moved).toBe(false);
    expect(result.scoreDelta).toBe(0);
  });
});

describe("move の各方向", () => {
  it("RIGHT: 2 2 0 0 -> 0 0 0 4", () => {
    const result = move(boardFromRow([2, 2, 0, 0]), "right");
    expect(result.board.slice(0, 4)).toEqual([0, 0, 0, 4]);
  });

  it("UP: 列方向のマージ", () => {
    // 1列目 (index 0,4,8,12) に 2,2,0,0
    const board: Board = [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const result = move(board, "up");
    expect(result.board[0]).toBe(4);
    expect(result.board[4]).toBe(0);
    expect(result.board[8]).toBe(0);
    expect(result.board[12]).toBe(0);
  });

  it("DOWN: 列方向のマージ（下詰め）", () => {
    const board: Board = [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const result = move(board, "down");
    expect(result.board[12]).toBe(4);
    expect(result.board[0]).toBe(0);
    expect(result.board[4]).toBe(0);
    expect(result.board[8]).toBe(0);
  });
});

describe("isGameOver — SPEC.md #10.5", () => {
  it("チェッカーボードパターンは Game Over", () => {
    const board: Board = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 2,
    ];
    expect(isGameOver(board)).toBe(true);
  });

  it("空きマスがあれば Game Over ではない", () => {
    const board: Board = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 0,
    ];
    expect(isGameOver(board)).toBe(false);
  });

  it("空きマスがなくても隣接マージ可能なら Game Over ではない", () => {
    const board: Board = [
      2, 2, 4, 8,
      16, 32, 64, 128,
      256, 512, 1024, 2048,
      4, 8, 16, 32,
    ];
    expect(isGameOver(board)).toBe(false);
  });
});

describe("盤面サイズの可変対応 — issue #16, #17", () => {
  it("3x3 盤面で LEFT へのマージが正しく動く", () => {
    const board: Board = [2, 2, 0, 0, 0, 0, 0, 0, 0];
    const result = move(board, "left");
    expect(result.board).toEqual([4, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(result.moved).toBe(true);
  });

  it("5x5 盤面で UP への列マージが正しく動く", () => {
    // 1列目 (index 0,5,10,15,20) に 2,2,0,0,0
    const board = createEmptyBoard(5);
    board[0] = 2;
    board[5] = 2;
    const result = move(board, "up");
    expect(result.board[0]).toBe(4);
    expect(result.board[5]).toBe(0);
  });

  it("3x3 の空盤面はすべての方向が有効", () => {
    const board = createEmptyBoard(3);
    board[4] = 2; // 中央
    board[0] = 4;
    expect(getValidMoves(board).sort()).toEqual(["down", "left", "right", "up"]);
  });

  it("5x5 のチェッカーボードパターンは Game Over", () => {
    const board: Board = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        board.push((r + c) % 2 === 0 ? 2 : 4);
      }
    }
    expect(isGameOver(board)).toBe(true);
  });
});
