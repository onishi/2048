from game2048.board import clone_board, create_empty_board, get_empty_cells, get_max_tile


def test_create_empty_board_is_all_zero():
    board = create_empty_board()
    assert len(board) == 16
    assert all(v == 0 for v in board)


def test_get_empty_cells():
    board = [2, 0, 4, 0] + [0] * 12
    assert get_empty_cells(board) == [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]


def test_get_max_tile():
    board = [2, 0, 1024, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4]
    assert get_max_tile(board) == 1024


def test_clone_board_is_independent():
    board = create_empty_board()
    clone = clone_board(board)
    clone[0] = 2
    assert board[0] == 0
