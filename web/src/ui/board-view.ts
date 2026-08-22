import type { Board, GameState } from "../game/types";

const MAX_STYLED_TILE = 2048;

function tileClassName(value: number): string {
  if (value === 0) return "tile tile-empty";
  if (value > MAX_STYLED_TILE) return "tile tile-super";
  return `tile tile-${value}`;
}

export function renderBoard(container: HTMLElement, board: Board): void {
  container.innerHTML = "";
  for (const value of board) {
    const tile = document.createElement("div");
    tile.className = tileClassName(value);
    if (value !== 0) tile.textContent = String(value);
    container.appendChild(tile);
  }
}

export function renderScore(scoreEl: HTMLElement, maxTileEl: HTMLElement, state: GameState): void {
  scoreEl.textContent = String(state.score);
  maxTileEl.textContent = String(Math.max(0, ...state.board));
}

export function renderMessage(messageEl: HTMLElement, gameOver: boolean): void {
  messageEl.textContent = gameOver ? "Game Over" : "";
  messageEl.classList.toggle("visible", gameOver);
}
