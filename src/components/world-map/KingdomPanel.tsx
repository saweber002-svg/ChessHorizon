import { motion } from 'framer-motion';
import { X, Swords, Eye, Star, Lock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import type { MapLocation } from '@/data/mapLocations';
import { ITALIAN_DRILL_VARIATIONS } from '@/data/mapLocations';
import { useProgress } from '@/contexts/ProgressContext';
import { KINGDOM_UNLOCK_STARS } from '@/types';

interface KingdomPanelProps {
  location: MapLocation;
  onClose: () => void;
}

export function KingdomPanel({ location, onClose }: KingdomPanelProps) {
  const [, setLocation] = useLocation();
  const { state } = useProgress();

  const threshold = KINGDOM_UNLOCK_STARS[location.kingdom] ?? location.starThreshold;
  const isUnlocked =
    location.kingdom === 'wilderness' ||
    location.kingdom === 'clearing' ||
    state.totalStars >= threshold;

  const completionPct = Math.min(100, Math.round((state.totalStars / Math.max(threshold + 10, 1)) * 100));

  const startDrill = (drillFileId: string, openingId: string, variationId: string) => {
    onClose();
    setLocation(`/drill-session/${drillFileId}?opening=${openingId}&variation=${variationId}`);
  };

  const startWatchMode = (drillFileId: string, openingId: string, variationId: string) => {
    onClose();
    setLocation(`/watch-mode/${drillFileId}?opening=${openingId}&variation=${variationId}`);
  };

  const startLegacyDrill = () => {
    onClose();
    const vid = location.variationId ?? 'giuoco-piano';
    setLocation(`/drill/${location.openingId}/${vid}/0`);
  };

  const goWilderness = () => {
    onClose();
    setLocation('/wilderness');
  };

  const goClearing = () => {
    onClose();
    setLocation('/clearing');
  };

  const isItaly = location.kingdom === 'italian' || location.drillFileId === 'giuoco-piano-main';

  return (
    <motion.aside
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="absolute right-0 top-0 bottom-0 z-30 w-full max-w-md bg-[#0a0a1f]/95 backdrop-blur-xl border-l border-[#00f5d4]/20 shadow-[-20px_0_80px_rgba(0,245,212,0.08)] flex flex-col"
    >
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: `radial-gradient(ellipse at top right, ${location.color}33, transparent 60%)`,
        }}
      />

      <motion.div className="relative p-6 flex-1 overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 border"
          style={{
            borderColor: `${location.color}44`,
            background: `${location.color}15`,
            boxShadow: `0 0 30px ${location.color}33`,
          }}
        >
          {location.symbol}
        </div>

        <p className="text-[10px] uppercase tracking-[0.25em] text-[#00f5d4]/70 mb-1">{location.subname}</p>
        <h2 className="text-2xl font-bold text-white mb-2">{location.name}</h2>
        <p className="text-sm text-white/50 leading-relaxed mb-6">{location.description}</p>

        {!isUnlocked ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-[#141422] border border-[#2a2a3e] mb-6">
            <Lock size={18} className="text-white/40" />
            <p className="text-sm text-white/50">
              Earn <span className="text-yellow-400 font-semibold">{threshold} stars</span> to unlock this realm.
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <motion.div className="flex justify-between text-xs text-white/40 mb-2">
              <span>Realm progress</span>
              <span>{completionPct}%</span>
            </motion.div>
            <div className="h-1.5 rounded-full bg-[#141422] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${location.color}, #00f5d4)` }}
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-white/40">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span>{state.totalStars} total stars</span>
            </div>
          </div>
        )}

        {location.kingdom === 'wilderness' && isUnlocked && (
          <Button onClick={goWilderness} className="w-full mb-3 bg-emerald-600 hover:bg-emerald-500">
            Enter Wilderness
          </Button>
        )}

        {location.kingdom === 'clearing' && isUnlocked && (
          <Button onClick={goClearing} className="w-full mb-3 bg-amber-600 hover:bg-amber-500">
            Enter The Clearing
          </Button>
        )}

        {isUnlocked && location.drillFileId && (
          <div className="space-y-3">
            <Button
              onClick={() =>
                startDrill(
                  location.drillFileId!,
                  location.openingId,
                  location.variationId ?? 'giuoco-piano'
                )
              }
              className="w-full gap-2 bg-gradient-to-r from-[#00f5d4] to-[#00c4aa] text-[#0a0a1f] font-bold hover:opacity-90"
            >
              <Swords size={18} />
              Start Drill (JSON)
            </Button>
            <Button
              variant="outline"
              onClick={startLegacyDrill}
              className="w-full gap-2 border-[#2a2a3e] text-white/70"
            >
              Single-move practice
              <ChevronRight size={16} />
            </Button>
            <Button
              onClick={() =>
                startWatchMode(
                  location.drillFileId!,
                  location.openingId,
                  location.variationId ?? 'giuoco-piano'
                )
              }
              variant="outline"
              className="w-full gap-2 border-[#2a2a3e] text-white/70 hover:border-[#00f5d4]/30"
            >
              <Eye size={18} />
              Watch Mode
            </Button>
          </div>
        )}

        {isUnlocked && isItaly && !location.drillFileId && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-white/30 mb-3">Italian variations</p>
            {ITALIAN_DRILL_VARIATIONS.map((v) => (
              <button
                key={v.drillFileId}
                onClick={() => startDrill(v.drillFileId, 'italian', v.variationId)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#141422]/80 border border-[#2a2a3e] hover:border-[#00f5d4]/40 transition-colors text-left group"
              >
                <span className="text-sm text-white/80 group-hover:text-white">{v.label}</span>
                <Swords size={16} className="text-[#00f5d4]/50 group-hover:text-[#00f5d4]" />
              </button>
            ))}
          </div>
        )}

        {isUnlocked && !location.drillFileId && location.kingdom !== 'wilderness' && location.kingdom !== 'clearing' && !isItaly && (
          <Button
            onClick={() => {
              onClose();
              setLocation(`/board/${location.openingId}/${location.variationId ?? 'main'}`);
            }}
            className="w-full gap-2"
            variant="outline"
          >
            View opening board
            <ChevronRight size={16} />
          </Button>
        )}
      </motion.div>
    </motion.aside>
  );
}
