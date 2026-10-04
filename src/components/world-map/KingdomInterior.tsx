import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star } from 'lucide-react';
import type { KingdomId } from '@/types';
import { KINGDOM_POSITIONS } from '@/types';
import { MAP_LOCATIONS } from '@/data/mapLocations';
import { getKingdomDrills, type KingdomDrill } from '@/data/kingdomDrills';
import { castleIconPx, MARKER_DESIGN_W, MOBILE_MARKER_BOOST, MOBILE_ICON_BREAKPOINT } from './atlasCamera';
import {
  CASTLE_BY_VARIATION,
  MAP_H,
  type CastleLocation,
  type FitView,
} from '@/data/castleLocations';
import { useProgress } from '@/contexts/ProgressContext';
import { REALM_TOTAL_MOVES } from '@/data/realmDrillTotals';

import {
  INTERIOR_CASTLE_SPOTS,
  INTERIOR_TEXTURE_URL,
  MAIN_ATLAS_CASTLE_SPOTS,
} from '@/data/interiorCastleSpots';

const ATLAS_MAP_URL = `${import.meta.env.BASE_URL}atlas/atlas-map.webp`; // fallback for kingdoms without a baked interior

/** Furthest the interior camera may zoom in (map units per screen width). */
const INTERIOR_MAX_ZOOM = 8;
/** Drag distance in px before a gesture counts as a pan (not a tap). */
const DRAG_THRESHOLD_PX = 8;

interface CastleSpot {
  drill: KingdomDrill;
  castle: CastleLocation | null;
  /** Map-space position (0-100), at the castle's true location. */
  mx: number;
  my: number;
}

/**
 * Castle positions for the interior view.
 *
 * Kingdoms with a baked interior texture use the hand-mapped spots from
 * interiorCastleSpots.ts (the castles are baked into the art). Kingdoms
 * without one (scandinavian) fall back to true geographic positions on
 * the main atlas.
 */
function trueCastleSpots(kingdom: KingdomId, drills: KingdomDrill[]): CastleSpot[] {
  const baked = INTERIOR_CASTLE_SPOTS[kingdom as keyof typeof INTERIOR_CASTLE_SPOTS];
  if (baked) {
    const byId = new Map(baked.map((s) => [s.variationId, s]));
    const fallback = KINGDOM_POSITIONS[kingdom];
    return drills.map((drill) => {
      const spot = byId.get(drill.variationId);
      const castle = CASTLE_BY_VARIATION[drill.variationId] ?? null;
      return {
        drill,
        castle,
        mx: spot ? spot.x : fallback.x,
        my: spot ? spot.y : fallback.y,
      };
    });
  }
  // Fallback: main-atlas positions for kingdoms without a baked interior.
  const mainAtlas = new Map(MAIN_ATLAS_CASTLE_SPOTS.map((s) => [s.variationId, s]));
  const fallback = KINGDOM_POSITIONS[kingdom];
  return drills.map((drill) => {
    const spot = mainAtlas.get(drill.variationId);
    const castle = CASTLE_BY_VARIATION[drill.variationId] ?? null;
    return {
      drill,
      castle,
      mx: spot ? spot.x : fallback.x,
      my: spot ? spot.y : fallback.y,
    };
  });
}

/**
 * Pan the interior camera by a pointer drag. Positive dxPx (pointer moved
 * right) moves the camera left so the map follows the pointer.
 */
export function panCamera(view: FitView, dxPx: number, dyPx: number, wPx: number, hPx: number): FitView {
  if (wPx <= 0 || hPx <= 0) return view;
  const cAspect = wPx / hPx;
  return {
    zoom: view.zoom,
    centerX: view.centerX - ((dxPx / wPx) * 100) / view.zoom,
    centerY: view.centerY - ((dyPx / hPx) * 100) / (view.zoom * cAspect),
  };
}

/**
 * Zoom the interior camera about a focal point given in % of the container.
 * factor > 1 zooms in. The map point under the focal stays under it.
 */
