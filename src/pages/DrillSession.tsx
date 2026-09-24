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
import { hasTacticalDrills, TACTICAL_FILE_IDS } from '@/data/drillRegistry';
import { isQuarantinedTacticalFileId } from '@/data/quarantinedTacticalRegistry';

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
  const { recordDrillResult, recordOpeningCompletion } = useProgress();

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

  const isTacticalPack = drillFileId.includes('-tacticals');

  const selectTactic = useCallback((tactic: DrillLine) => {
    setLine(tactic);
    setPlayerColor(null);
    setSessionComplete(false);
    setMoveIndex(0);
    setAttempts(0);
    setMoveResults([]);
    setHintUsed(false);
    setHintSquares([]);
    setLastMove(null);
    setGlowColor('idle');
    setShowStars(false);
  }, []);

  const moves = useMemo(() => line?.moves ?? [], [line]);
  const startFen = line?.startFen ?? pack?.startFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  useEffect(() => {
    // Reset session state when drillFileId changes
    setPack(null);
    setLine(null);
    setLoadError(null);
    setPlayerColor(null);
    setMoveIndex(0);
    setFen('');
    setAttempts(0);
    setGlowColor('idle');
    setShowStars(false);
    setEarnedStars(0);
    setSessionComplete(false);
    setWaitingOpponent(false);
    setLastMove(null);
    setMoveResults([]);
    setHintUsed(false);
    setHintSquares([]);

    loadDrillPack(drillFileId)
      .then((data) => {
        setPack(data);
        // For tactical packs (-tacticals), do NOT auto-start the first one.
        // Let the user choose from the list below.
        const isTacticalPack = drillFileId.includes('-tacticals');
        if (!isTacticalPack) {
          setLine(data.lines[0] ?? null);
        }
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
          void recordOpeningCompletion({
            openingId,
            variationId,
            side: playerColor === 'w' ? 'white' : 'black',
            moveResults: [
              ...moveResults.map((value, index) => ({ moveIndex: playerMoveIndices[index] ?? index, stars: Math.max(0, Math.min(3, value)) as 0 | 1 | 2 | 3 })),
              { moveIndex: currentPlayerMoveIdx, stars: Math.max(0, Math.min(3, stars)) as 0 | 1 | 2 | 3 },
            ],
          });
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
      recordOpeningCompletion,
      moveResults,
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
                  void recordOpeningCompletion({
                    openingId,
                    variationId,
                    side: playerColor === 'w' ? 'white' : 'black',
                    moveResults: [
                      ...moveResults.map((value, index) => ({ moveIndex: playerMoveIndices[index] ?? index, stars: Math.max(0, Math.min(3, value)) as 0 | 1 | 2 | 3 })),
                      { moveIndex: currentPlayerMoveIdx, stars: 0 },
                    ],
                  });
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
      recordOpeningCompletion,
      moveResults,
      playOpponentMoves,
    ]
  );

  if (loadError) {
    const isTactical = drillFileId.includes('-tacticals');
    const isQuarantined = isQuarantinedTacticalFileId(drillFileId);
    return (
      <motion.div className="min-h-screen bg-[#0a0a1f] flex flex-col items-center justify-center gap-4 p-6 text-center">
        {isQuarantined ? (
          <>
            <p className="text-amber-300 text-lg">This tactical pack is temporarily unavailable.</p>
            <p className="text-white/50 text-sm max-w-md">
              The source material is preserved for repair but is not exposed until every position and solution passes validation.
            </p>
          </>
        ) : isTactical ? (
          <>
            <p className="text-white/70 text-lg">Tactical drills for this variation are not available yet.</p>
            <p className="text-white/50 text-sm max-w-md">
              The opening drill is complete. More tactical puzzles will be added for this line soon.
            </p>
          </>
        ) : (
          <p className="text-red-400">{loadError}</p>
        )}
        <button
          onClick={() => setLocation('/atlas')}
          className="mt-2 px-6 py-3 rounded-xl bg-[#00f5d4] text-[#0a0a1f] font-bold"
        >
          Return to Atlas
        </button>
      </motion.div>
    );
  }

  // Tactical selector takes priority for -tacticals packs (show list before color choice)
  if (isTacticalPack && !line && pack) {
    const hasDrills = pack.lines && pack.lines.length > 0;
    return (
      <div className="min-h-screen bg-[#0a0a1f] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <button
            onClick={() => setLocation('/atlas')}
            className="mb-6 flex items-center gap-2 text-white/50 hover:text-white"
          >
            <ArrowLeft size={18} /> Back to Atlas
          </button>

          <h2 className="text-2xl font-bold text-white mb-2 text-center">Tactical Drills</h2>
          <p className="text-center text-white/60 mb-8">
            {hasDrills
              ? 'Choose a tactic to practice for this variation'
              : 'Tactical puzzles for this line are being prepared.'}
          </p>

          {hasDrills ? (
            <div className="grid gap-3">
              {pack.lines.map((tactic) => (
                <button
                  key={tactic.id}
                  onClick={() => selectTactic(tactic)}
                  className="w-full text-left p-4 rounded-xl bg-[#141422] border border-[#2a2a3e] hover:border-[#00f5d4]/40 transition-colors group"
                >
                  <div className="font-semibold text-white group-hover:text-[#00f5d4]">
                    {tactic.name}
                  </div>
                  {tactic.description && (
                    <div className="text-sm text-white/60 mt-1 line-clamp-2">
                      {tactic.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={() => setLocation('/atlas')}
                className="px-6 py-3 rounded-xl bg-[#00f5d4] text-[#0a0a1f] font-bold"
              >
                Return to Atlas
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!pack || !line) {
    return (
      <motion.div className="min-h-screen bg-[#0a0a1f] flex items-center justify-center">
        <p className="text-[#00f5d4] animate-pulse tracking-widest uppercase text-sm">Loading drill…</p>
      </motion.div>
    );
  }

  if (line.moves.length === 0) {
    return (
      <motion.div className="min-h-screen bg-[#0a0a1f] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-red-400">This drill does not contain any playable moves.</p>
        <button
          onClick={() => setLocation('/atlas')}
          className="px-6 py-3 rounded-xl bg-[#00f5d4] text-[#0a0a1f] font-bold"
        >
          Return to Atlas
        </button>
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setLocation('/atlas')}
                className="px-6 py-3 rounded-xl bg-[#00f5d4] text-[#0a0a1f] font-bold"
              >
                Return to Atlas
              </button>

              {/* Only show "Drill tactics" when we actually have tactical content registered
                  for this variation. This prevents the button appearing and then landing on
                  a "not available yet" screen with only Return. */}
              {drillFileId.endsWith('-main') && hasTacticalDrills(variationId) && (
                <button
                  onClick={() => {
                    // Try to find the most appropriate tactical pack (prefer white/standard, fallback to black)
                    const t1 = `${variationId}-tacticals`;
                    const t2 = `${variationId}-black-tacticals`;
                    const tacticalDrillId = TACTICAL_FILE_IDS.includes(t1) ? t1 : t2;
                    
                    setLocation(
                      `/drill-session/${tacticalDrillId}?opening=${openingId}&variation=${variationId}`
                    );
                  }}
                  className="px-6 py-3 rounded-xl bg-[#f5a623] text-[#0a0a1f] font-bold hover:bg-[#e5941a] transition-colors"
                >
                  Drill tactics for this variation
                </button>
              )}
            </div>

            {/* If we are in a tactical pack, show the other tactics to practice next */}
            {isTacticalPack && pack && pack.lines.length > 0 && (
              <div className="mt-12 w-full max-w-md mx-auto text-left">
                <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4 text-center">Practice another tactic</p>
                <div className="grid gap-3">
                  {pack.lines.map((tactic) => (
                    <button
                      key={tactic.id}
                      onClick={() => selectTactic(tactic)}
                      className={`w-full text-left p-4 rounded-xl border transition-all group ${
                        line?.id === tactic.id
                          ? 'bg-[#00f5d4]/5 border-[#00f5d4]/30 cursor-default'
                          : 'bg-[#141422] border-[#2a2a3e] hover:border-[#00f5d4]/40 hover:bg-[#1a1a2e]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`font-semibold ${line?.id === tactic.id ? 'text-[#00f5d4]' : 'text-white group-hover:text-[#00f5d4]'}`}>
                          {tactic.name}
                        </div>
                        {line?.id === tactic.id && (
                          <span className="text-[10px] font-bold bg-[#00f5d4]/20 text-[#00f5d4] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Just Completed
                          </span>
                        )}
                      </div>
                      {tactic.description && (
                        <div className="text-sm text-white/50 mt-1 line-clamp-1 group-hover:text-white/70">
                          {tactic.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
