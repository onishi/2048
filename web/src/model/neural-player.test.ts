import * as ort from "onnxruntime-web";
import { describe, expect, it } from "vitest";
import type { Board } from "../game/types";
import { boardToInput, NeuralPlayer } from "./neural-player";

/** テスト用の最小限のダミー InferenceSession。固定のロジットを返す。 */
function fakeSession(logits: number[]): Promise<ort.InferenceSession> {
  const session = {
    run: async (feeds: Record<string, ort.Tensor>) => {
      expect(feeds.board).toBeDefined();
      return {
        action_logits: new ort.Tensor("float32", Float32Array.from(logits), [1, logits.length]),
      };
    },
  };
  return Promise.resolve(session as unknown as ort.InferenceSession);
}

describe("boardToInput — SPEC.md #17.2", () => {
  it("空きマスは0、それ以外はlog2に変換する", () => {
    const board: Board = [0, 2, 4, 8, 16, 2048, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const input = boardToInput(board);
    expect(Array.from(input.slice(0, 6))).toEqual([0, 1, 2, 3, 4, 11]);
  });
});

describe("NeuralPlayer — SPEC.md #17.6", () => {
  it("最もロジットが高い方向(有効な場合)を選ぶ", async () => {
    // DIRECTIONS = ["up", "down", "left", "right"]
    const board: Board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // left(index 2) のロジットを最大にする。left は有効な手。
    const player = new NeuralPlayer(fakeSession([0, 0, 10, 0]));
    const direction = await player.chooseMove(board);
    expect(direction).toBe("left");
  });

  it("最上位候補が無効な手の場合、有効な手にフォールバックする", async () => {
    // board = [2,4,0,0,...] は up と left が無効(既に左上に寄っておりマージもできない)
    const board: Board = [2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // up(index 0) のロジットを最大にするが、up は無効なのでフォールバックが必要
    const player = new NeuralPlayer(fakeSession([10, 1, 0.5, 2]));
    const direction = await player.chooseMove(board);
    expect(["down", "right"]).toContain(direction);
  });

  it("有効な手がない場合はエラーを投げる", async () => {
    const board: Board = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 2,
    ];
    const player = new NeuralPlayer(fakeSession([0, 0, 0, 0]));
    await expect(player.chooseMove(board)).rejects.toThrow();
  });
});
