import { afterEach, describe, expect, it, vi } from "vitest";
import { move } from "../game/move";
import type { Board, Direction } from "../game/types";
import { calculateTileMotions, renderBoard, renderHighScore, renderMessage } from "./board-view";

function boardFromRows(rows: number[][]): Board {
  return rows.flat();
}

function boardFromMotions(board: Board, direction: Direction): Board {
  const result = new Array<number>(16).fill(0);
  for (const motion of calculateTileMotions(board, direction).motions) {
    result[motion.toIndex] += motion.value;
  }
  return result;
}

describe("calculateTileMotions", () => {
  const board = boardFromRows([
    [2, 0, 2, 4],
    [4, 4, 8, 0],
    [2, 0, 2, 2],
    [0, 8, 0, 8],
  ]);

  it.each<Direction>(["left", "right", "up", "down"])("%s の移動結果と一致する", (direction) => {
    const plan = calculateTileMotions(board, direction);

    expect(boardFromMotions(board, direction)).toEqual(move(board, direction).board);
    expect(plan.motions).toHaveLength(board.filter((value) => value !== 0).length);
  });

  it("結合する2枚を同じ到達先へ移動する", () => {
    const source = boardFromRows([
      [2, 2, 2, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);

    const plan = calculateTileMotions(source, "left");

    expect(plan.motions).toEqual([
      { fromIndex: 0, toIndex: 0, value: 2 },
      { fromIndex: 1, toIndex: 0, value: 2 },
      { fromIndex: 2, toIndex: 1, value: 2 },
      { fromIndex: 3, toIndex: 1, value: 2 },
    ]);
    expect(plan.mergedIndices).toEqual([0, 1]);
  });

  it("右・下方向では盤面端を到達先にする", () => {
    const source = boardFromRows([
      [2, 0, 2, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 0],
      [2, 0, 0, 0],
    ]);

    expect(calculateTileMotions(source, "right").motions.slice(0, 2)).toEqual([
      { fromIndex: 2, toIndex: 3, value: 2 },
      { fromIndex: 0, toIndex: 3, value: 2 },
    ]);
    expect(calculateTileMotions(source, "down").motions.filter((motion) => motion.fromIndex % 4 === 0)).toEqual([
      { fromIndex: 12, toIndex: 12, value: 2 },
      { fromIndex: 8, toIndex: 12, value: 2 },
      { fromIndex: 0, toIndex: 8, value: 2 },
    ]);
  });
});

describe("renderBoard", () => {
  const originalAnimate = HTMLElement.prototype.animate;

  afterEach(() => {
    if (originalAnimate) {
      HTMLElement.prototype.animate = originalAnimate;
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "animate");
    }
  });

  it("背景16セルと値を持つタイルだけを重ねて描画する", () => {
    const container = document.createElement("div");
    const board = boardFromRows([
      [2, 0, 0, 0],
      [0, 0, 4, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);

    renderBoard(container, board);

    expect(container.querySelectorAll(".board-cell")).toHaveLength(16);
    expect(container.querySelectorAll(".tile")).toHaveLength(2);
    expect(container.querySelector(".tile-2")?.getAttribute("style")).toContain("grid-row-start: 1");
    expect(container.querySelector(".tile-4")?.getAttribute("style")).toContain("grid-column-start: 3");
  });

  it.each([3, 5])("%ix%i 盤面でも size*size セルを描画し data-size を設定する (issue #16, #17)", (size) => {
    const container = document.createElement("div");
    const board: Board = new Array(size * size).fill(0);
    board[0] = 2;
    board[size * size - 1] = 4;

    renderBoard(container, board);

    expect(container.dataset.size).toBe(String(size));
    expect(container.style.getPropertyValue("--board-size")).toBe(String(size));
    expect(container.querySelectorAll(".board-cell")).toHaveLength(size * size);
    expect(container.querySelector(".tile-4")?.getAttribute("style")).toContain(`grid-row-start: ${size}`);
    expect(container.querySelector(".tile-4")?.getAttribute("style")).toContain(`grid-column-start: ${size}`);
  });

  it("startTile を指定すると、その値からの倍化段数(tier)で配色クラスが決まる (issue #20)", () => {
    const container = document.createElement("div");
    // 3 から始めるモード: 3, 6, 12, 24 は 2 から始めた場合の 2, 4, 8, 16 と同じ配色階層になる
    const board: Board = [3, 6, 12, 24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    renderBoard(container, board, undefined, 3);

    expect(container.querySelector('.tile[style*="grid-column-start: 1"]')?.className).toContain("tile-2");
    expect(container.querySelector('.tile[style*="grid-column-start: 2"]')?.className).toContain("tile-4");
    expect(container.querySelector('.tile[style*="grid-column-start: 3"]')?.className).toContain("tile-8");
    expect(container.querySelector('.tile[style*="grid-column-start: 4"]')?.className).toContain("tile-16");
  });

  it("startTile を省略すると従来通り値そのものが配色クラスになる", () => {
    const container = document.createElement("div");
    const board: Board = [2, 4, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    renderBoard(container, board);

    expect(container.querySelectorAll(".tile-2")).toHaveLength(1);
    expect(container.querySelectorAll(".tile-4")).toHaveLength(1);
    expect(container.querySelectorAll(".tile-8")).toHaveLength(1);
  });

  it("移動タイルの完了後に結合タイルと新規タイルを表示する", async () => {
    const animate = vi.fn(() => ({
      cancel: vi.fn(),
      finished: Promise.resolve(),
    })) as unknown as typeof HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = animate;

    const container = document.createElement("div");
    const previousBoard = boardFromRows([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const finalBoard = boardFromRows([
      [4, 0, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);

    renderBoard(container, finalBoard, { previousBoard, direction: "left" });

    expect(container.querySelectorAll(".tile-moving")).toHaveLength(2);
    expect(container.querySelectorAll(".tile-hidden")).toHaveLength(2);
    expect(animate).toHaveBeenCalledTimes(2);

    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelectorAll(".tile-moving")).toHaveLength(0);
    expect(container.querySelectorAll(".tile-hidden")).toHaveLength(0);
    expect(container.querySelector(".tile-4")?.classList.contains("tile-merged")).toBe(true);
    expect(container.querySelector(".tile-2")?.classList.contains("tile-new")).toBe(true);
  });

  it("再描画時に進行中の移動アニメーションをキャンセルする", () => {
    const cancel = vi.fn();
    const animate = vi.fn(() => ({
      cancel,
      finished: new Promise(() => undefined),
    })) as unknown as typeof HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = animate;

    const container = document.createElement("div");
    const previousBoard = boardFromRows([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const movedBoard = boardFromRows([
      [0, 0, 0, 2],
      [0, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);

    renderBoard(container, movedBoard, { previousBoard, direction: "right" });
    renderBoard(container, previousBoard);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll(".tile-moving")).toHaveLength(0);
    expect(container.querySelectorAll(".tile-hidden")).toHaveLength(0);
  });
});

describe("renderHighScore", () => {
  it("ハイスコアを表示する", () => {
    const el = document.createElement("span");

    renderHighScore(el, 1234, false);

    expect(el.textContent).toBe("1234");
    expect(el.classList.contains("new-record")).toBe(false);
  });

  it("記録更新時は new-record クラスを付け、更新でなくなれば外す", () => {
    const el = document.createElement("span");

    renderHighScore(el, 1234, true);
    expect(el.classList.contains("new-record")).toBe(true);

    renderHighScore(el, 1234, false);
    expect(el.classList.contains("new-record")).toBe(false);
  });
});

describe("renderMessage", () => {
  it("ゲーム継続中は何も表示しない", () => {
    const el = document.createElement("div");

    renderMessage(el, false);

    expect(el.textContent).toBe("");
    expect(el.classList.contains("visible")).toBe(false);
  });

  it("Game Over を表示する", () => {
    const el = document.createElement("div");

    renderMessage(el, true);

    expect(el.textContent).toBe("Game Over");
    expect(el.classList.contains("visible")).toBe(true);
  });

  it("ハイスコアを更新して終わった場合はその旨も表示する", () => {
    const el = document.createElement("div");

    renderMessage(el, true, true);

    expect(el.textContent).toBe("Game Over — New Best!");
  });
});
