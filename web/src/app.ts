import { GreedyPlayer } from "./ai/greedy-player";
import type { Player } from "./ai/player";
import { RandomPlayer } from "./ai/random-player";
import { applyMove, createInitialState } from "./game/game";
import { createRandomRng } from "./game/rng";
import type { Direction, GameState } from "./game/types";
import { renderBoard, renderMessage, renderScore } from "./ui/board-view";
import { attachControls } from "./ui/controls";

type AiType = "random" | "greedy";

const AUTO_PLAY_INTERVAL_MS = 200;

const TEMPLATE = `
  <div class="game">
    <header class="game-header">
      <h1>2048 AI</h1>
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
    </header>
    <div class="board-wrapper">
      <div class="board" id="board"></div>
      <div class="message" id="message"></div>
    </div>
    <div class="ai-bar">
      <label class="ai-select-label">
        AI:
        <select id="ai-select">
          <option value="random">Random</option>
          <option value="greedy" selected>Greedy</option>
        </select>
      </label>
      <button id="ai-move-button" type="button">AI Move</button>
      <button id="auto-play-button" type="button">Start AI</button>
    </div>
    <p class="ai-suggestion" id="ai-suggestion"></p>
    <div class="controls">
      <button id="reset-button" type="button">Reset</button>
    </div>
  </div>
`;

export class App {
  private state: GameState;
  private readonly rng = createRandomRng();
  private readonly boardEl: HTMLElement;
  private readonly scoreEl: HTMLElement;
  private readonly maxTileEl: HTMLElement;
  private readonly messageEl: HTMLElement;
  private readonly aiSelectEl: HTMLSelectElement;
  private readonly aiSuggestionEl: HTMLElement;
  private readonly autoPlayButtonEl: HTMLButtonElement;

  private aiType: AiType = "greedy";
  private autoPlayRunning = false;
  private autoPlayTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = TEMPLATE;

    this.boardEl = this.query("#board");
    this.scoreEl = this.query("#score");
    this.maxTileEl = this.query("#max-tile");
    this.messageEl = this.query("#message");
    this.aiSelectEl = this.query<HTMLSelectElement>("#ai-select");
    this.aiSuggestionEl = this.query("#ai-suggestion");
    this.autoPlayButtonEl = this.query<HTMLButtonElement>("#auto-play-button");

    this.state = createInitialState(this.rng);
    this.render();

    attachControls(this.boardEl, (direction) => this.handleMove(direction));
    this.query<HTMLButtonElement>("#reset-button").addEventListener("click", () => this.reset());
    this.query<HTMLButtonElement>("#ai-move-button").addEventListener("click", () => this.handleAiMove());
    this.autoPlayButtonEl.addEventListener("click", () => this.toggleAutoPlay());
    this.aiSelectEl.addEventListener("change", () => {
      this.aiType = this.aiSelectEl.value as AiType;
    });
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`要素が見つかりません: ${selector}`);
    return element;
  }

  private createPlayer(): Player {
    return this.aiType === "random" ? new RandomPlayer(this.rng) : new GreedyPlayer();
  }

  private handleMove(direction: Direction): void {
    this.state = applyMove(this.state, direction, this.rng);
    this.render();
  }

  private async handleAiMove(): Promise<void> {
    if (this.state.gameOver) return;
    const player = this.createPlayer();
    const direction = await player.chooseMove(this.state.board);
    this.aiSuggestionEl.textContent = `AI recommends: ${direction.toUpperCase()}`;
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
    this.runAutoPlayStep();
  }

  private stopAutoPlay(): void {
    this.autoPlayRunning = false;
    this.autoPlayButtonEl.textContent = "Start AI";
    if (this.autoPlayTimer !== null) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  private runAutoPlayStep(): void {
    if (!this.autoPlayRunning || this.state.gameOver) {
      this.stopAutoPlay();
      return;
    }

    const player = this.createPlayer();
    player
      .chooseMove(this.state.board)
      .then((direction) => {
        this.state = applyMove(this.state, direction, this.rng);
        this.render();
        this.autoPlayTimer = setTimeout(() => this.runAutoPlayStep(), AUTO_PLAY_INTERVAL_MS);
      })
      .catch(() => this.stopAutoPlay());
  }

  private reset(): void {
    this.stopAutoPlay();
    this.state = createInitialState(this.rng);
    this.aiSuggestionEl.textContent = "";
    this.render();
  }

  private render(): void {
    renderBoard(this.boardEl, this.state.board);
    renderScore(this.scoreEl, this.maxTileEl, this.state);
    renderMessage(this.messageEl, this.state.gameOver);
  }
}
