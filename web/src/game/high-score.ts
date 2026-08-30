/**
 * ハイスコアをブラウザに記録する。
 *
 * 盤面サイズ・開始タイル値によって到達しうるスコアの水準が大きく変わるため
 * (issue #16, #17, #20)、設定ごとに別々のハイスコアとして保持する。
 */
const STORAGE_KEY = "2048-ai-high-scores";

/** 設定ごとのハイスコアを表すキー。例: "4x4-2" */
export function highScoreKey(boardSize: number, startTile: number): string {
  return `${boardSize}x${boardSize}-${startTile}`;
}

type HighScores = Record<string, number>;

function isValidScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function loadAll(): HighScores {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const scores: HighScores = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isValidScore(value)) scores[key] = value;
    }
    return scores;
  } catch {
    // プライベートブラウジング等で localStorage が使えない、または壊れた JSON の場合は
    // 記録なしとして扱う (persistence.ts と同じ方針)
    return {};
  }
}

function saveAll(scores: HighScores): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // 保存に失敗してもゲーム自体には影響しないため無視する(ストレージ容量超過等)
  }
}

/** 指定した設定のハイスコアを読み込む。記録がなければ 0 を返す */
export function loadHighScore(boardSize: number, startTile: number): number {
  return loadAll()[highScoreKey(boardSize, startTile)] ?? 0;
}

/** ハイスコアの更新結果。`isNewRecord` は今回の記録で更新されたかどうか */
export interface HighScoreUpdate {
  highScore: number;
  isNewRecord: boolean;
}

/**
 * スコアをハイスコアとして記録する。既存の記録以下の場合は何も保存しない。
 * 戻り値は記録後のハイスコアと、今回更新されたかどうか。
 */
export function recordHighScore(boardSize: number, startTile: number, score: number): HighScoreUpdate {
  const key = highScoreKey(boardSize, startTile);
  const scores = loadAll();
  const current = scores[key] ?? 0;
  if (!isValidScore(score) || score <= current) {
    return { highScore: current, isNewRecord: false };
  }

  scores[key] = score;
  saveAll(scores);
  return { highScore: score, isNewRecord: true };
}

/** 記録済みのハイスコアをすべて消す */
export function clearHighScores(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 削除に失敗しても表示への影響はないため無視する
  }
}
