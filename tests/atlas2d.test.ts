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
  MIN_VIEW_W,
  MAX_VIEW_W,
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
  it('creates an initial viewBox that frames the whole 100x100 world with margin', () => {
    const vb = createInitialViewBox(ASPECT);
    expect(vb.x).toBe(-8);
    expect(vb.w).toBe(116);
    expect(vb.h).toBeCloseTo(116 / ASPECT, 10);
    expect(vb.y).toBeCloseTo(50 - 116 / ASPECT / 2, 10);
  });

  it('creates a portrait initial viewBox that frames the world', () => {
    const vb = createInitialViewBox(0.5);
    expect(vb.h).toBe(116);
    expect(vb.w).toBeCloseTo(58, 10);
    expect(vb.x).toBeCloseTo(50 - 29, 10);
    expect(vb.y).toBe(-8);
  });

  it('pans the camera so content follows the pointer', () => {
    const vb = createInitialViewBox(ASPECT);
    // Drag right by half the viewport width -> camera moves left by half the viewBox width.
    const next = panViewBox(vb, 800, 0, 1600, 1000, ASPECT);
    expect(next.x).toBeCloseTo(vb.x - 58, 10);
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
    const next = zoomViewBox(vb, 0.5, cxPx, cyPx, 1600, 1000, ASPECT);
    expect(next.w).toBeCloseTo(vb.w * 0.5, 10);
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
    expect(tooFarOut.w).toBe(MAX_VIEW_W);
  });

  it('clamps panning so the camera cannot leave the world far behind', () => {
    const vb = createInitialViewBox(ASPECT);
    const next = panViewBox(vb, -100000, -100000, 1600, 1000, ASPECT);
    const cx = next.x + next.w / 2;
    const cy = next.y + next.h / 2;
    expect(cx).toBeLessThanOrEqual(100 + 25);
    expect(cy).toBeLessThanOrEqual(100 + 25);
    expect(cx).toBeGreaterThanOrEqual(-25);
  });

  it('flyToTarget centers the point at the requested zoom', () => {
    const target = flyToTarget(35, 65, 34, ASPECT);
    expect(target.w).toBe(34);
    expect(target.x + target.w / 2).toBeCloseTo(35, 10);
    expect(target.y + target.h / 2).toBeCloseTo(65, 10);
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

  it('coaching keeps its centered legacy position (no GLB node exists for it)', () => {
    expect(KINGDOM_POSITIONS.coaching).toEqual({ x: 50, y: 50 });
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
