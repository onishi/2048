import { ExpectimaxPlayer } from "../ai/expectimax-player";
import type { AIRequest, AIResponse } from "./protocol";

/**
 * Expectimax 探索を実行する Web Worker 本体 (SPEC.md #13)。
 * "webworker" lib は "DOM" lib と両立できないため、
 * self を必要な形だけの構造的な型にキャストして使う。
 */
interface WorkerContext {
  onmessage: ((event: MessageEvent<AIRequest>) => void) | null;
  postMessage(message: AIResponse): void;
}

const ctx = self as unknown as WorkerContext;

ctx.onmessage = (event) => {
  const request = event.data;
  if (request.type !== "choose-move") return;

  const player = new ExpectimaxPlayer(request.depth);
  const result = player.evaluateBoard(request.board);

  const response: AIResponse = {
    type: "move-result",
    id: request.id,
    direction: result.direction,
    evaluation: result.evaluation,
    nodes: result.stats.nodes,
    elapsedMs: result.stats.elapsedMs,
  };
  ctx.postMessage(response);
};
