import { createEmptyBoard, DEFAULT_BOARD_SIZE, getEmptyCells } from "./board";
import { isGameOver, move } from "./move";
import type { Rng } from "./rng";
import type { Board, Direction, GameState } from "./types";

/** 開始タイル値は可変 (issue #20)。既定は従来通り 2 から始まる。 */
export const DEFAULT_START_TILE = 2;

/** 空きマスに新しいタイルを1つ生成する。startTile:90%, startTile*2:10% (SPEC.md #10.4, issue #20) */
export function spawnRandomTile(board: Board, rng: Rng, startTile: number = DEFAULT_START_TILE): Board {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) return board;

  const cellIndex = emptyCells[Math.floor(rng.next() * emptyCells.length)];
  const value = rng.next() < 0.9 ? startTile : startTile * 2;

  const next = board.slice();
  next[cellIndex] = value;
  return next;
}

/**
 * 初期盤面（タイル2つ配置済み）を持つ GameState を生成する。
 * 盤面サイズ(issue #16, #17)・開始タイル値(issue #20)は可変。
 */
export function createInitialState(
  rng: Rng,
  boardSize: number = DEFAULT_BOARD_SIZE,
  startTile: number = DEFAULT_START_TILE,
): GameState {
  let board = createEmptyBoard(boardSize);
  board = spawnRandomTile(board, rng, startTile);
  board = spawnRandomTile(board, rng, startTile);

  return {
    board,
    score: 0,
    moveCount: 0,
    gameOver: false,
    startTile,
  };
}

/**
 * 手を1つ適用する。盤面が変化しない方向を指定した場合は state をそのまま返す。
 */
export function applyMove(state: GameState, direction: Direction, rng: Rng): GameState {
  if (state.gameOver) return state;

  const result = move(state.board, direction);
  if (!result.moved) return state;

  const boardWithNewTile = spawnRandomTile(result.board, rng, state.startTile);

  return {
    board: boardWithNewTile,
    score: state.score + result.scoreDelta,
    moveCount: state.moveCount + 1,
    gameOver: isGameOver(boardWithNewTile),
    startTile: state.startTile,
  };
}

export { getEmptyCells, getMaxTile, cloneBoard } from "./board";
export { getValidMoves, isGameOver, move } from "./move";
