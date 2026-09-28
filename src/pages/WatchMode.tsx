import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, RotateCcw, FastForward, StepForward } from 'lucide-react';
import { useLocation, useParams, useSearch } from 'wouter';
import { Chess, type Square } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import {
  loadDrillPack,
  buildFenFromMoves,
  type DrillPack,
  type DrillLine,
} from '@/lib/drillLoader';

const MOVE_DELAY = 1200; // ms between moves

const PRESTIGE_TIER_NAMES = [
  'Pre-Novice',
  'Novice',
  'Apprentice',
  'Journeyman',
  'Master',
] as const;

export default function WatchMode() {
  const params = useParams<{ drillFileId: string }>();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const drillFileId = params.drillFileId ?? 'giuoco-piano-main';
  const query = new URLSearchParams(search);
  const openingId = query.get('opening') ?? 'italian';
  const variationId = query.get('variation') ?? 'giuoco-piano';
  const side = query.get('side') === 'black' ? 'black' : 'white';

  // Server-enforced watch quota, keyed per opening/variation/side.
  // Anonymous local mode can't track attempts server-side, so the quota
  // only applies to signed-in users.
  const quotaEnforced = !!user;
  const watchStatusQuery = trpc.watch.getStatus.useQuery(
    { openingId, variationId, side },
    { enabled: quotaEnforced, retry: 1, refetchOnWindowFocus: false }
  );
  const consumeWatch = trpc.watch.consume.useMutation();
  // One idempotency key per page session: rapid double-taps on Play resolve
  // to a single server-side consume.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [watchConsumed, setWatchConsumed] = useState(false);

  const status = watchStatusQuery.data;
  const statusLoading = quotaEnforced && watchStatusQuery.isPending;

  const [pack, setPack] = useState<DrillPack | null>(null);
  const [line, setLine] = useState<DrillLine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consumeError, setConsumeError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0);
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5x, 1x, 1.5x, 2x
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moves = useMemo(() => line?.moves ?? [], [line]);
  const startFen = line?.startFen ?? pack?.startFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  useEffect(() => {
    loadDrillPack(drillFileId)
      .then((data) => {
        setPack(data);
        setLine(data.lines[0] ?? null);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load'));
  }, [drillFileId]);

  const advanceOneMove = useCallback(() => {
    if (moveIndex >= moves.length) return;
    setFen(buildFenFromMoves(startFen, moves, moveIndex + 1));
    const prev = buildFenFromMoves(startFen, moves, moveIndex);
    const curr = buildFenFromMoves(startFen, moves, moveIndex + 1);

    const prevChess = new Chess(prev);

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
  }, [moveIndex, moves, startFen]);

  const autoPlay = useCallback(() => {
    if (!isPlaying || moveIndex >= moves.length) {
      setIsPlaying(false);
      return;
    }

    const delay = MOVE_DELAY / playbackSpeed;
    playRef.current = setTimeout(() => {
      advanceOneMove();
    }, delay);
  }, [moveIndex, moves, isPlaying, playbackSpeed, advanceOneMove]);

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

  // One viewing session consumes one watch from the quota. The server is the
  // authority: consume re-checks availability, so races resolve safely.
  const ensureWatchConsumed = useCallback(async (): Promise<boolean> => {
    if (watchConsumed) return true;
    if (!quotaEnforced) {
      setWatchConsumed(true);
      return true;
    }
    if (statusLoading) return false;
    const refetchStatus = watchStatusQuery.refetch;
    const current = status ?? (await refetchStatus()).data;
    if (current && !current.available) return false;
    try {
      await consumeWatch.mutateAsync({
        openingId,
        variationId,
        side,
        idempotencyKey,
      });
      setConsumeError(null);
    } catch {
      const fresh = (await refetchStatus()).data;
      if (fresh && !fresh.available) return false;
      // Fail open: a backend hiccup shouldn't lock learning. The quota
      // remains enforced server-side for subsequent watches.
      setConsumeError('Watch quota is temporarily unreachable — playing anyway.');
    }
    setWatchConsumed(true);
    void refetchStatus();
    return true;
  }, [
    watchConsumed,
    quotaEnforced,
    statusLoading,
    status,
    watchStatusQuery.refetch,
    consumeWatch,
    openingId,
    variationId,
    side,
    idempotencyKey,
  ]);

  const handlePlayPause = useCallback(async () => {
    if (moveIndex === 0 && !watchConsumed) {
      const ok = await ensureWatchConsumed();
      if (!ok) return;
    }
    if (moveIndex >= moves.length) {
      setMoveIndex(0);
      setFen(startFen);
      setLastMove(null);
    }
    setIsPlaying((p) => !p);
  }, [moveIndex, moves.length, startFen, watchConsumed, ensureWatchConsumed]);

  const handleStep = useCallback(async () => {
    // Stepping through the line is also a viewing session: the first step
    // consumes the watch just like the first Play press, so quota can't be
    // bypassed with step-only viewing.
    if (moveIndex === 0 && !watchConsumed) {
      const ok = await ensureWatchConsumed();
      if (!ok) return;
    }
    setIsPlaying(false);
    advanceOneMove();
  }, [advanceOneMove, moveIndex, watchConsumed, ensureWatchConsumed]);

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

  // Quota exhausted: the watch was already used and not enough drill attempts
  // have been recorded since to earn another one.
  if (quotaEnforced && !statusLoading && status && !status.available && !watchConsumed) {
    const remaining = Math.max(1, (status.attemptsRequired ?? 1) - status.attemptsSinceLastWatch);
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
          <div className="mb-6 text-4xl">👀</div>
          <h1 className="text-2xl font-bold text-white mb-2">Watch Used Up</h1>
          <p className="text-white/60 mb-4">
            You&apos;ve used your watch for this line at{' '}
            <span className="text-[#14b8a6] font-semibold">{PRESTIGE_TIER_NAMES[status.tier]}</span>{' '}
            tier. Complete{' '}
            <span className="text-white font-semibold">
              {remaining} more attempt{remaining === 1 ? '' : 's'}
            </span>{' '}
            to earn your next watch.
          </p>
          <p className="text-white/40 text-sm mb-6">
            Every drill attempt counts — right or wrong. Watching never affects your prestige.
          </p>
          <button
            onClick={() =>
              setLocation(`/drill-session/${drillFileId}?opening=${openingId}&variation=${variationId}`)
            }
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#00f5d4] to-[#00c4aa] text-[#0a0a1f] font-semibold hover:opacity-90 transition-opacity"
          >
            Drill this opening
          </button>
          <button
            onClick={() => setLocation('/atlas')}
            className="w-full mt-3 px-6 py-3 rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] font-semibold hover:bg-[#00f5d4]/20 transition-colors"
          >
            Back to Atlas
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
        {quotaEnforced && status && (
          <div className="mb-4 text-center">
            <span className="inline-flex items-center gap-2 text-xs text-white/40 px-3 py-1.5 rounded-full bg-[#141422] border border-[#2a2a3e]">
              <span className="text-[#00f5d4] font-semibold">
                {PRESTIGE_TIER_NAMES[status.tier]}
              </span>
              <span>·</span>
              {status.unlimited ? (
                <span>Unlimited watches</span>
              ) : status.available ? (
                <span>
                  1 watch per {status.attemptsRequired} attempt{status.attemptsRequired === 1 ? '' : 's'}
                </span>
              ) : (
                <span>
                  {(status.attemptsRequired ?? 0) - status.attemptsSinceLastWatch} more attempts
                  for next watch
                </span>
              )}
              {status.autoOnly && (
                <>
                  <span>·</span>
                  <span>Auto-play only</span>
                </>
              )}
            </span>
          </div>
        )}

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
            disabled={statusLoading || consumeWatch.isPending}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-[#00f5d4] to-[#00c4aa] text-[#0a0a1f] font-semibold hover:opacity-90 disabled:opacity-50"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {statusLoading ? 'Checking…' : isPlaying ? 'Pause' : 'Play'}
          </button>
          {(!status || !status.autoOnly) && (
            <button
              onClick={handleStep}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141422] border border-[#2a2a3e] text-white/60 hover:text-white hover:border-[#00f5d4]/30"
              title="Step one move"
            >
              <StepForward size={18} />
              Step
            </button>
          )}
          <button
            onClick={handleSpeedUp}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141422] border border-[#2a2a3e] text-white/60 hover:text-white hover:border-[#00f5d4]/30"
            title="Speed"
          >
            <FastForward size={18} />
            <span className="text-sm">{playbackSpeed}x</span>
          </button>
        </div>

        {consumeError && (
          <p className="text-center text-xs text-yellow-400/80 mb-4">{consumeError}</p>
        )}

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
