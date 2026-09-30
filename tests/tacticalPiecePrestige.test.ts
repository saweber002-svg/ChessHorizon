import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { attributeTacticPieces } from '@/lib/tacticalPiecePrestige';
import { buildFenFromMoves, loadDrillPack } from '@/lib/drillLoader';
import type { Tier } from '@/types';

const DRILL_DATA = join(__dirname, '..', 'public', 'drill-data');
const START =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function stubFetchFromDisk() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (url: string) => {
      const m = /drill-data\/(.+)\.json$/.exec(url);
      if (!m) return { ok: false };
      try {
        const json = JSON.parse(readFileSync(join(DRILL_DATA, `${m[1]}.json`), 'utf8'));
        return { ok: true, json: async () => json };
      } catch {
        return { ok: false };
      }
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('attributeTacticPieces', () => {
  const openingMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];

  it('credits the opening pieces the hero side moved in the tactic', () => {
    const tacticStart = buildFenFromMoves(START, openingMoves, 4); // after 1.e4 e5 2.Nf3 Nc6
    const result = attributeTacticPieces(START, openingMoves, [
      { startFen: tacticStart, moves: ['Bc4', 'Bc5'], tier: 2 as Tier },
    ]);
    // White's f1-bishop delivered the tactic; Black's reply earns nothing.
    expect(result.get('f1')).toBe(2);
    expect(result.get('f8')).toBeUndefined();
    expect(result.size).toBe(1);
  });

  it('credits nothing when the tactic does not match the opening line', () => {
    const result = attributeTacticPieces(START, openingMoves, [
      {
        // Sicilian position: nowhere on the Italian Game main line.
        startFen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        moves: ['Nf3'],
        tier: 3 as Tier,
      },
    ]);
    expect(result.size).toBe(0);
  });

  it('credits nothing for tier-0 tactics', () => {
    const tacticStart = buildFenFromMoves(START, openingMoves, 4);
    const result = attributeTacticPieces(START, openingMoves, [
      { startFen: tacticStart, moves: ['Bc4'], tier: 0 as Tier },
    ]);
    expect(result.size).toBe(0);
  });

  it('takes the best tier when a piece appears in several tactics', () => {
    const tacticStart = buildFenFromMoves(START, openingMoves, 4);
    const result = attributeTacticPieces(START, openingMoves, [
      { startFen: tacticStart, moves: ['Bc4'], tier: 1 as Tier },
      { startFen: tacticStart, moves: ['Bb5', 'a6', 'Ba4'], tier: 3 as Tier },
    ]);
    expect(result.get('f1')).toBe(3);
  });

  it('attributes a black-to-move tactic to Black pieces only', () => {
    const tacticStart = buildFenFromMoves(START, openingMoves, 5); // after 3.Bc4, Black to move
    const result = attributeTacticPieces(START, openingMoves, [
      { startFen: tacticStart, moves: ['Bc5', 'c3'], tier: 2 as Tier },
    ]);
    expect(result.get('f8')).toBe(2);
    expect(result.get('c3' as never)).toBeUndefined();
    expect(result.size).toBe(1);
  });

  it('maps real tactic packs onto their opening main line', async () => {
    stubFetchFromDisk();
    const main = await loadDrillPack('evans-gambit-main');
    const tacticals = await loadDrillPack('evans-gambit-tacticals');
    const mainLine = main.lines[0];
    expect(mainLine).toBeDefined();

    const result = attributeTacticPieces(main.startFen, mainLine!.moves, tacticals.lines.map((l) => ({
      startFen: l.startFen ?? tacticals.startFen,
      moves: l.moves,
      tier: 2 as Tier,
    })));

    // evans-gambit-t3: Nbd2 exd5... the b1-knight, e2-pawn and c2-pawn
    // deliver the tactic; Black's replies (Nf6, dxe5) earn nothing.
    expect(result.get('b1')).toBe(2);
    expect(result.get('e2')).toBe(2);
    expect(result.get('c2')).toBe(2);
    expect(result.size).toBe(3);
    for (const pieceId of result.keys()) {
      // White's home ranks only: Black's replies earn nothing.
      expect(['1', '2']).toContain(pieceId[1]);
    }
  });
});
