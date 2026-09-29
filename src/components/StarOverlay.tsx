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
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      className="absolute left-1/2 top-1 z-50 flex w-auto -translate-x-1/2 justify-center"
      onClick={onComplete}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
        className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-[#060712]/95 px-4 py-2 shadow-[0_8px_40px_rgba(0,245,212,0.14)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-base font-bold text-white whitespace-nowrap"
        >
          {LABELS[stars] || 'Correct'}
        </motion.span>

        <div className="flex gap-1.5">
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
                delay: 0.25 + i * 0.12,
              }}
            >
              <Star
                size={28}
                className={
                  i <= stars
                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                    : 'fill-gray-700 text-gray-700'
                }
                strokeWidth={1.5}
              />
            </motion.div>
          ))}
        </div>

        {/* Auto-advance progress bar */}
        <motion.div
          className="w-16 h-1 bg-white/10 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
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
