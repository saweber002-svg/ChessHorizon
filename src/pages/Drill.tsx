import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  RotateCcw,
  Lightbulb,
  Star,
  Flame,
  Settings,
  Trophy,
  Home,
  Swords,
  Shuffle,
  ListOrdered,
} from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { Chess, type Square } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import StarOverlay from '@/components/StarOverlay';
import StreakLostOverlay from '@/components/StreakLostOverlay';
import PrestigeBadge from '@/components/PrestigeBadge';
import TrophyBoard from '@/components/TrophyBoard';
import { useProgress } from '@/contexts/ProgressContext';
import { useWilderness } from '@/contexts/WildernessContext';
import { drillStart, drillComplete, drillFail } from '@/lib/analytics';
import openingsData from '@/data/openings.json';

const openings = openingsData as Record<string, { name: string; variations: Array<{ id: string; name: string; moveCount: number; moves: string[] }> }>;

// Compute FEN by playing through moves up to (but not including) targetIndex
function getFenForMoveIndex(moves: string[], targetIndex: number): string {
  try {
    const chess = new Chess();
    for (let i = 0; i < Math.min(targetIndex, moves.length); i++) {
      const result = chess.move(moves[i]);
      if (!result) {
        console.warn(`Invalid move in sequence: ${moves[i]} at index ${i}`);
        break;
      }
    }
    return chess.fen();
  } catch {
    return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  }
}

