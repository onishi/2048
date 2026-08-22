import pytest

torch = pytest.importorskip("torch")

from game2048.model import Game2048Net  # noqa: E402
from game2048.move import get_valid_moves  # noqa: E402
from game2048.neural_player import NeuralPlayer  # noqa: E402

GAME_OVER_BOARD = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2,
]


def test_chooses_a_valid_move_even_with_untrained_model():
    board = [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    player = NeuralPlayer(Game2048Net())
    for _ in range(20):
        assert player.choose_move(board) in get_valid_moves(board)


def test_raises_when_no_valid_moves():
    player = NeuralPlayer(Game2048Net())
    with pytest.raises(ValueError):
        player.choose_move(GAME_OVER_BOARD)


def test_falls_back_to_a_valid_move_when_top_choice_is_invalid():
    """全方向のロジットを固定した状態でも、有効な手の中から選ばれることを確認する。"""
    model = Game2048Net()
    # 最終層のバイアスを固定して up が常に最大ロジットになるようにする
    with torch.no_grad():
        final_layer = model.layers[-1]
        final_layer.weight.zero_()
        final_layer.bias.copy_(torch.tensor([10.0, 0.0, 0.0, 0.0]))  # up が最大

    # 既に左上に寄っており merge もできないため up と left は無効
    # (down/right は空きマスへ移動できるため有効)
    board = [2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    valid_moves = get_valid_moves(board)
    assert "up" not in valid_moves

    player = NeuralPlayer(model)
    direction = player.choose_move(board)
    assert direction in valid_moves
