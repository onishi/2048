"""ニューラルネット入力表現 (SPEC.md #17.2)。

タイル値を log2 へ変換する: empty=0, 2=1, 4=2, 8=3, 16=4, ..., 2048=11。
16マス分をそのまま16要素の入力ベクトルとする。
"""

from __future__ import annotations

import math

from .board import Board

INPUT_SIZE = 16


def board_to_input(board: Board) -> list[float]:
    return [0.0 if v == 0 else math.log2(v) for v in board]
