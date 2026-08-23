import { boardSizeOf, getMaxTile } from "../game/board";
import type { Board } from "../game/types";
import { DEFAULT_WEIGHTS, type EvaluationWeights } from "./weights";

function cornerIndices(size: number): readonly number[] {
  return [0, size - 1, size * (size - 1), size * size - 1];
}

function log2OrZero(value: number): number {
  return value === 0 ? 0 : Math.log2(value);
}

function getRow(board: Board, size: number, r: number): number[] {
  return board.slice(r * size, r * size + size);
}

function getColumn(board: Board, size: number, c: number): number[] {
  const column: number[] = [];
  for (let r = 0; r < size; r++) {
    column.push(board[r * size + c]);
  }
  return column;
}

/** 空きマス数。多いほど高評価 (SPEC.md #12.2) */
export function emptyScore(board: Board): number {
  let count = 0;
  for (const value of board) {
    if (value === 0) count += 1;
  }
  return count;
}

/** 最大タイルが角にある場合に、その値をボーナスとして返す (SPEC.md #12.3) */
export function cornerBonus(board: Board): number {
  const maxTile = getMaxTile(board);
  if (maxTile === 0) return 0;
  const size = boardSizeOf(board);
  return cornerIndices(size).some((i) => board[i] === maxTile) ? maxTile : 0;
}

/**
 * 1行/1列が厳密に単調（非減少 or 非増加）である場合にのみ、
 * その変化量（log2 差の合計）をクレジットとして返す。
 * 単調でない行/列は 0（ジグザグな並びに加点してしまうのを防ぐため）。
 */
function lineMonotonicityCredit(values: number[]): number {
  let increasing = 0;
  let decreasing = 0;
  for (let i = 0; i < values.length - 1; i++) {
    const a = log2OrZero(values[i]);
    const b = log2OrZero(values[i + 1]);
    if (b >= a) increasing += b - a;
    else decreasing += a - b;
  }
  if (decreasing === 0) return increasing;
  if (increasing === 0) return decreasing;
  return 0;
}

/** 大きいタイルから小さいタイルへ単調に並ぶ状態を評価する (SPEC.md #12.4) */
export function monotonicityScore(board: Board): number {
  const size = boardSizeOf(board);
  let score = 0;
  for (let r = 0; r < size; r++) {
    score += lineMonotonicityCredit(getRow(board, size, r));
  }
  for (let c = 0; c < size; c++) {
    score += lineMonotonicityCredit(getColumn(board, size, c));
  }
  return score;
}

/**
 * 隣接タイルの log2 差の絶対値の合計。値が大きいほど盤面が荒れている（悪い）ため、
 * evaluate() では減算するペナルティ項として扱う (SPEC.md #12.5, #12.1)。
 */
export function smoothnessPenalty(board: Board): number {
  const size = boardSizeOf(board);
  let penalty = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const value = board[r * size + c];
      if (value === 0) continue;
      const logValue = Math.log2(value);

      if (c + 1 < size) {
        const right = board[r * size + c + 1];
        if (right !== 0) penalty += Math.abs(logValue - Math.log2(right));
      }
      if (r + 1 < size) {
        const down = board[(r + 1) * size + c];
        if (down !== 0) penalty += Math.abs(logValue - Math.log2(down));
      }
    }
  }
  return penalty;
}

/** 同じ数字が隣接している場合に加点する (SPEC.md #12.6) */
export function mergePotentialScore(board: Board): number {
  const size = boardSizeOf(board);
  let count = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const value = board[r * size + c];
      if (value === 0) continue;
      if (c + 1 < size && board[r * size + c + 1] === value) count += 1;
      if (r + 1 < size && board[(r + 1) * size + c] === value) count += 1;
    }
  }
  return count;
}

/**
 * 蛇状（boustrophedon）に高いタイルを維持する盤面を評価するための重み行列を、
 * 任意の盤面サイズに対して生成する。1行目は左→右、2行目は右→左…と交互にたどる経路上で
 * 重みが単調に減っていくよう割り当てる(先頭マスが最大の重み `size*size - 1`)。
 * SPEC.md #12.7 の4x4の例（2048 1024 512 256 / 16 32 64 128 / 8 4 2 0 / 0 0 0 0）と一致する。
 */
function generateSnakeWeights(size: number): number[] {
  const weights = new Array<number>(size * size).fill(0);
  let value = size * size - 1;
  for (let r = 0; r < size; r++) {
    const leftToRight = r % 2 === 0;
    for (let i = 0; i < size; i++) {
      const c = leftToRight ? i : size - 1 - i;
      weights[r * size + c] = value;
      value -= 1;
    }
  }
  return weights;
}

const snakeWeightsCache = new Map<number, readonly number[]>();

function getSnakeWeights(size: number): readonly number[] {
  let weights = snakeWeightsCache.get(size);
  if (!weights) {
    weights = generateSnakeWeights(size);
    snakeWeightsCache.set(size, weights);
  }
  return weights;
}

/** 蛇状配置を評価する (SPEC.md #12.7) */
export function snakeScore(board: Board): number {
  const weights = getSnakeWeights(boardSizeOf(board));
  let score = 0;
  for (let i = 0; i < board.length; i++) {
    score += board[i] * weights[i];
  }
  return score;
}

/** evaluate() の内訳。AI 情報表示 (SPEC.md #14.2 の Evaluator Breakdown) で使う */
export interface EvaluationBreakdown {
  empty: number;
  monotonicity: number;
  smoothness: number;
  merge: number;
  corner: number;
  snake: number;
  total: number;
}

/**
 * 盤面を数値化し、各項目の重み付き寄与も内訳として返す (SPEC.md #12)。
 * Smoothness のみペナルティとして減算し、それ以外は加点として扱う (SPEC.md #12.1)。
 */
export function evaluateWithBreakdown(
  board: Board,
  weights: EvaluationWeights = DEFAULT_WEIGHTS,
): EvaluationBreakdown {
  const empty = weights.empty * emptyScore(board);
  const monotonicity = weights.monotonicity * monotonicityScore(board);
  const smoothness = -(weights.smoothness * smoothnessPenalty(board));
  const merge = weights.merge * mergePotentialScore(board);
  const corner = weights.corner * cornerBonus(board);
  const snake = weights.snake * snakeScore(board);

  return {
    empty,
    monotonicity,
    smoothness,
    merge,
    corner,
    snake,
    total: empty + monotonicity + smoothness + merge + corner + snake,
  };
}

/**
 * 盤面を数値化する (SPEC.md #12)。
 * Smoothness のみペナルティとして減算し、それ以外は加点として扱う (SPEC.md #12.1)。
 */
export function evaluate(board: Board, weights: EvaluationWeights = DEFAULT_WEIGHTS): number {
  return evaluateWithBreakdown(board, weights).total;
}
