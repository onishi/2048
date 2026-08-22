import { applyMove, createInitialState, getMaxTile } from "../game/game";
import { createRng } from "../game/rng";
import type { Player } from "./player";

export interface BenchmarkGameResult {
  score: number;
  maxTile: number;
  moveCount: number;
}

export interface BenchmarkSummary {
  games: number;
  results: BenchmarkGameResult[];
  averageScore: number;
  bestScore: number;
  averageMoves: number;
  /** 最大タイルごとの到達ゲーム数 (SPEC.md #44 の到達率表示に相当) */
  tileDistribution: Record<number, number>;
  elapsedMs: number;
}

export interface RunBenchmarkOptions {
  games: number;
  createPlayer: () => Player;
  /** ゲームごとの乱数 seed の起点。games 回、seedBase, seedBase+1, ... と変える */
  seedBase?: number;
  onProgress?: (completed: number, total: number) => void;
  /** 何ゲームごとにイベントループへ制御を返すか(UI の応答性確保のため) */
  yieldEvery?: number;
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Web 版の簡易ベンチマーク (SPEC.md #14.4, #42)。
 * 複数ゲームを自動実行し、スコア・最大タイルの分布を集計する。
 * 大量実行はローカルの Python 研究環境(Phase 7)を推奨する。
 */
export async function runBenchmark(options: RunBenchmarkOptions): Promise<BenchmarkSummary> {
  const { games, createPlayer, seedBase = 1, onProgress, yieldEvery = 1 } = options;
  const results: BenchmarkGameResult[] = [];
  const startTime = performance.now();

  for (let i = 0; i < games; i++) {
    const rng = createRng(seedBase + i);
    const player = createPlayer();
    let state = createInitialState(rng);

    while (!state.gameOver) {
      const direction = await player.chooseMove(state.board);
      state = applyMove(state, direction, rng);
    }

    results.push({ score: state.score, maxTile: getMaxTile(state.board), moveCount: state.moveCount });
    onProgress?.(i + 1, games);

    if ((i + 1) % yieldEvery === 0) {
      await yieldToEventLoop();
    }
  }

  const elapsedMs = performance.now() - startTime;
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalMoves = results.reduce((sum, r) => sum + r.moveCount, 0);
  const bestScore = results.reduce((max, r) => Math.max(max, r.score), 0);

  const tileDistribution: Record<number, number> = {};
  for (const result of results) {
    tileDistribution[result.maxTile] = (tileDistribution[result.maxTile] ?? 0) + 1;
  }

  return {
    games,
    results,
    averageScore: games > 0 ? totalScore / games : 0,
    bestScore,
    averageMoves: games > 0 ? totalMoves / games : 0,
    tileDistribution,
    elapsedMs,
  };
}
