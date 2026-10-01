import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  SPAR_START_FEN,
  buildStartPosition,
  lineFenAt,
  isHumanTurn,
  gameOverReason,
  positionsAfterMoves,
  takebackPlyCount,
} from '@/lib/sparring';

describe('buildStartPosition', () => {
  it('applies a legal opening line from the start position', () => {
    const { fen, appliedSans } = buildStartPosition(['e4', 'e5', 'Nf3']);
    expect(appliedSans).toEqual(['e4', 'e5', 'Nf3']);
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    game.move('Nf3');
    expect(fen).toBe(game.fen());
  });

  it('stops at the first illegal move', () => {
    const { fen, appliedSans } = buildStartPosition(['e4', 'Qh5', 'Nf3']);
    // Qh5 is illegal on move 1 for Black? No — Qh5 is White's move and it's Black's turn.
    expect(appliedSans).toEqual(['e4']);
    const game = new Chess();
    game.move('e4');
    expect(fen).toBe(game.fen());
  });

  it('returns the start position for an empty line', () => {
    const { fen, appliedSans } = buildStartPosition([]);
    expect(appliedSans).toEqual([]);
    expect(fen).toBe(SPAR_START_FEN);
  });
});

describe('lineFenAt', () => {
  const pv = ['e4', 'e5', 'Nf3', 'Nc6'];

  it('returns the base FEN at step 0', () => {
    expect(lineFenAt(SPAR_START_FEN, pv, 0)).toBe(SPAR_START_FEN);
  });

  it('plays the first N moves of the line', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    expect(lineFenAt(SPAR_START_FEN, pv, 2)).toBe(game.fen());
  });

  it('clamps steps beyond the line length', () => {
    const game = new Chess();
    for (const san of pv) game.move(san);
    expect(lineFenAt(SPAR_START_FEN, pv, 99)).toBe(game.fen());
    expect(lineFenAt(SPAR_START_FEN, pv, -3)).toBe(SPAR_START_FEN);
  });
});

describe('isHumanTurn', () => {
  it('matches the side to move for w/b choices', () => {
    expect(isHumanTurn(SPAR_START_FEN, 'w')).toBe(true);
    expect(isHumanTurn(SPAR_START_FEN, 'b')).toBe(false);
    const afterE4 = new Chess();
    afterE4.move('e4');
    expect(isHumanTurn(afterE4.fen(), 'w')).toBe(false);
    expect(isHumanTurn(afterE4.fen(), 'b')).toBe(true);
  });

  it('is always true in free-input (both) mode', () => {
    expect(isHumanTurn(SPAR_START_FEN, 'both')).toBe(true);
    const afterE4 = new Chess();
    afterE4.move('e4');
    expect(isHumanTurn(afterE4.fen(), 'both')).toBe(true);
  });
});

describe('positionsAfterMoves', () => {
  it('returns the start plus one FEN per move', () => {
    const positions = positionsAfterMoves(SPAR_START_FEN, ['e4', 'e5']);
    expect(positions).toHaveLength(3);
    expect(positions[0]).toBe(SPAR_START_FEN);
    const game = new Chess();
    game.move('e4');
    expect(positions[1]).toBe(game.fen());
    game.move('e5');
    expect(positions[2]).toBe(game.fen());
  });
});

describe('gameOverReason', () => {
  it('returns null for an ongoing game', () => {
    expect(gameOverReason(SPAR_START_FEN)).toBeNull();
  });

  it('detects checkmate via fools mate', () => {
    const { fen } = buildStartPosition(['f3', 'e5', 'g4', 'Qh4#']);
    expect(gameOverReason(fen)).toBe('checkmate');
  });

  it('detects stalemate', () => {
    // Black to move, no legal moves, not in check.
    expect(gameOverReason('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toBe('stalemate');
  });
});

describe('takebackPlyCount', () => {
  const pos = (sans: string[]) => positionsAfterMoves(SPAR_START_FEN, sans);

  it('rewinds the engine reply plus the human move (user White)', () => {
    // 1.e4 e5 2.Nf3 Nc6 — take back 2 plies, White to move.
    expect(takebackPlyCount(pos(['e4', 'e5', 'Nf3', 'Nc6']), 0, 'w')).toBe(2);
  });

  it('rewinds only the human move when the engine has not replied yet', () => {
    expect(takebackPlyCount(pos(['e4']), 0, 'w')).toBe(1);
  });

  it('rewinds the engine reply plus the human move (user Black)', () => {
    // 1.e4 (engine) e5 (human) 2.Nf3 (engine) — take back 2, Black to move.
    expect(takebackPlyCount(pos(['e4', 'e5', 'Nf3']), 0, 'b')).toBe(2);
  });

  it('rewinds one ply with "both sides" mode', () => {
    expect(takebackPlyCount(pos(['e4', 'e5', 'Nf3']), 0, 'both')).toBe(1);
  });

  it('never rewinds into preloaded opening moves', () => {
    // Two preloaded plies + two played: only the played plies come back.
    expect(takebackPlyCount(pos(['e4', 'e5', 'Nf3', 'Nc6']), 2, 'w')).toBe(2);
    // Nothing played beyond the preload: no-op.
    expect(takebackPlyCount(pos(['e4', 'e5']), 2, 'w')).toBe(0);
  });

  it('is a no-op with no moves played', () => {
    expect(takebackPlyCount(pos([]), 0, 'w')).toBe(0);
  });
});
