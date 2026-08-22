from game2048.rng import Rng


def test_same_seed_reproduces_same_sequence():
    a = Rng(42)
    b = Rng(42)
    seq_a = [a.next() for _ in range(20)]
    seq_b = [b.next() for _ in range(20)]
    assert seq_a == seq_b


def test_different_seed_differs():
    a = Rng(1)
    b = Rng(2)
    seq_a = [a.next() for _ in range(10)]
    seq_b = [b.next() for _ in range(10)]
    assert seq_a != seq_b


def test_values_within_unit_range():
    rng = Rng(12345)
    for _ in range(1000):
        value = rng.next()
        assert 0 <= value < 1


def test_matches_typescript_reference_values():
    """web/src/game/rng.ts の createRng(42) を node で実行して得た最初の5値と一致することを確認する。
    Web 版と Python 版でビット単位で同一の乱数列になっている必要がある (SPEC.md #15.1)。"""
    rng = Rng(42)
    values = [rng.next() for _ in range(5)]
    expected = [
        0.6011037519201636,
        0.44829055899754167,
        0.8524657934904099,
        0.6697340414393693,
        0.17481389874592423,
    ]
    for actual, exp in zip(values, expected):
        assert actual == exp
