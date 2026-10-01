import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Swords,
  RotateCcw,
  Save,
  Undo2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { Chess, type Square } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import BoardWithEval from '@/components/BoardWithEval';
import { useWilderness } from '@/contexts/WildernessContext';
import {
  analyzeMove,
  calculateAccuracy,
  EngineUnavailableError,
  type MoveAnalysis,
} from '@/lib/coachingAnalysis';
import { getEngine } from '@/engine/stockfish';
import { DIFFICULTY_LEVELS, blunderForDifficulty, skillForDifficulty, type DifficultyId } from '@/lib/difficulty';
import { classificationColors, classificationIcons } from '@/lib/classificationStyle';
import {
  SPAR_START_FEN,
  buildStartPosition,
  lineFenAt,
  isHumanTurn,
  gameOverReason,
  positionsAfterMoves,
  takebackPlyCount,
} from '@/lib/sparring';

type SideChoice = 'w' | 'b' | 'both';
type GameOverKind = 'checkmate' | 'stalemate' | 'draw';

const SIDE_OPTIONS: Array<{ id: SideChoice; label: string; hint: string }> = [
  { id: 'w', label: 'White', hint: 'You move first' },
  { id: 'b', label: 'Black', hint: 'Engine moves first' },
  { id: 'both', label: 'Both', hint: 'Free input, engine coaches every move' },
];

/** Analysis depth for wilderness sparring: a notch below coaching's 14 so the
 *  two searches (before MultiPV=3 + after) stay comfortably inside the UCI
 *  timeout even on slow devices. Classification quality is unaffected. */
const SPAR_ANALYSIS_DEPTH = 12;

