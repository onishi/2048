from game2048.features import INPUT_SIZE, board_to_input


def test_empty_cell_maps_to_zero():
    board = [0] * 16
    assert board_to_input(board) == [0.0] * 16


def test_tile_values_map_to_log2():
    board = [2, 4, 8, 16, 2048] + [0] * 11
    result = board_to_input(board)
    assert result[0] == 1.0
    assert result[1] == 2.0
    assert result[2] == 3.0
    assert result[3] == 4.0
    assert result[4] == 11.0


def test_output_length_matches_input_size():
    board = [0] * 16
    assert len(board_to_input(board)) == INPUT_SIZE
