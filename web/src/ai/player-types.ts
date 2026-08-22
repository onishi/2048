/** UI で選択可能な AI の種類 (SPEC.md #17) */
export type AiType = "random" | "greedy" | "expectimax" | "neural";

export const AI_TYPES: AiType[] = ["random", "greedy", "expectimax", "neural"];

export const AI_TYPE_LABELS: Record<AiType, string> = {
  random: "Random",
  greedy: "Greedy",
  expectimax: "Expectimax",
  neural: "Neural",
};
