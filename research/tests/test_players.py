import pytest

from game2048.move import get_valid_moves
from game2048.players import GreedyPlayer, RandomPlayer
from game2048.rng import Rng

GAME_OVER_BOARD = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2,
]


class TestRandomPlayer:
    def test_always_chooses_a_valid_move(self):
        board = [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        player = RandomPlayer(Rng(1))
        valid_moves = get_valid_moves(board)
        for _ in range(50):
            assert player.choose_move(board) in valid_moves

    def test_raises_when_no_valid_moves(self):
        player = RandomPlayer(Rng(1))
        with pytest.raises(ValueError):
            player.choose_move(GAME_OVER_BOARD)


class TestGreedyPlayer:
    def test_prefers_merging_into_the_corner(self):
        # LEFT: [4,0,0,0] (角に4、空きマス+1) / RIGHT: [0,0,0,4] (同じくマージするが角の重みが低い)
        board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        player = GreedyPlayer()
        assert player.choose_move(board) == "left"

    def test_raises_when_no_valid_moves(self):
        player = GreedyPlayer()
        with pytest.raises(ValueError):
            player.choose_move(GAME_OVER_BOARD)
