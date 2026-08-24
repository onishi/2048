/** 評価関数の重み (SPEC.md #12.8) */
export interface EvaluationWeights {
  empty: number;
  monotonicity: number;
  smoothness: number;
  merge: number;
  corner: number;
  snake: number;
}

/**
 * research/scripts/param_search.py の Random Search (Greedy AI, 60試行) で得た候補を、
 * 実際の Expectimax (depth=2/3) で default と比較検証した上で採用した値 (issue #32)。
 * depth=3, 10ゲームの比較で平均スコア約2.3倍・4096到達率 0%→67% を確認済み。
 */
export const DEFAULT_WEIGHTS: EvaluationWeights = {
  empty: 327,
  monotonicity: 70,
  smoothness: 15,
  merge: 569,
  corner: 1459,
  snake: 1.2,
};
