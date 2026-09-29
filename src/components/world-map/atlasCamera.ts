/**
 * atlasCamera.ts
 *
 * Pure viewBox math for the 2D atlas. The atlas renders inside an SVG with a
 * `viewBox="x y w h"` that acts as the camera: panning changes x/y, zooming
 * changes w (h follows the viewport aspect ratio so nothing ever distorts).
 *
 * All functions are pure and unit-tested in tests/atlas2d.test.ts.
 */

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The atlas world lives in 0–100 percent space (see KINGDOM_POSITIONS). */
export const WORLD_SIZE = 100;

/** Zoom limits, expressed as viewBox width in world units. */
export const MIN_VIEW_W = 14; // fully zoomed in
export const MAX_VIEW_W = 160; // zoomed out past the world edges

/** How far the camera center may drift outside the world (world units). */
const PAN_MARGIN = 25;

/** Clamp a number into [min, max]. */
function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Normalize a viewBox: clamp the zoom, re-derive h from the aspect ratio,
 * and keep the camera center within the world plus a small margin.
 */
export function clampViewBox(vb: ViewBox, aspect: number): ViewBox {
  const w = clamp(vb.w, MIN_VIEW_W, MAX_VIEW_W);
  const h = w / aspect;
  const cx = clamp(vb.x + vb.w / 2, -PAN_MARGIN, WORLD_SIZE + PAN_MARGIN);
  const cy = clamp(vb.y + vb.h / 2, -PAN_MARGIN, WORLD_SIZE + PAN_MARGIN);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/**
 * Initial camera: frame the whole 100x100 world with a small margin so
 * edge markers and their labels are never clipped.
 * `aspect` is viewportWidth / viewportHeight.
 */
export function createInitialViewBox(aspect: number): ViewBox {
  const PAD = 8;
  const SPAN = WORLD_SIZE + PAD * 2; // 116
  if (aspect >= 1) {
    const w = SPAN;
    const h = w / aspect;
    return { x: -PAD, y: WORLD_SIZE / 2 - h / 2, w, h };
  }
  const h = SPAN;
  const w = h * aspect;
  return { x: WORLD_SIZE / 2 - w / 2, y: -PAD, w, h };
}

/**
 * Pan the camera by a pointer drag. Positive dxPx (pointer moved right)
 * moves the camera left so the content follows the pointer.
 */
export function panViewBox(
  vb: ViewBox,
  dxPx: number,
  dyPx: number,
  viewportW: number,
  viewportH: number,
  aspect: number
): ViewBox {
  if (viewportW <= 0 || viewportH <= 0) return vb;
  const next: ViewBox = {
    ...vb,
    x: vb.x - dxPx * (vb.w / viewportW),
    y: vb.y - dyPx * (vb.h / viewportH),
  };
  return clampViewBox(next, aspect);
}

/**
 * Zoom the camera around a viewport pixel point (cxPx, cyPx).
 * `factor < 1` zooms in, `factor > 1` zooms out. The world point under the
 * cursor stays under the cursor.
 */
export function zoomViewBox(
  vb: ViewBox,
  factor: number,
  cxPx: number,
  cyPx: number,
  viewportW: number,
  viewportH: number,
  aspect: number
): ViewBox {
  if (viewportW <= 0 || viewportH <= 0 || factor <= 0) return vb;
  const w = clamp(vb.w * factor, MIN_VIEW_W, MAX_VIEW_W);
  const h = w / aspect;
  // World coords under the cursor before zooming…
  const bx = vb.x + (cxPx / viewportW) * vb.w;
  const by = vb.y + (cyPx / viewportH) * vb.h;
  // …stay under the cursor after zooming.
  return clampViewBox({ x: bx - (cxPx / viewportW) * w, y: by - (cyPx / viewportH) * h, w, h }, aspect);
}

/**
 * Compute the camera target for "fly to" a world point: center the point,
 * zoomed to `targetW` viewBox width.
 */
export function flyToTarget(cx: number, cy: number, targetW: number, aspect: number): ViewBox {
  const w = clamp(targetW, MIN_VIEW_W, MAX_VIEW_W);
  const h = w / aspect;
  return clampViewBox({ x: cx - w / 2, y: cy - h / 2, w, h }, aspect);
}

/** Linear interpolation between two viewBoxes (for the fly-to tween). */
export function tweenViewBox(from: ViewBox, to: ViewBox, t: number): ViewBox {
  const k = clamp(t, 0, 1);
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
    w: from.w + (to.w - from.w) * k,
    h: from.h + (to.h - from.h) * k,
  };
}

/** Ease in-out cubic for the fly-to animation. */
export function easeInOutCubic(t: number): number {
  const k = clamp(t, 0, 1);
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

/**
 * Deterministic PRNG (mulberry32) for the starfield — stable renders,
 * no hydration-style flicker between mounts.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
