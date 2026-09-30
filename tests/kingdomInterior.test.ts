import { describe, it, expect } from 'vitest';
import { panCamera, zoomCamera, clampCamera } from '@/components/world-map/KingdomInterior';
import { castleIconPx } from '@/components/world-map/atlasCamera';

const VIEW = { zoom: 3.2, centerX: 50, centerY: 50 };

describe('panCamera', () => {
  it('moves the map with the pointer (drag right shifts center left)', () => {
    // 390px wide container, zoom 3.2: 100 map units span 390px => 1px = 100/3.2/390 units
    const out = panCamera(VIEW, 39, 0, 390, 844);
    expect(out.zoom).toBe(VIEW.zoom);
    expect(out.centerX).toBeCloseTo(50 - (39 / 390) * (100 / 3.2), 10);
    expect(out.centerY).toBe(50);
  });

  it('returns the view unchanged for degenerate sizes', () => {
    expect(panCamera(VIEW, 10, 10, 0, 844)).toBe(VIEW);
  });
});

describe('zoomCamera', () => {
  it('zooms in about the focal point, keeping the map point under it stable', () => {
    const minZoom = 3.2;
    // Focal at container center (50%, 50%) with the camera centered: map point = center.
    const out = zoomCamera(VIEW, minZoom, 2, 50, 50);
    expect(out.zoom).toBeCloseTo(6.4, 10);
    expect(out.centerX).toBeCloseTo(50, 10);
    expect(out.centerY).toBeCloseTo(50, 10);
  });

  it('clamps to the fitted min zoom and the interior max zoom', () => {
    const zoomedOut = zoomCamera(VIEW, 3.2, 0.01, 50, 50);
    expect(zoomedOut.zoom).toBe(3.2);
    const zoomedIn = zoomCamera(VIEW, 3.2, 100, 50, 50);
    expect(zoomedIn.zoom).toBe(8);
  });

  it('returns the same view when the factor would not change the zoom', () => {
    expect(zoomCamera(VIEW, 3.2, 1, 25, 75)).toBe(VIEW);
  });

  it('keeps an off-center focal stable', () => {
    const out = zoomCamera(VIEW, 1, 2, 25, 25);
    // Map point under the 25% focal before zoom:
    const left = 50 - VIEW.zoom * VIEW.centerX;
    const mx = (25 - left) / VIEW.zoom;
    // After zoom it must still be under the 25% focal:
    const left2 = 50 - out.zoom * out.centerX;
    expect((25 - left2) / out.zoom).toBeCloseTo(mx, 10);
  });
});

describe('clampCamera', () => {
  it('leaves a centered view alone', () => {
    expect(clampCamera(VIEW)).toBe(VIEW);
  });

  it('pulls a far-drifted center back inside the map edges', () => {
    const out = clampCamera({ zoom: 3.2, centerX: 500, centerY: -200 });
    expect(out.centerX).toBeLessThanOrEqual(100 - 50 / 3.2);
    expect(out.centerY).toBeGreaterThanOrEqual(50 / 3.2);
  });
});

describe('castleIconPx boost override', () => {
  it('drops the 30% boost when boost=1.0 is passed', () => {
    const boosted = castleIconPx(100, 390);
    const plain = castleIconPx(100, 390, 1.0);
    expect(boosted).toBeCloseTo(6 * 1.3 * 3.9, 10);
    expect(plain).toBeCloseTo(6 * 1.0 * 3.9, 10);
  });

  it('defaults to the boosted size when boost is omitted', () => {
    expect(castleIconPx(100, 390, undefined)).toBeCloseTo(castleIconPx(100, 390), 10);
  });
});
