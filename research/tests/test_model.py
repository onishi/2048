import pytest

torch = pytest.importorskip("torch")

from game2048.model import DIRECTIONS, Game2048Net  # noqa: E402


def test_output_shape_matches_direction_count():
    model = Game2048Net()
    x = torch.randn(5, 16)
    out = model(x)
    assert out.shape == (5, len(DIRECTIONS))


def test_single_sample_forward():
    model = Game2048Net()
    x = torch.randn(1, 16)
    out = model(x)
    assert out.shape == (1, 4)
