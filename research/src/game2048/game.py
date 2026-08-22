"""ゲーム進行 (SPEC.md #10)。web/src/game/game.ts に対応。"""

from __future__ import annotations

from dataclasses import dataclass

from .board import Board, create_empty_board, get_empty_cells
from .move import Direction, is_game_over, move
from .rng import Rng

TILE_2_PROBABILITY = 0.9


@dataclass
class GameState:
    board: Board
    score: int
    move_count: int
    game_over: bool


def spawn_random_tile(board: Board, rng: Rng) -> Board:
    """空きマスに新しいタイルを1つ生成する。2:90%, 4:10% (SPEC.md #10.4)"""
    empty_cells = get_empty_cells(board)
    if not empty_cells:
        return board

    cell_index = empty_cells[int(rng.next() * len(empty_cells))]
    value = 2 if rng.next() < TILE_2_PROBABILITY else 4

    next_board = board.copy()
    next_board[cell_index] = value
    return next_board


def create_initial_state(rng: Rng) -> GameState:
    """初期盤面（タイル2つ配置済み）を持つ GameState を生成する"""
    board = create_empty_board()
    board = spawn_random_tile(board, rng)
    board = spawn_random_tile(board, rng)
    return GameState(board=board, score=0, move_count=0, game_over=False)


def apply_move(state: GameState, direction: Direction, rng: Rng) -> GameState:
    """手を1つ適用する。盤面が変化しない方向を指定した場合は state をそのまま返す。"""
    if state.game_over:
        return state

    result = move(state.board, direction)
    if not result.moved:
        return state

    board_with_new_tile = spawn_random_tile(result.board, rng)
    return GameState(
        board=board_with_new_tile,
        score=state.score + result.score_delta,
        move_count=state.move_count + 1,
        game_over=is_game_over(board_with_new_tile),
    )
