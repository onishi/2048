import { AI_VERSIONS } from "./ai-version";
import { runBenchmark, type BenchmarkSummary } from "./benchmark";
import type { Player } from "./player";
import type { AiType } from "./player-types";

/** AI 同士の比較結果 (SPEC.md #54, #61)。AI Version を必ず記録する。 */
export interface ComparisonEntry {
  aiType: AiType;
  version: string;
  summary: BenchmarkSummary;
}

export interface RunComparisonOptions {
  aiTypes: AiType[];
  games: number;
  createPlayer: (aiType: AiType) => Player;
  onProgress?: (aiType: AiType, completed: number, total: number) => void;
}

/**
 * 複数の AI を同条件(ゲーム数)で自動対局させ、比較結果を返す (SPEC.md #54, Phase 10)。
 */
export async function runComparison(options: RunComparisonOptions): Promise<ComparisonEntry[]> {
  const { aiTypes, games, createPlayer, onProgress } = options;
  const entries: ComparisonEntry[] = [];

  for (const aiType of aiTypes) {
    const summary = await runBenchmark({
      games,
      createPlayer: () => createPlayer(aiType),
      onProgress: (completed, total) => onProgress?.(aiType, completed, total),
    });
    entries.push({ aiType, version: AI_VERSIONS[aiType], summary });
  }

  return entries;
}
