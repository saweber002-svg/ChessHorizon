import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useProgress } from '@/contexts/ProgressContext';
import type { MapLocation } from '@/data/mapLocations';
import { KINGDOM_POSITIONS, KINGDOM_UNLOCK_ORDER, KINGDOM_UNLOCK_STARS } from '@/types';
import type { KingdomId } from '@/types';
import {
  clampViewBox,
  createInitialViewBox,
  panViewBox,
  zoomViewBox,
  flyToTarget,
  tweenViewBox,
  easeInOutCubic,
  markerScale,
  MOBILE_MARKER_BOOST,
  MOBILE_ICON_BREAKPOINT,
} from './atlasCamera';
import type { ViewBox } from './atlasCamera';

interface Atlas2DProps {
  locations: MapLocation[];
  selectedId: string | null;
  onSelectLocation: (location: MapLocation) => void;
}

/** "Kingdom of the Netherlands" -> "Netherlands", "The Coaching Pavilion" -> "Coaching Pavilion". */
export function shortRealmName(name: string): string {
  return name
    .replace(/^(Kingdom|Queendom|Realm) of (the )?/i, '')
    .replace(/^The /i, '');
}

export type MarkerLockState = 'unlocked' | 'locked';

export function getMarkerLockState(
  location: MapLocation,
  unlockedRegions: KingdomId[]
): MarkerLockState {
  return unlockedRegions.includes(location.kingdom) ? 'unlocked' : 'locked';
}

/** Star threshold that unlocks a kingdom (mirrors KingdomPanel's logic). */
export function getUnlockThreshold(location: MapLocation): number {
  return (
    KINGDOM_UNLOCK_ORDER.find((u) => u.kingdom === location.kingdom)?.starThreshold ??
    KINGDOM_UNLOCK_STARS[location.kingdom] ??
    location.starThreshold
  );
}

/**
 * Baked top-down render of world-atlas.glb (4096px square WebP).
 * Rendered once offline with an orthographic camera; kingdom markers are
 * placed from KINGDOM_POSITIONS, which were measured in this image's space.
 * The bake's gray 3D marker spheres were inpainted out and a gentle shaded
 * relief was applied so mountains read slightly 3D (geometry untouched).
 */
const ATLAS_MAP_URL = `${import.meta.env.BASE_URL}atlas/atlas-map.webp`;

/** Castle icon per kingdom, generated in one consistent storybook style. */
const ATLAS_ICON_URL = (kingdom: KingdomId) => `${import.meta.env.BASE_URL}atlas/icons/${kingdom}.webp`;

type LabelPlacement = 'above' | 'below' | 'left' | 'right';
// Non-default label placements to avoid collisions in the crowded North Sea cluster.
const LABEL_PLACEMENT: Partial<Record<KingdomId, LabelPlacement>> = {
  english: 'above',
  dutch: 'above',
  coaching: 'right',
  clearing: 'above',
  sicilian: 'above', // keeps the label inside the tighter Italy-first initial view
};

// ---------------------------------------------------------------------------
// Marker
// ---------------------------------------------------------------------------

interface MarkerProps {
  location: MapLocation;
  x: number;
  y: number;
  selected: boolean;
  lockState: MarkerLockState;
  glowId: string;
  clipId: string;
  /** Zoom-parented scale: keeps the marker a constant on-screen size. */
  scale: number;
  onSelect: (location: MapLocation) => void;
  suppressClickRef: React.MutableRefObject<boolean>;
}

