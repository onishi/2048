import { boardSizeOf, boardsEqual } from "./board";
import type { Board, Direction, MoveResult } from "./types";

function rowsFromBoard(board: Board): number[][] {
  const size = boardSizeOf(board);
  const rows: number[][] = [];
  for (let r = 0; r < size; r++) {
    rows.push(board.slice(r * size, r * size + size));
  }
  return rows;
}

function boardFromRows(rows: number[][]): Board {
  return rows.flat();
}

function transpose(rows: number[][]): number[][] {
  const size = rows.length;
  const result: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      result[c][r] = rows[r][c];
    }
  }
  return result;
}

/**
 * 1行を左方向へスライド・マージする (SPEC.md #10.2)。
 * 同ターン中に生成された結合後タイルは再結合しない (No Double Merge)。
 */
function mergeRowLeft(row: number[]): { row: number[]; scoreDelta: number } {
  const values = row.filter((value) => value !== 0);
  const merged: number[] = [];
  let scoreDelta = 0;
  let i = 0;
  while (i < values.length) {
    const current = values[i];
    const next = values[i + 1];
    if (next !== undefined && current === next) {
      const mergedValue = current * 2;
      merged.push(mergedValue);
      scoreDelta += mergedValue;
      i += 2;
    } else {
      merged.push(current);
      i += 1;
    }
  }
  while (merged.length < row.length) merged.push(0);
  return { row: merged, scoreDelta };
}

/**
 * 盤面を指定方向へ移動する (SPEC.md #10.1)。
 * 4方向すべてを個別実装せず、回転・反転によって「左への move」1種類に帰着させる。
 */
export function move(board: Board, direction: Direction): MoveResult {
  const rows = rowsFromBoard(board);

  let workingRows: number[][];
  const transposed = direction === "up" || direction === "down";
  const reversed = direction === "right" || direction === "down";

  workingRows = transposed ? transpose(rows) : rows;
  if (reversed) {
    workingRows = workingRows.map((row) => [...row].reverse());
  }

  let scoreDelta = 0;
  const mergedRows = workingRows.map((row) => {
    const result = mergeRowLeft(row);
    scoreDelta += result.scoreDelta;
    return result.row;
  });

  let resultRows = mergedRows;
  if (reversed) {
    resultRows = resultRows.map((row) => [...row].reverse());
  }
  if (transposed) {
    resultRows = transpose(resultRows);
  }

  const resultBoard = boardFromRows(resultRows);
  const moved = !boardsEqual(board, resultBoard);

  return { board: resultBoard, moved, scoreDelta };
}

/** 有効な（盤面が変化する）方向の一覧を返す (SPEC.md #10.1) */
export function getValidMoves(board: Board): Direction[] {
  const directions: Direction[] = ["up", "down", "left", "right"];
  return directions.filter((direction) => move(board, direction).moved);
}

/** 有効な手が1つも存在しない場合に true を返す (SPEC.md #10.1, #10.5) */
export function isGameOver(board: Board): boolean {
  return getValidMoves(board).length === 0;
}
