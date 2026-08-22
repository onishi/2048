import json
from pathlib import Path

from game2048.game import apply_move, create_initial_state, spawn_random_tile
from game2048.rng import Rng

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def test_initial_state_has_two_tiles():
    state = create_initial_state(Rng(1))
    non_zero = [v for v in state.board if v != 0]
    assert len(non_zero) == 2
    assert state.score == 0
    assert state.move_count == 0
    assert state.game_over is False


def test_spawn_tile_ratio_close_to_90_10():
    rng = Rng(7)
    two_count = 0
    four_count = 0
    trials = 20000

    for _ in range(trials):
        board = [2] * 16
        board[0] = 0  # 1マスだけ空き
        result = spawn_random_tile(board, rng)
        if result[0] == 2:
            two_count += 1
        elif result[0] == 4:
            four_count += 1

    ratio = two_count / trials
    assert 0.85 < ratio < 0.95
    assert two_count + four_count == trials


def test_apply_move_updates_score_and_move_count():
    from game2048.game import GameState

    board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    state = GameState(board=board, score=0, move_count=0, game_over=False)
    next_state = apply_move(state, "left", Rng(1))

    assert next_state.move_count == 1
    assert next_state.score == 4
    assert next_state.board[0] == 4


def test_matches_typescript_web_trace():
    """web/src/game/{game,move,rng}.ts で同一 seed・同一手順を実行した結果と
    盤面・スコア・手数・GameOver がすべて一致することを確認する回帰テスト。
    Web 版と Python 版のロジックを一致させることが Phase 7 の最重要事項 (PLAN.md)。"""
    with open(FIXTURES_DIR / "ts_web_trace_seed2024.json") as f:
        trace = json.load(f)

    rng = Rng(2024)
    state = create_initial_state(rng)
    assert state.board == trace[0]["board"]
    assert state.score == trace[0]["score"]

    directions = ["up", "left", "down", "right"]
    for i, expected in enumerate(trace[1:]):
        direction = directions[i % len(directions)]
        state = apply_move(state, direction, rng)
        assert state.board == expected["board"], f"board mismatch at step {i + 1}"
        assert state.score == expected["score"], f"score mismatch at step {i + 1}"
        assert state.move_count == expected["moveCount"], f"moveCount mismatch at step {i + 1}"
        assert state.game_over == expected["gameOver"], f"gameOver mismatch at step {i + 1}"
