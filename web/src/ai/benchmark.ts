import { DEFAULT_BOARD_SIZE } from "../game/board";
import { applyMove, createInitialState, DEFAULT_START_TILE, getMaxTile } from "../game/game";
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
  /**
   * 実行中の1ゲーム内での進捗(手数)を報告する (issue #34)。
   * Expectimax は1ゲームが数分かかることもあり、onProgress だけではゲームが
   * 完了するまで画面が何十手も無反応に見えてしまうため、ゲーム内の途中経過を伝える。
   */
  onMoveProgress?: (gameIndex: number, moveCount: number) => void;
  /** 何ゲームごとにイベントループへ制御を返すか(UI の応答性確保のため) */
  yieldEvery?: number;
  /** 何手ごとに onMoveProgress を呼ぶか */
  moveProgressEvery?: number;
  /** 盤面サイズ。既定は 4x4 (issue #16, #17) */
  boardSize?: number;
  /** 開始タイル値。既定は 2 (issue #20) */
  startTile?: number;
  /**
   * 1ゲームあたりの最大手数。盤面が大きいほど空きマスに余裕が生まれ、
   * 強い AI(Greedy/Expectimax)は Game Over に至らないまま手数が際限なく伸び続けることがある
   * (issue #17 の5x5盤面で実測: Greedy が5000手時点でも score 111,048 のまま Game Over せず継続)。
   * ベンチマーク/比較が終わらなくなるのを防ぐための安全弁。
   */
  maxMoves?: number;
}

/** RunBenchmarkOptions.maxMoves の既定値。4x4 の典型的なゲーム(数百〜千手強)には十分な余裕を持たせている */
const DEFAULT_MAX_MOVES = 3000;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Web 版の簡易ベンチマーク (SPEC.md #14.4, #42)。
 * 複数ゲームを自動実行し、スコア・最大タイルの分布を集計する。
 * 大量実行はローカルの Python 研究環境(Phase 7)を推奨する。
 */
export async function runBenchmark(options: RunBenchmarkOptions): Promise<BenchmarkSummary> {
  const {
    games,
    createPlayer,
    seedBase = 1,
    onProgress,
    onMoveProgress,
    yieldEvery = 1,
    moveProgressEvery = 20,
    boardSize = DEFAULT_BOARD_SIZE,
    startTile = DEFAULT_START_TILE,
    maxMoves = DEFAULT_MAX_MOVES,
  } = options;
  const results: BenchmarkGameResult[] = [];
  const startTime = performance.now();

  for (let i = 0; i < games; i++) {
    const rng = createRng(seedBase + i);
    const player = createPlayer();
    let state = createInitialState(rng, boardSize, startTile);

    while (!state.gameOver && state.moveCount < maxMoves) {
      const direction = await player.chooseMove(state.board);
      state = applyMove(state, direction, rng);
      if (state.moveCount % moveProgressEvery === 0) {
        onMoveProgress?.(i, state.moveCount);
      }
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
