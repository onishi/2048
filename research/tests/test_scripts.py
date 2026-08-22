"""research/scripts/ のロジック部分に対するテスト。CLI 起動ではなく関数を直接呼び出し、
高速に動くよう depth/games を小さく保つ。"""

import json

import benchmark as benchmark_script
import generate_dataset
import param_search
from game2048.weights import DEFAULT_WEIGHTS


def test_benchmark_run_game_greedy():
    result = benchmark_script.run_game(ai="greedy", depth=3, seed=1)
    assert result.score >= 0
    assert result.move_count > 0
    assert result.max_tile >= 2


def test_param_search_random_weights_stays_non_negative():
    import random

    rng = random.Random(1)
    weights = param_search.random_weights(DEFAULT_WEIGHTS, rng, scale=0.9)
    for value in [weights.empty, weights.monotonicity, weights.smoothness, weights.merge, weights.corner, weights.snake]:
        assert value >= 0


def test_param_search_evaluate_weights_with_greedy():
    stats = param_search.evaluate_weights(DEFAULT_WEIGHTS, games=2, seed=1, ai="greedy", depth=3)
    assert stats["average_score"] >= 0
    assert stats["best_score"] >= stats["average_score"] or stats["best_score"] == stats["average_score"]
    assert stats["average_max_tile"] >= 2


def test_generate_dataset_writes_expected_record_shape(tmp_path):
    output_path = tmp_path / "dataset.jsonl"
    count = generate_dataset.generate(games=1, depth=2, seed=1, output_path=str(output_path))

    assert count > 0
    lines = output_path.read_text().strip().split("\n")
    assert len(lines) == count

    first_record = json.loads(lines[0])
    assert len(first_record["board"]) == 16
    assert first_record["bestAction"] in ("up", "down", "left", "right")
    assert isinstance(first_record["values"], dict)
    assert first_record["bestAction"] in first_record["values"]
