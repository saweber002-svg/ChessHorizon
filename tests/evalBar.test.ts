import { describe, expect, it } from 'vitest';
import {
  formatEval,
  sideToMove,
  toWhitePerspective,
  whiteShare,
} from '@/lib/evalBar';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BLACK_TO_MOVE_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('sideToMove', () => {
  it('reads the turn field from a FEN', () => {
    expect(sideToMove(START_FEN)).toBe('w');
    expect(sideToMove(BLACK_TO_MOVE_FEN)).toBe('b');
  });

  it('defaults to White on a malformed FEN', () => {
    expect(sideToMove('nonsense')).toBe('w');
  });
});

describe('toWhitePerspective', () => {
  it('leaves scores alone when White is to move', () => {
    expect(toWhitePerspective({ type: 'cp', value: 150 }, 'w')).toEqual({ type: 'cp', value: 150 });
    expect(toWhitePerspective({ type: 'mate', value: 3 }, 'w')).toEqual({ type: 'mate', value: 3 });
  });

  it('flips scores when Black is to move', () => {
    expect(toWhitePerspective({ type: 'cp', value: 150 }, 'b')).toEqual({ type: 'cp', value: -150 });
    expect(toWhitePerspective({ type: 'cp', value: -40 }, 'b')).toEqual({ type: 'cp', value: 40 });
    expect(toWhitePerspective({ type: 'mate', value: 3 }, 'b')).toEqual({ type: 'mate', value: -3 });
    expect(toWhitePerspective({ type: 'mate', value: -2 }, 'b')).toEqual({ type: 'mate', value: 2 });
  });

  it('keeps zero at zero instead of producing -0', () => {
    expect(toWhitePerspective({ type: 'cp', value: 0 }, 'b').value).toBe(0);
  });
});

describe('whiteShare', () => {
  it('is 50% for a level position', () => {
    expect(whiteShare({ type: 'cp', value: 0 })).toBe(0.5);
  });

  it('follows the win-chance sigmoid for centipawn scores', () => {
    expect(whiteShare({ type: 'cp', value: 100 })).toBeCloseTo(0.591, 2);
    expect(whiteShare({ type: 'cp', value: -100 })).toBeCloseTo(0.409, 2);
    expect(whiteShare({ type: 'cp', value: 300 })).toBeCloseTo(0.751, 2);
    expect(whiteShare({ type: 'cp', value: -300 })).toBeCloseTo(0.249, 2);
  });

  it('saturates near the ends for a decisive advantage', () => {
    expect(whiteShare({ type: 'cp', value: 2000 })).toBeGreaterThan(0.99);
    expect(whiteShare({ type: 'cp', value: -2000 })).toBeLessThan(0.01);
  });

  it('fills or empties the bar for mate scores', () => {
    expect(whiteShare({ type: 'mate', value: 1 })).toBe(1);
    expect(whiteShare({ type: 'mate', value: 5 })).toBe(1);
    expect(whiteShare({ type: 'mate', value: -1 })).toBe(0);
    expect(whiteShare({ type: 'mate', value: -4 })).toBe(0);
  });
});

describe('formatEval', () => {
  it('formats centipawns as signed pawns with one decimal', () => {
    expect(formatEval({ type: 'cp', value: 123 })).toBe('+1.2');
    expect(formatEval({ type: 'cp', value: -80 })).toBe('-0.8');
    expect(formatEval({ type: 'cp', value: 50 })).toBe('+0.5');
    expect(formatEval({ type: 'cp', value: 0 })).toBe('0.0');
  });

  it('formats mate scores with M notation', () => {
    expect(formatEval({ type: 'mate', value: 3 })).toBe('M3');
    expect(formatEval({ type: 'mate', value: -2 })).toBe('-M2');
  });
});
