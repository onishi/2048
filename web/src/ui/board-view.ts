import { boardSizeOf } from "../game/board";
import { move } from "../game/move";
import type { Board, Direction, GameState } from "../game/types";

const MAX_STYLED_TILE = 2048;
const DEFAULT_MOVE_DURATION_MS = 140;

export interface BoardAnimation {
  previousBoard: Board;
  direction: Direction;
  durationMs?: number;
}

export interface TileMotion {
  fromIndex: number;
  toIndex: number;
  value: number;
}

export interface TileMotionPlan {
  motions: TileMotion[];
  mergedIndices: number[];
}

interface ActiveBoardAnimation {
  animations: Animation[];
  cancel(): void;
}

const activeAnimations = new WeakMap<HTMLElement, ActiveBoardAnimation>();

function tileClassName(value: number): string {
  if (value > MAX_STYLED_TILE) return "tile tile-super";
  return `tile tile-${value}`;
}

function lineIndices(direction: Direction, size: number): number[][] {
  const lines: number[][] = [];

  for (let outer = 0; outer < size; outer++) {
    const line: number[] = [];
    for (let inner = 0; inner < size; inner++) {
      const offset = direction === "right" || direction === "down" ? size - 1 - inner : inner;
      const index = direction === "left" || direction === "right" ? outer * size + offset : offset * size + outer;
      line.push(index);
    }
    lines.push(line);
  }

  return lines;
}

/**
 * 移動前の各タイルがどのセルへ到達するかを返す。
 * 同値タイルが結合する場合は2枚とも同じ到達先を持つ。
 */
export function calculateTileMotions(board: Board, direction: Direction): TileMotionPlan {
  const motions: TileMotion[] = [];
  const mergedIndices: number[] = [];
  const size = boardSizeOf(board);

  for (const line of lineIndices(direction, size)) {
    const tiles = line.flatMap((index) => (board[index] === 0 ? [] : [{ index, value: board[index] }]));
    let sourceOffset = 0;
    let targetOffset = 0;

    while (sourceOffset < tiles.length) {
      const current = tiles[sourceOffset];
      const next = tiles[sourceOffset + 1];
      const toIndex = line[targetOffset];

      motions.push({ fromIndex: current.index, toIndex, value: current.value });
      if (next && next.value === current.value) {
        motions.push({ fromIndex: next.index, toIndex, value: next.value });
        mergedIndices.push(toIndex);
        sourceOffset += 2;
      } else {
        sourceOffset += 1;
      }
      targetOffset += 1;
    }
  }

  return { motions, mergedIndices };
}

function placeOnBoard(element: HTMLElement, index: number, size: number): void {
  element.style.gridRowStart = String(Math.floor(index / size) + 1);
  element.style.gridColumnStart = String((index % size) + 1);
}

function createTile(value: number, index: number, size: number): HTMLDivElement {
  const tile = document.createElement("div");
  tile.className = tileClassName(value);
  tile.textContent = String(value);
  placeOnBoard(tile, index, size);
  return tile;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function cancelActiveAnimation(container: HTMLElement): void {
  const active = activeAnimations.get(container);
  if (!active) return;
  activeAnimations.delete(container);
  active.cancel();
}

export function renderBoard(container: HTMLElement, board: Board, transition?: BoardAnimation): void {
  cancelActiveAnimation(container);
  container.innerHTML = "";

  const size = boardSizeOf(board);
  container.style.setProperty("--board-size", String(size));
  container.dataset.size = String(size);

  const cells: HTMLDivElement[] = [];
  for (let index = 0; index < size * size; index++) {
    const cell = document.createElement("div");
    cell.className = "board-cell";
    placeOnBoard(cell, index, size);
    cells.push(cell);
    container.appendChild(cell);
  }

  const finalTiles = new Map<number, HTMLDivElement>();
  for (const [index, value] of board.entries()) {
    if (value === 0) continue;
    const tile = createTile(value, index, size);
    finalTiles.set(index, tile);
    container.appendChild(tile);
  }

  if (!transition) return;

  const plan = calculateTileMotions(transition.previousBoard, transition.direction);
  const movedBoard = move(transition.previousBoard, transition.direction).board;
  const spawnedIndices = board.flatMap((value, index) => (movedBoard[index] === 0 && value !== 0 ? [index] : []));
  const revealFinalTiles = (animateOutcome: boolean) => {
    for (const [index, tile] of finalTiles) {
      tile.classList.remove("tile-hidden");
      if (!animateOutcome) continue;
      if (spawnedIndices.includes(index)) tile.classList.add("tile-new");
      if (plan.mergedIndices.includes(index)) tile.classList.add("tile-merged");
    }
  };

  const durationMs = transition.durationMs ?? DEFAULT_MOVE_DURATION_MS;
  const canAnimate = durationMs > 0 && !prefersReducedMotion() && typeof HTMLElement.prototype.animate === "function";
  if (!canAnimate) {
    revealFinalTiles(false);
    return;
  }

  for (const tile of finalTiles.values()) tile.classList.add("tile-hidden");

  const movingTiles = plan.motions.map((motion) => {
    const tile = createTile(motion.value, motion.fromIndex, size);
    tile.classList.add("tile-moving");
    tile.setAttribute("aria-hidden", "true");
    container.appendChild(tile);
    return { motion, tile };
  });

  const animations: Animation[] = [];
  const controller: ActiveBoardAnimation = {
    animations,
    cancel() {
      for (const animation of animations) animation.cancel();
    },
  };
  activeAnimations.set(container, controller);

  for (const { motion, tile } of movingTiles) {
    const fromRect = cells[motion.fromIndex].getBoundingClientRect();
    const toRect = cells[motion.toIndex].getBoundingClientRect();
    animations.push(
      tile.animate(
        [
          { transform: "translate3d(0, 0, 0)" },
          { transform: `translate3d(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px, 0)` },
        ],
        {
          duration: durationMs,
          easing: "cubic-bezier(0.22, 0.8, 0.32, 1)",
          fill: "forwards",
        },
      ),
    );
  }

  const finish = () => {
    if (activeAnimations.get(container) !== controller) return;
    activeAnimations.delete(container);
    for (const { tile } of movingTiles) tile.remove();
    revealFinalTiles(true);
  };

  Promise.allSettled(animations.map((animation) => animation.finished)).then(finish);
}

export function renderScore(scoreEl: HTMLElement, maxTileEl: HTMLElement, state: GameState): void {
  scoreEl.textContent = String(state.score);
  maxTileEl.textContent = String(Math.max(0, ...state.board));
}

export function renderMessage(messageEl: HTMLElement, gameOver: boolean): void {
  messageEl.textContent = gameOver ? "Game Over" : "";
  messageEl.classList.toggle("visible", gameOver);
}
