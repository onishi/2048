"""Random / Greedy AI (SPEC.md #11.3, #11.4)。
web/src/ai/random-player.ts, greedy-player.ts に対応。
Expectimax との簡易比較用途で、研究環境のベンチマークスクリプトから使う。
"""

from __future__ import annotations

import math

from .board import Board
from .evaluator import evaluate
from .move import Direction, get_valid_moves, move
from .rng import Rng
from .weights import DEFAULT_WEIGHTS, EvaluationWeights


class RandomPlayer:
    """有効な方向からランダムに選択する。性能比較の最低基準 (SPEC.md #11.3)"""

    def __init__(self, rng: Rng):
        self.rng = rng

    def choose_move(self, board: Board) -> Direction:
        valid_moves = get_valid_moves(board)
        if not valid_moves:
            raise ValueError("No valid moves available")
        index = math.floor(self.rng.next() * len(valid_moves))
        return valid_moves[index]


class GreedyPlayer:
    """1手先だけ探索し、評価関数で最も評価値の高い手を選ぶ (SPEC.md #11.4)"""

    def __init__(self, weights: EvaluationWeights = DEFAULT_WEIGHTS):
        self.weights = weights

    def choose_move(self, board: Board) -> Direction:
        valid_moves = get_valid_moves(board)
        if not valid_moves:
            raise ValueError("No valid moves available")

        best_direction = valid_moves[0]
        best_score = float("-inf")
        for direction in valid_moves:
            result = move(board, direction)
            score = evaluate(result.board, self.weights)
            if score > best_score:
                best_score = score
                best_direction = direction
        return best_direction