function Marker({ location, x, y, selected, lockState, glowId, clipId, scale, onSelect, suppressClickRef }: MarkerProps) {
  const locked = lockState === 'locked';
  const threshold = getUnlockThreshold(location);
  const ariaLabel = locked
    ? `${location.name}, locked. Requires ${threshold} total stars.`
    : `${location.name}, ${location.subname}`;

  // Per-marker label geometry to avoid collisions in the crowded North Sea cluster.
  const placement: LabelPlacement = LABEL_PLACEMENT[location.kingdom] ?? 'below';
  const labelX = placement === 'left' ? -4.4 : placement === 'right' ? 4.4 : 0;
  const labelY = placement === 'above' ? -4.8 : placement === 'below' ? 6.1 : 0.65;
  const labelAnchor = placement === 'left' ? 'end' : placement === 'right' ? 'start' : 'middle';

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSelect(location);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(location);
    }
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      transform={`translate(${x},${y}) scale(${scale})`}
      className="atlas-marker"
      data-locked={locked}
      data-selected={selected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Soft radial glow in the realm color */}
      <circle r={5.5} fill={`url(#${glowId})`} opacity={locked ? 0.35 : selected ? 1 : 0.8} />
      {/* Castle icon, circular-cropped */}
      <g clipPath={`url(#${clipId})`} opacity={locked ? 0.5 : 1}>
        <image
          href={ATLAS_ICON_URL(location.kingdom)}
          x={-3}
          y={-3}
          width={6}
          height={6}
          preserveAspectRatio="xMidYMid slice"
          style={{ pointerEvents: 'none' }}
        />
      </g>
      {/* Thin rim around the icon */}
      <circle
        r={3}
        fill="none"
        stroke={locked ? '#4a5165' : location.color}
        strokeWidth={0.28}
        opacity={locked ? 0.7 : 0.9}
      />
      {/* Dim veil over locked realms (fog of war) */}
      {locked && <circle r={3.2} fill="#050510" opacity={0.55} />}
      {/* Lock badge on locked realms */}
      {locked && (
        <g transform="translate(3.2,-3.4)">
          <circle r={1.8} fill="#0a0a1f" stroke="#8b93a8" strokeWidth={0.25} />
          <rect x={-0.75} y={-0.55} width={1.5} height={1.2} rx={0.25} fill="#8b93a8" />
          <path d="M -0.48,-0.55 v -0.38 a 0.48,0.48 0 0 1 0.96,0 v 0.38" fill="none" stroke="#8b93a8" strokeWidth={0.3} />
        </g>
      )}
      {/* Hover ring (CSS) + selected gold ring */}
      <circle
        r={3.7}
        fill="none"
        stroke={selected ? '#f5c542' : location.color}
        strokeWidth={selected ? 0.45 : 0.3}
        className={selected ? 'marker-ring-selected' : 'marker-ring'}
        opacity={selected ? 0.95 : 0}
      />
      {/* Keyboard focus ring */}
      <circle r={4.2} fill="none" stroke="#ffffff" strokeWidth={0.3} strokeDasharray="1 0.8" className="focus-ring" opacity={0} />
      {/* Always-visible short label; full name on hover/select/focus */}
      <text
        x={labelX}
        y={labelY}
        textAnchor={labelAnchor}
        fontSize={1.75}
        fill={locked ? '#8b93a8' : '#dfe6f5'}
        className="marker-label-short"
        style={{ userSelect: 'none', pointerEvents: 'none', paintOrder: 'stroke' }}
        stroke="#050510"
        strokeWidth={0.5}
      >
        {shortRealmName(location.name)}
      </text>
      <text
        x={labelX}
        y={labelY}
        textAnchor={labelAnchor}
        fontSize={1.9}
        fill="#ffffff"
        className="marker-label-full"
        style={{ userSelect: 'none', pointerEvents: 'none', paintOrder: 'stroke' }}
        stroke="#050510"
        strokeWidth={0.6}
      >
        {location.name}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Atlas2D
// ---------------------------------------------------------------------------

