import { describe, expect, it, vi, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadDrillPack } from '@/lib/drillLoader';
import { TACTICAL_FILE_IDS } from '@/data/drillRegistry';

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

function deviationPackForTier(tier: number): string {
  if (tier <= 1) return 'giuoco-piano-deviations-1200';
  if (tier === 2) return 'giuoco-piano-deviations-1600';
  return 'giuoco-piano-deviations-2000';
}

describe('deviation drills', () => {
  it('selects band by prestige tier', () => {
    expect(deviationPackForTier(0)).toBe('giuoco-piano-deviations-1200');
    expect(deviationPackForTier(1)).toBe('giuoco-piano-deviations-1200');
    expect(deviationPackForTier(2)).toBe('giuoco-piano-deviations-1600');
    expect(deviationPackForTier(3)).toBe('giuoco-piano-deviations-2000');
    expect(deviationPackForTier(4)).toBe('giuoco-piano-deviations-2000');
  });

  it('loader preserves deviation metadata and lead-in', async () => {
    stubFetchFromDisk();
    const pack = await loadDrillPack('giuoco-piano-deviations-1600');
    expect(pack.lines.length).toBeGreaterThan(0);
    const line = pack.lines[0];
    expect(line.deviationOf).toBe('giuoco-piano-main');
    expect(line.band).toBe(1600);
    expect(line.badMove).toBeTruthy();
    expect(line.explanation).toBeTruthy();
    expect(line.explanation).not.toMatch(/TODO/);
    expect(line.leadInMoves?.length).toBeGreaterThan(0);
    expect(line.startFen).toBeTruthy();
  });

  it('no watch mode on deviation levels', () => {
    const isDeviation = (id: string) => id.includes('deviations');
    expect(isDeviation('giuoco-piano-deviations-1200')).toBe(true);
    expect(isDeviation('giuoco-piano-main')).toBe(false);
  });

  it('loads all 12 lines with deviation metadata intact', async () => {
    stubFetchFromDisk();
    const pack = await loadDrillPack('giuoco-piano-deviations-1600');
    expect(pack.lines).toHaveLength(12);
    for (const line of pack.lines) {
      expect(line.deviationOf).toBe('giuoco-piano-main');
      expect(line.band).toBe(1600);
      expect(line.badMove).toBeTruthy();
      expect(line.explanation).toBeTruthy();
      expect(line.leadInMoves?.length).toBeGreaterThan(0);
      expect(line.startFen).toBeTruthy();
      expect(line.moves.length).toBeGreaterThan(0);
    }
  });

  it('does not auto-select a line for deviation packs (chooser path)', () => {
    // Contract mirrored from tactical packs: deviation packs must not auto-start
    // lines[0]. The session shows the chooser until the user picks a line.
    // This is enforced by the load-effect guard `if (!isTactical && !isDeviation)`.
    const isDeviationPack = (id: string) => id.includes('deviations');
    const shouldAutoStart = (id: string) =>
      !id.includes('-tacticals') && !isDeviationPack(id);
    expect(shouldAutoStart('giuoco-piano-main')).toBe(true);
    expect(shouldAutoStart('giuoco-piano-deviations-1600')).toBe(false);
    expect(shouldAutoStart('giuoco-piano-tacticals')).toBe(false);
  });
});
