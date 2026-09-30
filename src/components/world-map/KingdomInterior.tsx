import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star } from 'lucide-react';
import type { KingdomId } from '@/types';
import { KINGDOM_POSITIONS, getTierColor } from '@/types';
import { MAP_LOCATIONS } from '@/data/mapLocations';
import { getKingdomDrills, type KingdomDrill } from '@/data/kingdomDrills';
import { castleIconPx, MARKER_DESIGN_W } from './atlasCamera';
import {
  CASTLE_BY_VARIATION,
  CASTLE_MIN_SEPARATION,
  declutterPositions,
  fitCastlesView,
  latLngToMap,
  type CastleLocation,
  type FitView,
} from '@/data/castleLocations';
import { useProgress } from '@/contexts/ProgressContext';
import { REALM_TOTAL_MOVES } from '@/data/realmDrillTotals';

const ATLAS_MAP_URL = `${import.meta.env.BASE_URL}atlas/atlas-map.webp`;
const CASTLE_ICON_URL = (variationId: string) =>
  `${import.meta.env.BASE_URL}atlas/icons/castles/${variationId}.webp`;
const KINGDOM_ICON_URL = (kingdom: KingdomId) =>
  `${import.meta.env.BASE_URL}atlas/icons/${kingdom}.webp`;

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
 * Places one castle per opening at its true geographic location on the baked
 * atlas, with a deterministic de-collision pass so dense clusters (Sicily,
 * the London set) stay legible.
 */
function trueCastleSpots(kingdom: KingdomId, drills: KingdomDrill[]): CastleSpot[] {
  const fallback = KINGDOM_POSITIONS[kingdom];
  const raw = drills.map((drill) => {
    const castle = CASTLE_BY_VARIATION[drill.variationId] ?? null;
    const p = castle ? latLngToMap(castle.lat, castle.lng) : fallback;
    return { drill, castle, mx: p.x, my: p.y };
  });
  const decluttered = declutterPositions(
    raw.map((r) => ({ x: r.mx, y: r.my })),
    CASTLE_MIN_SEPARATION,
  );
  return raw.map((r, i) => ({ ...r, mx: decluttered[i].x, my: decluttered[i].y }));
}

/**
 * Pan the interior camera by a pointer drag. Positive dxPx (pointer moved
 * right) moves the camera left so the map follows the pointer.
 */
