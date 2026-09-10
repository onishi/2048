/** UI で選択可能な AI の種類 (SPEC.md #17) */
export type AiType = "random" | "rotate" | "vertical" | "greedy" | "expectimax" | "neural";

export const AI_TYPES: AiType[] = ["random", "rotate", "vertical", "greedy", "expectimax", "neural"];

export const AI_TYPE_LABELS: Record<AiType, string> = {
  random: "Random",
  rotate: "Rotate",
  vertical: "Vertical",
  greedy: "Greedy",
  expectimax: "Expectimax",
  neural: "Neural",
};
