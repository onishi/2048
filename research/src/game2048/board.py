"""盤面ユーティリティ (SPEC.md #10, #12)。web/src/game/board.ts に対応。"""

from __future__ import annotations

Board = list[int]

BOARD_SIZE = 4
CELL_COUNT = BOARD_SIZE * BOARD_SIZE


def create_empty_board() -> Board:
    return [0] * CELL_COUNT


def clone_board(board: Board) -> Board:
    return board.copy()


def get_empty_cells(board: Board) -> list[int]:
    return [i for i, value in enumerate(board) if value == 0]


def get_max_tile(board: Board) -> int:
    return max(board) if board else 0


def serialize_board(board: Board) -> str:
    return ",".join(str(v) for v in board)


def boards_equal(a: Board, b: Board) -> bool:
    return a == b
