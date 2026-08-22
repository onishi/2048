import { describe, expect, it } from "vitest";
import type { Board } from "../game/types";
import { GreedyPlayer } from "./greedy-player";

describe("GreedyPlayer — SPEC.md #11.4", () => {
  it("マージにより空きマスが増え、角にタイルが揃う手を選ぶ", async () => {
    // LEFT: [4,0,0,0] (角に4、空きマス+1)
    // RIGHT: [0,0,0,4] (角に4、空きマス+1、snake重みはLEFTより低い)
    // DOWN: [2,2,0,0] を最終行へ移動するのみでマージなし
    const board: Board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const player = new GreedyPlayer();

    const direction = await player.chooseMove(board);
    expect(direction).toBe("left");
  });

  it("有効な手がない場合はエラーを投げる", async () => {
    const board: Board = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 2,
    ];
    const player = new GreedyPlayer();
    await expect(player.chooseMove(board)).rejects.toThrow();
  });
});
