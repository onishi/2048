import { getEmptyCells, serializeBoard } from "../game/board";
import { DEFAULT_START_TILE } from "../game/game";
import { getValidMovesWithResults } from "../game/move";
import type { Board, Direction } from "../game/types";
import { evaluate } from "./evaluator";
import type { Player } from "./player";
import { DEFAULT_WEIGHTS, type EvaluationWeights } from "./weights";

/** タイル生成確率 (SPEC.md #10.4)。開始タイル値: 90%、その2倍: 10% */
const TILE_BASE_PROBABILITY = 0.9;
const TILE_DOUBLE_PROBABILITY = 0.1;

/** SPEC.md #11.6: デフォルトの探索深度 */
export const DEFAULT_DEPTH = 4;
export const DYNAMIC_DEPTH = "dynamic" as const;
export type DepthSetting = number | typeof DYNAMIC_DEPTH;

/** SPEC.md #11.6: 終盤ほど深く読む Dynamic Depth テーブル。 */
export function getDynamicDepth(board: Board): number {
  const emptyCells = getEmptyCells(board).length;
  if (emptyCells >= 9) return 3;
  if (emptyCells >= 5) return 4;
  return 5;
}

export function resolveDepth(board: Board, setting: DepthSetting): number {
  return setting === DYNAMIC_DEPTH ? getDynamicDepth(board) : setting;
}

/**
 * SPEC.md #11.7: Chance Sampling。
 * 空きマスがこの数を超える場合、全マスを展開せず一部のみをサンプリングして評価する。
 * （空きマスが多い序盤ほど分岐数が爆発しやすく、キャッシュも効きにくいため実測で必須と判断した）
 */
const CHANCE_SAMPLE_THRESHOLD = 6;

type NodeType = "max" | "chance";

export interface ExpectimaxStats {
  nodes: number;
  cacheHits: number;
  elapsedMs: number;
}

export interface ExpectimaxResult {
  direction: Direction;
  evaluation: number;
  /** 各方向(有効な手のみ)の評価値。UI の Action Values 表示に使う (SPEC.md #14.2) */
  actionValues: Partial<Record<Direction, number>>;
  stats: ExpectimaxStats;
}

function placeTile(board: Board, index: number, value: number): Board {
  const next = board.slice();
  next[index] = value;
  return next;
}

/**
 * Expectimax AI (SPEC.md #11.5)。
 *
 * depth は CHANCE→MAX 遷移時のみ消費する（MAX→CHANCE では消費しない）。
 * これにより depth の値がそのまま「読むプレイヤー手数」と一致する
 * （SPEC.md #11.5 に記載の、元設計の depth 消費バグの修正版）。
 */
export class ExpectimaxPlayer implements Player {
  private cache = new Map<string, number>();
  private nodes = 0;
  private cacheHits = 0;

  constructor(
    private readonly depth: number = DEFAULT_DEPTH,
    private readonly weights: EvaluationWeights = DEFAULT_WEIGHTS,
    /** 3から始めるモード (issue #20) でも正しくシミュレートするための開始タイル値 */
    private readonly startTile: number = DEFAULT_START_TILE,
  ) {}

  async chooseMove(board: Board): Promise<Direction> {
    return this.evaluateBoard(board).direction;
  }

  /**
   * 各方向を評価し、最善手と探索統計を返す (SPEC.md #13.1 の AIResponse で使う値)。
   * chooseMove から呼ばれるほか、UI 側で Evaluation/Nodes/Time を表示する際にも使う。
   */
  evaluateBoard(board: Board): ExpectimaxResult {
    this.cache = new Map();
    this.nodes = 0;
    this.cacheHits = 0;
    const startTime = performance.now();

    const validMoves = getValidMovesWithResults(board);
    if (validMoves.length === 0) {
      throw new Error("No valid moves available");
    }

    let bestDirection = validMoves[0].direction;
    let bestScore = -Infinity;
    const actionValues: Partial<Record<Direction, number>> = {};
    for (const { direction, result } of validMoves) {
      // MAX ノード本体（ルート）: depth は消費せず CHANCE へ渡す
      const score = this.expectimax(result.board, this.depth, "chance");
      actionValues[direction] = score;
      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
      }
    }

    const elapsedMs = performance.now() - startTime;
    return {
      direction: bestDirection,
      evaluation: bestScore,
      actionValues,
      stats: { nodes: this.nodes, cacheHits: this.cacheHits, elapsedMs },
    };
  }

  private expectimax(board: Board, depth: number, nodeType: NodeType): number {
    const cacheKey = `${serializeBoard(board)}:${depth}:${nodeType}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      this.cacheHits += 1;
      return cached;
    }

    this.nodes += 1;
    const result = nodeType === "max" ? this.maxNode(board, depth) : this.chanceNode(board, depth);

    this.cache.set(cacheKey, result);
    return result;
  }

  private maxNode(board: Board, depth: number): number {
    if (depth === 0) {
      return evaluate(board, this.weights);
    }

    const validMoves = getValidMovesWithResults(board);
    if (validMoves.length === 0) {
      return evaluate(board, this.weights);
    }

    let best = -Infinity;
    for (const { result } of validMoves) {
      best = Math.max(best, this.expectimax(result.board, depth, "chance"));
    }
    return best;
  }

  private chanceNode(board: Board, depth: number): number {
    const emptyCells = getEmptyCells(board);
    if (emptyCells.length === 0) {
      return evaluate(board, this.weights);
    }

    const sampledCells = sampleCells(emptyCells);
    let expected = 0;
    for (const cell of sampledCells) {
      expected +=
        (TILE_BASE_PROBABILITY / sampledCells.length) *
        this.expectimax(placeTile(board, cell, this.startTile), depth - 1, "max");
      expected +=
        (TILE_DOUBLE_PROBABILITY / sampledCells.length) *
        this.expectimax(placeTile(board, cell, this.startTile * 2), depth - 1, "max");
    }
    return expected;
  }
}

/**
 * 空きマスが CHANCE_SAMPLE_THRESHOLD を超える場合、均等な間隔で一部だけを取り出す。
 * 乱数を使わず決定的に選ぶことで、同じ盤面に対しては常に同じ探索結果になるようにする。
 */
function sampleCells(emptyCells: number[]): number[] {
  if (emptyCells.length <= CHANCE_SAMPLE_THRESHOLD) return emptyCells;

  const stride = emptyCells.length / CHANCE_SAMPLE_THRESHOLD;
  const sampled: number[] = [];
  for (let i = 0; i < CHANCE_SAMPLE_THRESHOLD; i++) {
    sampled.push(emptyCells[Math.floor(i * stride)]);
  }
  return sampled;
}
