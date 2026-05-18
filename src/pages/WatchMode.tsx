import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { useLocation, useParams, useSearch } from 'wouter';
import { Chess, type Square } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import { useProgress } from '@/contexts/ProgressContext';
import {
  loadDrillPack,
  buildFenFromMoves,
  type DrillPack,
  type DrillLine,
} from '@/lib/drillLoader';
import { getTierColor, getTierLabel, TIER_THRESHOLDS } from '@/types';

const MOVE_DELAY = 1200; // ms between moves

export default function WatchMode() {
  const params = useParams<{ drillFileId: string }>();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { state } = useProgress();

  const drillFileId = params.drillFileId ?? 'giuoco-piano-main';
  const openingId = new URLSearchParams(search).get('opening') ?? 'italian';
  const variationId = new URLSearchParams(search).get('variation') ?? 'giuoco-piano';

  // Check prestige gate
  const totalStars = state.totalStars;
  const watchModeUnlocked = totalStars >= TIER_THRESHOLDS[1]; // Apprentice tier

  const [pack, setPack] = useState<DrillPack | null>(null);
  const [line, setLine] = useState<DrillLine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0);
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5x, 1x, 2x
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moves = line?.moves ?? [];
  const startFen = pack?.startFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  useEffect(() => {
    loadDrillPack(drillFileId)
      .then((data) => {
        setPack(data);
        setLine(data.lines[0] ?? null);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load'));
  }, [drillFileId]);

  const autoPlay = useCallback(() => {
    if (!isPlaying || moveIndex >= moves.length) {
      setIsPlaying(false);
      return;
    }

    const delay = MOVE_DELAY / playbackSpeed;
    playRef.current = setTimeout(() => {
      setFen(buildFenFromMoves(startFen, moves, moveIndex + 1));
      const prev = buildFenFromMoves(startFen, moves, moveIndex);
      const curr = buildFenFromMoves(startFen, moves, moveIndex + 1);

      const prevChess = new Chess(prev);
      const currChess = new Chess(curr);

      const allMoves = prevChess.moves({ verbose: true });
      for (const m of allMoves) {
        prevChess.move(m);
        if (prevChess.fen() === curr) {
          setLastMove({ from: m.from as Square, to: m.to as Square });
          break;
        }
        prevChess.undo();
      }

      setMoveIndex((i) => i + 1);
    }, delay);
  }, [moveIndex, moves, isPlaying, startFen, playbackSpeed]);

  useEffect(() => {
    autoPlay();
    return () => {
      if (playRef.current) clearTimeout(playRef.current);
    };
  }, [autoPlay]);

  useEffect(() => {
    return () => {
      if (playRef.current) clearTimeout(playRef.current);
    };
  }, []);

  const handlePlayPause = () => {
    if (moveIndex >= moves.length) {
      setMoveIndex(0);
      setFen(startFen);
      setLastMove(null);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setMoveIndex(0);
    setFen(startFen);
    setLastMove(null);
    if (playRef.current) clearTimeout(playRef.current);
  };

  const handleSpeedUp = () => {
    const speeds = [0.5, 1, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
  };

  if (!watchModeUnlocked) {
    return (
      <motion.div className="min-h-screen bg-[#0a0a1f] flex flex-col items-center justify-center p-6">
        <button
          onClick={() => setLocation('/atlas')}
          className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="mb-6 text-4xl">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Watch Mode Locked</h1>
          <p className="text-white/60 mb-6">
            Reach <span className="text-[#14b8a6] font-semibold">Apprentice</span> tier (3+ stars) to unlock Watch Mode
            for learning without pressure.
          </p>
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-[#141422] border border-[#2a2a3e] mb-6">
            <span className="text-sm text-white/50">Current progress:</span>
            <span className="text-lg font-bold text-yellow-400">{totalStars}</span>
            <span className="text-sm text-white/40">/ 3 stars</span>
          </div>
          <button
            onClick={() => setLocation('/atlas')}
            className="w-full px-6 py-3 rounded-xl bg-[#00f5d4]/20 border border-[#00f5d4]/40 text-[#00f5d4] font-semibold hover:bg-[#00f5d4]/30 transition-colors"
          >
            Keep Drilling
          </button>
        </motion.div>
      </motion.div>
    );
  }

  if (loadError) {
    return (
      <motion.div className="min-h-screen bg-[#0a0a1f] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{loadError}</p>
        <button onClick={() => setLocation('/atlas')} className="text-[#00f5d4]">
          Back to Atlas
        </button>
      </motion.div>
    );
  }

  if (!pack || !line) {
    return (
      <motion.div className="min-h-screen bg-[#0a0a1f] flex items-center justify-center">
        <p className="text-[#00f5d4] animate-pulse tracking-widest uppercase text-sm">
          Loading…
        </p>
      </motion.div>
    );
  }

  const progressPct = moves.length > 0 ? Math.round((moveIndex / moves.length) * 100) : 0;
  const currentMove = moves[moveIndex];

  return (
    <motion.div className="min-h-screen bg-[#0a0a1f]">
      <div className="sticky top-0 z-30 bg-[#0a0a1f]/95 backdrop-blur-md border-b border-[#2a2a3e]/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setLocation('/atlas')}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60"
          >
            <ArrowLeft size={20} />
          </button>
          <motion.div className="text-center">
            <h1 className="text-sm font-semibold text-white">📺 {line.name}</h1>
            <p className="text-xs text-white/40">{pack.name}</p>
          </motion.div>
          <div className="text-xs text-white/40">
            {moveIndex} / {moves.length} moves
          </div>
        </div>
        <div className="h-1 bg-[#141422]">
          <motion.div
            className="h-full bg-gradient-to-r from-[#00f5d4] to-[#f5a623]"
            animate={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-4">
          <p className="text-center text-sm text-white/50 mb-4">
            {isPlaying ? (
              <span className="text-[#00f5d4]/80 animate-pulse">Watching…</span>
            ) : (
              <span>Paused at move {moveIndex + 1}</span>
            )}
          </p>
        </div>

        <div className="mb-6">
          <ChessBoard
            fen={fen}
            onMove={() => {}}
            glowColor="idle"
            interactive={false}
            lastMove={lastMove}
          />
        </div>

        {/* Move notation */}
        {currentMove && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6 p-4 rounded-lg bg-[#141422] border border-[#2a2a3e]"
          >
            <p className="text-xs text-white/40 mb-1">Current Move</p>
            <p className="text-2xl font-mono text-[#00f5d4] font-bold">{currentMove}</p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex gap-3 justify-center mb-6">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141422] border border-[#2a2a3e] text-white/60 hover:text-white hover:border-[#00f5d4]/30"
            title="Restart"
          >
            <RotateCcw size={18} />
            Reset
          </button>
          <button
            onClick={handlePlayPause}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-[#00f5d4] to-[#00c4aa] text-[#0a0a1f] font-semibold hover:opacity-90"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleSpeedUp}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141422] border border-[#2a2a3e] text-white/60 hover:text-white hover:border-[#00f5d4]/30"
            title="Speed"
          >
            <FastForward size={18} />
            <span className="text-sm">{playbackSpeed}x</span>
          </button>
        </div>

        {moveIndex >= moves.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-4 rounded-lg bg-[#00f5d4]/10 border border-[#00f5d4]/30"
          >
            <p className="text-[#00f5d4]">Variation Complete! 🎉</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
