import { describe, expect, it } from "vitest";
import { getValidMoves } from "../game/move";
import type { Board } from "../game/types";
import { DYNAMIC_DEPTH, ExpectimaxPlayer, getDynamicDepth, resolveDepth } from "./expectimax-player";
import { DEFAULT_WEIGHTS } from "./weights";

describe("Dynamic Depth — SPEC.md #11.6", () => {
  it.each([
    { emptyCells: 9, expectedDepth: 3 },
    { emptyCells: 12, expectedDepth: 3 },
    { emptyCells: 5, expectedDepth: 4 },
    { emptyCells: 8, expectedDepth: 4 },
    { emptyCells: 0, expectedDepth: 5 },
    { emptyCells: 4, expectedDepth: 5 },
  ])("空きマス $emptyCells 個なら深度 $expectedDepth", ({ emptyCells, expectedDepth }) => {
    const board = new Array(16).fill(2) as Board;
    board.fill(0, 0, emptyCells);
    expect(getDynamicDepth(board)).toBe(expectedDepth);
  });

  it("固定深度を選んだ場合は盤面によらずその値を使う", () => {
    const board = new Array(16).fill(0) as Board;
    expect(resolveDepth(board, 6)).toBe(6);
    expect(resolveDepth(board, DYNAMIC_DEPTH)).toBe(3);
  });
});

describe("ExpectimaxPlayer — SPEC.md #11.5", () => {
  it("有効な手の中から選ぶ", async () => {
    const board: Board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const player = new ExpectimaxPlayer(3);
    const direction = await player.chooseMove(board);
    expect(getValidMoves(board)).toContain(direction);
  });

  it("有効な手がない場合はエラーを投げる", async () => {
    const board: Board = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 2,
    ];
    const player = new ExpectimaxPlayer(3);
    await expect(player.chooseMove(board)).rejects.toThrow();
  });

  it("同じ盤面・深度なら常に同じ結果になる（キャッシュとサンプリングの決定性）", () => {
    const board: Board = [
      8, 4, 2, 0,
      4, 2, 0, 0,
      2, 0, 0, 0,
      0, 0, 0, 0,
    ];
    const player = new ExpectimaxPlayer(3);
    const first = player.evaluateBoard(board);
    const second = player.evaluateBoard(board);
    expect(second.direction).toBe(first.direction);
    expect(second.evaluation).toBeCloseTo(first.evaluation, 8);
  });

  it("探索統計 (nodes, elapsedMs) を返す", () => {
    const board: Board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const player = new ExpectimaxPlayer(2);
    const result = player.evaluateBoard(board);
    expect(result.stats.nodes).toBeGreaterThan(0);
    expect(result.stats.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("キャッシュヒット数 (cacheHits) を返す — SPEC.md #14.2", () => {
    const board: Board = [
      8, 4, 2, 0,
      4, 2, 0, 0,
      2, 0, 0, 0,
      0, 0, 0, 0,
    ];
    const player = new ExpectimaxPlayer(4);
    const result = player.evaluateBoard(board);
    expect(result.stats.cacheHits).toBeGreaterThan(0);
    // ヒット数はキャッシュに登録されたノード数を超えない
    expect(result.stats.cacheHits).toBeLessThanOrEqual(result.stats.nodes);
  });

  it("有効な各方向の Action Values を返す — SPEC.md #14.2", () => {
    const board: Board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const player = new ExpectimaxPlayer(2);
    const result = player.evaluateBoard(board);
    const validMoves = getValidMoves(board);

    expect(Object.keys(result.actionValues).sort()).toEqual([...validMoves].sort());
    // 最善手として選ばれた方向の値が、その他のどの方向の値よりも大きいか等しい
    for (const direction of validMoves) {
      expect(result.actionValues[direction]).toBeLessThanOrEqual(result.evaluation);
    }
    expect(result.actionValues[result.direction]).toBe(result.evaluation);
  });

  it("明らかに良い手を選ぶ（マージして左上の角にタイルを寄せる）", async () => {
    // LEFT: [4,0,0,0] (角に4、空きマス+1) / RIGHT: [0,0,0,4] (同じくマージするが角の重みが低い)
    const board: Board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const player = new ExpectimaxPlayer(2);
    const direction = await player.chooseMove(board);
    expect(direction).toBe("left");
  });

  it("startTile を変えると Chance ノードのシミュレート内容が変わり evaluation も変わる — issue #20 のバグ修正 (以前は 2/4 固定でシミュレートしていた)", () => {
    const board: Board = [8, 4, 2, 0, 4, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0];
    const playerStart2 = new ExpectimaxPlayer(3, DEFAULT_WEIGHTS, 2);
    const playerStart3 = new ExpectimaxPlayer(3, DEFAULT_WEIGHTS, 3);

    const result2 = playerStart2.evaluateBoard(board);
    const result3 = playerStart3.evaluateBoard(board);

    // startTile が Chance ノードの placeTile() に反映されていれば、
    // 空きマスに置かれる値(2/4 と 3/6)が異なるため evaluation も一致しないはずである
    expect(result3.evaluation).not.toBeCloseTo(result2.evaluation, 5);
  });

  it("3から始めるモードの盤面でも有効な手の中から選ぶ (issue #20)", async () => {
    const board: Board = [3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const player = new ExpectimaxPlayer(2, DEFAULT_WEIGHTS, 3);
    const direction = await player.chooseMove(board);
    expect(getValidMoves(board)).toContain(direction);
  });

  it("空きマスが多い盤面でも Chance Sampling により現実的な時間で完了する", () => {
    const board: Board = [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4];
    const player = new ExpectimaxPlayer(4);
    const start = performance.now();
    const result = player.evaluateBoard(board);
    const elapsed = performance.now() - start;
    expect(getValidMoves(board)).toContain(result.direction);
    expect(elapsed).toBeLessThan(5000);
  });
});
