import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Swords, Star, Flame, Home } from 'lucide-react';
import { useLocation } from 'wouter';
import { useProgress } from '@/contexts/ProgressContext';
import Atlas2D from '@/components/world-map/Atlas2D';
import { KingdomPanel } from '@/components/world-map/KingdomPanel';
import { kingdomHasDrills } from '@/data/kingdomDrills';
import { IntroVideo } from '@/components/IntroVideo';
import type { MapLocation } from '@/data/mapLocations';
import { MAP_LOCATIONS } from '@/data/mapLocations';
import { tap as hapticTap } from '@/lib/haptics';

export default function WorldMap() {
  const [, setLocation] = useLocation();
  const { state, markIntroSeen } = useProgress();
  const [selected, setSelected] = useState<MapLocation | null>(null);

  const handleSelectLocation = useCallback((location: MapLocation) => {
    hapticTap();
    const unlocked = state.unlockedRegions.includes(location.kingdom);
    // Drill kingdoms open the interior view; locked or special kingdoms
    // (wilderness / clearing / coaching) keep the classic panel.
    if (unlocked && kingdomHasDrills(location.kingdom)) {
      setLocation(`/kingdom/${location.kingdom}`);
      return;
    }
    setSelected(location);
  }, [state.unlockedRegions, setLocation]);

  // First atlas entry (scope §8): the intro video plays UNSKIPPABLE and
  // ends by transitioning into Italy's interior, story mode, with only
  // Giuoco Piano selectable (the Italy frontier does the selecting).
  const finishIntro = useCallback(() => {
    markIntroSeen();
    setLocation('/kingdom/italian');
  }, [markIntroSeen, setLocation]);

  return (
    <div className="w-screen h-screen th-bg overflow-hidden relative">
      {/* 2D atlas */}
      <div className="absolute inset-0">
        <Atlas2D
          locations={MAP_LOCATIONS}
          selectedId={selected?.id ?? null}
          onSelectLocation={handleSelectLocation}
        />
      </div>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="bg-gradient-to-b from-[var(--th-bg)] to-transparent pt-4 pb-12 px-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto pointer-events-auto">
            <button
              onClick={() => setLocation('/')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <Home size={18} className="th-accent-text" />
              <Swords size={18} className="th-accent-text" />
              <span className="font-semibold tracking-wide">Chess Horizon</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full th-panel border th-border backdrop-blur">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium text-white">{state.totalStars}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full th-panel border th-border backdrop-blur">
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

      {/* First-entry intro video (replaces the old welcome card) */}
      {!state.introVideoSeen && (
        <IntroVideo skippable={false} onDone={finishIntro} />
      )}
    </div>
  );
}
