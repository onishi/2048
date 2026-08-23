import { createEmptyBoard, DEFAULT_BOARD_SIZE, getEmptyCells } from "./board";
import { isGameOver, move } from "./move";
import type { Rng } from "./rng";
import type { Board, Direction, GameState } from "./types";

/** 空きマスに新しいタイルを1つ生成する。2:90%, 4:10% (SPEC.md #10.4) */
export function spawnRandomTile(board: Board, rng: Rng): Board {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) return board;

  const cellIndex = emptyCells[Math.floor(rng.next() * emptyCells.length)];
  const value = rng.next() < 0.9 ? 2 : 4;

  const next = board.slice();
  next[cellIndex] = value;
  return next;
}

/** 初期盤面（タイル2つ配置済み）を持つ GameState を生成する。盤面サイズは可変 (issue #16, #17) */
export function createInitialState(rng: Rng, boardSize: number = DEFAULT_BOARD_SIZE): GameState {
  let board = createEmptyBoard(boardSize);
  board = spawnRandomTile(board, rng);
  board = spawnRandomTile(board, rng);

  return {
    board,
    score: 0,
    moveCount: 0,
    gameOver: false,
  };
}

/**
 * 手を1つ適用する。盤面が変化しない方向を指定した場合は state をそのまま返す。
 */
export function applyMove(state: GameState, direction: Direction, rng: Rng): GameState {
  if (state.gameOver) return state;

  const result = move(state.board, direction);
  if (!result.moved) return state;

  const boardWithNewTile = spawnRandomTile(result.board, rng);

  return {
    board: boardWithNewTile,
    score: state.score + result.scoreDelta,
    moveCount: state.moveCount + 1,
    gameOver: isGameOver(boardWithNewTile),
  };
}

export { getEmptyCells, getMaxTile, cloneBoard } from "./board";
export { getValidMoves, isGameOver, move } from "./move";
