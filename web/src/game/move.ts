import { boardSizeOf, boardsEqual } from "./board";
import type { Board, Direction, MoveResult } from "./types";

/**
 * 指定方向で1ラインを構成する盤面インデックスを、タイルが詰まっていく先頭から順に返す。
 * 例えば size=4, direction="left" なら各行を [0,1,2,3] のように先頭(左)から並べ、
 * direction="right" なら [3,2,1,0] のように末尾(右)から並べる。
 * 盤面サイズ・方向の組だけで決まり盤面の値には依存しないため、(size, direction) ごとにキャッシュする
 * (move() のホットパスで呼ばれるたびに再計算しないための最適化)。
 */
const lineIndicesCache = new Map<string, number[][]>();

export function lineIndices(direction: Direction, size: number): number[][] {
  const cacheKey = `${size}:${direction}`;
  const cached = lineIndicesCache.get(cacheKey);
  if (cached) return cached;

  const lines: number[][] = [];
  for (let outer = 0; outer < size; outer++) {
    const line: number[] = new Array(size);
    for (let inner = 0; inner < size; inner++) {
      const offset = direction === "right" || direction === "down" ? size - 1 - inner : inner;
      const index = direction === "left" || direction === "right" ? outer * size + offset : offset * size + outer;
      line[inner] = index;
    }
    lines.push(line);
  }

  lineIndicesCache.set(cacheKey, lines);
  return lines;
}

/**
 * 盤面を指定方向へ移動する (SPEC.md #10.1)。
 * 4方向すべてを個別実装せず、`lineIndices()` が返す「詰まっていく先頭から順のインデックス列」を
 * 使うことで、盤面の回転・転置による中間配列を作らずに直接結果盤面へ書き込む。
 * 同ターン内で生成された結合後タイルは再結合しない (No Double Merge)。
 */
export function move(board: Board, direction: Direction): MoveResult {
  const size = boardSizeOf(board);
  const resultBoard = board.slice();
  let scoreDelta = 0;

  for (const line of lineIndices(direction, size)) {
    let writePos = 0;
    let canMergeWithPrevious = false;

    for (const idx of line) {
      const value = board[idx];
      if (value === 0) continue;

      if (canMergeWithPrevious && resultBoard[line[writePos - 1]] === value) {
        const mergedValue = value * 2;
        resultBoard[line[writePos - 1]] = mergedValue;
        scoreDelta += mergedValue;
        canMergeWithPrevious = false; // 結合済みタイルは同ターン中に再結合しない
      } else {
        resultBoard[line[writePos]] = value;
        writePos += 1;
        canMergeWithPrevious = true;
      }
    }

    for (; writePos < line.length; writePos++) {
      resultBoard[line[writePos]] = 0;
    }
  }

  const moved = !boardsEqual(board, resultBoard);
  return { board: resultBoard, moved, scoreDelta };
}

const ALL_DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

/** 有効な（盤面が変化する）方向の一覧を返す (SPEC.md #10.1) */
export function getValidMoves(board: Board): Direction[] {
  return ALL_DIRECTIONS.filter((direction) => move(board, direction).moved);
}

export interface ValidMove {
  direction: Direction;
  result: MoveResult;
}

/**
 * 有効な手それぞれについて、direction と move() の結果を1回の計算でまとめて返す。
 * `getValidMoves(board)` で有効な方向を求めてから改めて `move(board, direction)` を呼び直すと
 * move() が二重に計算されるため、探索木の各ノードで手を展開する Expectimax のホットパス向けに用意した。
 */
export function getValidMovesWithResults(board: Board): ValidMove[] {
  const validMoves: ValidMove[] = [];
  for (const direction of ALL_DIRECTIONS) {
    const result = move(board, direction);
    if (result.moved) validMoves.push({ direction, result });
  }
  return validMoves;
}

/** 有効な手が1つも存在しない場合に true を返す (SPEC.md #10.1, #10.5) */
export function isGameOver(board: Board): boolean {
  return getValidMoves(board).length === 0;
}
