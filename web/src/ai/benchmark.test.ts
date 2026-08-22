import { describe, expect, it } from "vitest";
import { createRng } from "../game/rng";
import { RandomPlayer } from "./random-player";
import { runBenchmark } from "./benchmark";

describe("runBenchmark — SPEC.md #14.4", () => {
  it("指定したゲーム数だけ実行し、集計結果を返す", async () => {
    const summary = await runBenchmark({
      games: 5,
      createPlayer: () => new RandomPlayer(createRng(42)),
    });

    expect(summary.games).toBe(5);
    expect(summary.results).toHaveLength(5);
    expect(summary.averageScore).toBeGreaterThanOrEqual(0);
    expect(summary.bestScore).toBeGreaterThanOrEqual(0);
    expect(summary.averageMoves).toBeGreaterThan(0);
    expect(summary.elapsedMs).toBeGreaterThanOrEqual(0);

    // tileDistribution の合計はゲーム数と一致する
    const totalGamesInDistribution = Object.values(summary.tileDistribution).reduce((a, b) => a + b, 0);
    expect(totalGamesInDistribution).toBe(5);
  });

  it("ゲームごとに異なる seed を使うため結果が完全には一致しない", async () => {
    const summary = await runBenchmark({
      games: 5,
      createPlayer: () => new RandomPlayer(createRng(1)),
    });

    // 5ゲームすべてが全く同じ moveCount になる可能性は極めて低い
    const moveCounts = summary.results.map((r) => r.moveCount);
    const uniqueMoveCounts = new Set(moveCounts);
    expect(uniqueMoveCounts.size).toBeGreaterThan(1);
  });

  it("onProgress が各ゲーム完了時に呼ばれる", async () => {
    const progress: Array<[number, number]> = [];
    await runBenchmark({
      games: 3,
      createPlayer: () => new RandomPlayer(createRng(1)),
      onProgress: (completed, total) => progress.push([completed, total]),
    });

    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });
});
