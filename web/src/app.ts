import { runBenchmark } from "./ai/benchmark";
import { runComparison } from "./ai/comparison";
import { evaluateWithBreakdown } from "./ai/evaluator";
import { AI_TYPES, type AiType } from "./ai/player-types";
import { DEFAULT_DEPTH, DYNAMIC_DEPTH, type DepthSetting } from "./ai/expectimax-player";
import { GreedyPlayer } from "./ai/greedy-player";
import type { Player } from "./ai/player";
import { RandomPlayer } from "./ai/random-player";
import { WorkerExpectimaxPlayer } from "./ai/worker-expectimax-player";
import { DEFAULT_WEIGHTS } from "./ai/weights";
import { DEFAULT_BOARD_SIZE, MAX_BOARD_SIZE, MIN_BOARD_SIZE } from "./game/board";
import { applyMove, createInitialState, DEFAULT_START_TILE } from "./game/game";
import { move } from "./game/move";
import { createRandomRng } from "./game/rng";
import type { Board, Direction, GameState } from "./game/types";
import { NeuralPlayer } from "./model/neural-player";
import { renderBoard, renderMessage, renderScore, type BoardAnimation } from "./ui/board-view";
import { attachControls } from "./ui/controls";
import { renderAiStats, renderBenchmarkResults, renderComparisonResults, type AiStatsData } from "./ui/stats";
import { applyTheme, loadStoredTheme, THEMES, THEME_LABELS, type Theme } from "./ui/theme";
import { AiWorkerClient } from "./worker/ai-worker-client";

const MAX_BENCHMARK_GAMES = 200;
const MOVE_ANIMATION_DURATION_MS = 140;
const FAST_MOVE_ANIMATION_DURATION_MS = 80;

type AutoPlaySpeed = "slow" | "normal" | "fast" | "maximum";

const DEPTH_OPTIONS = [DYNAMIC_DEPTH, 2, 3, 4, 5, 6] as const;

/** 盤面サイズの選択肢 (issue #16, #17) */
const BOARD_SIZE_OPTIONS: number[] = Array.from(
  { length: MAX_BOARD_SIZE - MIN_BOARD_SIZE + 1 },
  (_, i) => MIN_BOARD_SIZE + i,
);

/** 開始タイル値の選択肢 (issue #20) */
const START_TILE_OPTIONS = [
  { value: DEFAULT_START_TILE, label: "2 (Classic)" },
  { value: 3, label: "3" },
];

/** SPEC.md #14.3: Auto Play 速度。値は手と手の間隔(ms) */
const AUTO_PLAY_INTERVALS_MS: Record<AutoPlaySpeed, number> = {
  slow: 800,
  normal: 300,
  fast: 100,
  maximum: 0,
};

const TEMPLATE = `
  <div class="game">
    <header class="game-header">
      <h1>2048 AI</h1>
      <div class="header-right">
        <select id="theme-select" class="theme-select" aria-label="Theme">
          ${THEMES.map((theme) => `<option value="${theme}">${THEME_LABELS[theme]}</option>`).join("")}
        </select>
        <div class="scores">
          <div class="score-box">
            <span class="label">Score</span>
            <span class="value" id="score">0</span>
          </div>
          <div class="score-box">
            <span class="label">Max Tile</span>
            <span class="value" id="max-tile">0</span>
          </div>
        </div>
      </div>
    </header>
    <div class="board-wrapper">
      <div class="board" id="board"></div>
      <div class="message" id="message"></div>
    </div>
    <div class="ai-bar">
      <label class="ai-select-label">
        Size:
        <select id="board-size-select">
          ${BOARD_SIZE_OPTIONS.map(
            (size) =>
              `<option value="${size}"${size === DEFAULT_BOARD_SIZE ? " selected" : ""}>${size}×${size}</option>`,
          ).join("")}
        </select>
      </label>
      <label class="ai-select-label">
        Start:
        <select id="start-tile-select">
          ${START_TILE_OPTIONS.map(
            ({ value, label }) =>
              `<option value="${value}"${value === DEFAULT_START_TILE ? " selected" : ""}>${label}</option>`,
          ).join("")}
        </select>
      </label>
      <label class="ai-select-label">
        AI:
        <select id="ai-select">
          <option value="random">Random</option>
          <option value="greedy" selected>Greedy</option>
          <option value="expectimax">Expectimax</option>
          <option value="neural">Neural</option>
        </select>
      </label>
      <label class="ai-select-label">
        Depth:
        <select id="depth-select">
          ${DEPTH_OPTIONS.map(
            (depth) =>
              `<option value="${depth}"${depth === DEFAULT_DEPTH ? " selected" : ""}>${depth === DYNAMIC_DEPTH ? "Auto (3–5)" : depth}</option>`,
          ).join("")}
        </select>
      </label>
      <label class="ai-select-label">
        Speed:
        <select id="speed-select">
          <option value="slow">Slow</option>
          <option value="normal" selected>Normal</option>
          <option value="fast">Fast</option>
          <option value="maximum">Maximum</option>
        </select>
      </label>
    </div>
    <div class="action-bar">
      <button id="ai-move-button" type="button">AI Move</button>
      <button id="auto-play-button" type="button">Start AI</button>
      <button id="reset-button" class="secondary" type="button">Reset</button>
    </div>
    <p class="ai-suggestion" id="ai-suggestion"></p>
    <div class="ai-stats" id="ai-stats"></div>
    <details class="advanced">
      <summary>Benchmark / Compare AIs</summary>
      <div class="benchmark-bar">
        <label class="ai-select-label">
          Games:
          <input id="benchmark-games" type="number" min="1" max="${MAX_BENCHMARK_GAMES}" value="10" />
        </label>
        <button id="benchmark-button" type="button">Run Benchmark</button>
        <button id="comparison-button" type="button">Compare All AIs</button>
      </div>
      <pre class="benchmark-results" id="benchmark-results"></pre>
      <div class="comparison-results" id="comparison-results"></div>
    </details>
  </div>
`;

