import type { Board, Direction } from "../game/types";
import type { AIRequest, AIResponse } from "./protocol";

export interface AiWorkerResult {
  direction: Direction;
  evaluation: number;
  actionValues: Partial<Record<Direction, number>>;
  depth: number;
  nodes: number;
  cacheHits: number;
  elapsedMs: number;
}

let requestCounter = 0;

/**
 * Expectimax Worker との通信を管理する (SPEC.md #13)。
 * 1つの Worker を使い回し、各リクエストに ID を付与して、
 * 最新のリクエスト以外のレスポンスは破棄する（AI キャンセル, SPEC.md #13.2）。
 */
export class AiWorkerClient {
  private worker: Worker;
  private latestRequestId: string | null = null;
  private readonly pending = new Map<
    string,
    { resolve: (result: AiWorkerResult) => void; reject: (error: unknown) => void }
  >();

  constructor() {
    this.worker = this.spawnWorker();
  }

  private spawnWorker(): Worker {
    const worker = new Worker(new URL("./ai-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<AIResponse>) => this.handleMessage(event.data);
    worker.onerror = (event) => this.handleError(event);
    return worker;
  }

  private handleMessage(response: AIResponse): void {
    if (response.id !== this.latestRequestId) return; // 古いレスポンスは破棄する
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);
    pending.resolve({
      direction: response.direction,
      evaluation: response.evaluation,
      actionValues: response.actionValues,
      depth: response.depth,
      nodes: response.nodes,
      cacheHits: response.cacheHits,
      elapsedMs: response.elapsedMs,
    });
  }

  private handleError(event: ErrorEvent): void {
    if (!this.latestRequestId) return;
    const pending = this.pending.get(this.latestRequestId);
    if (pending) {
      pending.reject(event.error ?? new Error(event.message));
      this.pending.delete(this.latestRequestId);
    }
  }

  evaluateBoard(board: Board, depth: number, startTile: number): Promise<AiWorkerResult> {
    const id = `req-${++requestCounter}`;
    this.latestRequestId = id;

    const request: AIRequest = { type: "choose-move", id, board, depth, startTile };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(request);
    });
  }

  /**
   * Reset / Pause / New Game 時に、進行中の探索結果を無視するために呼ぶ (SPEC.md #13.2)。
   * Worker を terminate して再生成し、保留中のリクエストはすべて reject する。
   */
  cancel(): void {
    this.worker.terminate();
    for (const pending of this.pending.values()) {
      pending.reject(new Error("cancelled"));
    }
    this.pending.clear();
    this.latestRequestId = null;
    this.worker = this.spawnWorker();
  }

  terminate(): void {
    this.worker.terminate();
    this.pending.clear();
  }
}
