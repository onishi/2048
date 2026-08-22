import type { Board, Direction } from "../game/types";
import type { AiWorkerClient, AiWorkerResult } from "../worker/ai-worker-client";
import { DEFAULT_DEPTH, resolveDepth, type DepthSetting } from "./expectimax-player";
import type { Player } from "./player";

/**
 * Expectimax を Web Worker 上で実行する Player 実装 (SPEC.md #13)。
 * AI 探索中もメインスレッド（UI）をブロックしない。
 * Worker 自体の生成・キャンセルは共有の AiWorkerClient が担う。
 */
export class WorkerExpectimaxPlayer implements Player {
  constructor(
    private readonly client: AiWorkerClient,
    private readonly depth: DepthSetting = DEFAULT_DEPTH,
  ) {}

  async chooseMove(board: Board): Promise<Direction> {
    const result = await this.evaluateBoard(board);
    return result.direction;
  }

  /** UI 側で Evaluation/Nodes/Time を表示する際に使う (SPEC.md #8.2) */
  evaluateBoard(board: Board): Promise<AiWorkerResult> {
    return this.client.evaluateBoard(board, resolveDepth(board, this.depth));
  }
}
