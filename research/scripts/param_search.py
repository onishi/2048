#!/usr/bin/env python3
"""評価関数のパラメータ探索 (SPEC.md #16.2)。

    python research/scripts/param_search.py --trials 20 --games 20

DEFAULT_WEIGHTS を基準に Random Search で重みを揺らし、平均スコアが
最も高い組み合わせを探す。デフォルトは高速な Greedy AI で評価するが、
--ai expectimax --depth N でより本番に近い評価もできる(その分低速)。
"""

from __future__ import annotations

import argparse
import random
import statistics
from dataclasses import asdict

from game2048.expectimax import DEFAULT_DEPTH, ExpectimaxPlayer
from game2048.game import apply_move, create_initial_state
from game2048.players import GreedyPlayer
from game2048.rng import Rng
from game2048.weights import DEFAULT_WEIGHTS, EvaluationWeights


def random_weights(base: EvaluationWeights, rng: random.Random, scale: float) -> EvaluationWeights:
    def jitter(value: float) -> float:
        factor = 1 + rng.uniform(-scale, scale)
        return max(0.0, value * factor)

    return EvaluationWeights(
        empty=jitter(base.empty),
        monotonicity=jitter(base.monotonicity),
        smoothness=jitter(base.smoothness),
        merge=jitter(base.merge),
        corner=jitter(base.corner),
        snake=jitter(base.snake),
    )


def evaluate_weights(
    weights: EvaluationWeights, games: int, seed: int, ai: str, depth: int
) -> dict[str, float]:
    scores = []
    max_tiles = []
    for i in range(games):
        rng = Rng(seed + i)
        state = create_initial_state(rng)
        player = ExpectimaxPlayer(depth=depth, weights=weights) if ai == "expectimax" else GreedyPlayer(weights)

        while not state.game_over:
            direction = player.choose_move(state.board)
            state = apply_move(state, direction, rng)

        scores.append(state.score)
        max_tiles.append(max(state.board) if state.board else 0)

    return {
        "average_score": statistics.mean(scores),
        "best_score": max(scores),
        "average_max_tile": statistics.mean(max_tiles),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="評価関数の重みを Random Search で探索する (SPEC.md #16.2)")
    parser.add_argument("--trials", type=int, default=10, help="ランダムに試す重みの組み合わせ数")
    parser.add_argument("--games", type=int, default=10, help="1組み合わせあたりのゲーム数")
    parser.add_argument("--seed", type=int, default=1, help="乱数 seed の起点")
    parser.add_argument("--ai", choices=["greedy", "expectimax"], default="greedy", help="評価に使う AI")
    parser.add_argument("--depth", type=int, default=DEFAULT_DEPTH, help="--ai expectimax の場合の探索深度")
    parser.add_argument("--scale", type=float, default=0.5, help="重みのランダム変動幅(±)。0.5 なら ±50%")
    args = parser.parse_args()

    search_rng = random.Random(args.seed)

    candidates: list[tuple[str, EvaluationWeights]] = [("default", DEFAULT_WEIGHTS)]
    for i in range(args.trials):
        candidates.append((f"trial {i + 1}", random_weights(DEFAULT_WEIGHTS, search_rng, args.scale)))

    results = []
    for label, weights in candidates:
        stats = evaluate_weights(weights, args.games, args.seed, args.ai, args.depth)
        results.append((label, weights, stats))
        print(
            f"{label}: avg_score={stats['average_score']:.0f} "
            f"best_score={stats['best_score']:.0f} "
            f"avg_max_tile={stats['average_max_tile']:.0f}"
        )

    best_label, best_weights, best_stats = max(results, key=lambda r: r[2]["average_score"])
    print()
    print(f"Best: {best_label} (avg_score={best_stats['average_score']:.0f})")
    print(f"Weights: {asdict(best_weights)}")


if __name__ == "__main__":
    main()
