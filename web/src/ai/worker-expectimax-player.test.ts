import { describe, expect, it, vi } from "vitest";
import type { Board } from "../game/types";
import type { AiWorkerClient, AiWorkerResult } from "../worker/ai-worker-client";
import { DYNAMIC_DEPTH } from "./expectimax-player";
import { WorkerExpectimaxPlayer } from "./worker-expectimax-player";

function createClient() {
  const evaluateBoard = vi.fn(async (_board: Board, depth: number): Promise<AiWorkerResult> => ({
    direction: "left",
    evaluation: 1,
    actionValues: { left: 1 },
    depth,
    nodes: 1,
    cacheHits: 0,
    elapsedMs: 1,
  }));
  return {
    client: { evaluateBoard } as unknown as AiWorkerClient,
    evaluateBoard,
  };
}

describe("WorkerExpectimaxPlayer Dynamic Depth — SPEC.md #11.6", () => {
  it("盤面の空きマス数から解決した深度を Worker へ送る", async () => {
    const board = new Array(16).fill(2) as Board;
    board.fill(0, 0, 9);
    const { client, evaluateBoard } = createClient();
    const player = new WorkerExpectimaxPlayer(client, DYNAMIC_DEPTH);

    const result = await player.evaluateBoard(board);

    expect(evaluateBoard).toHaveBeenCalledWith(board, 3);
    expect(result.depth).toBe(3);
  });

  it("固定深度はそのまま Worker へ送る", async () => {
    const board = new Array(16).fill(0) as Board;
    const { client, evaluateBoard } = createClient();
    const player = new WorkerExpectimaxPlayer(client, 6);

    const result = await player.evaluateBoard(board);

    expect(evaluateBoard).toHaveBeenCalledWith(board, 6);
    expect(result.depth).toBe(6);
  });
});
