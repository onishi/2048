import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, loadStoredTheme, THEME_LABELS, THEMES } from "./theme";

describe("theme — issue #18", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("保存された選択がない場合は classic を返す", () => {
    expect(loadStoredTheme()).toBe("classic");
  });

  it("applyTheme が data-theme 属性と localStorage の両方を更新する", () => {
    applyTheme("scifi");
    expect(document.documentElement.dataset.theme).toBe("scifi");
    expect(localStorage.getItem("2048-ai-theme")).toBe("scifi");
  });

  it("次回 loadStoredTheme で保存した選択が復元される", () => {
    applyTheme("nature");
    expect(loadStoredTheme()).toBe("nature");
  });

  it("localStorage に不正な値が入っていても classic にフォールバックする", () => {
    localStorage.setItem("2048-ai-theme", "not-a-real-theme");
    expect(loadStoredTheme()).toBe("classic");
  });

  it("THEMES と THEME_LABELS が一致している", () => {
    for (const theme of THEMES) {
      expect(THEME_LABELS[theme]).toBeTruthy();
    }
  });
});
