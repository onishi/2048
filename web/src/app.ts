import { applyMove, createInitialState } from "./game/game";
import { createRandomRng } from "./game/rng";
import type { Direction, GameState } from "./game/types";
import { renderBoard, renderMessage, renderScore } from "./ui/board-view";
import { attachControls } from "./ui/controls";

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

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = TEMPLATE;

    this.boardEl = this.query("#board");
    this.scoreEl = this.query("#score");
    this.maxTileEl = this.query("#max-tile");
    this.messageEl = this.query("#message");

    this.state = createInitialState(this.rng);
    this.render();

    attachControls(this.boardEl, (direction) => this.handleMove(direction));
    this.query<HTMLButtonElement>("#reset-button").addEventListener("click", () => this.reset());
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`要素が見つかりません: ${selector}`);
    return element;
  }

  private handleMove(direction: Direction): void {
    this.state = applyMove(this.state, direction, this.rng);
    this.render();
  }

  private reset(): void {
    this.state = createInitialState(this.rng);
    this.render();
  }

  private render(): void {
    renderBoard(this.boardEl, this.state.board);
    renderScore(this.scoreEl, this.maxTileEl, this.state);
    renderMessage(this.messageEl, this.state.gameOver);
  }
}
