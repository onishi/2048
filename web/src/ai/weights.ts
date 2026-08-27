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
 * issue #32 の DEFAULT_WEIGHTS を基準に Random Search (Greedy AI, 200試行, ±50%) で
 * 得た候補を、本番の Expectimax (depth=3) で計20ゲーム(seed違いで2回に分けて)
 * 比較検証した上で採用した値。
 * 平均スコア約+9%（44,049→48,075）、4096到達率 40%→55% を確認済み。
 */
export const DEFAULT_WEIGHTS: EvaluationWeights = {
  empty: 341,
  monotonicity: 55,
  smoothness: 21,
  merge: 462,
  corner: 2056,
  snake: 1.63,
};
