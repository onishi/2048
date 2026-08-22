import { getValidMoves } from "../game/move";
import type { Rng } from "../game/rng";
import type { Board, Direction } from "../game/types";
import type { Player } from "./player";

/** 有効な方向からランダムに選択する。性能比較の最低基準 (SPEC.md #11.3) */
export class RandomPlayer implements Player {
  constructor(private readonly rng: Rng) {}

  async chooseMove(board: Board): Promise<Direction> {
    const validMoves = getValidMoves(board);
    if (validMoves.length === 0) {
      throw new Error("No valid moves available");
    }
    const index = Math.floor(this.rng.next() * validMoves.length);
    return validMoves[index];
  }
}