export default function CoachingSpar() {
  const [, setLocation] = useLocation();
  const { openings, addOpening, updateVariationMoves } = useWilderness();

  // Setup
  const [started, setStarted] = useState(false);
  const [sideChoice, setSideChoice] = useState<SideChoice>('w');
  const [difficulty, setDifficulty] = useState<DifficultyId>('casual');
  const [startOpeningId, setStartOpeningId] = useState<string>('');

  // Play state
  const [fen, setFen] = useState(SPAR_START_FEN);
  const [positions, setPositions] = useState<string[]>([SPAR_START_FEN]);
  const [moveSans, setMoveSans] = useState<string[]>([]);
  /** Parallel to moveSans. null = engine move, preloaded line move, or analysis still pending. */
  const [analyses, setAnalyses] = useState<Array<MoveAnalysis | null>>([]);
  /** Plies whose analysis failed (timeout, engine error). Never stuck as pending. */
  const [failedPlies, setFailedPlies] = useState<ReadonlySet<number>>(new Set());
  /** Plies preloaded from a custom opening line — never analyzed. */
  const [preloadedCount, setPreloadedCount] = useState(0);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [engineThinking, setEngineThinking] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<GameOverKind | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [userSide, setUserSide] = useState<SideChoice>('w');
  // Board orientation follows the side chosen at game start and never changes
  // mid-game (userSide can flip to 'both' if the engine drops out — the view
  // should stay put).
  const [boardSide, setBoardSide] = useState<'w' | 'b'>('w');

  // Engine line step-through (the follow-up line for a rated move)
  const [lineBaseFen, setLineBaseFen] = useState<string | null>(null);
  const [linePv, setLinePv] = useState<string[]>([]);
  const [lineStep, setLineStep] = useState(0);
  const [lineForPly, setLineForPly] = useState<number | null>(null);

  // Save-as-opening dialog
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');

  const engineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on takeback so an in-flight engine reply is discarded instead of
  // landing on the rewound position.
  const replyToken = useRef(0);
  /** Incremented every time a new sparring game starts; async engine work
   *  from a previous game checks it and bails out instead of corrupting
   *  the new game's state. */
  const gameId = useRef(0);
  useEffect(() => () => {
    if (engineTimer.current) clearTimeout(engineTimer.current);
  }, []);

  // Pre-warm the engine while the user is on the setup screen.
  useEffect(() => {
    getEngine()
      .ensureReady()
      .catch(() => setEngineError('Engine unavailable — playing on without analysis.'));
  }, []);

  /** True when ply i was played by the human (not the engine, not preloaded). */
  const isUserPly = useCallback(
    (i: number) => {
      if (i < preloadedCount || i >= positions.length - 1) return false;
      const turn = new Chess(positions[i]).turn();
      return userSide === 'both' || turn === userSide;
    },
    [preloadedCount, positions, userSide]
  );

  const analysisPending = moveSans.some(
    (_, i) => analyses[i] === null && !failedPlies.has(i) && isUserPly(i)
  );

  const resetPlay = useCallback((startFen: string, startSans: string[], side: SideChoice) => {
    if (engineTimer.current) clearTimeout(engineTimer.current);
    gameId.current += 1;
    setFen(startFen);
    setPositions(positionsAfterMoves(startFen, startSans));
    setMoveSans(startSans);
    setAnalyses(startSans.map(() => null));
    setFailedPlies(new Set());
    setPreloadedCount(startSans.length);
    setViewPly(null);
    setGameOver(null);
    setLastMove(null);
    setUserSide(side);
    setBoardSide(side === 'b' ? 'b' : 'w');
    setLineBaseFen(null);
    setLinePv([]);
    setLineStep(0);
    setLineForPly(null);
    setEngineThinking(false);
    setEngineError(null);
  }, []);

  /** Apply an already-validated SAN move; optionally grade it in the background. */
  const applySan = useCallback(
    (moveSan: string, from: Square, to: Square, fenBefore: string, analyze: boolean) => {
      const game = new Chess(fenBefore);
      const result = game.move(moveSan);
      const newFen = game.fen();
      const over = gameOverReason(newFen);
      const plyIndex = moveSans.length;
      const id = gameId.current;

      setFen(newFen);
      setPositions((p) => [...p, newFen]);
      setMoveSans((m) => [...m, result.san]);
      setAnalyses((a) => [...a, null]);
      setLastMove({ from, to });
      setViewPly(null);
      if (over) setGameOver(over);

      if (analyze) {
        analyzeMove(result.san, fenBefore, SPAR_ANALYSIS_DEPTH).then(
          (analysis) => {
            if (id !== gameId.current) return; // stale game: ignore
            setAnalyses((a) => {
              const next = [...a];
              next[plyIndex] = analysis;
              return next;
            });
          },
          (e) => {
            if (id !== gameId.current) return; // stale game: ignore
            // Never leave the ply stuck as "analyzing": record the failure
            // so the UI moves on (e.g. UCI timeout on a slow device).
            setFailedPlies((prev) => new Set(prev).add(plyIndex));
            if (e instanceof EngineUnavailableError) {
              setEngineError('Engine unavailable — playing on without analysis.');
            } else {
              setEngineError('Analysis timed out on this device — that move will show no rating, play on.');
              console.error('Analysis failed', e);
            }
          }
        );
      }
      return { newFen, over };
    },
    [moveSans.length]
  );

  const makeEngineMove = useCallback(
    async (engineFen: string, difficultyId: DifficultyId) => {
      const id = gameId.current;
      const token = replyToken.current;
      setEngineThinking(true);
      try {
        const uci = await getEngine().findPlayMove(engineFen, {
          skill: skillForDifficulty(difficultyId),
          blunderRate: blunderForDifficulty(difficultyId),
        });
        if (token !== replyToken.current) return; // taken back: discard the reply
        if (id !== gameId.current) return; // stale game: don't touch the new board
        const game = new Chess(engineFen);
        const result = game.move({
          from: uci.slice(0, 2) as Square,
          to: uci.slice(2, 4) as Square,
          promotion: uci.length > 4 ? uci[4] : undefined,
        });
        applySan(result.san, result.from, result.to, engineFen, false);
      } catch (e) {
        if (e instanceof EngineUnavailableError) {
          if (id !== gameId.current) return; // stale game: don't touch the new board
          setEngineError('Engine unavailable — the engine cannot reply. You can keep moving both sides.');
          setUserSide('both');
        } else {
          console.error('Engine move failed', e);
        }
      } finally {
        setEngineThinking(false);
      }
    },
    [applySan]
  );
  const makeEngineMoveRef = useRef(makeEngineMove);
  useEffect(() => {
    makeEngineMoveRef.current = makeEngineMove;
  });

  const scheduleEngineReply = useCallback(
    (engineFen: string) => {
      if (engineTimer.current) clearTimeout(engineTimer.current);
      engineTimer.current = setTimeout(() => {
        void makeEngineMoveRef.current(engineFen, difficulty);
      }, 600);
    },
    [difficulty]
  );

  const startSparring = useCallback(() => {
    let startFen = SPAR_START_FEN;
    let startSans: string[] = [];
    if (startOpeningId) {
      const opening = openings.find((o) => o.id === startOpeningId);
      const built = buildStartPosition(opening?.variations[0]?.moves ?? []);
      startFen = built.fen;
      startSans = built.appliedSans;
    }
    resetPlay(startFen, startSans, sideChoice);
    setStarted(true);
    // Engine (White) opens when the user chose Black and White is to move.
    if (sideChoice === 'b' && startSans.length % 2 === 0) {
      engineTimer.current = setTimeout(() => {
        void makeEngineMoveRef.current(startFen, difficulty);
      }, 600);
    }
  }, [startOpeningId, openings, sideChoice, difficulty, resetPlay]);

  const handleBoardMove = useCallback(
    (from: Square, to: Square) => {
      if (!started || gameOver || lineBaseFen !== null || viewPly !== null) return;
      if (!isHumanTurn(fen, userSide) || engineThinking) return;
      const game = new Chess(fen);
      let result;
      try {
        result = game.move({ from, to, promotion: 'q' });
      } catch {
        return;
      }
      const { newFen, over } = applySan(result.san, from, to, fen, true);
      // Engine replies as the opposing color (unless free-input mode).
      if (!over && userSide !== 'both' && !isHumanTurn(newFen, userSide)) {
        scheduleEngineReply(newFen);
      }
    },
    [started, gameOver, lineBaseFen, viewPly, fen, userSide, engineThinking, applySan, scheduleEngineReply]
  );

  const showLine = useCallback(
    (plyIndex: number) => {
      const analysis = analyses[plyIndex];
      if (!analysis || analysis.pv.length === 0) return;
      setLineBaseFen(positions[plyIndex]);
      setLinePv(analysis.pv);
      setLineStep(0);
      setLineForPly(plyIndex);
      setViewPly(null);
    },
    [analyses, positions]
  );

  const closeLine = useCallback(() => {
    setLineBaseFen(null);
    setLinePv([]);
    setLineStep(0);
    setLineForPly(null);
  }, []);

  /**
   * Take back moves against the computer: rewinds to the last position where
   * it was the human's turn (your move + the engine's reply, or just your
   * move if the engine hasn't replied yet). Preloaded opening moves are never
   * taken back. An in-flight engine reply is cancelled via replyToken.
   */
  const handleTakeback = useCallback(() => {
    if (!started || gameOver || lineBaseFen !== null || viewPly !== null) return;
    const n = takebackPlyCount(positions, preloadedCount, userSide);
    if (n <= 0) return;
    if (engineTimer.current) clearTimeout(engineTimer.current);
    replyToken.current += 1;
    setEngineThinking(false);
    setEngineError(null);
    setGameOver(null);
    closeLine();
    setLastMove(null);
    const total = positions.length - 1;
    const newFen = positions[total - n];
    setMoveSans((m) => m.slice(0, m.length - n));
    setPositions((p) => p.slice(0, p.length - n));
    setAnalyses((a) => a.slice(0, a.length - n));
    setFailedPlies((prev) => new Set([...prev].filter((i) => i < total - n)));
    setFen(newFen);
    // If the rewind leaves the engine to move (e.g. taking back its opening
    // move before you moved), have it move again instead of stalling.
    if (
      userSide !== 'both' &&
      new Chess(newFen).turn() !== userSide &&
      !gameOverReason(newFen)
    ) {
      scheduleEngineReply(newFen);
    }
  }, [started, gameOver, lineBaseFen, viewPly, positions, preloadedCount, userSide, closeLine, scheduleEngineReply]);

  const goToPly = useCallback(
    (ply: number | null) => {
      closeLine();
      setViewPly(ply);
    },
    [closeLine]
  );

  const handleSave = useCallback(() => {
    if (!saveName.trim() || moveSans.length === 0) return;
    const created = addOpening(saveName.trim(), 'Opening sparred on the coaching board.');
    updateVariationMoves(created.id, 'main', moveSans);
    setShowSave(false);
    setSaveName('');
    setLocation('/wilderness');
  }, [saveName, moveSans, addOpening, updateVariationMoves, setLocation]);

  const userAnalyses = analyses.filter((a): a is MoveAnalysis => a !== null);
  const accuracy = userAnalyses.length > 0 ? calculateAccuracy(userAnalyses) : null;
  const latestAnalysis = [...analyses].reverse().find((a) => a !== null) ?? null;

  const lineFen = lineBaseFen !== null ? lineFenAt(lineBaseFen, linePv, lineStep) : null;
  const displayFen = lineFen ?? (viewPly !== null ? positions[viewPly] : fen);
  const boardInteractive =
    started && !gameOver && lineBaseFen === null && viewPly === null && isHumanTurn(fen, userSide) && !engineThinking;

  const gameOverText =
    gameOver === 'checkmate'
      ? `Checkmate — ${new Chess(fen).turn() === 'w' ? 'Black' : 'White'} wins`
      : gameOver === 'stalemate'
        ? 'Draw by stalemate'
        : gameOver === 'draw'
          ? 'Draw'
          : null;

  return (
    <div className="min-h-screen bg-[#0a0a1f]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a1f]/95 backdrop-blur-md border-b border-[#2a2a3e]/50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/coaching')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Back to Coaching Pavilion"
              >
                <ArrowLeft size={20} className="text-white/60" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Swords size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-white">Sparring Board</h1>
                  <p className="text-xs text-white/40">Play openings, get coached</p>
                </div>
              </div>
            </div>
            {started && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTakeback}
                  disabled={moveSans.length <= preloadedCount || lineBaseFen !== null || viewPly !== null}
                  title="Take back your last move (and the engine's reply)"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Undo2 size={14} />
                  <span className="hidden sm:inline">Take back</span>
                </button>
                <button
                  onClick={() => setShowSave(true)}
                  disabled={moveSans.length === 0}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  <span className="hidden sm:inline">Save as opening</span>
                </button>
                <button
                  onClick={() => {
                    setStarted(false);
                    closeLine();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {!started ? (
          <SetupScreen
            sideChoice={sideChoice}
            setSideChoice={setSideChoice}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            startOpeningId={startOpeningId}
            setStartOpeningId={setStartOpeningId}
            openings={openings}
            onStart={startSparring}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* Board */}
            <div>
              <div className="max-w-[560px] mx-auto">
                <BoardWithEval fen={displayFen} orientation={boardSide === 'b' ? 'black' : 'white'}>
                  <ChessBoard
                    fen={displayFen}
                    onMove={handleBoardMove}
                    glowColor="idle"
                    interactive={boardInteractive}
                    lastMove={lineBaseFen !== null || viewPly !== null ? null : lastMove}
                    orientation={boardSide === 'b' ? 'black' : 'white'}
                  />
                </BoardWithEval>
                <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                  <span>
                    {engineThinking
                      ? 'Engine is thinking…'
                      : analysisPending
                        ? 'Analyzing your move…'
                        : gameOver
                          ? gameOverText
                          : isHumanTurn(fen, userSide)
                            ? 'Your move'
                            : 'Waiting for engine'}
                  </span>
                  {accuracy !== null && (
                    <span>
                      Your accuracy <span className="text-white font-semibold">{accuracy}%</span>
                      <span className="text-white/30"> ({userAnalyses.length} moves)</span>
                    </span>
                  )}
                </div>
                {gameOver && (
                  <div className="mt-3 p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e] text-center">
                    <p className="text-white font-semibold">{gameOverText}</p>
                    <p className="text-white/40 text-sm mt-1">Review the moves on the right, or save this line as an opening.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis panel */}
            <div className="space-y-4">
              {engineError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                  {engineError}
                </div>
              )}

              {/* Line step-through */}
              {lineBaseFen !== null && lineForPly !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-[#141422] border border-[#00f5d4]/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">
                      Best line <span className="text-white/30 normal-case">after {moveSans[lineForPly]}</span>
                    </h3>
                    <button
                      onClick={closeLine}
                      className="p-1.5 rounded-lg hover:bg-white/10"
                      aria-label="Close line view"
                    >
                      <X size={16} className="text-white/40" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {linePv.map((san, i) => (
                      <button
                        key={i}
                        onClick={() => setLineStep(i + 1)}
                        className={`px-2.5 py-1 rounded-lg font-mono text-sm transition-colors ${
                          i < lineStep
                            ? 'bg-[#00f5d4]/20 text-[#00f5d4] border border-[#00f5d4]/40'
                            : 'bg-white/5 text-white/60 border border-transparent hover:border-white/20'
                        }`}
                      >
                        {san}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLineStep((s) => Math.max(0, s - 1))}
                      disabled={lineStep === 0}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30"
                      aria-label="Step back"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-white/40 flex-1 text-center">
                      Move {lineStep} of {linePv.length}
                    </span>
                    <button
                      onClick={() => setLineStep((s) => Math.min(linePv.length, s + 1))}
                      disabled={lineStep === linePv.length}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30"
                      aria-label="Step forward"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      onClick={closeLine}
                      className="px-3 py-2 rounded-lg bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] text-xs font-semibold hover:bg-[#00f5d4]/20"
                    >
                      Return to live
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Latest rating */}
              {latestAnalysis && lineBaseFen === null && (
                <motion.div
                  key={moveSans.length}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-white font-bold">{latestAnalysis.move}</span>
                    <span
                      className="text-xs font-black uppercase tracking-wide"
                      style={{ color: classificationColors[latestAnalysis.classification] }}
                    >
                      {classificationIcons[latestAnalysis.classification]} {latestAnalysis.classification}
                    </span>
                  </div>
                  <p className="text-sm text-white/60">{latestAnalysis.explanation}</p>
                  {latestAnalysis.pv.length > 0 && (
                    <button
                      onClick={() => {
                        const ply = analyses.lastIndexOf(latestAnalysis);
                        if (ply >= 0) showLine(ply);
                      }}
                      className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] text-xs font-semibold hover:bg-[#00f5d4]/20 transition-colors"
                    >
                      <Eye size={14} />
                      Show best line ({latestAnalysis.pv.length} moves)
                    </button>
                  )}
                </motion.div>
              )}

              {/* Move list */}
              <div className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Moves</h3>
                  {viewPly !== null && (
                    <button
                      onClick={() => goToPly(null)}
                      className="text-xs text-[#00f5d4] font-semibold hover:underline"
                    >
                      Return to live
                    </button>
                  )}
                </div>
                {moveSans.length === 0 ? (
                  <p className="text-sm text-white/30">No moves yet — move a piece to begin.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
                    {Array.from({ length: Math.ceil(moveSans.length / 2) }).map((_, moveNum) => (
                      <div key={moveNum} className="flex items-center gap-2 py-0.5">
                        <span className="text-white/30 text-xs w-7">{moveNum + 1}.</span>
                        {[0, 1].map((offset) => {
                          const idx = moveNum * 2 + offset;
                          const san = moveSans[idx];
                          if (!san) return <span key={offset} className="flex-1" />;
                          const analysis = analyses[idx];
                          const isViewing = viewPly === idx + 1;
                          return (
                            <button
                              key={offset}
                              onClick={() => goToPly(isViewing ? null : idx + 1)}
                              className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-all ${
                                isViewing
                                  ? 'bg-[#00f5d4]/15 border border-[#00f5d4]/30'
                                  : 'bg-white/5 border border-transparent hover:border-white/15'
                              }`}
                            >
                              <span className="text-white font-mono">{san}</span>
                              {analysis && (
                                <span
                                  className="text-xs font-black"
                                  style={{ color: classificationColors[analysis.classification] }}
                                  title={analysis.classification}
                                >
                                  {classificationIcons[analysis.classification]}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail for the viewed move */}
              {viewPly !== null && analyses[viewPly - 1] && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold font-mono">
                      {Math.ceil(viewPly / 2)}.{viewPly % 2 === 1 ? '' : '..'} {analyses[viewPly - 1]!.move}
                    </span>
                    <span
                      className="text-xs font-black uppercase"
                      style={{ color: classificationColors[analyses[viewPly - 1]!.classification] }}
                    >
                      {analyses[viewPly - 1]!.classification}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs">{analyses[viewPly - 1]!.explanation}</p>
                  <button
                    onClick={() => showLine(viewPly - 1)}
                    className="mt-2 flex items-center gap-2 text-xs text-[#00f5d4] font-semibold hover:underline"
                  >
                    <Eye size={12} />
                    Step through the best line
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save dialog */}
      <AnimatePresence>
        {showSave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowSave(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#141422] border border-[#2a2a3e] rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Save as opening</h2>
                <button onClick={() => setShowSave(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                  <X size={18} className="text-white/40" />
                </button>
              </div>
              <p className="text-sm text-white/40 mb-3">
                {moveSans.length} moves will be saved as the main line.
              </p>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., My Sicilian Line"
                className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 mb-4"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSave(false)}
                  className="flex-1 py-3 rounded-xl bg-[#2a2a3e] text-white/60 font-medium hover:bg-[#2a2a3e]/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-[#0a0a1f] font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface OpeningLike {
  id: string;
  name: string;
  variations: Array<{ moves: string[] }>;
}

function SetupScreen({
  sideChoice,
  setSideChoice,
  difficulty,
  setDifficulty,
  startOpeningId,
  setStartOpeningId,
  openings,
  onStart,
}: {
  sideChoice: SideChoice;
  setSideChoice: (s: SideChoice) => void;
  difficulty: DifficultyId;
  setDifficulty: (d: DifficultyId) => void;
  startOpeningId: string;
  setStartOpeningId: (id: string) => void;
  openings: OpeningLike[];
  onStart: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <div className="p-6 rounded-2xl bg-[#141422] border border-[#2a2a3e] mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Swords size={20} className="text-emerald-400" />
          <h2 className="text-lg font-bold text-white">How it works</h2>
        </div>
        <p className="text-sm text-white/50">
          Move the pieces to play out an opening. The engine replies as the opposing color,
          rates every one of your moves, explains its reasoning, and shows you the best
          continuation line — step by step, right on the board.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[#141422] border border-[#2a2a3e] mb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Play as</p>
        <div className="grid grid-cols-3 gap-2">
          {SIDE_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSideChoice(s.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                sideChoice === s.id
                  ? 'bg-emerald-500/15 border-emerald-500/50'
                  : 'bg-white/5 border-white/10 hover:border-white/25'
              }`}
            >
              <p className={`font-semibold text-sm ${sideChoice === s.id ? 'text-emerald-300' : 'text-white'}`}>
                {s.label}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{s.hint}</p>
            </button>
          ))}
        </div>
      </div>

      {sideChoice !== 'both' && (
        <div className="p-6 rounded-2xl bg-[#141422] border border-[#2a2a3e] mb-4">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Engine strength</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {DIFFICULTY_LEVELS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  difficulty === d.id
                    ? 'bg-emerald-500/15 border-emerald-500/50'
                    : 'bg-white/5 border-white/10 hover:border-white/25'
                }`}
              >
                <p className={`font-semibold text-sm ${difficulty === d.id ? 'text-emerald-300' : 'text-white'}`}>
                  {d.label}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">{d.hint}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-[#141422] border border-[#2a2a3e] mb-6">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Start from an opening (optional)</p>
        <select
          value={startOpeningId}
          onChange={(e) => setStartOpeningId(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white focus:outline-none focus:border-emerald-500/50"
        >
          <option value="">Standard starting position</option>
          {openings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.variations[0]?.moves.length ?? 0} moves)
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 rounded-2xl bg-emerald-500 text-[#0a0a1f] font-bold text-lg hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
      >
        <Swords size={20} />
        Start sparring
      </button>
    </motion.div>
  );
}
