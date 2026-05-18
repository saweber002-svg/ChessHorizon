import { motion } from 'framer-motion';

interface StreakLostOverlayProps {
  onComplete: () => void;
}

const QUOTES = [
  "Every master was once a beginner.",
  "The only way to fail is to stop trying.",
  "Mistakes are proof that you are trying.",
  "Fall seven times, stand up eight.",
  "Progress, not perfection.",
  "Your streak will return stronger.",
];

export default function StreakLostOverlay({ onComplete }: StreakLostOverlayProps) {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onComplete}
    >
      {/* Red flash background */}
      <motion.div
        className="absolute inset-0 bg-red-500/30"
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
        className="relative z-10 flex flex-col items-center gap-4 p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
          className="text-6xl mb-2"
        >
          <span className="text-red-400">&#x1F494;</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-red-400"
        >
          Streak Lost
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-lg text-white/80 italic max-w-md"
        >
          &ldquo;{quote}&rdquo;
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-sm text-white/40 mt-4"
        >
          Tap to continue
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
