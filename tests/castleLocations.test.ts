import { describe, expect, it } from 'vitest';
import {
  CASTLE_BY_VARIATION,
  CASTLE_LOCATIONS,
  declutterPositions,
  fitCastlesView,
  latLngToMap,
} from '@/data/castleLocations';
import { getKingdomDrills, kingdomHasDrills } from '@/data/kingdomDrills';
import type { KingdomId } from '@/types';

const DRILL_KINGDOMS: KingdomId[] = [
  'italian',
  'queendom',
  'french',
  'dutch',
  'spanish',
  'germany',
  'sicilian',
  'scandinavian',
  'english',
];

describe('castle assignments', () => {
  it('assigns exactly one castle to every drillable opening', () => {
    const seen = new Set<string>();
    for (const kingdom of DRILL_KINGDOMS) {
      expect(kingdomHasDrills(kingdom)).toBe(true);
      for (const d of getKingdomDrills(kingdom)) {
        const castle = CASTLE_BY_VARIATION[d.variationId];
        expect(castle, `no castle for ${d.variationId}`).toBeDefined();
        expect(castle.castle.length).toBeGreaterThan(0);
        seen.add(d.variationId);
      }
    }
    // No duplicate variation ids in the table.
    expect(seen.size).toBe(CASTLE_LOCATIONS.length);
    expect(CASTLE_LOCATIONS.length).toBeGreaterThanOrEqual(30);
  });

  it('keeps every castle inside Europe', () => {
    for (const c of CASTLE_LOCATIONS) {
      expect(c.lat, `${c.castle} lat`).toBeGreaterThan(35);
      expect(c.lat, `${c.castle} lat`).toBeLessThan(72);
      expect(c.lng, `${c.castle} lng`).toBeGreaterThan(-12);
      expect(c.lng, `${c.castle} lng`).toBeLessThan(45);
    }
  });

  it('uses a unique castle per opening', () => {
    const names = CASTLE_LOCATIONS.map((c) => c.castle);
    expect(new Set(names).size).toBe(names.length);
  });

  it('never lists tactical/puzzle packs: they have no icons and live only on the post-completion selection screen', () => {
    for (const kingdom of DRILL_KINGDOMS) {
      for (const d of getKingdomDrills(kingdom)) {
        expect(d.drillFileId.endsWith('-main'), `${d.drillFileId} in ${kingdom}`).toBe(true);
        expect(d.drillFileId).not.toMatch(/-(tacticals|black-tacticals|puzzles)$/i);
      }
    }
  });
});

describe('latLngToMap', () => {
  it('maps Rome to its measured position on the atlas', () => {
    const p = latLngToMap(41.9, 12.5);
    expect(p.x).toBeCloseTo(52.3, 0);
    expect(p.y).toBeCloseTo(54.5, 1);
  });

  it('maps the Tower of London west of Prague Castle', () => {
    const london = latLngToMap(51.5081, 0.0759);
    const prague = latLngToMap(50.0901, 14.4014);
    expect(london.x).toBeLessThan(prague.x);
    expect(london.y).toBeLessThan(prague.y); // London is further north
  });

  it('keeps every castle on the map', () => {
    for (const c of CASTLE_LOCATIONS) {
      const p = latLngToMap(c.lat, c.lng);
      expect(p.x, `${c.castle} x`).toBeGreaterThan(0);
      expect(p.x, `${c.castle} x`).toBeLessThan(100);
      expect(p.y, `${c.castle} y`).toBeGreaterThan(0);
      expect(p.y, `${c.castle} y`).toBeLessThan(100);
    }
  });
});

describe('declutterPositions', () => {
  it('pushes coincident markers apart to the minimum separation', () => {
    const out = declutterPositions(
      [
        { x: 50, y: 50 },
        { x: 50, y: 50 },
      ],
      4.2,
    );
    expect(Math.hypot(out[1].x - out[0].x, out[1].y - out[0].y)).toBeGreaterThanOrEqual(4.2 - 1e-6);
  });

  it('leaves well-separated markers untouched', () => {
    const pts = [
      { x: 10, y: 10 },
      { x: 90, y: 90 },
    ];
    expect(declutterPositions(pts, 4.2)).toEqual(pts);
  });

  it('is deterministic', () => {
    const pts = [
      { x: 50, y: 50 },
      { x: 51, y: 50.5 },
      { x: 49.5, y: 51 },
    ];
    expect(declutterPositions(pts, 4.2)).toEqual(declutterPositions(pts, 4.2));
  });
});

describe('fitCastlesView', () => {
  it('centers a single castle at max zoom', () => {
    const v = fitCastlesView([{ x: 40, y: 60 }]);
    expect(v.zoom).toBe(3.2);
    expect(v.centerX).toBe(40);
    expect(v.centerY).toBe(60);
  });

  it('zooms out to fit a wide spread of castles', () => {
    const v = fitCastlesView([
      { x: 10, y: 52.5 },
      { x: 90, y: 54.4 },
    ]);
    expect(v.zoom).toBeLessThan(3.2);
    expect(v.zoom).toBeCloseTo(100 / (80 * 1.35), 3);
    expect(v.centerX).toBeCloseTo(50, 1);
  });
});
