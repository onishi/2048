import type { AiType } from "./player-types";

/**
 * AI の変更によって性能が変わるため、AI にはバージョンを持たせる (SPEC.md #15.3, #61)。
 * アルゴリズムや評価関数の重み、モデルの再学習など、性能に影響する変更を行ったら
 * インクリメントする。ベンチマーク結果には必ずこのバージョンを記録する。
 */
export const AI_VERSIONS: Record<AiType, string> = {
  random: "random-v1",
  greedy: "greedy-v1",
  expectimax: "expectimax-v1",
  neural: "neural-v1",
};
