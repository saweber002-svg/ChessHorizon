import { describe, it, expect } from 'vitest';
import {
  parseInfoLine,
  parseBestmoveLine,
  scoreToCp,
  computeCpLoss,
} from '@/engine/stockfish';
import { uciToSan, classifyMove, pvToSan, formatEval, deviationCopy, type DeviationAnalysis } from '@/lib/coachingAnalysis';

describe('parseInfoLine', () => {
  it('parses a centipawn info line', () => {
    const line = 'info depth 14 seldepth 21 multipv 1 score cp 34 nodes 123456 nps 1000000 time 123 pv e2e4 e7e5 g1f3';
    const parsed = parseInfoLine(line);
    expect(parsed).not.toBeNull();
    expect(parsed!.depth).toBe(14);
    expect(parsed!.score).toEqual({ type: 'cp', value: 34 });
    expect(parsed!.pv).toEqual(['e2e4', 'e7e5', 'g1f3']);
    expect(parsed!.multiPv).toBe(1);
  });

  it('parses a mate score', () => {
    const line = 'info depth 18 seldepth 30 multipv 1 score mate 3 nodes 999 time 50 pv d1h5 e8e7 h5f7';
    const parsed = parseInfoLine(line);
    expect(parsed!.score).toEqual({ type: 'mate', value: 3 });
  });

  it('parses a negative mate score', () => {
    const line = 'info depth 12 multipv 2 score mate -2 nodes 100 time 10 pv e8e7 d1h5';
    const parsed = parseInfoLine(line);
    expect(parsed!.score).toEqual({ type: 'mate', value: -2 });
    expect(parsed!.multiPv).toBe(2);
  });

  it('ignores non-search info lines', () => {
    expect(parseInfoLine('info currmove e2e4 currmovenumber 1')).toBeNull();
    expect(parseInfoLine('info string Stockfish 18 by ...')).toBeNull();
    expect(parseInfoLine('uciok')).toBeNull();
    expect(parseInfoLine('bestmove e2e4')).toBeNull();
    expect(parseInfoLine('info depth 5 score cp 10 nodes 1')).toBeNull(); // no pv
  });
});

describe('parseBestmoveLine', () => {
  it('parses bestmove with and without ponder', () => {
    expect(parseBestmoveLine('bestmove e2e4 ponder e7e5')).toBe('e2e4');
    expect(parseBestmoveLine('bestmove g1f3')).toBe('g1f3');
    expect(parseBestmoveLine('bestmove e7e8q')).toBe('e7e8q');
  });

  it('returns null when there is no move', () => {
    expect(parseBestmoveLine('bestmove (none)')).toBeNull();
    expect(parseBestmoveLine('info depth 10 score cp 5 pv e2e4')).toBeNull();
  });
});

describe('scoreToCp', () => {
  it('passes centipawns through, clamped', () => {
    expect(scoreToCp({ type: 'cp', value: 34 })).toBe(34);
    expect(scoreToCp({ type: 'cp', value: -200 })).toBe(-200);
    expect(scoreToCp({ type: 'cp', value: 99999 })).toBe(10000);
  });

  it('maps mates near +/-10000, faster mates slightly better', () => {
    const mate1 = scoreToCp({ type: 'mate', value: 1 });
    const mate5 = scoreToCp({ type: 'mate', value: 5 });
    expect(mate1).toBeGreaterThan(mate5);
    expect(mate1).toBeGreaterThan(9000);
    expect(scoreToCp({ type: 'mate', value: -2 })).toBeLessThan(-9000);
  });
});

describe('computeCpLoss', () => {
  it('computes plain centipawn loss', () => {
    expect(computeCpLoss({ type: 'cp', value: 50 }, { type: 'cp', value: 20 })).toBe(30);
  });

  it('never goes negative (a better-than-best find is still Best)', () => {
    expect(computeCpLoss({ type: 'cp', value: 20 }, { type: 'cp', value: 50 })).toBe(0);
  });

  it('losing a forced mate is a huge loss', () => {
    const loss = computeCpLoss({ type: 'mate', value: 3 }, { type: 'cp', value: 200 });
    expect(loss).toBeGreaterThan(9000);
    expect(classifyMove(loss)).toBe('Blunder');
  });

  it('getting mated is a huge loss', () => {
    const loss = computeCpLoss({ type: 'cp', value: 100 }, { type: 'mate', value: -2 });
    expect(loss).toBeGreaterThan(9000);
  });

  it('escaping mate counts as no loss', () => {
    expect(computeCpLoss({ type: 'mate', value: -3 }, { type: 'cp', value: -200 })).toBe(0);
  });

  it('delivering mate is no loss', () => {
    expect(computeCpLoss({ type: 'cp', value: 300 }, { type: 'mate', value: 1 })).toBe(0);
  });
});

describe('uciToSan', () => {
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  it('converts quiet moves, captures, and promotions', () => {
    expect(uciToSan(start, 'e2e4')).toBe('e4');
    expect(uciToSan(start, 'g1f3')).toBe('Nf3');
    expect(uciToSan('7k/5P2/8/8/8/8/6K1/8 w - - 0 1', 'f7f8q')).toBe('f8=Q+');
  });
});

describe('pvToSan', () => {
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  it('walks a principal variation into SAN', () => {
    expect(pvToSan(start, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('stops at the first illegal move', () => {
    expect(pvToSan(start, ['e2e4', 'e2e5'])).toEqual(['e4']);
  });

  it('handles promotions in the line', () => {
    expect(pvToSan('7k/5P2/8/8/8/8/6K1/8 w - - 0 1', ['f7f8q'])).toEqual(['f8=Q+']);
  });
});

describe('formatEval', () => {
  it('formats centipawns as signed pawn units', () => {
    expect(formatEval(34)).toBe('+0.3');
    expect(formatEval(-150)).toBe('-1.5');
    expect(formatEval(0)).toBe('0.0');
  });

  it('shows # for mate scores', () => {
    expect(formatEval(10000)).toBe('#');
    expect(formatEval(-9970)).toBe('#');
  });
});

describe('deviationCopy', () => {
  const base: DeviationAnalysis = {
    move: 'Nf3',
    classification: 'Mistake',
    cpLoss: 230,
    evalBefore: 40,
    evalAfter: -190,
    engineBest: 'd4',
    refutation: ['e5', 'Nxe5', 'd4'],
    bookMove: 'd4',
  };

  it('explains a real mistake with the eval swing and refutation', () => {
    const copy = deviationCopy(base);
    expect(copy.mild).toBe(false);
    expect(copy.title).toContain('Mistake');
    expect(copy.title).toContain('+0.4 → -1.9');
    expect(copy.detail).toContain('Book plays d4');
    expect(copy.refutationLine).toBe('e5 Nxe5 d4');
  });

  it('notes when the engine agrees with the book move', () => {
    const copy = deviationCopy({ ...base, engineBest: 'd4', bookMove: 'd4' });
    expect(copy.detail).not.toContain("engine's top choice");
  });

  it('flags when the engine prefers something else', () => {
    const copy = deviationCopy({ ...base, engineBest: 'c4', bookMove: 'd4' });
    expect(copy.detail).toContain("The engine's top choice is c4");
  });

  it('is gentle when the off-book move loses nothing', () => {
    const copy = deviationCopy({ ...base, cpLoss: 12, classification: 'Excellent', evalAfter: 35 });
    expect(copy.mild).toBe(true);
    expect(copy.title).toContain('no damage');
    expect(copy.detail).toContain('d4');
    expect(copy.refutationLine).toBeNull();
  });
});
