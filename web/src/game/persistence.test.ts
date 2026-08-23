import { beforeEach, describe, expect, it } from "vitest";
import { loadGameState, saveGameState } from "./persistence";
import type { GameState } from "./types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    board: [2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    score: 12,
    moveCount: 3,
    gameOver: false,
    startTile: 2,
    ...overrides,
  };
}

describe("persistence — issue #24", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("保存されていない場合は null を返す", () => {
    expect(loadGameState()).toBeNull();
  });

  it("saveGameState で保存した内容を loadGameState で復元できる", () => {
    const state = makeState();
    saveGameState(state);
    expect(loadGameState()).toEqual(state);
  });

  it("Game Over 状態や開始タイル3のような値も正しく復元できる", () => {
    const state = makeState({ gameOver: true, startTile: 3, board: new Array(9).fill(0) });
    saveGameState(state);
    expect(loadGameState()).toEqual(state);
  });

  it("壊れたJSONが保存されている場合は null を返す", () => {
    localStorage.setItem("2048-ai-game-state", "{not valid json");
    expect(loadGameState()).toBeNull();
  });

  it("形の不正なデータ(boardが配列でない)は null を返す", () => {
    localStorage.setItem("2048-ai-game-state", JSON.stringify({ board: "nope", score: 0 }));
    expect(loadGameState()).toBeNull();
  });

  it("boardの長さが平方数でない場合は null を返す", () => {
    localStorage.setItem(
      "2048-ai-game-state",
      JSON.stringify({ board: [2, 4, 0], score: 0, moveCount: 0, gameOver: false, startTile: 2 }),
    );
    expect(loadGameState()).toBeNull();
  });

  it("必須フィールドが欠けている場合は null を返す", () => {
    localStorage.setItem("2048-ai-game-state", JSON.stringify({ board: [0, 0, 0, 0] }));
    expect(loadGameState()).toBeNull();
  });

  it("最新の saveGameState 呼び出しが以前の保存を上書きする", () => {
    saveGameState(makeState({ score: 10 }));
    saveGameState(makeState({ score: 999 }));
    expect(loadGameState()?.score).toBe(999);
  });
});
