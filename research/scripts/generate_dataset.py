#!/usr/bin/env python3
"""教師データ生成スクリプト (SPEC.md #16.3)。

    python research/scripts/generate_dataset.py --games 10000 --depth 5

Expectimax を教師として、自己対局中に出現した各盤面について
最善手 (bestAction) と各方向の評価値 (values) を記録する。

出力は JSON Lines (.jsonl) 形式(1行1レコード)。SPEC.md #16.3 の例のような
単一の巨大な JSON 配列は大量ゲーム時に扱いにくいため、ストリーミングで
書き出せる JSONL を採用している。1レコードの形式は以下の通り:

    {"board": [0, 2, 4, 8, ...], "bestAction": "left", "values": {"up": 312.1, ...}}
"""

from __future__ import annotations

import argparse
import json
import time

from game2048.expectimax import DEFAULT_DEPTH, ExpectimaxPlayer
from game2048.game import apply_move, create_initial_state
from game2048.rng import Rng


def generate(games: int, depth: int, seed: int, output_path: str) -> int:
    record_count = 0
    with open(output_path, "w") as f:
        for i in range(games):
            rng = Rng(seed + i)
            state = create_initial_state(rng)
            player = ExpectimaxPlayer(depth=depth)

            while not state.game_over:
                result = player.evaluate_board(state.board)
                record = {
                    "board": state.board,
                    "bestAction": result.direction,
                    "values": dict(result.action_values),
                }
                f.write(json.dumps(record) + "\n")
                record_count += 1
                state = apply_move(state, result.direction, rng)

            print(f"game {i + 1}/{games} done: moveCount={state.move_count} score={state.score}")

    return record_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Expectimax 教師データ生成 (SPEC.md #16.3)")
    parser.add_argument("--games", type=int, default=100, help="生成に使うゲーム数")
    parser.add_argument("--depth", type=int, default=DEFAULT_DEPTH, help="Expectimax の探索深度")
    parser.add_argument("--seed", type=int, default=1, help="1ゲーム目の乱数 seed。以降 +1 ずつ変える")
    parser.add_argument("--output", type=str, default="dataset.jsonl", help="出力ファイルパス (JSON Lines)")
    args = parser.parse_args()

    start_time = time.perf_counter()
    count = generate(args.games, args.depth, args.seed, args.output)
    elapsed_s = time.perf_counter() - start_time

    print(f"\nWrote {count} records to {args.output} in {elapsed_s:.1f}s")


if __name__ == "__main__":
    main()
