/** 評価関数の重み (SPEC.md #12.8) */
export interface EvaluationWeights {
  empty: number;
  monotonicity: number;
  smoothness: number;
  merge: number;
  corner: number;
  snake: number;
}

/** 初期値。最終値ではなく、Phase 7 の Python ベンチマークで調整する (SPEC.md #12.8) */
export const DEFAULT_WEIGHTS: EvaluationWeights = {
  empty: 270,
  monotonicity: 50,
  smoothness: 10,
  merge: 700,
  corner: 1000,
  snake: 1,
};