export class App {
  private state: GameState;
  private readonly rng = createRandomRng();
  private readonly boardEl: HTMLElement;
  private readonly scoreEl: HTMLElement;
  private readonly maxTileEl: HTMLElement;
  private readonly messageEl: HTMLElement;
  private readonly themeSelectEl: HTMLSelectElement;
  private readonly boardSizeSelectEl: HTMLSelectElement;
  private readonly startTileSelectEl: HTMLSelectElement;
  private readonly aiSelectEl: HTMLSelectElement;
  private readonly depthSelectEl: HTMLSelectElement;
  private readonly speedSelectEl: HTMLSelectElement;
  private readonly aiSuggestionEl: HTMLElement;
  private readonly aiStatsEl: HTMLElement;
  private readonly autoPlayButtonEl: HTMLButtonElement;
  private readonly benchmarkGamesEl: HTMLInputElement;
  private readonly benchmarkButtonEl: HTMLButtonElement;
  private readonly benchmarkResultsEl: HTMLElement;
  private readonly comparisonButtonEl: HTMLButtonElement;
  private readonly comparisonResultsEl: HTMLElement;

  private boardSize: number = DEFAULT_BOARD_SIZE;
  private startTile: number = DEFAULT_START_TILE;
  private aiType: AiType = "greedy";
  private depth: DepthSetting = DEFAULT_DEPTH;
  private autoPlaySpeed: AutoPlaySpeed = "normal";
  private autoPlayRunning = false;
  private autoPlayTimer: ReturnType<typeof setTimeout> | null = null;
  private benchmarkRunning = false;
  private comparisonRunning = false;
  /** Expectimax 用の Worker クライアント。使われるまで生成しない (SPEC.md #13) */
  private aiWorkerClient: AiWorkerClient | null = null;

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = TEMPLATE;

    this.boardEl = this.query("#board");
    this.scoreEl = this.query("#score");
    this.maxTileEl = this.query("#max-tile");
    this.messageEl = this.query("#message");
    this.themeSelectEl = this.query<HTMLSelectElement>("#theme-select");
    this.boardSizeSelectEl = this.query<HTMLSelectElement>("#board-size-select");
    this.startTileSelectEl = this.query<HTMLSelectElement>("#start-tile-select");
    this.aiSelectEl = this.query<HTMLSelectElement>("#ai-select");
    this.depthSelectEl = this.query<HTMLSelectElement>("#depth-select");
    this.speedSelectEl = this.query<HTMLSelectElement>("#speed-select");
    this.aiSuggestionEl = this.query("#ai-suggestion");
    this.aiStatsEl = this.query("#ai-stats");
    this.autoPlayButtonEl = this.query<HTMLButtonElement>("#auto-play-button");
    this.benchmarkGamesEl = this.query<HTMLInputElement>("#benchmark-games");
    this.benchmarkButtonEl = this.query<HTMLButtonElement>("#benchmark-button");
    this.benchmarkResultsEl = this.query("#benchmark-results");
    this.comparisonButtonEl = this.query<HTMLButtonElement>("#comparison-button");
    this.comparisonResultsEl = this.query("#comparison-results");

