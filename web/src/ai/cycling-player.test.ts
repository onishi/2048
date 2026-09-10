import { describe, expect, it } from "vitest";
import type { Board } from "../game/types";
import { RotatePlayer, VerticalPlayer } from "./cycling-player";

const board: Board = [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

describe("CyclingPlayer", () => {
  it("Rotate は上・右・下・左を繰り返す", async () => {
    const player = new RotatePlayer();
    const directions = await Promise.all(Array.from({ length: 8 }, () => player.chooseMove(board)));
    expect(directions).toEqual(["up", "right", "down", "left", "up", "right", "down", "left"]);
  });

  it("Vertical は上・下を繰り返す", async () => {
    const player = new VerticalPlayer();
    const directions = await Promise.all(Array.from({ length: 6 }, () => player.chooseMove(board)));
    expect(directions).toEqual(["up", "down", "up", "down", "up", "down"]);
  });
});
