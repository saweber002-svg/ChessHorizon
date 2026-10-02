import { describe, expect, it, vi, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { loadDrillPack } from '@/lib/drillLoader';
import {
  hasPuzzleDrills,
  hasTacticalDrills,
  isTacticalPackId,
  TACTICAL_FILE_IDS,
} from '@/data/drillRegistry';

const DRILL_DATA = join(__dirname, '..', 'public', 'drill-data');

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

describe('tactical content (restored + puzzles)', () => {
  it('loads a real puzzle pack through the app loader with playable lines', async () => {
    stubFetchFromDisk();
    const pack = await loadDrillPack('sicilian-dragon-puzzles');
    expect(pack.lines.length).toBe(8);
    expect(pack.lines[0].name).toMatch(/\(\d{4}\)$/); // "Hanging Piece (1231)"
    for (const line of pack.lines) {
      expect(line.startFen).toBeTruthy();
      expect(line.moves.length).toBeGreaterThanOrEqual(2);
      // Every solution must replay legally from its own FEN.
      const chess = new Chess(line.startFen!);
      for (const san of line.moves) {
        expect(() => chess.move(san)).not.toThrow();
      }
    }
  });

  it('loads a restored tactical pack with engine-verified copy', async () => {
    stubFetchFromDisk();
    const pack = await loadDrillPack('scandinavian-qd6-tacticals');
    const raid = pack.lines.find((l) => l.id === 'scandinavian-qd6-t3');
    expect(raid?.name).toBe('Qxb7: The Queen Raid');
    expect(raid?.moves[0]).toBe('Qxb7');
  });

  it('every registered -puzzles pack loads and every line replays legally', async () => {
    stubFetchFromDisk();
    const puzzleIds = TACTICAL_FILE_IDS.filter((id) => id.endsWith('-puzzles'));
    expect(puzzleIds.length).toBeGreaterThan(0);
    for (const id of puzzleIds) {
      const pack = await loadDrillPack(id);
      expect(pack.lines.length).toBeGreaterThan(0);
      for (const line of pack.lines) {
        const chess = new Chess(line.startFen!);
        for (const san of line.moves) {
          const mv = chess.move(san);
          expect(mv, `${id}/${line.id}: illegal move ${san}`).toBeTruthy();
        }
      }
    }
  });

  it('recognizes both tactical pack kinds', () => {
    expect(isTacticalPackId('sicilian-dragon-tacticals')).toBe(true);
    expect(isTacticalPackId('sicilian-dragon-puzzles')).toBe(true);
    expect(isTacticalPackId('sicilian-dragon-main')).toBe(false);
    expect(hasPuzzleDrills('sicilian-dragon')).toBe(true);
    expect(hasPuzzleDrills('no-such-opening')).toBe(false);
    expect(hasTacticalDrills('scandinavian-qd6')).toBe(true);
  });
});

describe('slice-G lead-in moves', () => {
  it('every leadInMoves chain replays from the initial position into the drill FEN', async () => {
    stubFetchFromDisk();
    const leadInDrills: Array<[string, string]> = [
      ['english-reversed-sicilian-tacticals', 'ers-t1'],
      ['english-reversed-sicilian-tacticals', 'ers-t2'],
      ['english-reversed-sicilian-tacticals', 'ers-t3'],
      ['english-reversed-sicilian-tacticals', 'ers-t4'],
      ['evans-gambit-tacticals', 'evans-gambit-t3'],
      ['fried-liver-attack-black-tacticals', 'fried-liver-bt2'],
      ['greco-counter-attack-tacticals', 'greco-t3'],
      ['london-system-tacticals', 'london-system-t2'],
      ['london-vs-qgd-tacticals', 'qgd-t1'],
      ['london-vs-qgd-tacticals', 'qgd-t2'],
      ['london-vs-qgd-tacticals', 'qgd-t3'],
      ['london-vs-qgd-tacticals', 'qgd-t4'],
      ['moeller-attack-black-tacticals', 'moeller-bt2'],
      ['moeller-attack-tacticals', 'moeller-t1'],
      ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t1'],
      ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t2'],
      ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t3'],
      ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t4'],
      ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t1'],
      ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t2'],
      ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t3'],
      ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t4'],
      ['scandinavian-qd6-tacticals', 'scandinavian-qd6-t3'],
      ['sicilian-classical-tacticals', 'sicilian-classical-t1'],
      ['sicilian-classical-tacticals', 'sicilian-classical-t2'],
      ['sicilian-classical-tacticals', 'sicilian-classical-t3'],
      ['sicilian-classical-tacticals', 'sicilian-classical-t4'],
      ['sicilian-dragon-tacticals', 'sicilian-dragon-t1'],
      ['sicilian-dragon-tacticals', 'sicilian-dragon-t2'],
      ['sicilian-dragon-tacticals', 'sicilian-dragon-t3'],
      ['sicilian-dragon-tacticals', 'sicilian-dragon-t4'],
      ['sicilian-sveshnikov-tacticals', 'sicilian-sveshnikov-t1'],
      ['traxler-counter-attack-black-tacticals', 'traxler-bt2'],
    ];
    expect(leadInDrills).toHaveLength(33);
    const norm = (fen: string) => fen.split(' ').slice(0, 4).join(' ');
    for (const [packId, drillId] of leadInDrills) {
      const pack = await loadDrillPack(packId);
      const line = pack.lines.find((l) => l.id === drillId);
      expect(line?.leadInMoves?.length).toBeGreaterThan(0);
      // The tactic itself still starts at its own first move.
      const chess = new Chess(line!.startFen!);
      for (const san of line!.moves) chess.move(san);
    }
  });
});