export default function Atlas2D({ locations, selectedId, onSelectLocation }: Atlas2DProps) {
  const { state } = useProgress();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const containerRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(16 / 10);
  const [containerW, setContainerW] = useState(0);
  const [viewBox, setViewBox] = useState<ViewBox>(() => createInitialViewBox(16 / 10));
  const aspectRef = useRef(aspect);
  useEffect(() => {
    aspectRef.current = aspect;
  }, [aspect]);

  // Pointer-gesture bookkeeping
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const downPosRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const flyAnimRef = useRef<number | null>(null);

  const cancelFlyTo = useCallback(() => {
    if (flyAnimRef.current !== null) {
      cancelAnimationFrame(flyAnimRef.current);
      flyAnimRef.current = null;
    }
  }, []);

  // Measure the container so the camera keeps the right aspect ratio.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerW(rect.width);
        const next = rect.width / rect.height;
        setAspect((prev) => {
          if (Math.abs(prev - next) < 0.001) return prev;
          setViewBox((vb) => clampViewBoxSafe(vb, next));
          return next;
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clampViewBoxSafe = (vb: ViewBox, a: number): ViewBox => {
    // Re-derive h from the new aspect while keeping zoom + center.
    return clampViewBox(vb, a);
  };

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0), w: rect?.width ?? 1, h: rect?.height ?? 1 };
  }, []);

  // --- Pan / pinch (mouse + pen) ---------------------------------------------
  // Touch is driven by the native touch listeners below (iOS Safari needs a
  // non-passive touchmove + preventDefault; pointermove alone isn't reliable
  // there), so the pointer handlers ignore touch to avoid double-applying.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelFlyTo();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const p = toLocal(e.clientX, e.clientY);
      pointersRef.current.set(e.pointerId, { x: p.x, y: p.y });
      downPosRef.current = { x: p.x, y: p.y };
      movedRef.current = false;
      if (pointersRef.current.size === 2) {
        const [a, b] = [...pointersRef.current.values()];
        pinchRef.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          mx: (a.x + b.x) / 2,
          my: (a.y + b.y) / 2,
        };
      }
    },
    [cancelFlyTo, toLocal]
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

      if (downPosRef.current) {
        const total = Math.hypot(p.x - downPosRef.current.x, p.y - downPosRef.current.y);
        if (total > 6) {
          movedRef.current = true;
          suppressClickRef.current = true;
        }
      }

      const aspect = aspectRef.current;
      if (pointersRef.current.size === 2) {
        const [a, b] = [...pointersRef.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const prev = pinchRef.current;
        if (prev && prev.dist > 0 && dist > 0) {
          setViewBox((vb) => {
            const zoomed = zoomViewBox(vb, prev.dist / dist, mx, my, p.w, p.h, aspect);
            return panViewBox(zoomed, mx - prev.mx, my - prev.my, p.w, p.h, aspect);
          });
        }
        pinchRef.current = { dist, mx, my };
      } else {
        setViewBox((vb) => panViewBox(vb, dx, dy, p.w, p.h, aspect));
      }
    },
    [toLocal]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) downPosRef.current = null;
  }, []);

  // --- Wheel zoom (native listener: needs passive:false) --------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelFlyTo();
      const p = toLocal(e.clientX, e.clientY);
      const factor = Math.exp(e.deltaY * 0.0015);
      setViewBox((vb) => zoomViewBox(vb, factor, p.x, p.y, p.w, p.h, aspectRef.current));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [cancelFlyTo, toLocal]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      cancelFlyTo();
      const p = toLocal(e.clientX, e.clientY);
      setViewBox((vb) => zoomViewBox(vb, 0.55, p.x, p.y, p.w, p.h, aspectRef.current));
    },
    [cancelFlyTo, toLocal]
  );

  // --- Touch gestures (native listeners) ------------------------------------
  // iOS Safari hijacks vertical swipes for page scroll / rubber-banding even
  // with touch-action:none, which is why vertical panning died on mobile
  // while horizontal (nothing to scroll to) kept working through the
  // identical pointer pipeline. So touch is driven here: a non-passive
  // touchmove lets us preventDefault once a real drag starts, and the pan /
  // pinch math runs directly off the touch list instead of relying on
  // pointermove delivery. Taps never reach the preventDefault threshold, so
  // marker taps still produce click events.
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

    const onTouchStart = (e: TouchEvent) => {
      cancelFlyTo();
      for (const t of Array.from(e.changedTouches)) {
        const p = local(t);
        touches.set(t.identifier, { x: p.x, y: p.y });
      }
      if (touches.size === 1) {
        const p = [...touches.values()][0];
        downPos = { x: p.x, y: p.y };
        movedRef.current = false;
      } else {
        downPos = null;
        if (touches.size === 2) {
          const [a, b] = [...touches.values()];
          pinch = {
            dist: Math.hypot(a.x - b.x, a.y - b.y),
            mx: (a.x + b.x) / 2,
            my: (a.y + b.y) / 2,
          };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touches.size === 0) return;
      const ref = local(e.changedTouches[0]);
      const aspect = aspectRef.current;

      if (touches.size === 2) {
        const prev = pinch;
        for (const t of Array.from(e.changedTouches)) {
          const p = local(t);
          touches.set(t.identifier, { x: p.x, y: p.y });
        }
        const [a, b] = [...touches.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        if (prev && prev.dist > 0 && dist > 0) {
          // Pinch is unambiguously a map gesture: take over immediately.
          e.preventDefault();
          movedRef.current = true;
          suppressClickRef.current = true;
          setViewBox((vb) => {
            const zoomed = zoomViewBox(vb, prev.dist / dist, mx, my, ref.w, ref.h, aspect);
            return panViewBox(zoomed, mx - prev.mx, my - prev.my, ref.w, ref.h, aspect);
          });
        }
        pinch = { dist, mx, my };
        return;
      }

      if (touches.size === 1) {
        const t = e.changedTouches[0];
        const prev = touches.get(t.identifier);
        const p = local(t);
        if (!prev) return;
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        touches.set(t.identifier, { x: p.x, y: p.y });
        if (downPos) {
          const total = Math.hypot(p.x - downPos.x, p.y - downPos.y);
          if (total > 6) {
            movedRef.current = true;
            suppressClickRef.current = true;
          }
        }
        if (movedRef.current) {
          // Real drag, not a tap: block the browser's scroll/zoom takeover.
          e.preventDefault();
          setViewBox((vb) => panViewBox(vb, dx, dy, ref.w, ref.h, aspect));
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) touches.delete(t.identifier);
      if (touches.size < 2) pinch = null;
      if (touches.size === 1) {
        // Pinch -> pan handoff: re-anchor so the remaining finger doesn't jump.
        const p = [...touches.values()][0];
        downPos = { x: p.x, y: p.y };
      } else if (touches.size === 0) {
        downPos = null;
      }
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
  }, [cancelFlyTo]);

  // --- Fly to the selected realm --------------------------------------------
  useEffect(() => {
    if (!selectedId) return;
    const loc = locations.find((l) => l.id === selectedId);
    const pos = loc ? KINGDOM_POSITIONS[loc.kingdom] : undefined;
    if (!pos) return;
    cancelFlyTo();
    const aspect = aspectRef.current;
    let raf = 0;
    const DURATION = 650;
    let from: ViewBox | null = null;
    const to = flyToTarget(pos.x, pos.y, 34, aspect);
    const start = performance.now();
    const step = (now: number) => {
      setViewBox((vb) => {
        if (!from) from = vb;
        const t = easeInOutCubic((now - start) / DURATION);
        return tweenViewBox(from, to, t);
      });
      if (now - start < DURATION) {
        raf = requestAnimationFrame(step);
        flyAnimRef.current = raf;
      } else {
        setViewBox(to);
        flyAnimRef.current = null;
      }
    };
    raf = requestAnimationFrame(step);
    flyAnimRef.current = raf;
    return () => {
      cancelAnimationFrame(raf);
      if (flyAnimRef.current === raf) flyAnimRef.current = null;
    };
  }, [selectedId, locations, cancelFlyTo]);

  useEffect(() => cancelFlyTo, [cancelFlyTo]);

  const zoomBy = useCallback(
    (factor: number) => {
      cancelFlyTo();
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const w = rect?.width ?? 1;
      const h = rect?.height ?? 1;
      setViewBox((vb) => zoomViewBox(vb, factor, w / 2, h / 2, w, h, aspectRef.current));
    },
    [cancelFlyTo]
  );

  const resetCamera = useCallback(() => {
    cancelFlyTo();
    setViewBox(createInitialViewBox(aspectRef.current));
  }, [cancelFlyTo]);

  const vbAttr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#050510]"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <style>{ATLAS_CSS}</style>
      <svg
        width="100%"
        height="100%"
        viewBox={vbAttr}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Chess Horizon world atlas. Drag to pan, scroll to zoom, activate a realm marker to open it."
      >
        <defs>
          <radialGradient id={`ocean-${uid}`} cx="50%" cy="42%" r="75%">
            <stop offset="0%" stopColor="#0c1330" />
            <stop offset="55%" stopColor="#070b22" />
            <stop offset="100%" stopColor="#050510" />
          </radialGradient>
          {locations.map((l) => (
            <radialGradient key={l.id} id={`glow-${uid}-${l.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={l.color} stopOpacity="0.85" />
              <stop offset="55%" stopColor={l.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={l.color} stopOpacity="0" />
            </radialGradient>
          ))}
          {/* Circular clip for each castle icon marker */}
          {locations.map((l) => (
            <clipPath key={l.id} id={`iconclip-${uid}-${l.id}`}>
              <circle r={3} />
            </clipPath>
          ))}
        </defs>

        {/* Nebula ocean backdrop (shows through letterbox/overscroll areas) */}
        <rect x={-60} y={-60} width={220} height={220} fill={`url(#ocean-${uid})`} />

        {/* Baked top-down render of the world-atlas.glb */}
        <image href={ATLAS_MAP_URL} x={0} y={0} width={100} height={100} preserveAspectRatio="none" />

        {/* Realm markers */}
        {locations.map((location) => {
          const pos = KINGDOM_POSITIONS[location.kingdom];
          if (!pos) return null;
          return (
            <Marker
              key={location.id}
              location={location}
              x={pos.x}
              y={pos.y}
              selected={selectedId === location.id}
              lockState={getMarkerLockState(location, state.unlockedRegions)}
              glowId={`glow-${uid}-${location.id}`}
              clipId={`iconclip-${uid}-${location.id}`}
              scale={markerScale(viewBox.w, containerW > 0 && containerW < MOBILE_ICON_BREAKPOINT ? MOBILE_MARKER_BOOST : undefined)}
              onSelect={onSelectLocation}
              suppressClickRef={suppressClickRef}
            />
          );
        })}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-5 right-5 z-10 flex flex-col gap-2">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomBy(0.7)}
          className="w-10 h-10 rounded-full bg-[#141422]/90 border border-[#2a2a3e] text-white text-xl leading-none hover:border-[#00f5d4]/50 hover:text-[#00f5d4] transition-colors"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomBy(1.4)}
          className="w-10 h-10 rounded-full bg-[#141422]/90 border border-[#2a2a3e] text-white text-xl leading-none hover:border-[#00f5d4]/50 hover:text-[#00f5d4] transition-colors"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Reset atlas view"
          onClick={resetCamera}
          className="w-10 h-10 rounded-full bg-[#141422]/90 border border-[#2a2a3e] text-white/70 text-sm hover:border-[#00f5d4]/50 hover:text-[#00f5d4] transition-colors"
        >
          ⟲
        </button>
      </div>
    </div>
  );
}

const ATLAS_CSS = `
.atlas-marker { cursor: pointer; outline: none; }
.atlas-marker .marker-ring { transition: opacity 0.25s ease; }
.atlas-marker:hover .marker-ring,
.atlas-marker:focus-visible .marker-ring { opacity: 0.85; }
.atlas-marker:hover .marker-ring { animation: atlas-pulse 1.8s ease-out infinite; }
.atlas-marker .marker-label-full { display: none; }
.atlas-marker:hover .marker-label-short,
.atlas-marker:focus-visible .marker-label-short,
.atlas-marker[data-selected="true"] .marker-label-short { display: none; }
.atlas-marker:hover .marker-label-full,
.atlas-marker:focus-visible .marker-label-full,
.atlas-marker[data-selected="true"] .marker-label-full { display: block; }
.atlas-marker:focus-visible .focus-ring { opacity: 1; }
.atlas-marker[data-locked="true"] { opacity: 0.85; }
@keyframes atlas-pulse {
  0% { transform: scale(0.75); opacity: 0.9; }
  70% { transform: scale(1.5); opacity: 0; }
  100% { transform: scale(1.5); opacity: 0; }
}
.atlas-marker .marker-ring { transform-box: fill-box; transform-origin: center; }
@media (prefers-reduced-motion: reduce) {
  .atlas-marker:hover .marker-ring { animation: none; }
}
`;
