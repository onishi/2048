import { describe, expect, it } from "vitest";
import { createRng } from "../game/rng";
import { GreedyPlayer } from "./greedy-player";
import { RandomPlayer } from "./random-player";
import { runComparison } from "./comparison";
import { AI_VERSIONS } from "./ai-version";

describe("runComparison — SPEC.md #54, Phase 10", () => {
  it("指定したすべてのAIについて、ゲーム数分の結果とバージョンを返す", async () => {
    const entries = await runComparison({
      aiTypes: ["random", "greedy"],
      games: 3,
      createPlayer: (aiType) => (aiType === "random" ? new RandomPlayer(createRng(1)) : new GreedyPlayer()),
    });

    expect(entries).toHaveLength(2);
    expect(entries[0].aiType).toBe("random");
    expect(entries[0].version).toBe(AI_VERSIONS.random);
    expect(entries[0].summary.games).toBe(3);
    expect(entries[1].aiType).toBe("greedy");
    expect(entries[1].version).toBe(AI_VERSIONS.greedy);
    expect(entries[1].summary.games).toBe(3);
  });

  it("Greedy は Random より平均スコアが高い傾向になる", async () => {
    const entries = await runComparison({
      aiTypes: ["random", "greedy"],
      games: 10,
      createPlayer: (aiType) => (aiType === "random" ? new RandomPlayer(createRng(1)) : new GreedyPlayer()),
    });

    const [randomEntry, greedyEntry] = entries;
    expect(greedyEntry.summary.averageScore).toBeGreaterThan(randomEntry.summary.averageScore);
  });

  it("boardSize を指定すると指定サイズの盤面で実行される (issue #16, #17)", async () => {
    const entries = await runComparison({
      aiTypes: ["random"],
      games: 3,
      boardSize: 3,
      createPlayer: () => new RandomPlayer(createRng(1)),
    });

    expect(entries[0].summary.games).toBe(3);
  });

  it("startTile を指定すると 3 から始まる盤面で実行される (issue #20)", async () => {
    const entries = await runComparison({
      aiTypes: ["random"],
      games: 3,
      startTile: 3,
      createPlayer: () => new RandomPlayer(createRng(1)),
    });

    expect(entries[0].summary.games).toBe(3);
  });

  it("onProgress が各AI・各ゲームで呼ばれる", async () => {
    const calls: Array<[string, number, number]> = [];
    await runComparison({
      aiTypes: ["random"],
      games: 2,
      createPlayer: () => new RandomPlayer(createRng(1)),
      onProgress: (aiType, completed, total) => calls.push([aiType, completed, total]),
    });

    expect(calls).toEqual([
      ["random", 1, 2],
      ["random", 2, 2],
    ]);
  });
});
