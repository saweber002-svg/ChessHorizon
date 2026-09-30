import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { computeTrophyPosition } from '@/lib/trophyPosition';
import { getKingdomDrills, kingdomHasDrills } from '@/data/kingdomDrills';

const START =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('computeTrophyPosition', () => {
  it('replays the Giuoco Piano main line to the known final FEN', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2', 'd5', 'exd5', 'Nxd5', 'Qb3', 'Nce7', 'O-O', 'O-O'];
    const pos = computeTrophyPosition(START, moves);
    const expected = new Chess(START);
    moves.forEach((m) => expected.move(m));
    expect(pos.finalFen).toBe(expected.fen());
  });

  it('attributes captured pieces to the capturer', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4 Bb4+ ... (exchange on d2)
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2'];
    const pos = computeTrophyPosition(START, moves);
    // Black lost a pawn (exd4) and a bishop (Bxd2+); white lost a pawn and a bishop.
    expect(pos.capturedByWhite).toContain('p');
    expect(pos.capturedByWhite).toContain('b');
    expect(pos.capturedByBlack).toContain('p');
    expect(pos.capturedByBlack).toContain('b');
  });

  it('records which piece type moved on each move index', () => {
    const pos = computeTrophyPosition(START, ['e4', 'e5', 'Nf3']);
    expect(pos.moverAtIndex.get(0)).toBe('wp');
    expect(pos.moverAtIndex.get(1)).toBe('bp');
    expect(pos.moverAtIndex.get(2)).toBe('wn');
  });

  it('keeps every surviving piece on a unique final square', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6'];
    const pos = computeTrophyPosition(START, moves);
    const squares = pos.pieces.map((p) => p.square);
    expect(new Set(squares).size).toBe(squares.length);
    // 32 - 0 captures = 32 pieces
    expect(pos.pieces.length).toBe(32);
    expect(pos.capturedByWhite).toHaveLength(0);
    expect(pos.capturedByBlack).toHaveLength(0);
  });
});

describe('individual piece identity', () => {
  it('records which individual piece moved on each move index', () => {
    const pos = computeTrophyPosition(START, ['e4', 'e5', 'Nf3', 'Nc6']);
    expect(pos.moverIdAtIndex.get(0)).toBe('e2');
    expect(pos.moverIdAtIndex.get(1)).toBe('e7');
    expect(pos.moverIdAtIndex.get(2)).toBe('g1');
    expect(pos.moverIdAtIndex.get(3)).toBe('b8');
  });

  it('keeps the two knights independent through the replay', () => {
    const pos = computeTrophyPosition(START, ['Nf3', 'Nf6', 'Nc3', 'Nc6']);
    expect(pos.moverIdAtIndex.get(0)).toBe('g1');
    expect(pos.moverIdAtIndex.get(2)).toBe('b1');
    const byId = new Map(pos.pieces.map((p) => [p.pieceId, p.square]));
    expect(byId.get('g1')).toBe('f3');
    expect(byId.get('b1')).toBe('c3');
  });

  it('carries the rook identity through castling', () => {
    const pos = computeTrophyPosition(START, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']);
    const byId = new Map(pos.pieces.map((p) => [p.pieceId, p.square]));
    expect(byId.get('e1')).toBe('g1');
    expect(byId.get('h1')).toBe('f1');
  });

  it('removes the captured pawn on en passant and keeps the mover identity', () => {
    const pos = computeTrophyPosition(START, ['e4', 'a6', 'e5', 'd5', 'exd6']);
    const byId = new Map(pos.pieces.map((p) => [p.pieceId, p.square]));
    expect(byId.get('e2')).toBe('d6');
    expect(byId.has('d7')).toBe(false);
    expect(pos.capturedByWhite).toContain('p');
  });

  it('keeps pawn identity through promotion', () => {
    const pos = computeTrophyPosition('8/4P3/8/8/8/1k6/8/4K3 w - - 0 1', ['e8=Q']);
    expect(pos.moverIdAtIndex.get(0)).toBe('e7');
    const queen = pos.pieces.find((p) => p.type === 'q' && p.color === 'w');
    expect(queen?.pieceId).toBe('e7');
    expect(queen?.square).toBe('e8');
  });
});

describe('getKingdomDrills', () => {
  it('returns the nine Italian variations (orphan Italian-family packs included)', () => {
    const drills = getKingdomDrills('italian');
    expect(drills.map((d) => d.drillFileId).sort()).toEqual(
      [
        'evans-gambit-main',
        'fried-liver-attack-main',
        'giuoco-pianissimo-main',
        'giuoco-piano-main',
        'greco-counter-attack-main',
        'moeller-attack-main',
        'traxler-counter-attack-main',
        'two-knights-main',
        'ulvestad-variation-main',
      ].sort()
    );
    expect(drills.every((d) => d.openingId === 'italian')).toBe(true);
  });

  it('maps Spain to ruy-lopez packs and Germany to caro packs', () => {
    const spain = getKingdomDrills('spanish');
    expect(spain.length).toBeGreaterThan(0);
    expect(spain.every((d) => d.drillFileId.startsWith('ruy-lopez-'))).toBe(true);
    expect(spain.every((d) => d.openingId === 'spanish')).toBe(true);

    const germany = getKingdomDrills('germany');
    expect(germany.length).toBeGreaterThan(0);
    expect(germany.every((d) => d.drillFileId.startsWith('caro-'))).toBe(true);
  });

  it('covers the queendom with its five prefixes', () => {
    const drills = getKingdomDrills('queendom');
    expect(drills.length).toBeGreaterThan(0);
    expect(
      drills.every((d) =>
        ['queen-', 'slav-', 'budapest-', 'blackmar-', 'london-'].some((p) => d.drillFileId.startsWith(p))
      )
    ).toBe(true);
  });

  it('returns only -main packs', () => {
    for (const k of ['sicilian', 'french', 'dutch', 'scandinavian', 'english'] as const) {
      expect(getKingdomDrills(k).every((d) => d.drillFileId.endsWith('-main'))).toBe(true);
    }
  });

  it('returns empty for special kingdoms', () => {
    expect(getKingdomDrills('wilderness')).toHaveLength(0);
    expect(getKingdomDrills('clearing')).toHaveLength(0);
    expect(getKingdomDrills('coaching')).toHaveLength(0);
  });

  it('kingdomHasDrills agrees with getKingdomDrills', () => {
    expect(kingdomHasDrills('sicilian')).toBe(true);
    expect(kingdomHasDrills('wilderness')).toBe(false);
  });
});
