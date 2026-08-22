/** SPEC.md #10.4 / #15.1: seed可能な乱数生成器。テストとリプレイ再現に用いる。 */
export interface Rng {
  /** [0, 1) の乱数を返す */
  next(): number;
}

/** mulberry32: 軽量・高速な seed 可能な PRNG */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) | 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** 非決定的な乱数生成器（実プレイ用） */
export function createRandomRng(): Rng {
  return { next: () => Math.random() };
}
