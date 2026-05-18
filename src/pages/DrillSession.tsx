import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, RotateCcw, Shuffle, ListOrdered, Lightbulb } from 'lucide-react';
import { useLocation, useParams, useSearch } from 'wouter';
import { Chess, type Square } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import StarOverlay from '@/components/StarOverlay';
import { useProgress } from '@/contexts/ProgressContext';
import {
  loadDrillPack,
  buildFenFromMoves,
  isPlayerTurn,
  type DrillPack,
  type DrillLine,
} from '@/lib/drillLoader';

type PlayerColor = 'w' | 'b';
type DrillMode = 'in-order' | 'random';

const MAX_ATTEMPTS = 3;

function starsFromAttempts(attempts: number): number {
  if (attempts === 1) return 3;
  if (attempts === 2) return 2;
  if (attempts === 3) return 1;
  return 0;
}

export default function DrillSession() {
  const params = useParams<{ drillFileId: string }>();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { recordDrillResult } = useProgress();

  const drillFileId = params.drillFileId ?? 'giuoco-piano-main';
  const openingId = new URLSearchParams(search).get('opening') ?? 'italian';
  const variationId = new URLSearchParams(search).get('variation') ?? 'giuoco-piano';

  const [pack, setPack] = useState<DrillPack | null>(null);
  const [line, setLine] = useState<DrillLine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [playerColor, setPlayerColor] = useState<PlayerColor | null>(null);
  const [drillMode, setDrillMode] = useState<DrillMode>('in-order');
  const [moveIndex, setMoveIndex] = useState(0);
  const [fen, setFen] = useState<string>('');
  const [attempts, setAttempts] = useState(0);
  const [glowColor, setGlowColor] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [showStars, setShowStars] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [waitingOpponent, setWaitingOpponent] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveResults, setMoveResults] = useState<number[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintSquares, setHintSquares] = useState<Square[]>([]);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moves = line?.moves ?? [];
  const startFen = pack?.startFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  useEffect(() => {
    loadDrillPack(drillFileId)
      .then((data) => {
        setPack(data);
        setLine(data.lines[0] ?? null);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load drill'));
  }, [drillFileId]);

  const playerMoveIndices = useMemo(() => {
    if (!playerColor || moves.length === 0) return [];
    const indices: number[] = [];
    for (let i = 0; i < moves.length; i++) {
      const fenBefore = buildFenFromMoves(startFen, moves, i);
      if (isPlayerTurn(fenBefore, playerColor)) indices.push(i);
    }
    return indices;
  }, [moves, playerColor, startFen]);

  const currentPlayerMoveIdx = playerMoveIndices[moveIndex] ?? -1;
  const correctMove = currentPlayerMoveIdx >= 0 ? moves[currentPlayerMoveIdx] : undefined;

  const applyMovesUpTo = useCallback(
    (upTo: number) => {
      setFen(buildFenFromMoves(startFen, moves, upTo));
    },
    [startFen, moves]
  );

  const playOpponentMoves = useCallback(
    (fromIndex: number) => {
      if (!playerColor) return;
      let i = fromIndex;
      const step = () => {
        if (i >= moves.length) {
          setSessionComplete(true);
          return;
        }
        const fenBefore = buildFenFromMoves(startFen, moves, i);
        if (isPlayerTurn(fenBefore, playerColor)) {
          setWaitingOpponent(false);
          applyMovesUpTo(i);
          return;
        }
        setWaitingOpponent(true);
        applyMovesUpTo(i + 1);
        i++;
        autoPlayRef.current = setTimeout(step, 450);
      };
      step();
    },
    [moves, playerColor, startFen, applyMovesUpTo]
  );

  const beginSession = useCallback(
    (color: PlayerColor) => {
      setPlayerColor(color);
      setMoveIndex(0);
      setAttempts(0);
      setMoveResults([]);
      setSessionComplete(false);
      setShowStars(false);
      setHintUsed(false);
      setHintSquares([]);
      applyMovesUpTo(0);
      setTimeout(() => playOpponentMoves(0), 300);
    },
    [applyMovesUpTo, playOpponentMoves]
  );

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    };
  }, []);

  const handleHint = useCallback(() => {
    if (sessionComplete || showStars || !correctMove) return;
    setHintUsed(true);

    const testChess = new Chess(fen);
    const legalMoves = testChess.moves({ verbose: true });
    const correct = legalMoves.find((m) => m.san === correctMove);
    if (correct) {
      setHintSquares([correct.from, correct.to]);
    }

    setTimeout(() => {
      setHintSquares([]);
    }, 3000);
  }, [fen, correctMove, sessionComplete, showStars]);

  const advanceAfterCorrect = useCallback(
    (stars: number) => {
      setMoveResults((prev) => [...prev, stars]);
      const moveKey = `${openingId}:${variationId}:${currentPlayerMoveIdx}`;
      recordDrillResult(moveKey, stars);

      setTimeout(() => {
        setShowStars(false);
        setAttempts(0);
        setHintUsed(false);
        setHintSquares([]);
        const nextMoveIndex = moveIndex + 1;
        if (nextMoveIndex >= playerMoveIndices.length) {
          setSessionComplete(true);
          return;
        }
        setMoveIndex(nextMoveIndex);
        const nextIdx = playerMoveIndices[nextMoveIndex];
        playOpponentMoves(nextIdx);
      }, 1200);
    },
    [
      moveIndex,
      playerMoveIndices,
      currentPlayerMoveIdx,
      openingId,
      variationId,
      recordDrillResult,
      playOpponentMoves,
    ]
  );

  const handleMove = useCallback(
    (from: Square, to: Square) => {
      if (!correctMove || waitingOpponent || sessionComplete || showStars || !playerColor) return;

      try {
        const test = new Chess(fen);
        const result = test.move({ from, to, promotion: 'q' });
        if (!result) return;

        if (result.san === correctMove) {
          setLastMove({ from, to });
          setFen(test.fen());
          setGlowColor('correct');
          const stars = starsFromAttempts(attempts + 1);
          setEarnedStars(stars);
          setShowStars(true);
          advanceAfterCorrect(stars);
        } else {
          const nextAttempts = attempts + 1;
          setAttempts(nextAttempts);
          setGlowColor('incorrect');
          applyMovesUpTo(currentPlayerMoveIdx);

          if (nextAttempts >= MAX_ATTEMPTS) {
            setMoveResults((prev) => [...prev, 0]);
            const moveKey = `${openingId}:${variationId}:${currentPlayerMoveIdx}`;
            recordDrillResult(moveKey, 0);
            setTimeout(() => {
              const correct = new Chess(fen);
              const m = correct.move(correctMove);
              if (m) {
                setFen(correct.fen());
                setLastMove({ from: m.from as Square, to: m.to as Square });
              }
              setTimeout(() => {
                const nextMoveIndex = moveIndex + 1;
                if (nextMoveIndex >= playerMoveIndices.length) {
                  setSessionComplete(true);
                  return;
                }
                setMoveIndex(nextMoveIndex);
                setAttempts(0);
                setHintUsed(false);
                setHintSquares([]);
                setGlowColor('idle');
                playOpponentMoves(playerMoveIndices[nextMoveIndex]);
              }, 800);
            }, 600);
          } else {
            setTimeout(() => setGlowColor('idle'), 700);
          }
        }
      } catch {
        /* invalid */
      }
    },
    [
      correctMove,
      fen,
      attempts,
      waitingOpponent,
      sessionComplete,
      showStars,
      playerColor,
      advanceAfterCorrect,
      applyMovesUpTo,
      currentPlayerMoveIdx,
      moveIndex,
      playerMoveIndices,
      openingId,
      variationId,
      recordDrillResult,
      playOpponentMoves,
    ]
  );

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
        <p className="text-[#00f5d4] animate-pulse tracking-widest uppercase text-sm">Loading drill…</p>
      </motion.div>
    );
  }

  if (!playerColor) {
    return (
      <motion.div className="min-h-screen bg-[#0a0a1f] flex flex-col items-center justify-center p-6">
        <button
          onClick={() => setLocation('/atlas')}
          className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white"
        >
          <ArrowLeft size={18} /> Atlas
        </button>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <p className="text-[#00f5d4] text-xs uppercase tracking-[0.3em] mb-2">Choose your banner</p>
          <h1 className="text-2xl font-bold text-white mb-2">{pack.name}</h1>
          <p className="text-white/45 text-sm mb-8">{line.description}</p>
          <p className="text-white/60 text-sm mb-6">Lock in your color for this session:</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => beginSession('w')}
              className="flex-1 max-w-[140px] py-4 rounded-xl border-2 border-cyan-400/50 bg-cyan-400/10 hover:bg-cyan-400/20 transition-all"
            >
              <span className="text-3xl">♔</span>
              <p className="text-sm font-semibold text-cyan-300 mt-2">White</p>
            </button>
            <button
              onClick={() => beginSession('b')}
              className="flex-1 max-w-[140px] py-4 rounded-xl border-2 border-red-500/50 bg-red-500/10 hover:bg-red-500/20 transition-all"
            >
              <span className="text-3xl">♚</span>
              <p className="text-sm font-semibold text-red-400 mt-2">Black</p>
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  const progressPct =
    playerMoveIndices.length > 0
      ? Math.round((moveIndex / playerMoveIndices.length) * 100)
      : 0;

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
            <h1 className="text-sm font-semibold text-white">{line.name}</h1>
            <p className="text-xs text-white/40">{pack.name}</p>
          </motion.div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className={playerColor === 'w' ? 'text-cyan-400' : 'text-red-400'}>
              {playerColor === 'w' ? '♔ White' : '♚ Black'}
            </span>
          </div>
        </div>
        <div className="h-1 bg-[#141422]">
          <motion.div
            className="h-full bg-gradient-to-r from-[#00f5d4] to-[#f5a623]"
            animate={{ width: `${sessionComplete ? 100 : progressPct}%` }}
          />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {sessionComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Drill Complete</h2>
            <div className="flex justify-center gap-1 mb-6">
              {moveResults.map((s, i) => (
                <Star
                  key={i}
                  size={24}
                  className={s > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}
                />
              ))}
            </div>
            <button
              onClick={() => setLocation('/atlas')}
              className="px-6 py-3 rounded-xl bg-[#00f5d4] text-[#0a0a1f] font-bold"
            >
              Return to Atlas
            </button>
          </motion.div>
        ) : (
          <>
            <p className="text-center text-sm text-white/50 mb-4">
              {waitingOpponent ? (
                <span className="text-[#00f5d4]/80 animate-pulse">Opponent is moving…</span>
              ) : (
                <>
                  Your move {moveIndex + 1} of {playerMoveIndices.length}
                  {attempts > 0 && (
                    <span className="text-yellow-400/70"> · Attempt {attempts + 1}/{MAX_ATTEMPTS}</span>
                  )}
                </>
              )}
            </p>

            <div className="relative pt-20">
              <AnimatePresence>
                {showStars && (
                  <StarOverlay stars={earnedStars} onComplete={() => setShowStars(false)} />
                )}
              </AnimatePresence>

              <ChessBoard
                fen={fen}
                onMove={handleMove}
                glowColor={glowColor}
                hintSquares={hintSquares}
                lastMove={lastMove}
                interactive={!waitingOpponent && !showStars}
              />
            </div>

            <motion.div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => beginSession(playerColor)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141422] border border-[#2a2a3e] text-white/60 text-sm"
              >
                <RotateCcw size={16} /> Restart
              </button>
              <button
                onClick={handleHint}
                disabled={hintUsed || sessionComplete || showStars}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                  hintUsed
                    ? 'bg-[#141422] border-[#2a2a3e] text-white/30 cursor-not-allowed'
                    : 'bg-[#141422] border-[#2a2a3e] text-white/60 hover:text-[#00f5d4] hover:border-[#00f5d4]/30'
                }`}
              >
                <Lightbulb size={16} />
                {hintUsed ? 'Hint Used' : 'Hint'}
              </button>
              <button
                onClick={() => setDrillMode((m) => (m === 'in-order' ? 'random' : 'in-order'))}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141422] border border-[#2a2a3e] text-white/60 text-sm"
              >
                {drillMode === 'in-order' ? <ListOrdered size={16} /> : <Shuffle size={16} />}
                {drillMode === 'in-order' ? 'In order' : 'Random'}
              </button>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}
