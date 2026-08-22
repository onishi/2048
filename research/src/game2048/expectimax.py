"""Expectimax AI (SPEC.md #11.5)。web/src/ai/expectimax-player.ts に対応。

depth は CHANCE→MAX 遷移時のみ消費する(MAX→CHANCE では消費しない)。
これにより depth の値がそのまま「読むプレイヤー手数」と一致する
(SPEC.md #11.5 に記載の、元設計の depth 消費バグの修正版)。
"""

from __future__ import annotations

import time
from dataclasses import dataclass

from .board import Board, get_empty_cells, serialize_board
from .evaluator import evaluate
from .move import Direction, get_valid_moves, is_game_over, move
from .weights import DEFAULT_WEIGHTS, EvaluationWeights

TILE_2_PROBABILITY = 0.9
TILE_4_PROBABILITY = 0.1

DEFAULT_DEPTH = 4

# SPEC.md #11.7: Chance Sampling。空きマスがこの数を超える場合、
# 全マスを展開せず一部のみをサンプリングして評価する。
CHANCE_SAMPLE_THRESHOLD = 6


def _place_tile(board: Board, index: int, value: int) -> Board:
    next_board = board.copy()
    next_board[index] = value
    return next_board


def _sample_cells(empty_cells: list[int]) -> list[int]:
    """空きマスが CHANCE_SAMPLE_THRESHOLD を超える場合、均等な間隔で一部だけを取り出す。
    乱数を使わず決定的に選ぶことで、同じ盤面に対しては常に同じ探索結果になるようにする。"""
    if len(empty_cells) <= CHANCE_SAMPLE_THRESHOLD:
        return empty_cells

    stride = len(empty_cells) / CHANCE_SAMPLE_THRESHOLD
    return [empty_cells[int(i * stride)] for i in range(CHANCE_SAMPLE_THRESHOLD)]


@dataclass
class ExpectimaxStats:
    nodes: int
    cache_hits: int
    elapsed_ms: float


@dataclass
class ExpectimaxResult:
    direction: Direction
    evaluation: float
    action_values: dict[Direction, float]
    stats: ExpectimaxStats


class ExpectimaxPlayer:
    def __init__(self, depth: int = DEFAULT_DEPTH, weights: EvaluationWeights = DEFAULT_WEIGHTS):
        self.depth = depth
        self.weights = weights
        self._cache: dict[str, float] = {}
        self._nodes = 0
        self._cache_hits = 0

    def choose_move(self, board: Board) -> Direction:
        return self.evaluate_board(board).direction

    def evaluate_board(self, board: Board) -> ExpectimaxResult:
        """各方向を評価し、最善手と探索統計を返す (SPEC.md #13.1 の AIResponse で使う値)。"""
        self._cache = {}
        self._nodes = 0
        self._cache_hits = 0
        start_time = time.perf_counter()

        valid_moves = get_valid_moves(board)
        if not valid_moves:
            raise ValueError("No valid moves available")

        best_direction = valid_moves[0]
        best_score = float("-inf")
        action_values: dict[Direction, float] = {}
        for direction in valid_moves:
            result = move(board, direction)
            # MAX ノード本体(ルート): depth は消費せず CHANCE へ渡す
            score = self._expectimax(result.board, self.depth, "chance")
            action_values[direction] = score
            if score > best_score:
                best_score = score
                best_direction = direction

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        return ExpectimaxResult(
            direction=best_direction,
            evaluation=best_score,
            action_values=action_values,
            stats=ExpectimaxStats(nodes=self._nodes, cache_hits=self._cache_hits, elapsed_ms=elapsed_ms),
        )

    def _expectimax(self, board: Board, depth: int, node_type: str) -> float:
        cache_key = f"{serialize_board(board)}:{depth}:{node_type}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            self._cache_hits += 1
            return cached

        self._nodes += 1
        if node_type == "max":
            result = self._max_node(board, depth)
        else:
            result = self._chance_node(board, depth)

        self._cache[cache_key] = result
        return result

    def _max_node(self, board: Board, depth: int) -> float:
        if depth == 0 or is_game_over(board):
            return evaluate(board, self.weights)

        best = float("-inf")
        for direction in get_valid_moves(board):
            result = move(board, direction)
            best = max(best, self._expectimax(result.board, depth, "chance"))
        return best

    def _chance_node(self, board: Board, depth: int) -> float:
        empty_cells = get_empty_cells(board)
        if not empty_cells:
            return evaluate(board, self.weights)

        sampled_cells = _sample_cells(empty_cells)
        expected = 0.0
        for cell in sampled_cells:
            expected += (TILE_2_PROBABILITY / len(sampled_cells)) * self._expectimax(
                _place_tile(board, cell, 2), depth - 1, "max"
            )
            expected += (TILE_4_PROBABILITY / len(sampled_cells)) * self._expectimax(
                _place_tile(board, cell, 4), depth - 1, "max"
            )
        return expected
