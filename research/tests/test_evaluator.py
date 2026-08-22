import json
from pathlib import Path

import pytest

from game2048.evaluator import (
    corner_bonus,
    empty_score,
    evaluate,
    evaluate_with_breakdown,
    merge_potential_score,
    monotonicity_score,
    smoothness_penalty,
    snake_score,
)
from game2048.weights import DEFAULT_WEIGHTS

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def test_empty_score():
    board = [2, 0, 4, 0] + [0] * 12
    assert empty_score(board) == 14


class TestCornerBonus:
    def test_max_tile_in_corner(self):
        board = [2048] + [0] * 15
        assert corner_bonus(board) == 2048

    def test_max_tile_not_in_corner(self):
        board = [0, 2048] + [0] * 14
        assert corner_bonus(board) == 0

    def test_empty_board(self):
        assert corner_bonus([0] * 16) == 0


class TestMonotonicity:
    def test_fully_monotonic_is_positive(self):
        board = [
            2048, 1024, 512, 256,
            128, 64, 32, 16,
            8, 4, 2, 0,
            0, 0, 0, 0,
        ]
        assert monotonicity_score(board) > 0

    def test_monotonic_beats_zigzag(self):
        monotonic_row = [2, 4, 8, 16] + [0] * 12
        zigzag_row = [2, 8, 2, 8] + [0] * 12
        assert monotonicity_score(monotonic_row) > monotonicity_score(zigzag_row)


def test_smoothness_penalty_smooth_beats_rough():
    smooth = [128, 64, 32, 16] + [0] * 12
    rough = [128, 2, 64, 4] + [0] * 12
    assert smoothness_penalty(smooth) < smoothness_penalty(rough)


class TestMergePotential:
    def test_adjacent_equal_tiles(self):
        board = [4, 4] + [0] * 14
        assert merge_potential_score(board) == 1

    def test_no_adjacent_equal_tiles(self):
        board = [2, 4, 8, 16] + [0] * 12
        assert merge_potential_score(board) == 0


def test_snake_score_favors_spec_example():
    snake = [
        2048, 1024, 512, 256,
        16, 32, 64, 128,
        8, 4, 2, 0,
        0, 0, 0, 0,
    ]
    shuffled = [
        256, 1024, 512, 2048,
        16, 32, 64, 128,
        8, 4, 2, 0,
        0, 0, 0, 0,
    ]
    assert snake_score(snake) > snake_score(shuffled)


def test_evaluate_matches_weighted_sum_of_breakdown():
    board = [
        2048, 1024, 512, 256,
        16, 32, 64, 128,
        8, 4, 2, 0,
        0, 0, 0, 0,
    ]
    breakdown = evaluate_with_breakdown(board, DEFAULT_WEIGHTS)
    total = (
        breakdown.empty
        + breakdown.monotonicity
        + breakdown.smoothness
        + breakdown.merge
        + breakdown.corner
        + breakdown.snake
    )
    assert breakdown.total == total
    assert evaluate(board, DEFAULT_WEIGHTS) == breakdown.total


def test_smoothness_breakdown_is_non_positive():
    board = [128, 2, 64, 4] + [0] * 12
    breakdown = evaluate_with_breakdown(board, DEFAULT_WEIGHTS)
    assert breakdown.smoothness <= 0


def test_matches_typescript_web_evaluator():
    """web/src/ai/evaluator.ts の evaluateWithBreakdown() を node で実行した結果と一致することを
    確認する回帰テスト (PLAN.md Phase 7: TypeScript版とロジックを一致させることが最重要)。"""
    with open(FIXTURES_DIR / "ts_web_evaluator.json") as f:
        fixture = json.load(f)

    for board, expected in zip(fixture["boards"], fixture["expected"]):
        breakdown = evaluate_with_breakdown(board, DEFAULT_WEIGHTS)
        for key, expected_value in expected.items():
            actual_value = getattr(breakdown, key)
            assert actual_value == pytest.approx(expected_value, abs=1e-6), (
                f"{key} mismatch for board {board}: py={actual_value} ts={expected_value}"
            )