    const initialTheme = loadStoredTheme();
    applyTheme(initialTheme);
    this.themeSelectEl.value = initialTheme;

    this.state = createInitialState(this.rng, this.boardSize, this.startTile);
    this.render();

    attachControls(this.boardEl, (direction) => this.handleMove(direction));
    this.themeSelectEl.addEventListener("change", () => {
      applyTheme(this.themeSelectEl.value as Theme);
    });
    this.boardSizeSelectEl.addEventListener("change", () => {
      this.boardSize = Number(this.boardSizeSelectEl.value);
      this.updateNeuralAvailability();
      this.reset();
    });
    this.startTileSelectEl.addEventListener("change", () => {
      this.startTile = Number(this.startTileSelectEl.value);
      this.updateNeuralAvailability();
      this.reset();
    });
    this.query<HTMLButtonElement>("#reset-button").addEventListener("click", () => this.reset());
    this.query<HTMLButtonElement>("#ai-move-button").addEventListener("click", () => this.handleAiMove());
    this.autoPlayButtonEl.addEventListener("click", () => this.toggleAutoPlay());
    this.aiSelectEl.addEventListener("change", () => {
      this.aiType = this.aiSelectEl.value as AiType;
      this.clearAiStats();
    });
    this.depthSelectEl.addEventListener("change", () => {
      this.depth =
        this.depthSelectEl.value === DYNAMIC_DEPTH ? DYNAMIC_DEPTH : Number(this.depthSelectEl.value);
      this.clearAiStats();
    });
    this.speedSelectEl.addEventListener("change", () => {
      this.autoPlaySpeed = this.speedSelectEl.value as AutoPlaySpeed;
    });
    this.benchmarkButtonEl.addEventListener("click", () => this.runBenchmarkFromUi());
    this.comparisonButtonEl.addEventListener("click", () => this.runComparisonFromUi());
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`要素が見つかりません: ${selector}`);
    return element;
  }

  private getAiWorkerClient(): AiWorkerClient {
    if (!this.aiWorkerClient) {
      this.aiWorkerClient = new AiWorkerClient();
    }
    return this.aiWorkerClient;
  }

  private createPlayer(): Player {
    switch (this.aiType) {
      case "random":
        return new RandomPlayer(this.rng);
      case "expectimax":
        return new WorkerExpectimaxPlayer(this.getAiWorkerClient(), this.depth);
      case "neural":
        return new NeuralPlayer();
      case "greedy":
        return new GreedyPlayer();
    }
  }

  private clearAiStats(): void {
    renderAiStats(this.aiStatsEl, null);
  }

  /**
   * Neural AI は「4x4・2から始まる」盤面専用に学習されたモデルしか持たないため (SPEC.md #17.3)、
   * それ以外の設定では選択肢を無効化し、選択中なら Greedy に切り替える (issue #16, #17, #20)。
   */
  private isNeuralCompatible(): boolean {
    return this.boardSize === DEFAULT_BOARD_SIZE && this.startTile === DEFAULT_START_TILE;
  }

  private updateNeuralAvailability(): void {
    const neuralOption = this.aiSelectEl.querySelector<HTMLOptionElement>('option[value="neural"]');
    if (!neuralOption) return;

    const neuralAvailable = this.isNeuralCompatible();
    neuralOption.disabled = !neuralAvailable;
    if (!neuralAvailable && this.aiType === "neural") {
      this.aiType = "greedy";
      this.aiSelectEl.value = "greedy";
    }
  }

  /** Compare All AIs で使う AI 一覧。Neural は盤面サイズ4・開始タイル2のときのみ含める */
  private availableAiTypes(): AiType[] {
    return this.isNeuralCompatible() ? AI_TYPES : AI_TYPES.filter((aiType) => aiType !== "neural");
  }

  /**
   * ベンチマーク/比較実行中の1ゲームごとに使う Player を作る。
   * メイン画面の Auto Play とは独立させるため、Expectimax の場合は
   * 呼び出し側が用意した専用の AiWorkerClient を使う。
   */
  private createPlayerForAiType(aiType: AiType, workerClient: AiWorkerClient | null): Player {
    switch (aiType) {
      case "random":
        return new RandomPlayer(createRandomRng());
      case "expectimax":
        if (!workerClient) throw new Error("workerClient is required for Expectimax");
        return new WorkerExpectimaxPlayer(workerClient, this.depth);
      case "neural":
        return new NeuralPlayer();
      case "greedy":
        return new GreedyPlayer();
    }
  }

  /** ベンチマーク/比較実行中とAuto Play実行中で互いの操作を無効化する (SPEC.md #14.4) */
  private setBenchmarkControlsDisabled(disabled: boolean): void {
    this.benchmarkButtonEl.disabled = disabled;
    this.benchmarkGamesEl.disabled = disabled;
    this.comparisonButtonEl.disabled = disabled;
  }

  private setGameplayControlsDisabled(disabled: boolean): void {
    this.autoPlayButtonEl.disabled = disabled;
    this.query<HTMLButtonElement>("#ai-move-button").disabled = disabled;
  }

  /** Web 版簡易ベンチマーク (SPEC.md #14.4, #42)。大量実行はローカルの Python 環境を推奨する */
  private async runBenchmarkFromUi(): Promise<void> {
    if (this.benchmarkRunning || this.comparisonRunning || this.autoPlayRunning) return;

    const games = Math.min(MAX_BENCHMARK_GAMES, Math.max(1, Math.floor(Number(this.benchmarkGamesEl.value)) || 1));
    this.benchmarkRunning = true;
    this.setBenchmarkControlsDisabled(true);
    this.setGameplayControlsDisabled(true);
    this.benchmarkResultsEl.textContent = `Running 0/${games}...`;

    // メイン画面の AiWorkerClient とは分離し、Reset/Pause の cancel() の影響を受けないようにする
    const benchmarkWorkerClient = this.aiType === "expectimax" ? new AiWorkerClient() : null;

    try {
      const summary = await runBenchmark({
        games,
        boardSize: this.boardSize,
        startTile: this.startTile,
        createPlayer: () => this.createPlayerForAiType(this.aiType, benchmarkWorkerClient),
        onProgress: (completed, total) => {
          this.benchmarkResultsEl.textContent = `Running ${completed}/${total}...`;
        },
      });
      renderBenchmarkResults(this.benchmarkResultsEl, summary);
    } catch (error) {
      this.benchmarkResultsEl.textContent = `Benchmark failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      benchmarkWorkerClient?.terminate();
      this.benchmarkRunning = false;
      this.setBenchmarkControlsDisabled(false);
      this.setGameplayControlsDisabled(false);
    }
  }

  /** Random / Greedy / Expectimax / Neural を同条件で比較する (SPEC.md #54, Phase 10) */
  private async runComparisonFromUi(): Promise<void> {
    if (this.benchmarkRunning || this.comparisonRunning || this.autoPlayRunning) return;

    const games = Math.min(MAX_BENCHMARK_GAMES, Math.max(1, Math.floor(Number(this.benchmarkGamesEl.value)) || 1));
    this.comparisonRunning = true;
    this.setBenchmarkControlsDisabled(true);
    this.setGameplayControlsDisabled(true);
    this.comparisonResultsEl.textContent = "Running comparison...";

    const comparisonWorkerClient = new AiWorkerClient();

    try {
      const entries = await runComparison({
        aiTypes: this.availableAiTypes(),
        games,
        boardSize: this.boardSize,
        startTile: this.startTile,
        createPlayer: (aiType) => this.createPlayerForAiType(aiType, comparisonWorkerClient),
        onProgress: (aiType, completed, total) => {
          this.comparisonResultsEl.textContent = `Running ${aiType}: ${completed}/${total}...`;
        },
      });
      renderComparisonResults(this.comparisonResultsEl, entries);
    } catch (error) {
      this.comparisonResultsEl.textContent = `Comparison failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      comparisonWorkerClient.terminate();
      this.comparisonRunning = false;
      this.setBenchmarkControlsDisabled(false);
      this.setGameplayControlsDisabled(false);
    }
  }

  /**
   * Expectimax の探索結果から AI 情報表示用データを組み立てる。
   * Evaluator Breakdown (SPEC.md #14.2) は選ばれた手を適用した後の盤面に対して計算する。
   */
  private buildStatsData(
    board: Board,
    result: { direction: Direction; evaluation: number; actionValues: Partial<Record<Direction, number>>; depth: number; nodes: number; cacheHits: number; elapsedMs: number },
  ): AiStatsData {
    const resultingBoard = move(board, result.direction).board;
    return {
      direction: result.direction,
      evaluation: result.evaluation,
      actionValues: result.actionValues,
      depth: result.depth,
      nodes: result.nodes,
      cacheHits: result.cacheHits,
      elapsedMs: result.elapsedMs,
      breakdown: evaluateWithBreakdown(resultingBoard, DEFAULT_WEIGHTS),
    };
  }

  private handleMove(direction: Direction): void {
    this.applyDirection(direction, MOVE_ANIMATION_DURATION_MS);
  }

  private async handleAiMove(): Promise<void> {
    if (this.state.gameOver) return;
    const player = this.createPlayer();

    try {
      if (player instanceof WorkerExpectimaxPlayer) {
        const result = await player.evaluateBoard(this.state.board);
        this.aiSuggestionEl.textContent = `AI recommends: ${result.direction.toUpperCase()}`;
        renderAiStats(this.aiStatsEl, this.buildStatsData(this.state.board, result));
        return;
      }

      const direction = await player.chooseMove(this.state.board);
      this.aiSuggestionEl.textContent = `AI recommends: ${direction.toUpperCase()}`;
      this.clearAiStats();
    } catch {
      // Reset 等で Worker がキャンセルされた場合は何もしない (SPEC.md #13.2)
    }
  }

  private toggleAutoPlay(): void {
    if (this.autoPlayRunning) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  private startAutoPlay(): void {
    if (this.state.gameOver) return;
    this.autoPlayRunning = true;
    this.autoPlayButtonEl.textContent = "Pause";
    this.setBenchmarkControlsDisabled(true);
    this.runAutoPlayStep();
  }

  private stopAutoPlay(): void {
    this.autoPlayRunning = false;
    this.autoPlayButtonEl.textContent = "Start AI";
    if (this.autoPlayTimer !== null) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    if (!this.benchmarkRunning && !this.comparisonRunning) this.setBenchmarkControlsDisabled(false);
    // Pause / Reset / New Game: 進行中の探索結果を無視する (SPEC.md #13.2)
    this.aiWorkerClient?.cancel();
  }

  private runAutoPlayStep(): void {
    if (!this.autoPlayRunning || this.state.gameOver) {
      this.stopAutoPlay();
      return;
    }

    const player = this.createPlayer();
    const board = this.state.board;
    const movePromise: Promise<Direction> =
      player instanceof WorkerExpectimaxPlayer
        ? player.evaluateBoard(board).then((result) => {
            if (this.autoPlayRunning) {
              renderAiStats(this.aiStatsEl, this.buildStatsData(board, result));
            }
            return result.direction;
          })
        : player.chooseMove(board);

    movePromise
      .then((direction) => {
        // Pause 中に届いた古い結果は無視する (SPEC.md #13.2)
        if (!this.autoPlayRunning) return;
        const animationDurationMs =
          this.autoPlaySpeed === "maximum"
            ? null
            : this.autoPlaySpeed === "fast"
              ? FAST_MOVE_ANIMATION_DURATION_MS
              : MOVE_ANIMATION_DURATION_MS;
        this.applyDirection(direction, animationDurationMs);
        const intervalMs = AUTO_PLAY_INTERVALS_MS[this.autoPlaySpeed];
        this.autoPlayTimer = setTimeout(() => this.runAutoPlayStep(), intervalMs);
      })
      .catch(() => this.stopAutoPlay());
  }

  private reset(): void {
    this.stopAutoPlay();
    this.state = createInitialState(this.rng, this.boardSize, this.startTile);
    this.aiSuggestionEl.textContent = "";
    this.clearAiStats();
    this.render();
  }

  private applyDirection(direction: Direction, animationDurationMs: number | null): void {
    const previousState = this.state;
    const nextState = applyMove(previousState, direction, this.rng);
    if (nextState === previousState) return;

    this.state = nextState;
    const animation: BoardAnimation | undefined =
      animationDurationMs === null
        ? undefined
        : {
            previousBoard: previousState.board,
            direction,
            durationMs: animationDurationMs,
          };
    this.render(animation);
  }

  private render(animation?: BoardAnimation): void {
    renderBoard(this.boardEl, this.state.board, animation, this.state.startTile);
    renderScore(this.scoreEl, this.maxTileEl, this.state);
    renderMessage(this.messageEl, this.state.gameOver);
  }
}
