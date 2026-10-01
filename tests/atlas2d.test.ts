import { describe, expect, it } from 'vitest';
import {
  clampViewBox,
  createInitialViewBox,
  panViewBox,
  zoomViewBox,
  flyToTarget,
  tweenViewBox,
  easeInOutCubic,
  mulberry32,
  markerScale,
  castleIconPx,
  CASTLE_ICON_UNITS,
  MARKER_DESIGN_W,
  MIN_VIEW_W,
  maxViewW,
} from '@/components/world-map/atlasCamera';
import {
  shortRealmName,
  getMarkerLockState,
  getUnlockThreshold,
} from '@/components/world-map/Atlas2D';
import { MAP_LOCATIONS } from '@/data/mapLocations';
import { KINGDOM_POSITIONS } from '@/types';
import type { KingdomId } from '@/types';

const ASPECT = 16 / 10;

describe('atlas camera math', () => {
  it('starts over the western Mediterranean, not on the full map', () => {
    const vb = createInitialViewBox(ASPECT);
    expect(vb.w).toBe(24);
    expect(vb.h).toBeCloseTo(24 / ASPECT, 10);
    expect(vb.x + vb.w / 2).toBeCloseTo(48, 10);
    expect(vb.y + vb.h / 2).toBeCloseTo(58, 1);
  });

  it('initial view frames Italy with Sicily and France a short pan away', () => {
    // Common phone / tablet / desktop aspects.
    for (const aspect of [0.46, 1, 4 / 3, 16 / 10, 16 / 9]) {
      const vb = createInitialViewBox(aspect);
      const pos = KINGDOM_POSITIONS.italian;
      expect(pos.x, `italian x @ aspect ${aspect}`).toBeGreaterThanOrEqual(vb.x);
      expect(pos.x, `italian x @ aspect ${aspect}`).toBeLessThanOrEqual(vb.x + vb.w);
      expect(pos.y, `italian y @ aspect ${aspect}`).toBeGreaterThanOrEqual(vb.y);
      expect(pos.y, `italian y @ aspect ${aspect}`).toBeLessThanOrEqual(vb.y + vb.h);
    }
    // Sicily sits just south, France just west: one swipe away on portrait/square screens.
    for (const aspect of [0.46, 1]) {
      const vb = createInitialViewBox(aspect);
      for (const kingdom of ['sicilian', 'french'] as const) {
        const kp = KINGDOM_POSITIONS[kingdom];
        expect(Math.abs(kp.x - (vb.x + vb.w / 2))).toBeLessThanOrEqual(vb.w / 2 + 8);
        expect(Math.abs(kp.y - (vb.y + vb.h / 2))).toBeLessThanOrEqual(vb.h / 2 + 8);
      }
    }
  });

  it('creates a portrait initial viewBox clamped inside the world', () => {
    const vb = createInitialViewBox(0.5);
    // Portrait: INITIAL_W (24) is smaller than maxViewW (39.72), so w=24.
    expect(vb.w).toBeCloseTo(24, 1);
    expect(vb.h).toBeCloseTo(48, 1);
    expect(vb.x).toBeCloseTo(48 - vb.w / 2, 10);
    // y gets clamped: 58-24=34 would put vb.y+48=82 above the viewable world (79.42).
    expect(vb.y).toBeCloseTo(31.44, 0);
  });

  it('pans the camera so content follows the pointer', () => {
    const vb = createInitialViewBox(ASPECT);
    // Drag right by half the viewport width -> camera moves left by half the viewBox width.
    const next = panViewBox(vb, 800, 0, 1600, 1000, ASPECT);
    expect(next.x).toBeCloseTo(vb.x - 12, 10);
    expect(next.y).toBeCloseTo(vb.y, 10);
    expect(next.w).toBe(vb.w);
  });

  it('zooms in around the cursor, keeping the world point under the cursor fixed', () => {
    const vb = createInitialViewBox(ASPECT);
    const cxPx = 400;
    const cyPx = 250;
    // World point under cursor before zoom:
    const bx = vb.x + (cxPx / 1600) * vb.w;
    const by = vb.y + (cyPx / 1000) * vb.h;
    const next = zoomViewBox(vb, 0.7, cxPx, cyPx, 1600, 1000, ASPECT);
    expect(next.w).toBeCloseTo(vb.w * 0.7, 10);
    // Same world point is still under the cursor:
    const ax = next.x + (cxPx / 1600) * next.w;
    const ay = next.y + (cyPx / 1000) * next.h;
    expect(ax).toBeCloseTo(bx, 8);
    expect(ay).toBeCloseTo(by, 8);
  });

  it('clamps zoom to the min/max viewBox width', () => {
    const vb = createInitialViewBox(ASPECT);
    const tooFarIn = zoomViewBox(vb, 0.0001, 800, 500, 1600, 1000, ASPECT);
    expect(tooFarIn.w).toBe(MIN_VIEW_W);
    const tooFarOut = zoomViewBox(vb, 1000, 800, 500, 1600, 1000, ASPECT);
    expect(tooFarOut.w).toBe(maxViewW(ASPECT));
  });

  it('limits zoom-out so the map always covers the viewport', () => {
    // Widescreen map (100 x 57.14): height binds when aspect < 1.75.
    expect(maxViewW(16 / 10)).toBeCloseTo(100, 1);
    expect(maxViewW(2.5)).toBe(100);
    expect(maxViewW(0.5)).toBeCloseTo(39.72, 1);
    expect(maxViewW(1)).toBeCloseTo(79.44, 1);
    // Degenerate aspect never blows up the camera.
    expect(maxViewW(0)).toBe(100);
    expect(maxViewW(-3)).toBe(100);
  });

  it('hard-clamps panning so map edges never leave empty space in view', () => {
    const vb = createInitialViewBox(ASPECT);
    // Dragging far up-left shoves the camera to the bottom-right world edges.
    const next = panViewBox(vb, -100000, -100000, 1600, 1000, ASPECT);
    expect(next.x + next.w).toBe(100);
    expect(next.y + next.h).toBeCloseTo(79.44, 1);
    // Dragging far down-right shoves it to the top-left edges.
    const other = panViewBox(vb, 100000, 100000, 1600, 1000, ASPECT);
    expect(other.x).toBe(0);
    expect(other.y).toBe(0);
  });

  it('never shows void outside the world, whatever the gestures', () => {
    for (const aspect of [0.5, 1, 16 / 10, 2.5]) {
      let vb = createInitialViewBox(aspect);
      const steps: Array<[number, number, number]> = [
        [-3000, 1500, 0.4],
        [2500, -2000, 2.5],
        [-100000, -100000, 0.0001],
        [100000, 100000, 1000],
        [1234, -5678, 0.9],
      ];
      for (const [dx, dy, zf] of steps) {
        vb = zoomViewBox(vb, zf, 800, 500, 1600, 1000, aspect);
        vb = panViewBox(vb, dx, dy, 1600, 1000, aspect);
        expect(vb.x).toBeGreaterThanOrEqual(-1e-9);
        expect(vb.y).toBeGreaterThanOrEqual(-1e-9);
        expect(vb.x + vb.w).toBeLessThanOrEqual(100 + 1e-9);
        expect(vb.y + vb.h).toBeLessThanOrEqual(100 + 1e-9);
        expect(vb.w).toBeGreaterThanOrEqual(MIN_VIEW_W);
        expect(vb.w).toBeLessThanOrEqual(maxViewW(aspect) + 1e-9);
      }
    }
  });

  it('flyToTarget centers the point at the requested zoom', () => {
    const target = flyToTarget(35, 35, 34, ASPECT);
    expect(target.w).toBe(34);
    expect(target.x + target.w / 2).toBeCloseTo(35, 10);
    expect(target.y + target.h / 2).toBeCloseTo(35, 10);
  });

  it('fly-to near a world edge clamps inside instead of showing void', () => {
    const target = flyToTarget(2, 98, 34, ASPECT);
    expect(target.x).toBeGreaterThanOrEqual(0);
    expect(target.y + target.h).toBeLessThanOrEqual(100);
  });

  it('markerScale keeps markers a constant on-screen size across zooms', () => {
    expect(markerScale(100)).toBe(1.3);
    expect(markerScale(26)).toBeCloseTo(0.338, 10);
    expect(markerScale(14)).toBeCloseTo(0.182, 10);
    // Never smaller than the floor, never larger than designed x boost.
    expect(markerScale(1)).toBeGreaterThanOrEqual(0.13);
    expect(markerScale(400)).toBe(1.3);
  });

  it('castleIconPx matches the atlas marker sizing at any interior zoom', () => {
    // A 390px phone at full-map view: 6 units * 1.3 boost * (390/100).
    expect(castleIconPx(100, 390)).toBeCloseTo(6 * 1.3 * 3.9, 10);
    // Interior zooms 1..3.2 hold the same on-screen size (the zoom cancels out,
    // which is the whole point of the zoom-parented scale).
    for (const zoom of [1, 1.5, 2, 3.2]) {
      const vbW = MARKER_DESIGN_W / zoom;
      expect(castleIconPx(vbW, 390)).toBeCloseTo(castleIconPx(100, 390), 10);
    }
    // Icon geometry matches the Atlas2D marker image (6x6 units).
    expect(CASTLE_ICON_UNITS).toBe(6);
    // Degenerate inputs never produce NaN/Infinity.
    expect(castleIconPx(0, 390)).toBe(0);
    expect(castleIconPx(50, 0)).toBe(0);
  });

  it('tweenViewBox interpolates linearly and clamps t', () => {
    const from = createInitialViewBox(ASPECT);
    const to = flyToTarget(35, 65, 34, ASPECT);
    const mid = tweenViewBox(from, to, 0.5);
    expect(mid.w).toBeCloseTo((from.w + to.w) / 2, 10);
    expect(tweenViewBox(from, to, -1)).toEqual(from);
    expect(tweenViewBox(from, to, 2).w).toBeCloseTo(to.w, 10);
  });

  it('easeInOutCubic is 0 at 0, 1 at 1, and monotonic', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easeInOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('mulberry32 is deterministic', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('clampViewBox re-derives h from the aspect ratio', () => {
    const vb = clampViewBox({ x: 0, y: 0, w: 50, h: 999 }, 2);
    expect(vb.h).toBeCloseTo(25, 10);
  });
});

describe('atlas marker data', () => {
  it('every MAP_LOCATIONS kingdom has a KINGDOM_POSITIONS entry within 0–100', () => {
    expect(MAP_LOCATIONS.length).toBeGreaterThan(0);
    const seen = new Set<KingdomId>();
    for (const loc of MAP_LOCATIONS) {
      const pos = KINGDOM_POSITIONS[loc.kingdom];
      expect(pos, `missing KINGDOM_POSITIONS for ${loc.kingdom}`).toBeDefined();
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(100);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(100);
      expect(seen.has(loc.kingdom)).toBe(false);
      seen.add(loc.kingdom);
    }
  });

  it('coaching sits in the Baltic Sea (Scott-placed, slice 22)', () => {
    expect(KINGDOM_POSITIONS.coaching).toEqual({ x: 67.6, y: 28.6 });
  });

  it('keeps every pair of realm markers at least 5 world units apart', () => {
    // Guards against extracted positions landing on top of each other.
    const ids = Object.keys(KINGDOM_POSITIONS) as KingdomId[];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = KINGDOM_POSITIONS[ids[i]];
        const b = KINGDOM_POSITIONS[ids[j]];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        expect(dist, `${ids[i]} vs ${ids[j]}`).toBeGreaterThan(5);
      }
    }
  });

  it('every location has the display fields the atlas needs', () => {
    for (const loc of MAP_LOCATIONS) {
      expect(loc.id).toBeTruthy();
      expect(loc.name).toBeTruthy();
      expect(loc.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(loc.symbol).toBeTruthy();
    }
  });
});

describe('atlas marker lock state', () => {
  const italy = MAP_LOCATIONS.find((l) => l.kingdom === 'italian')!;
  const spain = MAP_LOCATIONS.find((l) => l.kingdom === 'spanish')!;

  it('marks kingdoms in unlockedRegions as unlocked, others as locked', () => {
    expect(getMarkerLockState(italy, ['italian'])).toBe('unlocked');
    expect(getMarkerLockState(spain, ['italian'])).toBe('locked');
    expect(getMarkerLockState(spain, ['italian', 'spanish'])).toBe('unlocked');
  });

  it('resolves unlock thresholds', () => {
    expect(getUnlockThreshold(italy)).toBe(0);
    expect(getUnlockThreshold(spain)).toBeGreaterThan(0);
  });
});

describe('shortRealmName', () => {
  it('strips the royal prefix', () => {
    expect(shortRealmName('Kingdom of Italy')).toBe('Italy');
    expect(shortRealmName('Kingdom of the Netherlands')).toBe('Netherlands');
    expect(shortRealmName('Queendom of Sicily')).toBe('Sicily');
    expect(shortRealmName('Realm of Scandinavia')).toBe('Scandinavia');
    expect(shortRealmName('The Queendom')).toBe('Queendom');
    expect(shortRealmName('The Wilderness')).toBe('Wilderness');
    expect(shortRealmName('The Coaching Pavilion')).toBe('Coaching Pavilion');
  });
});
