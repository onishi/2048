import { BOARD_SIZE, getMaxTile } from "../game/board";
import type { Board } from "../game/types";
import { DEFAULT_WEIGHTS, type EvaluationWeights } from "./weights";

const CORNER_INDICES = [0, BOARD_SIZE - 1, BOARD_SIZE * (BOARD_SIZE - 1), BOARD_SIZE * BOARD_SIZE - 1] as const;

function log2OrZero(value: number): number {
  return value === 0 ? 0 : Math.log2(value);
}

function getRow(board: Board, r: number): number[] {
  return board.slice(r * BOARD_SIZE, r * BOARD_SIZE + BOARD_SIZE);
}

function getColumn(board: Board, c: number): number[] {
  const column: number[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    column.push(board[r * BOARD_SIZE + c]);
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
  return CORNER_INDICES.some((i) => board[i] === maxTile) ? maxTile : 0;
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
  let score = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    score += lineMonotonicityCredit(getRow(board, r));
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    score += lineMonotonicityCredit(getColumn(board, c));
  }
  return score;
}

/**
 * 隣接タイルの log2 差の絶対値の合計。値が大きいほど盤面が荒れている（悪い）ため、
 * evaluate() では減算するペナルティ項として扱う (SPEC.md #12.5, #12.1)。
 */
export function smoothnessPenalty(board: Board): number {
  let penalty = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const value = board[r * BOARD_SIZE + c];
      if (value === 0) continue;
      const logValue = Math.log2(value);

      if (c + 1 < BOARD_SIZE) {
        const right = board[r * BOARD_SIZE + c + 1];
        if (right !== 0) penalty += Math.abs(logValue - Math.log2(right));
      }
      if (r + 1 < BOARD_SIZE) {
        const down = board[(r + 1) * BOARD_SIZE + c];
        if (down !== 0) penalty += Math.abs(logValue - Math.log2(down));
      }
    }
  }
  return penalty;
}

/** 同じ数字が隣接している場合に加点する (SPEC.md #12.6) */
export function mergePotentialScore(board: Board): number {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const value = board[r * BOARD_SIZE + c];
      if (value === 0) continue;
      if (c + 1 < BOARD_SIZE && board[r * BOARD_SIZE + c + 1] === value) count += 1;
      if (r + 1 < BOARD_SIZE && board[(r + 1) * BOARD_SIZE + c] === value) count += 1;
    }
  }
  return count;
}

/**
 * 蛇状（boustrophedon）に高いタイルを維持する盤面を評価するための重み行列。
 * SPEC.md #12.7 の例（2048 1024 512 256 / 16 32 64 128 / 8 4 2 0 / 0 0 0 0）で
 * 最大の重みが割り当たるよう構成している。
 */
const SNAKE_WEIGHTS: readonly number[] = [
  15, 14, 13, 12,
  8, 9, 10, 11,
  7, 6, 5, 4,
  0, 1, 2, 3,
];

/** 蛇状配置を評価する (SPEC.md #12.7) */
export function snakeScore(board: Board): number {
  let score = 0;
  for (let i = 0; i < board.length; i++) {
    score += board[i] * SNAKE_WEIGHTS[i];
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
