import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Star, Flame, Home } from 'lucide-react';
import { useLocation } from 'wouter';
import { useProgress } from '@/contexts/ProgressContext';
import { WorldMapScene } from '@/components/world-map/WorldMapScene';
import { KingdomPanel } from '@/components/world-map/KingdomPanel';
import type { MapLocation } from '@/data/mapLocations';
import { MAP_LOCATIONS } from '@/data/mapLocations';

export default function WorldMap() {
  const [, setLocation] = useLocation();
  const { state } = useProgress();
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number, number] | null>(null);
  const [showIntro, setShowIntro] = useState(false);

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

  return (
    <div className="w-screen h-screen bg-[#050510] overflow-hidden relative">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <WorldMapScene
          selectedId={selected?.id ?? null}
          onSelectLocation={handleSelectLocation}
          flyToPosition={flyTo}
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

      {/* Quick-start hint */}
      {!selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
        >
          <button
            onClick={() => {
              const featured = MAP_LOCATIONS.find((l) => l.drillFileId === 'giuoco-piano-main');
              if (featured) handleSelectLocation(featured);
            }}
            className="px-5 py-2.5 rounded-full bg-[#00f5d4]/15 border border-[#00f5d4]/40 text-[#00f5d4] text-sm font-medium hover:bg-[#00f5d4]/25 transition-colors backdrop-blur"
          >
            ★ Try Giuoco Piano drill
          </button>
        </motion.div>
      )}

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
  );
}
