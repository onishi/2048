#!/usr/bin/env python3
"""簡易ベンチマークスクリプト (SPEC.md #16.1, #44, #45)。

    python research/scripts/benchmark.py --games 1000 --depth 4

複数ゲームを自動実行し、スコア・最大タイル到達率・探索統計を集計する。

性能に関する注記: 現時点では TypeScript 版と全く同じ純粋な Python 実装であり、
V8 の JIT のような最適化がないため Expectimax は depth が上がると大幅に遅くなる
(depth 2 で 1 ゲームあたり十数秒〜、depth 4 では非常に長時間かかる)。
手早く動作確認したい場合は --depth 2〜3 と少ないゲーム数から始めることを推奨する。
将来的に高速化する場合は bitboard 化(SPEC.md #38)や NumPy ベクトル化を検討する。
"""

from __future__ import annotations

import argparse
import statistics
import time
from dataclasses import dataclass

from game2048.expectimax import DEFAULT_DEPTH, ExpectimaxPlayer
from game2048.game import apply_move, create_initial_state
from game2048.players import GreedyPlayer, RandomPlayer
from game2048.rng import Rng


@dataclass
class GameResult:
    score: int
    move_count: int
    max_tile: int
    total_nodes: int
    total_cache_hits: int
    total_move_time_ms: float


def _create_neural_player(model_path: str):
    # torch は Phase 8 (Neural AI) でのみ必要な重い依存関係のため、
    # --ai neural を使う場合だけ遅延 import する (SPEC.md #6.2 の ml extra)。
    import torch

    from game2048.model import Game2048Net
    from game2048.neural_player import NeuralPlayer

    model = Game2048Net()
    model.load_state_dict(torch.load(model_path, map_location="cpu", weights_only=True))
    return NeuralPlayer(model)


def run_game(ai: str, depth: int, seed: int, model_path: str | None = None) -> GameResult:
    rng = Rng(seed)
    state = create_initial_state(rng)

    if ai == "expectimax":
        player = ExpectimaxPlayer(depth=depth)
    elif ai == "greedy":
        player = GreedyPlayer()
    elif ai == "neural":
        if not model_path:
            raise ValueError("--ai neural には --model-path が必要です")
        player = _create_neural_player(model_path)
    else:
        player = RandomPlayer(rng)

    total_nodes = 0
    total_cache_hits = 0
    total_move_time_ms = 0.0

    while not state.game_over:
        if isinstance(player, ExpectimaxPlayer):
            start = time.perf_counter()
            result = player.evaluate_board(state.board)
            total_move_time_ms += (time.perf_counter() - start) * 1000
            total_nodes += result.stats.nodes
            total_cache_hits += result.stats.cache_hits
            direction = result.direction
        else:
            start = time.perf_counter()
            direction = player.choose_move(state.board)
            total_move_time_ms += (time.perf_counter() - start) * 1000

        state = apply_move(state, direction, rng)

    max_tile = max(state.board) if state.board else 0
    return GameResult(
        score=state.score,
        move_count=state.move_count,
        max_tile=max_tile,
        total_nodes=total_nodes,
        total_cache_hits=total_cache_hits,
        total_move_time_ms=total_move_time_ms,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="2048 AI 簡易ベンチマーク (SPEC.md #16.1)")
    parser.add_argument("--games", type=int, default=100, help="実行するゲーム数")
    parser.add_argument("--depth", type=int, default=DEFAULT_DEPTH, help="Expectimax の探索深度")
    parser.add_argument(
        "--ai", choices=["expectimax", "greedy", "random", "neural"], default="expectimax", help="使用する AI"
    )
    parser.add_argument("--model-path", help="--ai neural の場合に読み込む train.py の出力 (.pt)")
    parser.add_argument("--seed", type=int, default=1, help="1ゲーム目の乱数 seed。以降 +1 ずつ変える")
    args = parser.parse_args()

    results: list[GameResult] = []
    start_time = time.perf_counter()

    for i in range(args.games):
        result = run_game(args.ai, args.depth, args.seed + i, args.model_path)
        results.append(result)
        print(
            f"game {i + 1}/{args.games}: score={result.score} maxTile={result.max_tile} "
            f"moves={result.move_count}"
        )

    total_time_s = time.perf_counter() - start_time

    scores = [r.score for r in results]
    max_tiles = [r.max_tile for r in results]
    total_moves = sum(r.move_count for r in results)
    total_nodes = sum(r.total_nodes for r in results)
    total_cache_hits = sum(r.total_cache_hits for r in results)
    total_move_time_ms = sum(r.total_move_time_ms for r in results)

    tile_distribution: dict[int, int] = {}
    for tile in max_tiles:
        tile_distribution[tile] = tile_distribution.get(tile, 0) + 1

    print()
    print(f"Games: {args.games}")
    print()
    print(f"Average Score: {statistics.mean(scores):,.0f}")
    print(f"Median Score: {statistics.median(scores):,.0f}")
    print(f"Best Score: {max(scores):,}")
    print()
    for tile in sorted(tile_distribution):
        rate = tile_distribution[tile] / args.games * 100
        print(f"{tile}: {rate:.1f}%")
    print()
    print(f"Average move time: {total_move_time_ms / total_moves:.2f} ms" if total_moves else "Average move time: n/a")
    print(f"Total game time: {total_time_s:.1f}s")
    if args.ai == "expectimax":
        print(f"Nodes searched (total): {total_nodes:,}")
        cache_hit_rate = total_cache_hits / (total_nodes + total_cache_hits) * 100 if (total_nodes + total_cache_hits) else 0
        print(f"Cache hit rate: {cache_hit_rate:.1f}%")


if __name__ == "__main__":
    main()
