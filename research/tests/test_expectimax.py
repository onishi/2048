import json
from pathlib import Path

import pytest

from game2048.expectimax import ExpectimaxPlayer
from game2048.move import get_valid_moves

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def test_chooses_a_valid_move():
    board = [8, 4, 2, 0, 4, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0]
    player = ExpectimaxPlayer(depth=3)
    direction = player.choose_move(board)
    assert direction in get_valid_moves(board)


def test_raises_when_no_valid_moves():
    board = [
        2, 4, 2, 4,
        4, 2, 4, 2,
        2, 4, 2, 4,
        4, 2, 4, 2,
    ]
    player = ExpectimaxPlayer(depth=3)
    with pytest.raises(ValueError):
        player.choose_move(board)


def test_same_board_and_depth_give_same_result():
    board = [8, 4, 2, 0, 4, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0]
    player = ExpectimaxPlayer(depth=3)
    first = player.evaluate_board(board)
    second = player.evaluate_board(board)
    assert first.direction == second.direction
    assert first.evaluation == pytest.approx(second.evaluation)


def test_returns_search_stats():
    board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    player = ExpectimaxPlayer(depth=2)
    result = player.evaluate_board(board)
    assert result.stats.nodes > 0
    assert result.stats.cache_hits >= 0
    assert result.stats.elapsed_ms >= 0


def test_action_values_cover_all_valid_moves():
    board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    player = ExpectimaxPlayer(depth=2)
    result = player.evaluate_board(board)
    assert set(result.action_values.keys()) == set(get_valid_moves(board))
    assert result.action_values[result.direction] == result.evaluation


def test_matches_typescript_web_expectimax():
    """web/src/ai/expectimax-player.ts を node で実行した結果(最善手・評価値・各方向の値)と
    一致することを確認する回帰テスト。depth消費の意味論を含め、探索アルゴリズムが
    Web版と完全に同じであることを保証する。"""
    with open(FIXTURES_DIR / "ts_web_expectimax.json") as f:
        cases = json.load(f)

    boards_and_depths = [
        ([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 3),
        ([8, 4, 2, 0, 4, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0], 3),
        ([32, 16, 4, 0, 8, 4, 0, 0, 4, 2, 0, 2, 4, 0, 0, 0], 3),
    ]

    for (board, depth), expected in zip(boards_and_depths, cases):
        player = ExpectimaxPlayer(depth=depth)
        result = player.evaluate_board(board)
        assert result.direction == expected["direction"]
        assert result.evaluation == pytest.approx(expected["evaluation"], abs=1e-6)
        for direction, expected_value in expected["actionValues"].items():
            assert result.action_values[direction] == pytest.approx(expected_value, abs=1e-6)
