import type { Board, Direction } from "../game/types";

/**
 * AI プレイヤーの共通インターフェース (SPEC.md #11.1)。
 * AI 計算を Worker で行う（Phase 4）ため、最初から非同期インターフェースとする。
 */
export interface Player {
  chooseMove(board: Board): Promise<Direction>;
}
