import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Star, Flame, Home } from 'lucide-react';
import { useLocation } from 'wouter';
import { useProgress } from '@/contexts/ProgressContext';
import { WorldMapScene } from '@/components/world-map/WorldMapScene';
import { KingdomPanel } from '@/components/world-map/KingdomPanel';
import type { MapLocation } from '@/data/mapLocations';
import { MAP_LOCATIONS, ATLAS_CONFIG, applyAtlasTransform, getLegacyTransformedPosition } from '@/data/mapLocations';
import { KINGDOM_POSITIONS } from '@/types';
import type { KingdomId } from '@/types';

/**
 * Top-level error boundary for the entire Atlas page.
 * The previous one was only inside <Canvas>, so WebGL context loss,
 * errors during Canvas creation, or errors that unmount the Canvas
 * would still produce a pure white screen.
 */
class AtlasPageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('%c[Atlas Page] FATAL ERROR (caused white screen):', 'color:#f00;font-size:14px', error, errorInfo);
    // Also log a simple string version in case the object is huge
    console.error('[Atlas Page] Error message:', error?.message || error?.toString?.() || error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#050510] flex items-center justify-center text-white p-6">
          <div className="max-w-lg text-center">
            <div className="text-3xl mb-4 text-red-500">Atlas crashed (white screen)</div>
            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              A fatal error occurred in the 3D viewer. This is usually caused by the very large GLB (64 MB),
              WebGL context loss, bad geometry in the model, or a Three.js / R3F crash during load.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 rounded-xl bg-[#00f5d4] text-[#050510] font-bold text-lg hover:bg-white active:scale-[0.985] transition-all"
              >
                Hard Reload Page
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('atlas_minimal', '1');
                  window.location.reload();
                }}
                className="px-6 py-2.5 rounded-xl border border-white/30 hover:bg-white/5 text-sm"
              >
                Reload in Minimal Mode (disable particles + fewer markers)
              </button>
              <p className="text-[10px] text-white/40 mt-2">
                Open DevTools Console (F12) before reloading — the red error right when it whites out is the most important clue.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WorldMap() {
  const [, setLocation] = useLocation();
  const { state } = useProgress();
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number, number] | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  // Extracted 3D positions from the active GLB (world-atlas.glb).
  // These now come from *inside* the Canvas via KingdomPositionExtractor (using the cached GLTF from WorldMapMesh).
  // This eliminates the previous separate raw GLTFLoader load that was causing double memory usage + white screens on the large 64MB model.
  const [glbPositions, setGlbPositions] = useState<Partial<Record<KingdomId, [number, number, number]>>>({});

  const handleExtractedPositions = useCallback((positions: Partial<Record<KingdomId, [number, number, number]>>) => {
    setGlbPositions(positions);
  }, []);

  // Merge: take static MAP_LOCATIONS (all metadata, colors, drill wiring, star thresholds)
  // and override .position when we successfully extracted a real node center from the GLB.
  // Filter by unlocked kingdoms for Fog of War.
  const effectiveLocations = useMemo(() => {
    return MAP_LOCATIONS.filter((loc) => state.unlockedRegions.includes(loc.kingdom)).map((loc) => {


      // 1. Prefer live extracted positions if the debug flag is on
      const dyn = glbPositions[loc.kingdom];
      if (dyn) {
        const [x, y, z] = dyn;
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
          return { ...loc, position: dyn };
        }
      }

      // 2. Otherwise, apply manual overrides from ATLAS_CONFIG (works even with flag off)
      const manual = ATLAS_CONFIG.manualMarkerPositions?.[loc.kingdom];
      if (manual) {
        const rawPos: [number, number, number] = [
          manual[0],
          manual[1] + ATLAS_CONFIG.markerVerticalOffset,
          manual[2],
        ];
        try {
          const transformed = applyAtlasTransform(rawPos); // reuse the same transform used by the extractor
          return { ...loc, position: transformed };
        } catch {
          return loc;
        }
      }

      // 3. Final fallback
      if (ATLAS_CONFIG.forceLegacyPercentPositions) {
        // Use the improved legacy positioning (with rotation support)
        const legacyPos = getLegacyPosition(loc);
        return { ...loc, position: legacyPos };
      }

      // Default: use whatever was originally computed (old percentToWorld3D)
      // This is usually wrong on the new GLB unless forceLegacyPercentPositions is true
      return loc;
    });
  }, [glbPositions, state.unlockedRegions]);

  useEffect(() => {
    const seen = localStorage.getItem('ch_atlas_intro_seen');
    if (!seen) setShowIntro(true);
  }, []);

  const handleSelectLocation = useCallback((location: MapLocation) => {
    setSelected(location);
    setFlyTo(location.position);
  }, []);

  const dismissIntro = () => {
    setShowIntro(false);
    localStorage.setItem('ch_atlas_intro_seen', 'true');
  };

  // When forceLegacyPercentPositions is true, we use a properly transformed
  // version of the old percent layout (including rotation support).
  function getLegacyPosition(location: MapLocation): [number, number, number] {
    // We need the original percent values. They live in KINGDOM_POSITIONS.
    // For locations created via the `loc()` helper, we can reverse from the stored position,
    // but the cleanest way is to look up by kingdom.
    const kingdom = location.kingdom;
    const percents = KINGDOM_POSITIONS[kingdom];

    if (percents) {
      return getLegacyTransformedPosition(percents.x, percents.y);
    }

    // Fallback for special locations (giuoco-piano hotspot etc.)
    return location.position;
  }

  return (
    <AtlasPageErrorBoundary>
    <div className="w-screen h-screen bg-[#050510] overflow-hidden relative">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <WorldMapScene
          selectedId={selected?.id ?? null}
          onSelectLocation={handleSelectLocation}
          flyToPosition={flyTo}
          locations={effectiveLocations}
          // Position extraction is HEAVY on a 64MB GLB.
          // It is disabled by default to prevent white screens / instability.
          //
          // When you enable the flag (see below), the console will print a ready-to-paste
          // manualMarkerPositions block with the *real* centers from your GLB objects.
          //
          // Once you paste good values into manualMarkerPositions in mapLocations.ts,
          // the positions will be correct *even with the flag turned off*.
          //
          // Enable temporarily only when tuning:
          //   localStorage.setItem('debug_atlas_positions', '1')
          // Hard refresh → copy from console → paste → remove flag → hard refresh.
	          onExtractedPositions={
	            !ATLAS_CONFIG.forceLegacyPercentPositions
	              ? handleExtractedPositions
	              : undefined
	          }
        />
      </div>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="bg-gradient-to-b from-[#0a0a1f]/90 to-transparent pt-4 pb-12 px-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto pointer-events-auto">
            <button
              onClick={() => setLocation('/')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <Home size={18} className="text-[#00f5d4]" />
              <Swords size={18} className="text-[#00f5d4]" />
              <span className="font-semibold tracking-wide">Chess Horizon</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141422]/90 border border-[#2a2a3e] backdrop-blur">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium text-white">{state.totalStars}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141422]/90 border border-[#2a2a3e] backdrop-blur">
                <Flame size={16} className="text-orange-400" />
                <span className="text-sm font-medium text-white">{state.prestigeStreak}</span>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-4 px-2 pointer-events-none">
            <h1 className="text-lg font-bold text-white/25 tracking-[0.35em] uppercase">The Atlas</h1>
            <p className="text-xs text-white/20">Click a glowing realm to begin your journey</p>
          </div>
        </div>
      </div>



      {/* Kingdom panel */}
      <AnimatePresence>
        {selected && (
          <KingdomPanel location={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>

      {/* Intro overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={dismissIntro}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full p-8 rounded-2xl bg-[#0a0a1f] border border-[#00f5d4]/30 text-center shadow-[0_0_80px_rgba(0,245,212,0.15)]"
            >
              <p className="text-[#00f5d4] text-xs uppercase tracking-[0.3em] mb-3">Welcome, traveler</p>
              <h2 className="text-2xl font-bold text-white mb-3">The Fantasy Atlas</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Explore the 3D world map. Click glowing markers to open kingdoms and start opening drills
                powered by real variation data.
              </p>
              <button
                onClick={dismissIntro}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00f5d4] to-[#00c4aa] text-[#0a0a1f] font-bold"
              >
                Enter the Atlas
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </AtlasPageErrorBoundary>
  );
}
