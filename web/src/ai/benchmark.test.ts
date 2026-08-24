import { describe, expect, it } from "vitest";
import { createRng } from "../game/rng";
import { GreedyPlayer } from "./greedy-player";
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

  it("boardSize を指定すると指定サイズの盤面でゲームを実行する (issue #16, #17)", async () => {
    const summary = await runBenchmark({
      games: 3,
      boardSize: 3,
      createPlayer: () => new RandomPlayer(createRng(1)),
    });

    expect(summary.games).toBe(3);
    expect(summary.results).toHaveLength(3);
    expect(Object.values(summary.tileDistribution).reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("startTile を指定すると 3 から始まるゲームを実行する (issue #20)", async () => {
    const summary = await runBenchmark({
      games: 3,
      startTile: 3,
      createPlayer: () => new RandomPlayer(createRng(1)),
    });

    expect(summary.games).toBe(3);
    // 3から始まるモードではタイル値は 3 の倍(3,6,12,...)にしかならない
    for (const tile of Object.keys(summary.tileDistribution).map(Number)) {
      expect(tile % 3).toBe(0);
    }
  });

  it("onMoveProgress が moveProgressEvery 手ごとにゲーム内の進捗を報告する (issue #34)", async () => {
    const calls: Array<[number, number]> = [];
    await runBenchmark({
      games: 2,
      moveProgressEvery: 5,
      createPlayer: () => new RandomPlayer(createRng(1)),
      onMoveProgress: (gameIndex, moveCount) => calls.push([gameIndex, moveCount]),
    });

    expect(calls.length).toBeGreaterThan(0);
    // gameIndex は 0 始まり、moveCount は moveProgressEvery の倍数ごとに報告される
    for (const [gameIndex, moveCount] of calls) {
      expect(gameIndex).toBeGreaterThanOrEqual(0);
      expect(gameIndex).toBeLessThan(2);
      expect(moveCount % 5).toBe(0);
    }
  });

  it("maxMoves に達したら Game Over でなくてもゲームを打ち切る (issue #17)", async () => {
    // 大きい盤面では強い AI が Game Over に至らないまま手数が伸び続けることがあるため、
    // 安全弁として動作することを確認する。
    const summary = await runBenchmark({
      games: 1,
      boardSize: 5,
      maxMoves: 10,
      createPlayer: () => new GreedyPlayer(),
    });

    expect(summary.results[0].moveCount).toBeLessThanOrEqual(10);
  });
});
