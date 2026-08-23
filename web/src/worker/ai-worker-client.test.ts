import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Board } from "../game/types";
import { AiWorkerClient } from "./ai-worker-client";
import type { AIRequest, AIResponse } from "./protocol";

/** 実際の Worker の代わりに使う、テスト用の最小限のダミー実装 */
class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent<AIResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: AIRequest[] = [];
  terminated = false;

  constructor(
    public url: string | URL,
    public options?: WorkerOptions,
  ) {
    FakeWorker.instances.push(this);
  }

  postMessage(message: AIRequest): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** テストからレスポンスの到着をシミュレートする */
  respond(response: AIResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<AIResponse>);
  }
}

const BOARD: Board = new Array(16).fill(0);

beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker as unknown as typeof Worker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AiWorkerClient — SPEC.md #13", () => {
  it("Worker にリクエストを送り、レスポンスを解決する", async () => {
    const client = new AiWorkerClient();
    const worker = FakeWorker.instances[0];

    const promise = client.evaluateBoard(BOARD, 3, 2);
    expect(worker.posted).toHaveLength(1);
    expect(worker.posted[0].type).toBe("choose-move");
    expect(worker.posted[0].depth).toBe(3);
    expect(worker.posted[0].startTile).toBe(2);

    worker.respond({
      type: "move-result",
      id: worker.posted[0].id,
      direction: "left",
      evaluation: 123,
      actionValues: {},
      depth: 3,
      nodes: 456,
      cacheHits: 0,
      elapsedMs: 12.3,
    });

    const result = await promise;
    expect(result.direction).toBe("left");
    expect(result.depth).toBe(3);
    expect(result.nodes).toBe(456);
  });

  it("最新のリクエスト以外のレスポンスは破棄する (SPEC.md #13.2)", async () => {
    const client = new AiWorkerClient();
    const worker = FakeWorker.instances[0];

    const firstPromise = client.evaluateBoard(BOARD, 3, 2);
    const firstId = worker.posted[0].id;
    const secondPromise = client.evaluateBoard(BOARD, 3, 2);
    const secondId = worker.posted[1].id;

    // 古いリクエスト(first)のレスポンスが後から届いても無視される
    worker.respond({
      type: "move-result",
      id: firstId,
      direction: "up",
      evaluation: 1,
      actionValues: {},
      depth: 3,
      nodes: 1,
      cacheHits: 0,
      elapsedMs: 1,
    });
    worker.respond({
      type: "move-result",
      id: secondId,
      direction: "right",
      evaluation: 2,
      actionValues: {},
      depth: 3,
      nodes: 2,
      cacheHits: 0,
      elapsedMs: 2,
    });

    const secondResult = await secondPromise;
    expect(secondResult.direction).toBe("right");

    // firstPromise は resolve も reject もされないまま残る
    const raceResult = await Promise.race([firstPromise.then(() => "resolved"), Promise.resolve("pending")]);
    expect(raceResult).toBe("pending");
  });

  it("cancel() すると Worker が terminate され、保留中のリクエストは reject される", async () => {
    const client = new AiWorkerClient();
    const worker = FakeWorker.instances[0];

    const promise = client.evaluateBoard(BOARD, 3, 2);
    client.cancel();

    await expect(promise).rejects.toThrow();
    expect(worker.terminated).toBe(true);
    expect(FakeWorker.instances).toHaveLength(2); // 再生成された新しい Worker
  });

  it("cancel() 後の新しい Worker でも正常にリクエストできる", async () => {
    const client = new AiWorkerClient();
    client.cancel();
    const newWorker = FakeWorker.instances[1];

    const promise = client.evaluateBoard(BOARD, 4, 2);
    expect(newWorker.posted).toHaveLength(1);

    newWorker.respond({
      type: "move-result",
      id: newWorker.posted[0].id,
      direction: "down",
      evaluation: 9,
      actionValues: {},
      depth: 4,
      nodes: 9,
      cacheHits: 0,
      elapsedMs: 9,
    });

    const result = await promise;
    expect(result.direction).toBe("down");
  });
});
