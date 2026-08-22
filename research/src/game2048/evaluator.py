"""評価関数 (SPEC.md #12)。web/src/ai/evaluator.ts に対応。"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .board import Board, BOARD_SIZE, get_max_tile
from .weights import DEFAULT_WEIGHTS, EvaluationWeights

CORNER_INDICES = (0, BOARD_SIZE - 1, BOARD_SIZE * (BOARD_SIZE - 1), BOARD_SIZE * BOARD_SIZE - 1)


def _log2_or_zero(value: int) -> float:
    return 0.0 if value == 0 else math.log2(value)


def _get_row(board: Board, r: int) -> list[int]:
    return board[r * BOARD_SIZE : r * BOARD_SIZE + BOARD_SIZE]


def _get_column(board: Board, c: int) -> list[int]:
    return [board[r * BOARD_SIZE + c] for r in range(BOARD_SIZE)]


def empty_score(board: Board) -> int:
    """空きマス数。多いほど高評価 (SPEC.md #12.2)"""
    return sum(1 for v in board if v == 0)


def corner_bonus(board: Board) -> int:
    """最大タイルが角にある場合に、その値をボーナスとして返す (SPEC.md #12.3)"""
    max_tile = get_max_tile(board)
    if max_tile == 0:
        return 0
    return max_tile if any(board[i] == max_tile for i in CORNER_INDICES) else 0


def _line_monotonicity_credit(values: list[int]) -> float:
    """1行/1列が厳密に単調(非減少 or 非増加)である場合にのみ、
    その変化量(log2差の合計)をクレジットとして返す。
    単調でない行/列は0(ジグザグな並びに加点してしまうのを防ぐため)。"""
    increasing = 0.0
    decreasing = 0.0
    for i in range(len(values) - 1):
        a = _log2_or_zero(values[i])
        b = _log2_or_zero(values[i + 1])
        if b >= a:
            increasing += b - a
        else:
            decreasing += a - b
    if decreasing == 0:
        return increasing
    if increasing == 0:
        return decreasing
    return 0.0


def monotonicity_score(board: Board) -> float:
    """大きいタイルから小さいタイルへ単調に並ぶ状態を評価する (SPEC.md #12.4)"""
    score = 0.0
    for r in range(BOARD_SIZE):
        score += _line_monotonicity_credit(_get_row(board, r))
    for c in range(BOARD_SIZE):
        score += _line_monotonicity_credit(_get_column(board, c))
    return score


def smoothness_penalty(board: Board) -> float:
    """隣接タイルの log2 差の絶対値の合計。値が大きいほど盤面が荒れている(悪い)ため、
    evaluate() では減算するペナルティ項として扱う (SPEC.md #12.5, #12.1)。"""
    penalty = 0.0
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            value = board[r * BOARD_SIZE + c]
            if value == 0:
                continue
            log_value = math.log2(value)

            if c + 1 < BOARD_SIZE:
                right = board[r * BOARD_SIZE + c + 1]
                if right != 0:
                    penalty += abs(log_value - math.log2(right))
            if r + 1 < BOARD_SIZE:
                down = board[(r + 1) * BOARD_SIZE + c]
                if down != 0:
                    penalty += abs(log_value - math.log2(down))
    return penalty


def merge_potential_score(board: Board) -> int:
    """同じ数字が隣接している場合に加点する (SPEC.md #12.6)"""
    count = 0
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            value = board[r * BOARD_SIZE + c]
            if value == 0:
                continue
            if c + 1 < BOARD_SIZE and board[r * BOARD_SIZE + c + 1] == value:
                count += 1
            if r + 1 < BOARD_SIZE and board[(r + 1) * BOARD_SIZE + c] == value:
                count += 1
    return count


# 蛇状(boustrophedon)に高いタイルを維持する盤面を評価するための重み行列。
# SPEC.md #12.7 の例(2048 1024 512 256 / 16 32 64 128 / 8 4 2 0 / 0 0 0 0)で
# 最大の重みが割り当たるよう構成している。web/src/ai/evaluator.ts と揃えている。
SNAKE_WEIGHTS = (
    15, 14, 13, 12,
    8, 9, 10, 11,
    7, 6, 5, 4,
    0, 1, 2, 3,
)


def snake_score(board: Board) -> int:
    """蛇状配置を評価する (SPEC.md #12.7)"""
    return sum(board[i] * SNAKE_WEIGHTS[i] for i in range(len(board)))


@dataclass
class EvaluationBreakdown:
    empty: float
    monotonicity: float
    smoothness: float
    merge: float
    corner: float
    snake: float
    total: float


def evaluate_with_breakdown(board: Board, weights: EvaluationWeights = DEFAULT_WEIGHTS) -> EvaluationBreakdown:
    """盤面を数値化し、各項目の重み付き寄与も内訳として返す (SPEC.md #12)。
    Smoothness のみペナルティとして減算し、それ以外は加点として扱う (SPEC.md #12.1)。"""
    empty = weights.empty * empty_score(board)
    monotonicity = weights.monotonicity * monotonicity_score(board)
    smoothness = -(weights.smoothness * smoothness_penalty(board))
    merge = weights.merge * merge_potential_score(board)
    corner = weights.corner * corner_bonus(board)
    snake = weights.snake * snake_score(board)

    return EvaluationBreakdown(
        empty=empty,
        monotonicity=monotonicity,
        smoothness=smoothness,
        merge=merge,
        corner=corner,
        snake=snake,
        total=empty + monotonicity + smoothness + merge + corner + snake,
    )


def evaluate(board: Board, weights: EvaluationWeights = DEFAULT_WEIGHTS) -> float:
    """盤面を数値化する (SPEC.md #12)"""
    return evaluate_with_breakdown(board, weights).total
