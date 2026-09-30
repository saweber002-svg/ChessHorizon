/**
 * atlasCamera.ts
 *
 * Pure viewBox math for the 2D atlas. The atlas renders inside an SVG with a
 * `viewBox="x y w h"` that acts as the camera: panning changes x/y, zooming
 * changes w (h follows the viewport aspect ratio so nothing ever distorts).
 *
 * The camera has hard boundaries: the viewBox is always fully inside the
 * 0–100 world, so empty space can never be panned or zoomed into view.
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

/** Zoomed-in limit, expressed as viewBox width in world units. */
export const MIN_VIEW_W = 14;

/**
 * Zoomed-out limit: the widest viewBox that still keeps the map covering
 * the viewport. On wide screens the full 100-unit world fits; on portrait
 * screens the height is the binding constraint.
 */
export function maxViewW(aspect: number): number {
  if (!(aspect > 0)) return WORLD_SIZE;
  return WORLD_SIZE * Math.min(1, aspect);
}

/** Clamp a number into [min, max]. */
function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Normalize a viewBox: clamp the zoom, re-derive h from the aspect ratio,
 * and clamp the camera center so the viewBox stays fully inside the world.
 * Panning past a map edge or zooming out past full coverage is impossible.
 */
export function clampViewBox(vb: ViewBox, aspect: number): ViewBox {
  const w = clamp(vb.w, MIN_VIEW_W, maxViewW(aspect));
  const h = w / aspect;
  const cx = clamp(vb.x + vb.w / 2, w / 2, WORLD_SIZE - w / 2);
  const cy = clamp(vb.y + vb.h / 2, h / 2, WORLD_SIZE - h / 2);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/**
 * Initial camera: over the Tyrrhenian Sea just west of Italy, framed tight
 * enough to show Italy, Sicily, and a sliver of France — the rest of the
 * map is left to discover by panning and zooming.
 * `aspect` is viewportWidth / viewportHeight.
 */
const INITIAL_CENTER = { x: 45, y: 72 };
const INITIAL_W = 26;

export function createInitialViewBox(aspect: number): ViewBox {
  const w = INITIAL_W;
  const h = w / aspect;
  return clampViewBox(
    { x: INITIAL_CENTER.x - w / 2, y: INITIAL_CENTER.y - h / 2, w, h },
    aspect
  );
}

/** ViewBox width the castle markers were designed at (full-map view). */
export const MARKER_DESIGN_W = 100;
/** 30% size boost on top of the zoom-parented scale (icons felt small). */
const MARKER_SIZE_BOOST = 1.3;
/** Markers never shrink below this fraction of their designed size. */
const MARKER_MIN_SCALE = 0.1;

/**
 * Marker scale parented to the zoom: a marker's world size tracks the
 * viewBox width, so markers hold a constant on-screen size at any zoom
 * instead of ballooning when you zoom in.
 */
export function markerScale(vbW: number, boost: number = MARKER_SIZE_BOOST): number {
  return boost * clamp(vbW / MARKER_DESIGN_W, MARKER_MIN_SCALE, 1);
}

/** Designed width of a castle icon in map units (matches the Atlas2D marker image). */
export const CASTLE_ICON_UNITS = 6;

/**
 * On-screen pixel diameter of a castle icon parented to the zoom, using the
 * same logic as the atlas markers: the icon holds a constant on-screen size
 * at any zoom instead of ballooning with the map.
 *
 * @param viewBoxWidth map units visible across the viewport width
 * @param viewportWidthPx viewport width in CSS pixels
 * @param boost optional size multiplier override (defaults to the standard
 * 30% boost; pass 1.0 for unboosted icons, e.g. on narrow screens)
 */
export function castleIconPx(
  viewBoxWidth: number,
  viewportWidthPx: number,
  boost?: number,
): number {
  if (viewBoxWidth <= 0 || viewportWidthPx <= 0) return 0;
  return (
    CASTLE_ICON_UNITS *
    markerScale(viewBoxWidth, boost ?? MARKER_SIZE_BOOST) *
    (viewportWidthPx / viewBoxWidth)
  );
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
  const w = clamp(vb.w * factor, MIN_VIEW_W, maxViewW(aspect));
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
  const w = clamp(targetW, MIN_VIEW_W, maxViewW(aspect));
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