export default function Drill() {
  const params = useParams<{ openingId?: string; variationId?: string; moveIndex?: string }>();
  const [, setLocation] = useLocation();
  const { state, recordDrillResult, getMoveProgress } = useProgress();
  const wilderness = useWilderness();

  // Resolve current drill parameters
  const { openingId, variationId, moveIndex, variation, openingName, moves } = useMemo(() => {
    let oid = params.openingId || 'italian';
    let vid = params.variationId;
    let mid = parseInt(params.moveIndex || '0', 10);

    // Check wilderness first
    if (oid.startsWith('custom-') || oid === 'wilderness') {
      // Handle wilderness drill
      const wOpening = wilderness.openings.find((o) => o.id === oid || oid === 'wilderness');
      if (wOpening) {
        const wVar = vid ? wOpening.variations.find((v) => v.id === vid) : wOpening.variations[0];
        if (wVar) {
          return {
            openingId: wOpening.id,
            variationId: wVar.id,
            moveIndex: isNaN(mid) ? 0 : Math.max(0, Math.min(mid, wVar.moves.length - 1)),
            variation: wVar,
            openingName: wOpening.name,
            moves: wVar.moves,
          };
        }
      }
    }

    // Standard openings
    const opening = openings[oid];
    if (!opening) {
      oid = 'italian';
      mid = 0;
    }

    const variations = openings[oid]?.variations || [];
    if (!vid || !variations.find((v) => v.id === vid)) {
      vid = variations[0]?.id;
      mid = 0;
    }

    if (isNaN(mid) || mid < 0) mid = 0;

    const varObj = openings[oid]?.variations.find((v) => v.id === vid);

    return {
      openingId: oid,
      variationId: vid || 'giuoco-piano',
      moveIndex: mid,
      variation: varObj,
      openingName: openings[oid]?.name || '',
      moves: varObj?.moves || [],
    };
  }, [params, wilderness.openings]);

  const correctMove = moves[moveIndex];

  // Compute the FEN for the position we want to present to the user
  // (after playing moves[0] through moves[moveIndex-1])
  const targetFen = useMemo(() => {
    return getFenForMoveIndex(moves, moveIndex);
  }, [moves, moveIndex]);

  // Game state
  const [fen, setFen] = useState(targetFen);
  const [glowColor, setGlowColor] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [attempts, setAttempts] = useState(0);
  const [showStarOverlay, setShowStarOverlay] = useState(false);
  const [showStreakOverlay, setShowStreakOverlay] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintSquares, setHintSquares] = useState<Square[]>([]);
  const [showTrophy, setShowTrophy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [drillCompleteState, setDrillComplete] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const moveKey = `${openingId}:${variationId}:${moveIndex}`;
  const moveProgress = getMoveProgress(moveKey);

  // We need a fresh Chess instance each time we validate a move
  // Load drill - set the FEN to the computed position
  useEffect(() => {
    if (moves.length > 0 && correctMove) {
      const computedFen = getFenForMoveIndex(moves, moveIndex);
      setFen(computedFen);
      setGlowColor('idle');
      setAttempts(0);
      setHintUsed(false);
      setHintSquares([]);
      setDrillComplete(false);
      setLastMove(null);
      drillStart(variationId, moveIndex);
    }
  }, [openingId, variationId, moveIndex, moves, correctMove]);

  const handleMove = useCallback(
    (from: Square, to: Square) => {
      if (drillCompleteState || !correctMove) return;

      try {
        const testChess = new Chess(fen);
        const move = testChess.move({ from, to, promotion: 'q' });
        if (!move) return;

        const san = move.san;
        setLastMove({ from, to });
        // Apply the move to display it on the board
        setFen(testChess.fen());

        if (san === correctMove) {
          // Correct move!
          const stars = Math.max(1, 3 - attempts - (hintUsed ? 1 : 0));
          setEarnedStars(Math.max(stars, 1));
          setGlowColor('correct');
          setDrillComplete(true);
          recordDrillResult(moveKey, Math.max(stars, 1));
          drillComplete(variationId, moveIndex, Math.max(stars, 1), attempts + 1, hintUsed);

          // Haptic feedback
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
          }

          setTimeout(() => {
            setShowStarOverlay(true);
          }, 600);
        } else {
          // Incorrect move
          // Undo the move display - revert to the original FEN
          const originalFen = getFenForMoveIndex(moves, moveIndex);
          setFen(originalFen);
          setLastMove(null);

          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setGlowColor('incorrect');

          if (newAttempts >= 3) {
            setDrillComplete(true);
            recordDrillResult(moveKey, 0);
            drillFail(variationId, moveIndex, 3);

            setTimeout(() => {
              setShowStreakOverlay(true);
            }, 600);
          } else {
            setTimeout(() => {
              setGlowColor('idle');
            }, 800);
          }
        }
      } catch {
        // Invalid move
      }
    },
    [fen, correctMove, attempts, hintUsed, drillCompleteState, moveKey, moves, moveIndex, variationId, recordDrillResult]
  );

  const handleHint = useCallback(() => {
    if (drillCompleteState || !correctMove) return;
    setHintUsed(true);

    // Find which piece can make the correct move from the current position
    const testChess = new Chess(fen);
    const legalMoves = testChess.moves({ verbose: true });
    const correct = legalMoves.find((m) => m.san === correctMove);
    if (correct) {
      setHintSquares([correct.from, correct.to]);
    }

    setTimeout(() => {
      setHintSquares([]);
    }, 3000);
  }, [fen, correctMove, drillCompleteState]);

  const handleNext = useCallback(() => {
    setShowStarOverlay(false);
    setShowStreakOverlay(false);

    const nextIndex = moveIndex + 1;
    if (nextIndex < moves.length) {
      setLocation(`/drill/${openingId}/${variationId}/${nextIndex}`);
    } else {
      setLocation(`/atlas`);
    }
  }, [moveIndex, moves.length, openingId, variationId, setLocation]);

  const handleRetry = useCallback(() => {
    setShowStarOverlay(false);
    setShowStreakOverlay(false);
    const computedFen = getFenForMoveIndex(moves, moveIndex);
    setFen(computedFen);
    setGlowColor('idle');
    setAttempts(0);
    setHintUsed(false);
    setHintSquares([]);
    setDrillComplete(false);
    setLastMove(null);
  }, [moves, moveIndex]);

  const handleRandomDrill = useCallback(() => {
    const allOpeningIds = Object.keys(openings);
    const randomOid = allOpeningIds[Math.floor(Math.random() * allOpeningIds.length)];
    const randomOpening = openings[randomOid];
    if (!randomOpening) return;
    const randomVid = randomOpening.variations[Math.floor(Math.random() * randomOpening.variations.length)]?.id;
    if (!randomVid) return;
    const randomMid = Math.floor(Math.random() * (randomOpening.variations.find((v) => v.id === randomVid)?.moves.length || 1));
    setLocation(`/drill/${randomOid}/${randomVid}/${randomMid}`);
  }, [setLocation]);

  // Determine whose turn it is
  const whoseTurn = useMemo(() => {
    try {
      const c = new Chess(fen);
      return c.turn() === 'w' ? 'White' : 'Black';
    } catch {
      return 'White';
    }
  }, [fen]);

  if (!variation || moves.length === 0) {
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
          <div className="flex items-center justify-between">
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
                <p className="text-xs text-white/40">{openingName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#141422] border border-[#2a2a3e]">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-medium text-white">{state.totalStars}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#141422] border border-[#2a2a3e]">
                <Flame size={14} className="text-orange-400" />
                <span className="text-xs font-medium text-white">{state.prestigeStreak}</span>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Settings size={18} className="text-white/40" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Board Area */}
          <div className="flex flex-col items-center">
            {/* Move info - HIDDEN correct move, shows only move number and turn */}
            <div className="w-full max-w-md mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-white/40">
                    Move {Math.floor(moveIndex / 2) + 1}
                    {moveIndex % 2 === 0 ? '.' : '...'}
                  </span>
                  <span className="text-xs font-medium text-[#00f5d4]/70">
                    {whoseTurn} to move
                  </span>
                  {hintUsed && (
                    <span className="text-[10px] text-yellow-400/70 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">
                      Hint used
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i <= attempts ? 'bg-red-500' : 'bg-[#2a2a3e]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Chess Board */}
            <div className="w-full max-w-md">
              <ChessBoard
                fen={fen}
                onMove={handleMove}
                glowColor={glowColor}
                interactive={!drillCompleteState}
                hintSquares={hintSquares}
                lastMove={lastMove}
              />
            </div>

            {/* Board Controls */}
            <div className="w-full max-w-md mt-4 flex items-center justify-between">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141422] border border-[#2a2a3e] text-white/60 hover:text-white hover:border-[#00f5d4]/30 transition-colors text-sm"
              >
                <RotateCcw size={16} />
                Reset
              </button>

              <button
                onClick={handleHint}
                disabled={drillCompleteState || hintUsed}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors ${
                  hintUsed
                    ? 'bg-[#141422] border-[#2a2a3e] text-white/30 cursor-not-allowed'
                    : 'bg-[#141422] border-[#2a2a3e] text-white/60 hover:text-[#00f5d4] hover:border-[#00f5d4]/30'
                }`}
              >
                <Lightbulb size={16} />
                {hintUsed ? 'Hint Used' : 'Hint'}
              </button>

              <button
                onClick={() => setShowTrophy(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141422] border border-[#2a2a3e] text-white/60 hover:text-[#00f5d4] hover:border-[#00f5d4]/30 transition-colors text-sm"
              >
                <Trophy size={16} />
                Board
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Progress Card */}
            <div className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]">
              <h3 className="text-sm font-medium text-white/60 mb-3">Your Progress</h3>
              <div className="flex items-center gap-3">
                <PrestigeBadge tier={moveProgress.tier} stars={moveProgress.stars} size="md" />
                <div>
                  <p className="text-sm font-medium text-white">{moveProgress.stars} stars earned</p>
                  <p className="text-xs text-white/40">{moveProgress.attempts} attempts total</p>
                </div>
              </div>
            </div>

            {/* Move List - Current move shows ??? instead of answer */}
            <div className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]">
              <h3 className="text-sm font-medium text-white/60 mb-3">Move Sequence</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {moves.map((_, i) => {
                  const key = `${openingId}:${variationId}:${i}`;
                  const prog = getMoveProgress(key);
                  const isCurrent = i === moveIndex;
                  const isCompleted = i < moveIndex;
                  const moveLabel = isCurrent && !drillCompleteState ? '???' : moves[i];

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#00f5d4]/10 border border-[#00f5d4]/30'
                          : isCompleted
                          ? 'bg-[#1a1a2e] opacity-60'
                          : 'bg-[#1a1a2e]'
                      }`}
                      onClick={() => {
                        if (i !== moveIndex) {
                          setLocation(`/drill/${openingId}/${variationId}/${i}`);
                        }
                      }}
                    >
                      <span className="text-xs font-mono text-white/30 w-8">
                        {Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '...'}
                      </span>
                      <span className={`font-mono flex-1 ${
                        isCurrent && !drillCompleteState
                          ? 'text-[#00f5d4] animate-pulse'
                          : isCurrent
                          ? 'text-[#00f5d4]'
                          : 'text-white/60'
                      }`}>
                        {moveLabel}
                      </span>
                      {prog.stars > 0 && (
                        <div className="flex gap-0.5">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              size={10}
                              className={s <= prog.stars ? 'text-yellow-400 fill-yellow-400' : 'text-[#2a2a3e]'}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drill Mode */}
            <div className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]">
              <h3 className="text-sm font-medium text-white/60 mb-3">Drill Mode</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleRandomDrill}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white/60 hover:text-[#00f5d4] hover:border-[#00f5d4]/30 transition-colors text-sm"
                >
                  <Shuffle size={14} />
                  Random
                </button>
                <button
                  onClick={() => {
                    const nextIdx = (moveIndex + 1) % moves.length;
                    setLocation(`/drill/${openingId}/${variationId}/${nextIdx}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white/60 hover:text-[#00f5d4] hover:border-[#00f5d4]/30 transition-colors text-sm"
                >
                  <ListOrdered size={14} />
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {showStarOverlay && <StarOverlay stars={earnedStars} onComplete={handleNext} />}
        {showStreakOverlay && <StreakLostOverlay onComplete={handleNext} />}
      </AnimatePresence>

      {/* Trophy Board */}
      <TrophyBoard openingId={openingId} variationId={variationId} isOpen={showTrophy} onClose={() => setShowTrophy(false)} />

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#141422] border border-[#2a2a3e] rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white mb-4">Settings</h2>
              <div className="space-y-3">
                <button onClick={() => { setShowSettings(false); setLocation('/'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white/70 hover:text-white hover:border-[#00f5d4]/30 transition-colors">
                  <Home size={18} />
                  <span>Home</span>
                </button>
                <button onClick={() => { setShowSettings(false); setLocation('/atlas'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white/70 hover:text-white hover:border-[#00f5d4]/30 transition-colors">
                  <Swords size={18} />
                  <span>Atlas</span>
                </button>
                <button onClick={() => { setShowSettings(false); handleRandomDrill(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white/70 hover:text-white hover:border-[#00f5d4]/30 transition-colors">
                  <Shuffle size={18} />
                  <span>Random Drill</span>
                </button>
              </div>
              <button className="w-full mt-4 py-2 rounded-xl bg-[#2a2a3e] text-white/60 hover:bg-[#2a2a3e]/80 transition-colors text-sm" onClick={() => setShowSettings(false)}>
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