export function zoomCamera(
  view: FitView,
  minZoom: number,
  factor: number,
  fxPct: number,
  fyPct: number,
  cAspect: number = 1,
): FitView {
  const z2 = Math.min(INTERIOR_MAX_ZOOM, Math.max(minZoom, view.zoom * factor));
  if (z2 === view.zoom) return view;
  const left = 50 - view.zoom * view.centerX;
  const top = 50 - view.zoom * cAspect * view.centerY;
  const mx = (fxPct - left) / view.zoom;
  const my = (fyPct - top) / (view.zoom * cAspect);
  return {
    zoom: z2,
    centerX: (50 - (fxPct - z2 * mx)) / z2,
    centerY: (50 - (fyPct - z2 * cAspect * my)) / (z2 * cAspect),
  };
}

/** Clamp the camera center so the map never slides past the container edges. */
export function clampCamera(v: FitView, cAspect: number = 1): FitView {
  const lo = 50 / v.zoom;
  const hi = 100 - 50 / v.zoom;
  const cx = Math.min(Math.max(v.centerX, lo), hi);
  // Vertical range is 0-MAP_H, scaled by container aspect.
  const yZoom = v.zoom * cAspect;
  const loY = 50 / yZoom;
  const hiY = MAP_H - 50 / yZoom;
  // If the whole map height fits in view (portrait / zoomed out), center it
  // instead of clamping to an inverted range.
  const cy = loY > hiY ? MAP_H / 2 : Math.min(Math.max(v.centerY, loY), hiY);
  if (cx === v.centerX && cy === v.centerY) return v;
  return { zoom: v.zoom, centerX: cx, centerY: cy };
}

interface KingdomInteriorProps {
  kingdom: KingdomId;
  onBack: () => void;
  onSelectDrill: (drillFileId: string, openingId: string, variationId: string) => void;
}

export function KingdomInterior({ kingdom, onBack, onSelectDrill }: KingdomInteriorProps) {
  const { state } = useProgress();
  const location = MAP_LOCATIONS.find((l) => l.kingdom === kingdom);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() =>
    typeof window === 'undefined' ? { w: 0, h: 0 } : { w: window.innerWidth, h: window.innerHeight },
  );
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ w: el.clientWidth || window.innerWidth, h: el.clientHeight || window.innerHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const drills = useMemo(() => getKingdomDrills(kingdom), [kingdom]);
  const castles = useMemo(() => trueCastleSpots(kingdom, drills), [kingdom, drills]);

  // Baked interior texture when available; falls back to the main atlas.
  const interiorUrl = INTERIOR_TEXTURE_URL(kingdom);
  const mapUrl = interiorUrl ?? ATLAS_MAP_URL;
  // All interior textures and the main atlas are square (1:1).
  const mapAspect = '1 / 1';
  const mapAspectNum = 1;

  // Fill zoom: the minimum zoom where the square image covers the container
  // (no black bars). For portrait (cAspect < 1), height is the constraint:
  // zoom >= 1/cAspect. For landscape, width is the constraint: zoom >= 1.
  const fillZoom = useMemo(() => {
    const cAspect = size.w > 0 && size.h > 0 ? size.w / size.h : 1;
    return Math.max(1, 1 / cAspect);
  }, [size]);

  // Start fully zoomed out: the whole interior is visible on entry (no
  // black bars — fillZoom is the minimum). Users pinch/drag to explore.
  const initialView = useMemo(
    () => ({
      zoom: fillZoom,
      centerX: 50,
      centerY: MAP_H / 2,
    }),
    [fillZoom],
  );
  const [view, setView] = useState<FitView>(initialView);
  useEffect(() => {
    setView(initialView);
  }, [initialView]);
  const sizeRef = useRef(size);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);
  const minZoomRef = useRef(fillZoom);
  useEffect(() => {
    minZoomRef.current = fillZoom;
  }, [fillZoom]);

