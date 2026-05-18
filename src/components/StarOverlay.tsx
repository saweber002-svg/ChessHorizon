import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface StarOverlayProps {
  stars: number;
  onComplete: () => void;
}

const LABELS: Record<number, string> = {
  3: 'Perfect!',
  2: 'Good!',
  1: 'Correct',
};

export default function StarOverlay({ stars, onComplete }: StarOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -32 }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      className="absolute left-1/2 top-0 z-50 flex w-full max-w-sm -translate-x-1/2 justify-center px-4"
      onClick={onComplete}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
        className="flex flex-col items-center gap-3 rounded-3xl border border-cyan-400/20 bg-[#060712]/95 px-4 py-4 shadow-[0_16px_80px_rgba(0,245,212,0.14)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white"
        >
          {LABELS[stars] || 'Correct'}
        </motion.h2>

        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={{
                scale: 1,
                rotate: 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 15,
                delay: 0.4 + i * 0.15,
              }}
            >
              <Star
                size={64}
                className={
                  i <= stars
                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]'
                    : 'fill-gray-700 text-gray-700'
                }
                strokeWidth={1.5}
              />
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-sm text-white/60"
        >
          Tap to continue
        </motion.p>

        {/* Auto-advance progress bar */}
        <motion.div
          className="w-48 h-1 bg-white/10 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.div
            className="h-full bg-[#00f5d4] rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.8, ease: 'linear' }}
            onAnimationComplete={onComplete}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
