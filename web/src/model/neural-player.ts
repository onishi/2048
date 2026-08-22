// wasm 専用のエントリポイントを使う。既定の "onnxruntime-web" は WebGPU/JSEP
// バックエンドも含み、ビルド時に不要な巨大な wasm バリアントまで同梱されてしまう。
import * as ort from "onnxruntime-web/wasm";
import type { Player } from "../ai/player";
import { getValidMoves } from "../game/move";
import type { Board, Direction } from "../game/types";

// wasm バイナリは Vite のビルドが自動的に dist/assets/ へバンドルし、
// import.meta.url 経由で解決する (SPEC.md #17.6)。
// numThreads は 1 に固定し、SharedArrayBuffer / cross-origin isolation を不要にする。
ort.env.wasm.numThreads = 1;

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];
const DEFAULT_MODEL_URL = "/models/2048-ai.onnx";

/** タイル値を log2 へ変換する (SPEC.md #17.2)。空きマスは 0。 */
export function boardToInput(board: Board): Float32Array {
  return Float32Array.from(board, (value) => (value === 0 ? 0 : Math.log2(value)));
}

let defaultSessionPromise: Promise<ort.InferenceSession> | null = null;

function getDefaultSession(): Promise<ort.InferenceSession> {
  if (!defaultSessionPromise) {
    defaultSessionPromise = ort.InferenceSession.create(DEFAULT_MODEL_URL, {
      executionProviders: ["wasm"],
    });
  }
  return defaultSessionPromise;
}

/**
 * 探索を行わず、1回の推論だけで次の手を決める AI (SPEC.md #17.6)。
 * ブラウザ上で ONNX Runtime Web を使って推論する。
 */
export class NeuralPlayer implements Player {
  constructor(private readonly sessionPromise: Promise<ort.InferenceSession> = getDefaultSession()) {}

  async chooseMove(board: Board): Promise<Direction> {
    const validMoves = getValidMoves(board);
    if (validMoves.length === 0) {
      throw new Error("No valid moves available");
    }

    const session = await this.sessionPromise;
    const input = new ort.Tensor("float32", boardToInput(board), [1, board.length]);
    const results = await session.run({ board: input });
    const logits = results.action_logits.data as Float32Array;

    // 最もロジットが高い方向から順に、有効な手が見つかるまでフォールバックする
    const order = [...logits.keys()].sort((a, b) => logits[b] - logits[a]);
    for (const index of order) {
      const direction = DIRECTIONS[index];
      if (validMoves.includes(direction)) {
        return direction;
      }
    }
    return validMoves[0];
  }
}
