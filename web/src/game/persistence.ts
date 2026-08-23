import type { GameState } from "./types";

/** issue #24: ブラウザリロードしてもゲームの場面を保持する */
const STORAGE_KEY = "2048-ai-game-state";

function isValidGameState(value: unknown): value is GameState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  if (!Array.isArray(v.board) || v.board.length === 0) return false;
  if (!v.board.every((cell) => typeof cell === "number" && Number.isFinite(cell) && cell >= 0)) return false;
  if (!Number.isInteger(Math.sqrt(v.board.length))) return false;

  if (typeof v.score !== "number" || !Number.isFinite(v.score) || v.score < 0) return false;
  if (typeof v.moveCount !== "number" || !Number.isFinite(v.moveCount) || v.moveCount < 0) return false;
  if (typeof v.gameOver !== "boolean") return false;
  if (typeof v.startTile !== "number" || !(v.startTile > 0)) return false;

  return true;
}

/** 保存された場面を読み込む。未保存/不正な内容/localStorage 利用不可のときは null を返す */
export function loadGameState(): GameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isValidGameState(parsed) ? parsed : null;
  } catch {
    // プライベートブラウジング等で localStorage が使えない、または壊れた JSON の場合は無視する
    return null;
  }
}

/** 手を指定するたびに場面を保存する */
export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存に失敗してもゲーム自体には影響しないため無視する(ストレージ容量超過等)
  }
}