/** Space below the kingdom title header where the map starts (px). */
const HEADER_OFFSET_PX = 92;

  const mapOffset = useMemo(() => {
    // Vertical % refers to container height, horizontal to width — scale the
    // vertical zoom by the container aspect so map units stay square.
    const cAspect = size.w > 0 && size.h > 0 ? size.w / size.h : 1;
    const yZoom = view.zoom * cAspect;
    const rawL = 50 - view.zoom * view.centerX;
    const rawT = 50 - yZoom * view.centerY;
    const minL = 100 - view.zoom * 100;
    const minT = 100 - (view.zoom * 100 * cAspect) / mapAspectNum;
    // On portrait/mobile, bottom-align the map when it doesn't fill the
    // container vertically (minT > 0) so the image sits on the screen bottom.
    const baseTop =
      cAspect < 1 && minT > 0 ? minT : Math.min(0, Math.max(minT, rawT));
    // Shift the map down so its top edge sits just below the kingdom title,
    // making use of the header space instead of hiding map behind it.
    const headerPct = size.h > 0 ? (HEADER_OFFSET_PX / size.h) * 100 : 0;
    return {
      left: Math.min(0, Math.max(minL, rawL)),
      top: baseTop + headerPct,
    };
  }, [view, size, mapAspectNum]);

  const toScreen = (mx: number, my: number) => {
    const cAspect = size.w > 0 && size.h > 0 ? size.w / size.h : 1;
    return {
      x: mapOffset.left + view.zoom * mx,
      y: mapOffset.top + view.zoom * cAspect * my,
    };
  };

  // Same zoom-parented icon sizing as the atlas markers: the interior's
  // effective viewBox width is the map units visible across the screen
  // (100 / zoom), so castle icons hold a constant on-screen size at any
  // interior zoom instead of ballooning with the map. Narrow screens get
  // the larger mobile boost (~50px icons) for visibility and tappability.
  const iconPx = useMemo(
    () =>
      castleIconPx(
        MARKER_DESIGN_W / view.zoom,
        size.w,
        size.w > 0 && size.w < MOBILE_ICON_BREAKPOINT ? MOBILE_MARKER_BOOST : undefined,
      ),
    [view.zoom, size.w],
  );

  // Screen-space label culling: in dense clusters (northern Italy, Sicily)
  // the compact pills would pile up unreadably, so each label is kept only
  // if it fits without covering another label or a neighboring icon. Tried
  // below the icon first, then above; if neither fits the label is hidden
  // until the user pinch-zooms and the markers spread apart. Icons always
  // render at their (near-true) decluttered positions. Deterministic in
  // drill order so it never flickers between renders.
  const labelPlacement = useMemo(() => {
    const placement = new Map<string, 'above' | 'below'>();
    if (size.w <= 0 || size.h <= 0) return placement;
    const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const overlaps = (r: { x0: number; y0: number; x1: number; y1: number }) =>
      placed.some(
        (p) => r.x0 < p.x1 && r.x1 > p.x0 && r.y0 < p.y1 && r.y1 > p.y0,
      );
    const iconR = iconPx / 2;
    const centers = castles.map(({ mx, my }) => ({
      cx: ((mapOffset.left + view.zoom * mx) / 100) * size.w,
      cy: ((mapOffset.top + view.zoom * my) / 100) * size.h,
    }));
    // Reserve every icon's rect so labels never cover a neighboring castle.
    centers.forEach(({ cx, cy }) =>
      placed.push({
        x0: cx - iconR,
        y0: cy - iconR,
        x1: cx + iconR,
        y1: cy + iconR,
      }),
    );
    castles.forEach(({ drill }, i) => {
      const { cx, cy } = centers[i];
      // Calibrated against measured pills: 10px semibold + star + padding.
      const w = 12 + 5.6 * (drill.label.length + 4);
      const h = 22;
      const below = {
        x0: cx - w / 2 - 3,
        y0: cy + iconR + 4 - 3,
        x1: cx + w / 2 + 3,
        y1: cy + iconR + 4 + h + 3,
      };
      const above = {
        x0: cx - w / 2 - 3,
        y0: cy - iconR - 4 - h - 3,
        x1: cx + w / 2 + 3,
        y1: cy - iconR - 4 + 3,
      };
      if (!overlaps(below)) {
        placement.set(drill.drillFileId, 'below');
        placed.push(below);
      } else if (!overlaps(above)) {
        placement.set(drill.drillFileId, 'above');
        placed.push(above);
      }
    });
    return placement;
  }, [castles, view, size, mapOffset, iconPx]);

  // --- Pan / pinch gestures -----------------------------------------------
  // Pointer events drive mouse + pen. Touch goes through the native
  // listeners below: iOS Safari needs a non-passive touchmove +
  // preventDefault for reliable panning, and pointermove alone isn't
  // dependable there — so the pointer handlers ignore touch to avoid
  // double-applying.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const downPosRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
      w: rect?.width ?? 1,
      h: rect?.height ?? 1,
    };
  }, []);

  const applyPan = useCallback((dxPx: number, dyPx: number) => {
    const { w, h } = sizeRef.current;
    const cAspect = w > 0 && h > 0 ? w / h : 1;
    setView((v) => clampCamera(panCamera(v, dxPx, dyPx, w, h), cAspect));
  }, []);

  const applyZoom = useCallback((factor: number, clientX: number, clientY: number) => {
    const p = toLocal(clientX, clientY);
    const fxPct = (p.x / p.w) * 100;
    const fyPct = (p.y / p.h) * 100;
    const { w, h } = sizeRef.current;
    const cAspect = w > 0 && h > 0 ? w / h : 1;
    setView((v) => clampCamera(zoomCamera(v, minZoomRef.current, factor, fxPct, fyPct, cAspect), cAspect));
  }, [toLocal]);

  const markMoved = useCallback((x: number, y: number) => {
    const down = downPosRef.current;
    if (down && Math.hypot(x - down.x, y - down.y) > DRAG_THRESHOLD_PX) {
      suppressClickRef.current = true;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const p = toLocal(e.clientX, e.clientY);
      pointersRef.current.set(e.pointerId, { x: p.x, y: p.y });
      downPosRef.current = { x: p.x, y: p.y };
      suppressClickRef.current = false;
      if (pointersRef.current.size === 2) {
        const [a, b] = [...pointersRef.current.values()];
        pinchRef.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          mx: (a.x + b.x) / 2,
          my: (a.y + b.y) / 2,
        };
      }
    },
    [toLocal],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const tracked = pointersRef.current.get(e.pointerId);
      if (!tracked) return;
      const p = toLocal(e.clientX, e.clientY);
      const dx = p.x - tracked.x;
      const dy = p.y - tracked.y;
      pointersRef.current.set(e.pointerId, { x: p.x, y: p.y });
      markMoved(p.x, p.y);

      if (pointersRef.current.size === 2) {
        const [a, b] = [...pointersRef.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const prev = pinchRef.current;
        if (prev && prev.dist > 0 && dist > 0) {
          const prevDist = prev.dist;
          const prevMx = prev.mx;
          const prevMy = prev.my;
          const rect = containerRef.current?.getBoundingClientRect();
          const cx = (rect?.left ?? 0) + mx;
          const cy = (rect?.top ?? 0) + my;
          applyZoom(dist / prevDist, cx, cy);
          applyPan(mx - prevMx, my - prevMy);
        }
        pinchRef.current = { dist, mx, my };
      } else {
        applyPan(dx, dy);
      }
    },
    [toLocal, applyPan, applyZoom, markMoved],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) downPosRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      applyZoom(1.8, e.clientX, e.clientY);
    },
    [applyZoom],
  );

  // Wheel zoom (native listener: needs passive:false).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toLocal(e.clientX, e.clientY);
      const fxPct = (p.x / p.w) * 100;
      const fyPct = (p.y / p.h) * 100;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const r = el.getBoundingClientRect();
      const cAspect = r.width > 0 && r.height > 0 ? r.width / r.height : 1;
      setView((v) => clampCamera(zoomCamera(v, minZoomRef.current, factor, fxPct, fyPct, cAspect), cAspect));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [toLocal]);

  // Touch gestures (native listeners): a non-passive touchmove lets us
  // preventDefault once a real drag starts; taps never reach the drag
  // threshold so castle taps still produce click events.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const touches = new Map<number, { x: number; y: number }>();
    let pinch: { dist: number; mx: number; my: number } | null = null;
    let downPos: { x: number; y: number } | null = null;

    const local = (t: Touch) => {
      const r = el.getBoundingClientRect();
      return { x: t.clientX - r.left, y: t.clientY - r.top, w: r.width, h: r.height };
    };
    const setViewClamped = (fn: (v: FitView) => FitView) => {
      const r = el.getBoundingClientRect();
      const cAspect = r.width > 0 && r.height > 0 ? r.width / r.height : 1;
      setView((v) => clampCamera(fn(v), cAspect));
    };

    const onTouchStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const p = local(t);
        touches.set(t.identifier, { x: p.x, y: p.y });
      }
      if (touches.size === 1) {
        const p = [...touches.values()][0];
        downPos = { x: p.x, y: p.y };
        suppressClickRef.current = false;
      } else {
        downPos = null;
        suppressClickRef.current = true;
      }
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinch = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          mx: (a.x + b.x) / 2,
          my: (a.y + b.y) / 2,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touches.size === 0) return;
      const prev = new Map(touches);
      for (const t of Array.from(e.changedTouches)) {
        const p = local(t);
        touches.set(t.identifier, { x: p.x, y: p.y });
      }
      if (touches.size === 2) {
        e.preventDefault();
        const [a, b] = [...touches.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const r = el.getBoundingClientRect();
        if (pinch && pinch.dist > 0 && dist > 0) {
          // Capture before setState: updaters run after this handler returns,
          // by which time touchend may have cleared pinch.
          const pinchDist = pinch.dist;
          const pinchMx = pinch.mx;
          const pinchMy = pinch.my;
          const fxPct = (mx / r.width) * 100;
          const fyPct = (my / r.height) * 100;
          const cAspect = r.width > 0 && r.height > 0 ? r.width / r.height : 1;
          setViewClamped((v) =>
            zoomCamera(v, minZoomRef.current, dist / pinchDist, fxPct, fyPct, cAspect),
          );
          setViewClamped((v) => panCamera(v, mx - pinchMx, my - pinchMy, r.width, r.height));
        }
        pinch = { dist, mx, my };
        return;
      }
      if (touches.size === 1 && downPos) {
        const p = [...touches.values()][0];
        const old = prev.get([...touches.keys()][0]);
        if (Math.hypot(p.x - downPos.x, p.y - downPos.y) > DRAG_THRESHOLD_PX) {
          e.preventDefault();
          suppressClickRef.current = true;
          if (old) {
            const r = el.getBoundingClientRect();
            setViewClamped((v) => panCamera(v, p.x - old.x, p.y - old.y, r.width, r.height));
          }
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) touches.delete(t.identifier);
      if (touches.size < 2) pinch = null;
      if (touches.size === 0) downPos = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const handleCastleClick = useCallback(
    (drill: KingdomDrill) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      onSelectDrill(drill.drillFileId, drill.openingId, drill.variationId);
    },
    [onSelectDrill],
  );

  // Per-variation progress: stars + best prestige tier.
  const variationProgress = useMemo(() => {
    const map = new Map<string, { stars: number; tier: number }>();
    for (const d of drills) {
      const prefix = `${d.openingId}:${d.variationId}:`;
      let stars = 0;
      let tier = 0;
      for (const [key, p] of Object.entries(state.moveProgress)) {
        if (key.startsWith(prefix)) {
          stars += p.stars ?? 0;
          tier = Math.max(tier, p.tier ?? 0);
        }
      }
      map.set(d.drillFileId, { stars, tier });
    }
    return map;
  }, [drills, state.moveProgress]);

  const realmPct = useMemo(() => {
    const totalMoves = REALM_TOTAL_MOVES[kingdom] ?? 0;
    if (totalMoves <= 0) return 0;
    const prefix = `${kingdom}:`;
    let earned = 0;
    for (const [key, p] of Object.entries(state.moveProgress)) {
      if (key.startsWith(prefix)) earned += p.stars ?? 0;
    }
    return Math.min(100, Math.round((earned / (totalMoves * 3)) * 100));
  }, [kingdom, state.moveProgress]);

  if (!location) return null;

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen th-bg overflow-hidden relative"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Zoomed atlas map */}
      <div
        className="absolute cursor-grab active:cursor-grabbing"
        style={{
          width: `${view.zoom * 100}%`,
          aspectRatio: mapAspect,
          left: `${mapOffset.left}%`,
          top: `${mapOffset.top}%`,
          backgroundImage: `url(${mapUrl})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Vignette for legibility */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,5,16,0.75)_100%)]" />

      {/* Castles */}
      {castles.map(({ drill, castle, mx, my }, i) => {
        const pos = toScreen(mx, my);
        const prog = variationProgress.get(drill.drillFileId) ?? { stars: 0, tier: 0 };
        const castleName = castle ? `${castle.castle}, ${castle.place}` : drill.label;
        // The (invisible) hit area is anchored on the castle's map position; the
        // label floats below or above it per the screen-space culling pass.
        const place = labelPlacement.get(drill.drillFileId);
        return (
          <div
            key={drill.drillFileId}
            className="absolute z-10"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 260, damping: 20 }}
              onClick={() => handleCastleClick(drill)}
              className="group absolute"
              style={{
                width: iconPx,
                height: iconPx,
                left: -iconPx / 2,
                top: -iconPx / 2,
              }}
              aria-label={`${drill.label} at ${castleName}. ${prog.stars} stars.`}
              title={drill.label}
            >
              {/* Invisible hit area — the castle is baked into the map texture.
                  The label pill below remains the visible tag. */}
              <div className="absolute inset-0 rounded-full group-hover:bg-white/10 transition-colors" />
              {place && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full th-bg/85 backdrop-blur border border-white/10 text-center whitespace-nowrap"
                  style={
                    place === 'below'
                      ? { top: 'calc(100% + 4px)' }
                      : { bottom: 'calc(100% + 4px)' }
                  }
                >
                  <p className="text-[10px] font-semibold text-white whitespace-nowrap leading-tight">
                    {drill.label}{' '}
                    <span className="inline-flex items-center gap-0.5 font-normal text-white/50">
                      <Star size={8} className="text-yellow-400 fill-yellow-400" />
                      {prog.stars}
                    </span>
                  </p>
                </div>
              )}
            </motion.button>
          </div>
        );
      })}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="bg-gradient-to-b from-[var(--th-bg)] to-transparent pt-4 pb-10 px-4">
          <div className="flex items-center gap-3 max-w-3xl mx-auto pointer-events-auto">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl th-panel border th-border text-white/70 hover:text-white th-hover-accent-border transition-colors text-sm"
            >
              <ArrowLeft size={16} /> Atlas
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] th-accent-text/70">{location.subname}</p>
              <h1 className="text-lg md:text-xl font-bold text-white truncate">{location.name}</h1>
            </div>
          </div>
          <div className="max-w-3xl mx-auto mt-3 px-1 pointer-events-auto">
            <div className="flex justify-between text-[11px] text-white/40 mb-1.5">
              <span>Realm progress</span>
              <span>{realmPct}%</span>
            </div>
            <div className="h-1.5 rounded-full th-panel overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${location.color}, #00f5d4)` }}
                initial={{ width: 0 }}
                animate={{ width: `${realmPct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="text-xs text-white/40 mt-3 leading-relaxed max-w-2xl">{location.description}</p>
            <p className="text-[11px] text-white/30 mt-2">
              Drag to explore · pinch to zoom · tap a castle to enter its opening
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
