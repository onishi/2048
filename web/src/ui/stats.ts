import type { BenchmarkSummary } from "../ai/benchmark";
import type { EvaluationBreakdown } from "../ai/evaluator";
import type { Direction } from "../game/types";

/** AI 情報表示に必要なデータ (SPEC.md #14.2) */
export interface AiStatsData {
  direction: Direction;
  evaluation: number;
  actionValues: Partial<Record<Direction, number>>;
  depth: number;
  nodes: number;
  cacheHits: number;
  elapsedMs: number;
  breakdown: EvaluationBreakdown;
}

const DIRECTION_ORDER: Direction[] = ["up", "down", "left", "right"];
const DIRECTION_LABELS: Record<Direction, string> = {
  up: "UP",
  down: "DOWN",
  left: "LEFT",
  right: "RIGHT",
};

const BREAKDOWN_LABELS: { key: keyof Omit<EvaluationBreakdown, "total">; label: string }[] = [
  { key: "empty", label: "Empty" },
  { key: "monotonicity", label: "Monotonicity" },
  { key: "smoothness", label: "Smoothness" },
  { key: "merge", label: "Merge" },
  { key: "corner", label: "Corner" },
  { key: "snake", label: "Snake" },
];

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

/** AI の判断根拠(Action Values / 探索統計 / 評価内訳)を表示する (SPEC.md #14.2) */
export function renderAiStats(container: HTMLElement, data: AiStatsData | null): void {
  if (!data) {
    container.innerHTML = "";
    container.classList.remove("visible");
    return;
  }
  container.classList.add("visible");

  const actionRows = DIRECTION_ORDER.filter((direction) => data.actionValues[direction] !== undefined)
    .map((direction) => {
      const value = data.actionValues[direction] as number;
      const isBest = direction === data.direction;
      return `
        <tr class="${isBest ? "best" : ""}">
          <td>${DIRECTION_LABELS[direction]}</td>
          <td>${formatNumber(value)}</td>
          <td>${isBest ? "← BEST" : ""}</td>
        </tr>`;
    })
    .join("");

  const breakdownRows = BREAKDOWN_LABELS.map(
    ({ key, label }) => `<tr><td>${label}</td><td>${formatNumber(data.breakdown[key])}</td></tr>`,
  ).join("");

  container.innerHTML = `
    <table class="action-values">
      <thead><tr><th>Dir</th><th>Value</th><th></th></tr></thead>
      <tbody>${actionRows}</tbody>
    </table>
    <dl class="search-stats">
      <div><dt>Depth</dt><dd>${data.depth}</dd></div>
      <div><dt>Nodes</dt><dd>${data.nodes.toLocaleString()}</dd></div>
      <div><dt>Cache Hits</dt><dd>${data.cacheHits.toLocaleString()}</dd></div>
      <div><dt>Time</dt><dd>${data.elapsedMs.toFixed(1)} ms</dd></div>
    </dl>
    <details class="evaluator-breakdown">
      <summary>Evaluator Breakdown (total: ${formatNumber(data.evaluation)})</summary>
      <table>
        <tbody>${breakdownRows}</tbody>
      </table>
    </details>
  `;
}

/** 簡易ベンチマークの結果を表示する (SPEC.md #14.4, #44) */
export function renderBenchmarkResults(container: HTMLElement, summary: BenchmarkSummary): void {
  const tileLines = Object.entries(summary.tileDistribution)
    .map(([tile, count]) => [Number(tile), count] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([tile, count]) => `  ${tile}: ${((count / summary.games) * 100).toFixed(1)}%`)
    .join("\n");

  container.textContent = [
    `Games: ${summary.games}`,
    `Average Score: ${Math.round(summary.averageScore).toLocaleString()}`,
    `Best Score: ${summary.bestScore.toLocaleString()}`,
    `Average Moves: ${summary.averageMoves.toFixed(1)}`,
    `Elapsed: ${(summary.elapsedMs / 1000).toFixed(1)}s`,
    "",
    "Max Tile Distribution:",
    tileLines,
  ].join("\n");
}
