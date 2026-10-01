import { Chess } from 'chess.js';

export const WILDERNESS_SPAR_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Apply a SAN move list from the standard start position, stopping at the
 * first illegal move. Used to preload a custom opening line as the sparring
 * start position.
 */
export function buildStartPosition(moveSans: string[]): {
  fen: string;
  appliedSans: string[];
} {
  const game = new Chess();
  const appliedSans: string[] = [];
  for (const san of moveSans) {
    try {
      const m = game.move(san);
      appliedSans.push(m.san);
    } catch {
      break;
    }
  }
  return { fen: game.fen(), appliedSans };
}

/**
 * FEN after playing the first `step` moves of a SAN principal variation from
 * `baseFen`. Clamps step to [0, pvSan.length]; stops early on illegal moves.
 */
export function lineFenAt(baseFen: string, pvSan: string[], step: number): string {
  const game = new Chess(baseFen);
  const n = Math.max(0, Math.min(step, pvSan.length));
  for (let i = 0; i < n; i++) {
    try {
      game.move(pvSan[i]);
    } catch {
      break;
    }
  }
  return game.fen();
}

/**
 * True when the side to move in `fen` is one the human controls.
 * `userSide` is 'w' | 'b', or 'both' for free input on both colors.
 */
export function isHumanTurn(fen: string, userSide: 'w' | 'b' | 'both'): boolean {
  if (userSide === 'both') return true;
  try {
    return new Chess(fen).turn() === userSide;
  } catch {
    return false;
  }
}

/** FENs after each ply, starting with the initial position. */
export function positionsAfterMoves(startFen: string, moveSans: string[]): string[] {
  const positions = [startFen];
  const game = new Chess(startFen);
  for (const san of moveSans) {
    try {
      game.move(san);
      positions.push(game.fen());
    } catch {
      break;
    }
  }
  return positions;
}

/** Reason a game ended, or null while play continues. */
export function gameOverReason(fen: string): 'checkmate' | 'stalemate' | 'draw' | null {
  const game = new Chess(fen);
  if (!game.isGameOver()) return null;
  if (game.isCheckmate()) return 'checkmate';
  if (game.isStalemate()) return 'stalemate';
  return 'draw';
}
