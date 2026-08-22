import { getValidMoves, move } from "../game/move";
import type { Board, Direction } from "../game/types";
import { evaluate } from "./evaluator";
import { DEFAULT_WEIGHTS, type EvaluationWeights } from "./weights";
import type { Player } from "./player";

/** 1手先だけ探索し、評価関数で最も評価値の高い手を選ぶ (SPEC.md #11.4) */
export class GreedyPlayer implements Player {
  constructor(private readonly weights: EvaluationWeights = DEFAULT_WEIGHTS) {}

  async chooseMove(board: Board): Promise<Direction> {
    const validMoves = getValidMoves(board);
    if (validMoves.length === 0) {
      throw new Error("No valid moves available");
    }

    let bestDirection = validMoves[0];
    let bestScore = -Infinity;
    for (const direction of validMoves) {
      const result = move(board, direction);
      const score = evaluate(result.board, this.weights);
      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
      }
    }
    return bestDirection;
  }
}
