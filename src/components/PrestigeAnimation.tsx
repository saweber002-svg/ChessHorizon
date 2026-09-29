import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '@/contexts/SoundContext';

interface PrestigeAnimationProps {
  /** 'journeyman' or 'master' */
  level: 'journeyman' | 'master' | null;
  onComplete: () => void;
}

/**
 * Full-screen prestige celebration for Journeyman and Master tiers.
 * Plays the iconic horn motif with an animated overlay.
 */
export default function PrestigeAnimation({ level, onComplete }: PrestigeAnimationProps) {
  const { play } = useSound();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!level) {
      setVisible(false);
      return;
    }
    setVisible(true);
    // Play the motif
    play(level === 'journeyman' ? 'journeymanPrestige' : 'masterPrestige');
    // Auto-dismiss after the fanfare
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500);
    }, level === 'journeyman' ? 2500 : 3500);
    return () => clearTimeout(timer);
  }, [level, play, onComplete]);

  const isMaster = level === 'master';

  return (
    <AnimatePresence>
      {visible && level && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={() => {
            setVisible(false);
            setTimeout(onComplete, 300);
          }}
        >
          {/* Radiating rays */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className={`absolute left-1/2 top-1/2 w-1 h-[150vmax] origin-top ${
                  isMaster ? 'bg-amber-400/20' : 'bg-cyan-400/20'
                }`}
                style={{ rotate: `${i * 30}deg` }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.8 }}
              />
            ))}
          </div>

          {/* Center content */}
          <div className="relative text-center px-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
              className={`text-6xl md:text-7xl font-black tracking-tight ${
                isMaster
                  ? 'bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent'
                  : 'bg-gradient-to-b from-cyan-200 via-cyan-400 to-cyan-600 bg-clip-text text-transparent'
              }`}
            >
              {isMaster ? 'MASTER' : 'JOURNEYMAN'}
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 text-lg text-white/70 font-medium"
            >
              {isMaster
                ? 'You have mastered this opening'
                : 'You are now a journeyman of this opening'}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-8 text-sm text-white/40"
            >
              Tap anywhere to continue
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
