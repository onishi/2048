import { beforeEach, describe, expect, it } from "vitest";
import { clearHighScores, highScoreKey, loadHighScore, recordHighScore } from "./high-score";

const STORAGE_KEY = "2048-ai-high-scores";

describe("high-score", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("記録がない場合は 0 を返す", () => {
    expect(loadHighScore(4, 2)).toBe(0);
  });

  it("記録したスコアを読み込める", () => {
    expect(recordHighScore(4, 2, 1234)).toEqual({ highScore: 1234, isNewRecord: true });
    expect(loadHighScore(4, 2)).toBe(1234);
  });

  it("既存の記録より高いスコアだけが記録を更新する", () => {
    recordHighScore(4, 2, 1000);

    expect(recordHighScore(4, 2, 500)).toEqual({ highScore: 1000, isNewRecord: false });
    expect(loadHighScore(4, 2)).toBe(1000);

    expect(recordHighScore(4, 2, 2000)).toEqual({ highScore: 2000, isNewRecord: true });
    expect(loadHighScore(4, 2)).toBe(2000);
  });

  it("同点は記録の更新とみなさない", () => {
    recordHighScore(4, 2, 1000);
    expect(recordHighScore(4, 2, 1000)).toEqual({ highScore: 1000, isNewRecord: false });
  });

  it("盤面サイズ・開始タイルごとに別々のハイスコアを持つ", () => {
    recordHighScore(4, 2, 1000);
    recordHighScore(5, 2, 300);
    recordHighScore(4, 3, 50);

    expect(loadHighScore(4, 2)).toBe(1000);
    expect(loadHighScore(5, 2)).toBe(300);
    expect(loadHighScore(4, 3)).toBe(50);
    expect(loadHighScore(6, 2)).toBe(0);
  });

  it("他の設定の記録を消さずに保存する", () => {
    recordHighScore(4, 2, 1000);
    recordHighScore(5, 2, 300);
    recordHighScore(4, 2, 1500);

    expect(loadHighScore(5, 2)).toBe(300);
    expect(loadHighScore(4, 2)).toBe(1500);
  });

  it("clearHighScores ですべての記録を消す", () => {
    recordHighScore(4, 2, 1000);
    recordHighScore(5, 2, 300);

    clearHighScores();

    expect(loadHighScore(4, 2)).toBe(0);
    expect(loadHighScore(5, 2)).toBe(0);
  });

  it("壊れたJSONが保存されている場合は記録なしとして扱う", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadHighScore(4, 2)).toBe(0);
    expect(recordHighScore(4, 2, 10)).toEqual({ highScore: 10, isNewRecord: true });
  });

  it("不正な値のエントリは無視する", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ [highScoreKey(4, 2)]: "1000", [highScoreKey(5, 2)]: -1, [highScoreKey(6, 2)]: 42 }),
    );

    expect(loadHighScore(4, 2)).toBe(0);
    expect(loadHighScore(5, 2)).toBe(0);
    expect(loadHighScore(6, 2)).toBe(42);
  });

  it("配列が保存されている場合は記録なしとして扱う", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(loadHighScore(4, 2)).toBe(0);
  });

  it("有限でないスコアは記録しない", () => {
    expect(recordHighScore(4, 2, Number.POSITIVE_INFINITY)).toEqual({ highScore: 0, isNewRecord: false });
    expect(loadHighScore(4, 2)).toBe(0);
  });
});
