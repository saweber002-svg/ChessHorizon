import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildFenFromMoves,
  getPlayerColorFromFen,
  isPlayerTurn,
  loadDrillPack,
  variationToDrillFileId,
} from '@/lib/drillLoader';
import { hasTacticalDrills } from '@/data/drillRegistry';
import { isQuarantinedTacticalFileId } from '@/data/quarantinedTacticalRegistry';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('drill loader', () => {
  it('normalizes a main-line pack and derives move count', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test-main',
        name: 'Test Main',
        lines: [{ id: 'line-1', moves: ['e4', 'e5'] }],
      }),
    }));

    const pack = await loadDrillPack('test-main');

    expect(pack.startFen).toBe(startFen);
    expect(pack.lines[0]).toMatchObject({
      id: 'line-1',
      moveCount: 2,
      difficulty: 'Standard',
    });
  });

  it('normalizes a tactical pack into playable lines with per-puzzle FENs', async () => {
    const tacticalFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test-tacticals',
        drills: [{
          drillId: 't-1',
          name: 'Test tactic',
          fen: tacticalFen,
          solutionMoves: ['e5'],
        }],
      }),
    }));

    const pack = await loadDrillPack('test-tacticals');

    expect(pack.lines).toHaveLength(1);
    expect(pack.lines[0]).toMatchObject({
      id: 't-1',
      startFen: tacticalFen,
      moves: ['e5'],
      moveCount: 1,
      difficulty: 'Tactical',
    });
  });

  it('rejects unsupported pack shapes and failed HTTP responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(loadDrillPack('missing')).rejects.toThrow('Failed to load drill: missing');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'invalid' }),
    }));
    await expect(loadDrillPack('invalid')).rejects.toThrow('Unsupported drill file format: invalid');
  });

  it('rejects quarantined tactical packs before fetching their preserved JSON', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadDrillPack('english-main-tacticals')).rejects.toThrow('quarantined pending validation');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('chess drill helpers', () => {
  it('reconstructs positions and reports side to move', () => {
    const afterWhiteMove = buildFenFromMoves(startFen, ['e4'], 1);
    expect(getPlayerColorFromFen(afterWhiteMove)).toBe('b');
    expect(isPlayerTurn(afterWhiteMove, 'b')).toBe(true);
    expect(isPlayerTurn(afterWhiteMove, 'w')).toBe(false);
  });

  it('maps variation IDs to main and tactical files', () => {
    expect(variationToDrillFileId('giuoco-piano')).toBe('giuoco-piano-main');
    expect(variationToDrillFileId('giuoco-piano', 'tacticals')).toBe('giuoco-piano-tacticals');
  });
});

describe('tactical registry', () => {
  it('recognizes registered tactical variants and rejects unknown variants', () => {
    expect(hasTacticalDrills('london-vs-qgd')).toBe(true);
    expect(hasTacticalDrills('french-advance')).toBe(false);
    expect(hasTacticalDrills('not-a-real-variation')).toBe(false);
    expect(isQuarantinedTacticalFileId('english-main-tacticals')).toBe(true);
    expect(isQuarantinedTacticalFileId('london-vs-qgd-tacticals')).toBe(false);
  });
});
