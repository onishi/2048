"""評価関数の重み (SPEC.md #12.8)。web/src/ai/weights.ts に対応。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EvaluationWeights:
    empty: float
    monotonicity: float
    smoothness: float
    merge: float
    corner: float
    snake: float


# 初期値。最終値ではなく、ベンチマークによって調整する (SPEC.md #12.8)
DEFAULT_WEIGHTS = EvaluationWeights(
    empty=270,
    monotonicity=50,
    smoothness=10,
    merge=700,
    corner=1000,
    snake=1,
)
