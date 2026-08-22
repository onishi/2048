from game2048.move import is_game_over, move


def _board_from_row(row: list[int]) -> list[int]:
    return row + [0] * (16 - len(row))


class TestMoveLeft:
    """SPEC.md #10.3 のテストケース"""

    def test_basic_merge(self):
        result = move(_board_from_row([2, 2, 0, 0]), "left")
        assert result.board[:4] == [4, 0, 0, 0]
        assert result.moved is True
        assert result.score_delta == 4

    def test_two_pairs_merge(self):
        result = move(_board_from_row([2, 2, 2, 2]), "left")
        assert result.board[:4] == [4, 4, 0, 0]
        assert result.score_delta == 8

    def test_two_different_pairs_merge(self):
        result = move(_board_from_row([4, 4, 8, 8]), "left")
        assert result.board[:4] == [8, 16, 0, 0]
        assert result.score_delta == 24

    def test_no_double_merge(self):
        result = move(_board_from_row([2, 2, 4, 0]), "left")
        assert result.board[:4] == [4, 4, 0, 0]
        assert result.board[:4] != [8, 0, 0, 0]

    def test_no_valid_move(self):
        result = move(_board_from_row([2, 4, 8, 16]), "left")
        assert result.moved is False
        assert result.score_delta == 0


class TestMoveDirections:
    def test_right(self):
        result = move(_board_from_row([2, 2, 0, 0]), "right")
        assert result.board[:4] == [0, 0, 0, 4]

    def test_up(self):
        board = [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        result = move(board, "up")
        assert result.board[0] == 4
        assert result.board[4] == 0

    def test_down(self):
        board = [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        result = move(board, "down")
        assert result.board[12] == 4
        assert result.board[0] == 0


class TestGameOver:
    """SPEC.md #10.5"""

    def test_checkerboard_is_game_over(self):
        board = [
            2, 4, 2, 4,
            4, 2, 4, 2,
            2, 4, 2, 4,
            4, 2, 4, 2,
        ]
        assert is_game_over(board) is True

    def test_empty_cell_is_not_game_over(self):
        board = [
            2, 4, 2, 4,
            4, 2, 4, 2,
            2, 4, 2, 4,
            4, 2, 4, 0,
        ]
        assert is_game_over(board) is False

    def test_adjacent_merge_possible_is_not_game_over(self):
        board = [
            2, 2, 4, 8,
            16, 32, 64, 128,
            256, 512, 1024, 2048,
            4, 8, 16, 32,
        ]
        assert is_game_over(board) is False
