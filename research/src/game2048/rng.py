"""seed 可能な乱数生成器 (SPEC.md #10.4)。

Web 版 (web/src/game/rng.ts) の mulberry32 実装とビット単位で同じ結果になるよう
移植している。同じ seed から同じ乱数列が得られるため、Web 版と Python 版で
同一の対局を再現できる。
"""

_MASK32 = 0xFFFFFFFF


def _imul(a: int, b: int) -> int:
    """JavaScript の Math.imul 相当（32bit 乗算、下位32bitに折り返す）"""
    return (a * b) & _MASK32


class Rng:
    def __init__(self, seed: int):
        self._state = seed & _MASK32

    def next(self) -> float:
        """[0, 1) の乱数を返す"""
        self._state = (self._state + 0x6D2B79F5) & _MASK32
        t = self._state
        t = _imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + _imul(t ^ (t >> 7), t | 61)) & _MASK32)) & _MASK32
        return ((t ^ (t >> 14)) & _MASK32) / 4294967296.0
