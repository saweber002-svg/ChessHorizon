import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star } from 'lucide-react';
import type { KingdomId } from '@/types';
import { KINGDOM_POSITIONS, getTierColor } from '@/types';
import { MAP_LOCATIONS } from '@/data/mapLocations';
import { getKingdomDrills, type KingdomDrill } from '@/data/kingdomDrills';
import {
  CASTLE_BY_VARIATION,
  CASTLE_MIN_SEPARATION,
  declutterPositions,
  fitCastlesView,
  latLngToMap,
  type CastleLocation,
} from '@/data/castleLocations';
import { useProgress } from '@/contexts/ProgressContext';
import { REALM_TOTAL_MOVES } from '@/data/realmDrillTotals';

const ATLAS_MAP_URL = `${import.meta.env.BASE_URL}atlas/atlas-map.webp`;
const CASTLE_ICON_URL = (variationId: string) =>
  `${import.meta.env.BASE_URL}atlas/icons/castles/${variationId}.webp`;
const KINGDOM_ICON_URL = (kingdom: KingdomId) =>
  `${import.meta.env.BASE_URL}atlas/icons/${kingdom}.webp`;

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

interface KingdomInteriorProps {
  kingdom: KingdomId;
  onBack: () => void;
  onSelectDrill: (drillFileId: string, openingId: string, variationId: string) => void;
}

export function KingdomInterior({ kingdom, onBack, onSelectDrill }: KingdomInteriorProps) {
  const { state } = useProgress();
  const location = MAP_LOCATIONS.find((l) => l.kingdom === kingdom);
  const drills = useMemo(() => getKingdomDrills(kingdom), [kingdom]);
  const castles = useMemo(() => trueCastleSpots(kingdom, drills), [kingdom, drills]);

  // Camera fits the true castle bounding box (capped at the close-up zoom),
  // clamped so we never show past the map edges.
  const view = useMemo(
    () => fitCastlesView(castles.map((c) => ({ x: c.mx, y: c.my }))),
    [castles],
  );
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
    <div className="w-screen h-screen bg-[#050510] overflow-hidden relative">
      {/* Zoomed atlas map */}
      <div
        className="absolute"
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
          <motion.button
            key={drill.drillFileId}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => onSelectDrill(drill.drillFileId, drill.openingId, drill.variationId)}
            className="absolute z-10 flex flex-col items-center group"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
            aria-label={`${drill.label} at ${castleName}. ${prog.stars} stars.`}
          >
            <div
              className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 transition-transform group-hover:scale-110 group-active:scale-95"
              style={{
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
            <div className="mt-1.5 px-2.5 py-1 rounded-full bg-[#0a0a1f]/85 backdrop-blur border border-white/10 text-center">
              <p className="text-[11px] md:text-xs font-semibold text-white whitespace-nowrap leading-tight">
                {drill.label}
              </p>
              <p className="text-[10px] text-white/40 whitespace-nowrap leading-tight">
                {castle?.castle ?? ''}
              </p>
              <p className="flex items-center justify-center gap-1 text-[10px] text-white/50 leading-tight">
                <Star size={9} className="text-yellow-400 fill-yellow-400" />
                {prog.stars}
              </p>
            </div>
          </motion.button>
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
              Tap a castle to enter its opening
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
