import { boardSizeOf } from "../game/board";
import { DEFAULT_START_TILE } from "../game/game";
import { lineIndices, move } from "../game/move";
import type { Board, Direction, GameState } from "../game/types";

const DEFAULT_MOVE_DURATION_MS = 140;

/**
 * タイルの配色は「開始タイル値から何回倍化したか(tier)」で決める (issue #20)。
 * 3から始めるモードでは 3, 6, 12, ... のように値そのものは2048モードと異なるが、
 * 同じ12段階の配色を使い回すことで見た目の一貫性を保つ。
 */
const TILE_TIER_CLASSES = [
  "tile-2",
  "tile-4",
  "tile-8",
  "tile-16",
  "tile-32",
  "tile-64",
  "tile-128",
  "tile-256",
  "tile-512",
  "tile-1024",
  "tile-2048",
];

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

function tileClassName(value: number, startTile: number): string {
  const tier = Math.round(Math.log2(value / startTile));
  if (tier < 0 || tier >= TILE_TIER_CLASSES.length) return "tile tile-super";
  return `tile ${TILE_TIER_CLASSES[tier]}`;
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

function createTile(value: number, index: number, size: number, startTile: number): HTMLDivElement {
  const tile = document.createElement("div");
  tile.className = tileClassName(value, startTile);
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

export function renderBoard(
  container: HTMLElement,
  board: Board,
  transition?: BoardAnimation,
  startTile: number = DEFAULT_START_TILE,
): void {
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
    const tile = createTile(value, index, size, startTile);
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
    const tile = createTile(motion.value, motion.fromIndex, size, startTile);
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

/** ハイスコアを表示する。今回のプレイで記録を更新した場合は強調表示する */
export function renderHighScore(bestScoreEl: HTMLElement, highScore: number, isNewRecord: boolean): void {
  bestScoreEl.textContent = String(highScore);
  bestScoreEl.classList.toggle("new-record", isNewRecord);
}

export function renderMessage(messageEl: HTMLElement, gameOver: boolean, isNewRecord = false): void {
  messageEl.textContent = gameOver ? (isNewRecord ? "Game Over — New Best!" : "Game Over") : "";
  messageEl.classList.toggle("visible", gameOver);
}
