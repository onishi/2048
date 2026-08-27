/** ゲームの雰囲気を変えるテーマ (issue #18) */
export type Theme = "classic" | "scifi" | "nature";

export const THEMES: Theme[] = ["classic", "scifi", "nature"];

export const DEFAULT_THEME: Theme = "classic";

export const THEME_LABELS: Record<Theme, string> = {
  classic: "Classic",
  scifi: "Sci-Fi",
  nature: "Nature",
};

const STORAGE_KEY = "2048-ai-theme";

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as string[]).includes(value);
}

/** 保存済みのテーマ選択を読み込む。localStorage が使えない場合は既定値にフォールバックする */
export function loadStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // プライベートブラウジング等で localStorage が使えない場合は無視する
  }
  return DEFAULT_THEME;
}

/** テーマを `<html data-theme="...">` に反映し、選択を保存する */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 保存に失敗しても表示への影響はないため無視する
  }
}
