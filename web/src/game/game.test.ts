import { describe, expect, it } from "vitest";
import { getEmptyCells } from "./board";
import { applyMove, createInitialState, spawnRandomTile } from "./game";
import { createRng } from "./rng";
import type { Board } from "./types";

describe("createInitialState", () => {
  it("盤面上にタイルがちょうど2つ配置される", () => {
    const state = createInitialState(createRng(1));
    const nonZero = state.board.filter((v) => v !== 0);
    expect(nonZero).toHaveLength(2);
    expect(state.score).toBe(0);
    expect(state.moveCount).toBe(0);
    expect(state.gameOver).toBe(false);
  });

  it.each([3, 4, 5])("盤面サイズ %i を指定すると size*size マスの盤面になる (issue #16, #17)", (size) => {
    const state = createInitialState(createRng(1), size);
    expect(state.board).toHaveLength(size * size);
    expect(state.board.filter((v) => v !== 0)).toHaveLength(2);
  });
});

describe("spawnRandomTile — SPEC.md #10.4", () => {
  it("ランダムタイル生成の比率はおよそ 2:90% / 4:10% になる", () => {
    const rng = createRng(7);
    let twoCount = 0;
    let fourCount = 0;
    const trials = 20000;

    for (let i = 0; i < trials; i++) {
      const board: Board = new Array(16).fill(2); // 1マスだけ空き
      board[0] = 0;
      const result = spawnRandomTile(board, rng);
      if (result[0] === 2) twoCount++;
      else if (result[0] === 4) fourCount++;
    }

    const ratio = twoCount / trials;
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(0.95);
    expect(twoCount + fourCount).toBe(trials);
  });

  it("空きマスがない場合は盤面をそのまま返す", () => {
    const board: Board = new Array(16).fill(2);
    const result = spawnRandomTile(board, createRng(1));
    expect(result).toEqual(board);
  });

  it("空きマスから一様ランダムに選ばれる", () => {
    const rng = createRng(99);
    const counts = new Map<number, number>();
    const trials = 20000;

    for (let i = 0; i < trials; i++) {
      const board: Board = new Array(16).fill(0);
      const result = spawnRandomTile(board, rng);
      const placedIndex = result.findIndex((v) => v !== 0);
      counts.set(placedIndex, (counts.get(placedIndex) ?? 0) + 1);
    }

    expect(counts.size).toBe(16);
    for (const count of counts.values()) {
      expect(count / trials).toBeGreaterThan(1 / 16 - 0.02);
      expect(count / trials).toBeLessThan(1 / 16 + 0.02);
    }
  });
});

describe("applyMove", () => {
  it("盤面が変化しない方向を指定した場合は state をそのまま返す", () => {
    const board: Board = [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const state = { board, score: 0, moveCount: 0, gameOver: false };
    const next = applyMove(state, "left", createRng(1));
    expect(next).toBe(state);
  });

  it("有効な手を適用すると moveCount と score が更新される", () => {
    const board: Board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const state = { board, score: 0, moveCount: 0, gameOver: false };
    const next = applyMove(state, "left", createRng(1));

    expect(next.moveCount).toBe(1);
    expect(next.score).toBe(4);
    expect(next.board[0]).toBe(4);
    // 新しいタイルが1つ追加されている
    expect(getEmptyCells(next.board)).toHaveLength(14);
  });

  it("gameOver 状態では手を適用しても state が変わらない", () => {
    const board: Board = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 2,
    ];
    const state = { board, score: 100, moveCount: 5, gameOver: true };
    const next = applyMove(state, "left", createRng(1));
    expect(next).toBe(state);
  });
});
