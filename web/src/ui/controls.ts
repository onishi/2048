import type { Direction } from "../game/types";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const SWIPE_THRESHOLD_PX = 24;

/**
 * キーボード（矢印キー）とタッチ（スワイプ）操作を待ち受け、
 * Direction が確定するたびに onMove を呼び出す (SPEC.md #8.1)。
 * 返り値の関数を呼ぶとリスナーを解除する。
 */
export function attachControls(target: HTMLElement, onMove: (direction: Direction) => void): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    const direction = KEY_TO_DIRECTION[event.key];
    if (!direction) return;
    event.preventDefault();
    onMove(direction);
  };

  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) return;

    const direction: Direction =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    onMove(direction);
  };

  window.addEventListener("keydown", handleKeyDown);
  target.addEventListener("touchstart", handleTouchStart, { passive: true });
  target.addEventListener("touchend", handleTouchEnd, { passive: true });

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    target.removeEventListener("touchstart", handleTouchStart);
    target.removeEventListener("touchend", handleTouchEnd);
  };
}
