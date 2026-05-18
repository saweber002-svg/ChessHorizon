import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, ChevronRight } from 'lucide-react';
import { useProgress } from '@/contexts/ProgressContext';
import { useWilderness } from '@/contexts/WildernessContext';
import { getTierColor, getTierLabel } from '@/types';
import type { KingdomId } from '@/types';
import openingsData from '@/data/openings.json';
import { useLocation } from 'wouter';

interface TrophyBoardProps {
  openingId: string;
  variationId: string;
  isOpen: boolean;
  onClose: () => void;
}

const openings = openingsData as Record<string, {
  name: string;
  kingdom: KingdomId;
  variations: Array<{ id: string; name: string; moveCount: number; moves: string[] }>;
}>;

export default function TrophyBoard({ openingId, variationId, isOpen, onClose }: TrophyBoardProps) {
  const { getMoveProgress, getMasteredCount } = useProgress();
  const { getOpening: getWildernessOpening } = useWilderness();
  const [, setLocation] = useLocation();

  // Try to find the opening in standard openings first, then wilderness
  const standardOpening = openings[openingId];
  const wildOpening = !standardOpening ? getWildernessOpening(openingId) : null;

  let variation: { name: string; moves: string[] } | null = null;
  let openingName = '';

  if (standardOpening) {
    openingName = standardOpening.name;
    const varObj = standardOpening.variations.find((v) => v.id === variationId);
    if (varObj) variation = { name: varObj.name, moves: varObj.moves };
  } else if (wildOpening) {
    openingName = wildOpening.name;
    const varObj = wildOpening.variations.find((v) => v.id === variationId);
    if (varObj) variation = { name: varObj.name, moves: varObj.moves };
  }

  if (!variation) return null;

  const moveCount = variation.moves.length;
  const masteredCount = getMasteredCount(openingId, variationId, moveCount);
  const masteryPercent = Math.round((masteredCount / moveCount) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-[#141422] border border-[#2a2a3e] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#2a2a3e]">
              <div className="flex items-center gap-3">
                <Trophy className="text-[#00f5d4]" size={24} />
                <div>
                  <h2 className="text-xl font-bold text-white">{variation.name}</h2>
                  <p className="text-sm text-white/50">{openingName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Stats */}
            <div className="p-6 border-b border-[#2a2a3e]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-white/60">Mastery</span>
                <span className="text-lg font-bold text-[#00f5d4]">{masteryPercent}%</span>
              </div>
              <div className="w-full h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#14b8a6] to-[#00f5d4] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${masteryPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-white/40 mt-2">
                {masteredCount} of {moveCount} moves at Master tier
              </p>
            </div>

            {/* 3D View Button */}
            <div className="px-6 pt-4">
              <button
                onClick={() => {
                  onClose();
                  setLocation(`/trophy/${openingId}/${variationId}`);
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] font-medium flex items-center justify-center gap-2 hover:bg-[#00f5d4]/20 transition-colors"
              >
                View in 3D
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Move List */}
            <div className="overflow-y-auto max-h-[50vh] p-4">
              <div className="grid grid-cols-2 gap-2">
                {variation.moves.map((move, index) => {
                  const key = `${openingId}:${variationId}:${index}`;
                  const progress = getMoveProgress(key);
                  const tier = progress.tier;
                  const color = getTierColor(tier);
                  const label = getTierLabel(tier);

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e]"
                    >
                      <span className="text-xs font-mono text-white/30 w-6">
                        {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'}
                      </span>
                      <span className="font-mono text-sm text-white/80 flex-1">{move}</span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}50` }}
                        />
                        <span className="text-[10px] font-medium" style={{ color }}>
                          {label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
