import { motion } from 'framer-motion';
import { ArrowLeft, Swords, ChevronRight } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { useProgress } from '@/contexts/ProgressContext';
import { getTierColor, getTierLabel } from '@/types';
import openingsData from '@/data/openings.json';

const openings = openingsData as Record<string, {
  name: string;
  variations: Array<{
    id: string;
    name: string;
    moveCount: number;
    moves: string[];
  }>;
}>;

export default function Board() {
  const params = useParams<{ openingId?: string; variationId?: string }>();
  const [, setLocation] = useLocation();
  const { getMoveProgress } = useProgress();

  const openingId = params.openingId || 'italian';
  const variationId = params.variationId || 'giuoco-piano';

  const opening = openings[openingId];
  const variation = opening?.variations.find((v) => v.id === variationId);

  if (!opening || !variation) {
    return (
      <div className="min-h-screen bg-[#0a0a1f] flex items-center justify-center">
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1f]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a1f]/95 backdrop-blur-md border-b border-[#2a2a3e]/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation('/atlas')}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} className="text-white/60" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-white">
                {variation.name}
              </h1>
              <p className="text-xs text-white/40">{opening.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Variation Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-[#141422] border border-[#2a2a3e] mb-6"
        >
          <h2 className="text-lg font-bold text-white mb-2">
            {variation.name}
          </h2>
          <p className="text-sm text-white/50 mb-4">
            {variation.moveCount} moves in this variation
          </p>
          <button
            onClick={() =>
              setLocation(`/drill/${openingId}/${variationId}/0`)
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00f5d4] text-[#0a0a1f] font-medium text-sm hover:bg-[#00f5d4]/90 transition-colors"
          >
            <Swords size={16} />
            Start Drilling
            <ChevronRight size={16} />
          </button>
        </motion.div>

        {/* Move List */}
        <div className="grid gap-2">
          {variation.moves.map((move, index) => {
            const key = `${openingId}:${variationId}:${index}`;
            const progress = getMoveProgress(key);
            const color = getTierColor(progress.tier);
            const label = getTierLabel(progress.tier);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-[#141422] border border-[#2a2a3e] hover:border-[#00f5d4]/30 transition-colors cursor-pointer"
                onClick={() =>
                  setLocation(`/drill/${openingId}/${variationId}/${index}`)
                }
              >
                <span className="text-xs font-mono text-white/30 w-8">
                  {Math.floor(index / 2) + 1}
                  {index % 2 === 0 ? '.' : '...'}
                </span>
                <span className="font-mono text-lg text-white/80 flex-1">
                  {move}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`w-2 h-2 rounded-full ${
                          s <= progress.stars
                            ? 'bg-yellow-400'
                            : 'bg-[#2a2a3e]'
                        }`}
                      />
                    ))}
                  </div>
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 6px ${color}50`,
                    }}
                  />
                  <span className="text-xs font-medium" style={{ color }}>
                    {label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
