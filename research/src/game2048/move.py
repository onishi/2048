"""移動・マージロジック (SPEC.md #10.2)。web/src/game/move.ts に対応。

4方向すべてを個別実装せず、盤面の回転・反転によって「左への move」1種類に
帰着させる方針も Web 版と揃えている。
"""

from __future__ import annotations

from dataclasses import dataclass

from .board import Board, BOARD_SIZE, boards_equal

Direction = str  # "up" | "down" | "left" | "right"

DIRECTIONS: list[Direction] = ["up", "down", "left", "right"]


@dataclass
class MoveResult:
    board: Board
    moved: bool
    score_delta: int


def _rows_from_board(board: Board) -> list[list[int]]:
    return [board[r * BOARD_SIZE : r * BOARD_SIZE + BOARD_SIZE] for r in range(BOARD_SIZE)]


def _board_from_rows(rows: list[list[int]]) -> Board:
    return [value for row in rows for value in row]


def _transpose(rows: list[list[int]]) -> list[list[int]]:
    size = len(rows)
    return [[rows[r][c] for r in range(size)] for c in range(size)]


def _merge_row_left(row: list[int]) -> tuple[list[int], int]:
    """1行を左方向へスライド・マージする。同ターン中に生成された結合後タイルは
    再結合しない (No Double Merge)。"""
    values = [v for v in row if v != 0]
    merged: list[int] = []
    score_delta = 0
    i = 0
    while i < len(values):
        if i + 1 < len(values) and values[i] == values[i + 1]:
            merged_value = values[i] * 2
            merged.append(merged_value)
            score_delta += merged_value
            i += 2
        else:
            merged.append(values[i])
            i += 1
    merged += [0] * (len(row) - len(merged))
    return merged, score_delta


def move(board: Board, direction: Direction) -> MoveResult:
    rows = _rows_from_board(board)

    transposed = direction in ("up", "down")
    reversed_ = direction in ("right", "down")

    working_rows = _transpose(rows) if transposed else rows
    if reversed_:
        working_rows = [list(reversed(row)) for row in working_rows]

    score_delta = 0
    merged_rows = []
    for row in working_rows:
        merged_row, delta = _merge_row_left(row)
        score_delta += delta
        merged_rows.append(merged_row)

    result_rows = merged_rows
    if reversed_:
        result_rows = [list(reversed(row)) for row in result_rows]
    if transposed:
        result_rows = _transpose(result_rows)

    result_board = _board_from_rows(result_rows)
    moved = not boards_equal(board, result_board)

    return MoveResult(board=result_board, moved=moved, score_delta=score_delta)


def get_valid_moves(board: Board) -> list[Direction]:
    return [direction for direction in DIRECTIONS if move(board, direction).moved]


def is_game_over(board: Board) -> bool:
    return len(get_valid_moves(board)) == 0