export function panCamera(view: FitView, dxPx: number, dyPx: number, wPx: number, hPx: number): FitView {
  if (wPx <= 0 || hPx <= 0) return view;
  return {
    zoom: view.zoom,
    centerX: view.centerX - ((dxPx / wPx) * 100) / view.zoom,
    centerY: view.centerY - ((dyPx / hPx) * 100) / view.zoom,
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
): FitView {
  const z2 = Math.min(INTERIOR_MAX_ZOOM, Math.max(minZoom, view.zoom * factor));
  if (z2 === view.zoom) return view;
  const left = 50 - view.zoom * view.centerX;
  const top = 50 - view.zoom * view.centerY;
  const mx = (fxPct - left) / view.zoom;
  const my = (fyPct - top) / view.zoom;
  return {
    zoom: z2,
    centerX: (50 - (fxPct - z2 * mx)) / z2,
    centerY: (50 - (fyPct - z2 * my)) / z2,
  };
}

/** Clamp the camera center so the map never slides past the container edges. */
export function clampCamera(v: FitView): FitView {
  const lo = 50 / v.zoom;
  const hi = 100 - 50 / v.zoom;
  const cx = Math.min(Math.max(v.centerX, lo), hi);
  const cy = Math.min(Math.max(v.centerY, lo), hi);
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

  // Interactive camera: starts fitted to the castle bounding box (capped at
  // the close-up zoom) and clamped so we never show past the map edges.
  // Pinch/wheel zoom bottoms out at the fitted zoom so every castle stays
  // reachable; icons stay a constant on-screen size via castleIconPx.
  const fit = useMemo(
    () => fitCastlesView(castles.map((c) => ({ x: c.mx, y: c.my }))),
    [castles],
  );
  const [view, setView] = useState<FitView>(fit);
  useEffect(() => {
    setView(fit);
  }, [fit]);
  const sizeRef = useRef(size);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);
  const fitZoomRef = useRef(fit.zoom);
  useEffect(() => {
    fitZoomRef.current = fit.zoom;
  }, [fit.zoom]);

  const mapOffset = useMemo(() => {
    const rawL = 50 - view.zoom * view.centerX;
    const rawT = 50 - view.zoom * view.centerY;
    const min = 100 - view.zoom * 100;
    return {
      left: Math.min(0, Math.max(min, rawL)),
      top: Math.min(0, Math.max(min, rawT)),
    };
  }, [view]);

  const toScreen = (mx: number, my: number) => ({
    x: mapOffset.left + view.zoom * mx,
    y: mapOffset.top + view.zoom * my,
  });

  // Same zoom-parented icon sizing as the atlas markers: the interior's
  // effective viewBox width is the map units visible across the screen
  // (100 / zoom), so castle icons hold a constant on-screen size at any
  // interior zoom instead of ballooning with the map. The 30% desktop size
  // boost is dropped on narrow screens so markers start smaller on phones.
  const iconPx = useMemo(
    () =>
      castleIconPx(
        MARKER_DESIGN_W / view.zoom,
        size.w,
        size.w > 0 && size.w < 480 ? 1.0 : undefined,
      ),
    [view.zoom, size.w],
  );

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
    setView((v) => clampCamera(panCamera(v, dxPx, dyPx, w, h)));
  }, []);

  const applyZoom = useCallback((factor: number, clientX: number, clientY: number) => {
    const p = toLocal(clientX, clientY);
    const fxPct = (p.x / p.w) * 100;
    const fyPct = (p.y / p.h) * 100;
    setView((v) => clampCamera(zoomCamera(v, fitZoomRef.current, factor, fxPct, fyPct)));
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
      setView((v) => clampCamera(zoomCamera(v, fitZoomRef.current, factor, fxPct, fyPct)));
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
    const setViewClamped = (fn: (v: FitView) => FitView) =>
      setView((v) => clampCamera(fn(v)));

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
          setViewClamped((v) =>
            zoomCamera(v, fitZoomRef.current, dist / pinchDist, fxPct, fyPct),
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
      className="w-screen h-screen bg-[#050510] overflow-hidden relative"
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
          height: `${view.zoom * 100}%`,
          left: `${mapOffset.left}%`,
          top: `${mapOffset.top}%`,
          backgroundImage: `url(${ATLAS_MAP_URL})`,
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
        const tierColor = getTierColor(prog.tier as 0 | 1 | 2 | 3 | 4);
        const castleName = castle ? `${castle.castle}, ${castle.place}` : drill.label;
        return (
          <div
            key={drill.drillFileId}
            className="absolute z-10"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 260, damping: 20 }}
              onClick={() => handleCastleClick(drill)}
              className="flex flex-col items-center group p-2.5"
              aria-label={`${drill.label} at ${castleName}. ${prog.stars} stars.`}
            >
              <div
                className="relative rounded-full overflow-hidden border-2 transition-transform group-hover:scale-110 group-active:scale-95"
                style={{
                  width: iconPx,
                  height: iconPx,
                  borderColor: tierColor,
                  boxShadow: `0 0 24px ${tierColor}66, 0 4px 16px rgba(0,0,0,0.6)`,
                }}
              >
                <img
                  src={CASTLE_ICON_URL(drill.variationId)}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                  onError={(e) => {
                    const t = e.currentTarget;
                    if (!t.dataset.fbk) {
                      t.dataset.fbk = '1';
                      t.src = KINGDOM_ICON_URL(kingdom);
                    }
                  }}
                />
              </div>
              <div className="mt-1 px-2 py-0.5 rounded-full bg-[#0a0a1f]/85 backdrop-blur border border-white/10 text-center">
                <p className="text-[10px] font-semibold text-white whitespace-nowrap leading-tight">
                  {drill.label}{' '}
                  <span className="inline-flex items-center gap-0.5 font-normal text-white/50">
                    <Star size={8} className="text-yellow-400 fill-yellow-400" />
                    {prog.stars}
                  </span>
                </p>
              </div>
            </motion.button>
          </div>
        );
      })}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="bg-gradient-to-b from-[#0a0a1f]/95 to-transparent pt-4 pb-10 px-4">
          <div className="flex items-center gap-3 max-w-3xl mx-auto pointer-events-auto">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141422]/90 border border-[#2a2a3e] text-white/70 hover:text-white hover:border-[#00f5d4]/40 transition-colors text-sm"
            >
              <ArrowLeft size={16} /> Atlas
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#00f5d4]/70">{location.subname}</p>
              <h1 className="text-lg md:text-xl font-bold text-white truncate">{location.name}</h1>
            </div>
          </div>
          <div className="max-w-3xl mx-auto mt-3 px-1 pointer-events-auto">
            <div className="flex justify-between text-[11px] text-white/40 mb-1.5">
              <span>Realm progress</span>
              <span>{realmPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#141422]/90 overflow-hidden">
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
