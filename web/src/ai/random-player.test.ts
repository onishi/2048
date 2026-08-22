import { describe, expect, it } from "vitest";
import { getValidMoves } from "../game/move";
import { createRng } from "../game/rng";
import type { Board } from "../game/types";
import { RandomPlayer } from "./random-player";

describe("RandomPlayer — SPEC.md #11.3", () => {
  it("常に有効な手の中から選ぶ", async () => {
    const board: Board = [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const player = new RandomPlayer(createRng(1));
    const validMoves = getValidMoves(board);

    for (let i = 0; i < 50; i++) {
      const direction = await player.chooseMove(board);
      expect(validMoves).toContain(direction);
    }
  });

  it("有効な手がない場合はエラーを投げる", async () => {
    const board: Board = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 2,
    ];
    const player = new RandomPlayer(createRng(1));
    await expect(player.chooseMove(board)).rejects.toThrow();
  });
});
