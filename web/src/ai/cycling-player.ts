import type { Board, Direction } from "../game/types";
import type { Player } from "./player";

/** 指定された方向を順番に返す。方向が無効でも別の手へフォールバックしない。 */
export class CyclingPlayer implements Player {
  private index = 0;

  constructor(private readonly directions: readonly Direction[]) {
    if (directions.length === 0) throw new Error("At least one direction is required");
  }

  async chooseMove(_board: Board): Promise<Direction> {
    const direction = this.directions[this.index];
    this.index = (this.index + 1) % this.directions.length;
    return direction;
  }
}

export class RotatePlayer extends CyclingPlayer {
  constructor() {
    super(["up", "right", "down", "left"]);
  }
}

export class VerticalPlayer extends CyclingPlayer {
  constructor() {
    super(["up", "down"]);
  }
}
