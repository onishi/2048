import { describe, expect, it } from "vitest";
import type { Board } from "../game/types";
import {
  cornerBonus,
  emptyScore,
  evaluate,
  mergePotentialScore,
  monotonicityScore,
  smoothnessPenalty,
  snakeScore,
} from "./evaluator";
import { DEFAULT_WEIGHTS } from "./weights";

describe("emptyScore — SPEC.md #12.2", () => {
  it("空きマス数を返す", () => {
    const board: Board = [2, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(emptyScore(board)).toBe(14);
  });
});

describe("cornerBonus — SPEC.md #12.3", () => {
  it("最大タイルが角にあればその値を返す", () => {
    const board: Board = [2048, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(cornerBonus(board)).toBe(2048);
  });

  it("最大タイルが角になければ0を返す", () => {
    const board: Board = [0, 2048, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(cornerBonus(board)).toBe(0);
  });

  it("盤面が空の場合は0を返す", () => {
    const board: Board = new Array(16).fill(0);
    expect(cornerBonus(board)).toBe(0);
  });
});

describe("monotonicityScore — SPEC.md #12.4", () => {
  it("完全に単調な盤面は0より大きいスコアを持つ", () => {
    const monotonic: Board = [
      2048, 1024, 512, 256,
      128, 64, 32, 16,
      8, 4, 2, 0,
      0, 0, 0, 0,
    ];
    expect(monotonicityScore(monotonic)).toBeGreaterThan(0);
  });

  it("単調な盤面はジグザグな盤面よりスコアが高い", () => {
    const monotonicRow: Board = [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const zigzagRow: Board = [2, 8, 2, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(monotonicityScore(monotonicRow)).toBeGreaterThan(monotonicityScore(zigzagRow));
  });
});

describe("smoothnessPenalty — SPEC.md #12.5", () => {
  it("滑らかな盤面はペナルティが小さい", () => {
    const smooth: Board = [128, 64, 32, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const rough: Board = [128, 2, 64, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(smoothnessPenalty(smooth)).toBeLessThan(smoothnessPenalty(rough));
  });
});

describe("mergePotentialScore — SPEC.md #12.6", () => {
  it("隣接する同値タイルの数を返す", () => {
    const board: Board = [4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(mergePotentialScore(board)).toBe(1);
  });

  it("隣接する同値タイルがなければ0", () => {
    const board: Board = [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(mergePotentialScore(board)).toBe(0);
  });
});

describe("snakeScore — SPEC.md #12.7", () => {
  it("SPEC.md の例の盤面は高いスコアを持つ", () => {
    const snake: Board = [
      2048, 1024, 512, 256,
      16, 32, 64, 128,
      8, 4, 2, 0,
      0, 0, 0, 0,
    ];
    const shuffled: Board = [
      256, 1024, 512, 2048,
      16, 32, 64, 128,
      8, 4, 2, 0,
      0, 0, 0, 0,
    ];
    expect(snakeScore(snake)).toBeGreaterThan(snakeScore(shuffled));
  });
});

describe("evaluate — SPEC.md #12.1 の符号規約", () => {
  it("smoothness のみ減算し、他の項は加算した重み付き和になる", () => {
    const board: Board = [
      2048, 1024, 512, 256,
      16, 32, 64, 128,
      8, 4, 2, 0,
      0, 0, 0, 0,
    ];

    const expected =
      DEFAULT_WEIGHTS.empty * emptyScore(board) +
      DEFAULT_WEIGHTS.monotonicity * monotonicityScore(board) -
      DEFAULT_WEIGHTS.smoothness * smoothnessPenalty(board) +
      DEFAULT_WEIGHTS.merge * mergePotentialScore(board) +
      DEFAULT_WEIGHTS.corner * cornerBonus(board) +
      DEFAULT_WEIGHTS.snake * snakeScore(board);

    expect(evaluate(board, DEFAULT_WEIGHTS)).toBe(expected);
  });
});
