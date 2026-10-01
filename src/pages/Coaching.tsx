import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, AlertCircle, Swords, User } from 'lucide-react';
import { useLocation } from 'wouter';
import { Chess, type Square } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import { analyzeMove, analyzeGame, EngineUnavailableError, type MoveAnalysis as AnalysisResult, type GameReview } from '@/lib/coachingAnalysis';
import { getEngine } from '@/engine/stockfish';
import { tap as hapticTap, success as hapticSuccess, error as hapticError } from '@/lib/haptics';
import { DIFFICULTY_LEVELS, skillForDifficulty, type DifficultyId } from '@/lib/difficulty';
import { classificationColors, classificationIcons } from '@/lib/classificationStyle';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

type MoveAnalysis = AnalysisResult;

interface GameState {
  fen: string;
  history: MoveAnalysis[];
  /** FEN after each ply, starting with the initial position. Enables move navigation. */
  positions: string[];
  /** SAN for each ply, parallel to positions (positions[i+1] follows moveSans[i]). */
  moveSans: string[];
  /** Null = live position; number = viewing historical ply. */
  viewPly: number | null;
  difficulty: DifficultyId;
  isPaused: boolean;
  pausedReason: string;
  isExploring: boolean;
  explorationBoard: string;
  userSide: 'w' | 'b';
  gameStarted: boolean;
  /** Set when the game ends: 'checkmate' | 'stalemate' | 'draw' | null */
  gameOver: string | null;
}

export default function Coaching() {
  const [, setLocation] = useLocation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [explorationAnalysis, setExplorationAnalysis] = useState<MoveAnalysis | null>(null);
  const [gameReview, setGameReview] = useState<GameReview | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState({ completed: 0, total: 0 });
  const [showReview, setShowReview] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    fen: START_FEN,
    history: [],
    positions: [START_FEN],
    moveSans: [],
    viewPly: null,
    difficulty: 'casual',
    isPaused: false,
    pausedReason: '',
    isExploring: false,
    explorationBoard: START_FEN,
    userSide: 'w',
    gameStarted: false,
    gameOver: null,
  });
  const [pendingDifficulty, setPendingDifficulty] = useState<DifficultyId>('casual');

  const makeComputerMove = useCallback(async (fen: string, skill: number) => {
    try {
      const uci = await getEngine().findBestMove(fen, skill);
      const computerGame = new Chess(fen);
      const moved = computerGame.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
      if (!moved) return;
      const newFen = computerGame.fen();
      const gameOverReason = computerGame.isGameOver()
        ? computerGame.isCheckmate() ? 'checkmate' : computerGame.isStalemate() ? 'stalemate' : 'draw'
        : null;
      setGameState(prev => ({
        ...prev,
        fen: newFen,
        positions: [...prev.positions, newFen],
        moveSans: [...prev.moveSans, moved.san],
        viewPly: null,
        gameOver: gameOverReason,
      }));
    } catch {
      // Engine hiccup mid-game: fall back to a random legal move so play continues.
      const computerGame = new Chess(fen);
      const moves = computerGame.moves({ verbose: true });
      if (moves.length > 0) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        const moved = computerGame.move(randomMove);
        const newFen = computerGame.fen();
        const gameOverReason = computerGame.isGameOver()
          ? computerGame.isCheckmate() ? 'checkmate' : computerGame.isStalemate() ? 'stalemate' : 'draw'
          : null;
        setGameState(prev => ({
          ...prev,
          fen: newFen,
          positions: [...prev.positions, newFen],
          moveSans: [...prev.moveSans, moved.san],
          viewPly: null,
          gameOver: gameOverReason,
        }));
      }
    }
  }, []);

  const handleUserMove = useCallback(async (from: Square, to: Square) => {
    if (gameState.isPaused && !gameState.isExploring) return;
    if (gameState.viewPly !== null) return; // browsing history, not playing

    const currentFen = gameState.isExploring ? gameState.explorationBoard : gameState.fen;
    let tempGame: Chess;
    try {
      tempGame = new Chess(currentFen);
    } catch {
      tempGame = new Chess();
    }
    
    let result;
    try {
      result = tempGame.move({ from, to, promotion: 'q' });
    } catch {
      return;
    }
    if (!result) return;

    const newFen = tempGame.fen();
    const moveSan = result.san;
    const isGameOver = tempGame.isGameOver();
    const gameOverReason = isGameOver
      ? tempGame.isCheckmate() ? 'checkmate' : tempGame.isStalemate() ? 'stalemate' : 'draw'
      : null;

    if (gameState.isExploring) {
      setGameState(prev => ({ ...prev, explorationBoard: newFen }));
      // Grade the explored move live with the engine.
      analyzeMove(moveSan, currentFen).then(
        (a) => setExplorationAnalysis(a),
        () => setExplorationAnalysis(null),
      );
      return;
    }

    // Apply the move IMMEDIATELY so the board updates even if engine
    // analysis fails or hangs. Analysis runs in the background.
    const skill = skillForDifficulty(gameState.difficulty);
    setGameState(prev => ({
      ...prev,
      fen: newFen,
      positions: [...prev.positions, newFen],
      moveSans: [...prev.moveSans, moveSan],
      viewPly: null,
      gameOver: gameOverReason,
    }));
    setIsAnalyzing(true);

    try {
      const analysis = await analyzeMove(moveSan, currentFen);
      if (['Inaccuracy', 'Mistake', 'Blunder'].includes(analysis.classification)) {
        setGameState(prev => ({
          ...prev,
          history: [...prev.history, analysis],
          isPaused: true,
          pausedReason: `${analysis.classification} detected!`,
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          history: [...prev.history, analysis],
        }));
        if (!isGameOver) {
          setTimeout(() => {
            void makeComputerMove(newFen, skill);
          }, 600);
        }
      }
    } catch (e) {
      if (e instanceof EngineUnavailableError) {
        setEngineError('Engine unavailable — playing on without analysis.');
      } else {
        console.error('Analysis failed', e);
      }
      // Move was already applied; continue the game without analysis.
      if (!isGameOver) {
        setTimeout(() => {
          void makeComputerMove(newFen, skill);
        }, 600);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [gameState, makeComputerMove]);



  useEffect(() => {
    // Pre-warm the engine while the user picks a side, hiding the WASM download latency.
    getEngine().ensureReady().catch(() => {
      setEngineError('Engine unavailable — playing on without analysis.');
    });
  }, []);

  useEffect(() => {
    // If user chose Black, computer moves first
    if (gameState.gameStarted && gameState.userSide === 'b' && gameState.moveSans.length === 0) {
      const game = new Chess();
      if (game.turn() === 'w') {
        const skill = skillForDifficulty(gameState.difficulty);
        void makeComputerMove(game.fen(), skill);
      }
    }
  }, [gameState.gameStarted, gameState.userSide, gameState.moveSans.length, gameState.difficulty, makeComputerMove]);

  // Haptic feedback when the game ends: affirming double pulse for a
  // checkmate win, longer buzz for getting checkmated. The ref guards
  // against re-firing on unrelated re-renders.
  const prevGameOverRef = useRef<string | null>(null);
  useEffect(() => {
    const gameOver = gameState.gameOver;
    if (gameOver === 'checkmate' && prevGameOverRef.current !== 'checkmate') {
      // The side to move in the final position was checkmated.
      const loser = new Chess(gameState.fen).turn();
      const winner = loser === 'w' ? 'b' : 'w';
      if (winner === gameState.userSide) {
        hapticSuccess();
      } else {
        hapticError();
      }
    }
    prevGameOverRef.current = gameOver;
  }, [gameState.gameOver, gameState.fen, gameState.userSide]);

  const startGame = (side: 'w' | 'b') => {
    hapticTap();
    setGameState(prev => ({
      ...prev,
      userSide: side,
      gameStarted: true,
      difficulty: pendingDifficulty,
      fen: START_FEN,
      history: [],
      positions: [START_FEN],
      moveSans: [],
      viewPly: null,
      gameOver: null,
    }));
    setGameReview(null);
    setShowReview(false);
  };

  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      gameStarted: false,
      isPaused: false,
      isExploring: false,
      history: [],
      positions: [START_FEN],
      moveSans: [],
      viewPly: null,
      gameOver: null,
      fen: START_FEN,
    }));
    setGameReview(null);
    setShowReview(false);
  };

  const enterExploration = () => {
    setExplorationAnalysis(null);
    setGameState(prev => ({ ...prev, isExploring: true, explorationBoard: prev.fen }));
  };
  const exitExploration = () => {
    setExplorationAnalysis(null);
    setGameState(prev => ({ ...prev, isExploring: false }));
  };
  const resumeGame = () => {
    setExplorationAnalysis(null);
    setGameState(prev => ({ ...prev, isPaused: false, pausedReason: '', isExploring: false }));
  };
  
  const takeBackMove = () => {
    // Take back the user's last move and the computer's reply (up to 2 plies).
    setGameState(prev => {
      const pliesToTakeBack = Math.min(2, prev.positions.length - 1);
      if (pliesToTakeBack <= 0) return prev;
      const newPositions = prev.positions.slice(0, prev.positions.length - pliesToTakeBack);
      const newMoveSans = prev.moveSans.slice(0, prev.moveSans.length - pliesToTakeBack);
      return {
        ...prev,
        fen: newPositions[newPositions.length - 1],
        positions: newPositions,
        moveSans: newMoveSans,
        viewPly: null,
        isPaused: false,
        pausedReason: '',
        isExploring: false,
      };
    });
  };

  /** Viewing an earlier position; null viewPly means live. */
  const isViewingHistory = gameState.viewPly !== null;
  const viewedFen = isViewingHistory ? gameState.positions[gameState.viewPly!] : gameState.fen;
  const maxPly = gameState.positions.length - 1;

  const goToPly = (ply: number) => {
    const clamped = Math.max(0, Math.min(maxPly, ply));
    setGameState(prev => ({
      ...prev,
      viewPly: clamped >= prev.positions.length - 1 ? null : clamped,
    }));
  };
  const stepBack = () => {
    const current = gameState.viewPly ?? maxPly;
    goToPly(current - 1);
  };
  const stepForward = () => {
    const current = gameState.viewPly ?? maxPly;
    goToPly(current + 1);
  };
  const goLive = () => setGameState(prev => ({ ...prev, viewPly: null }));

  const startReview = async () => {
    if (gameState.moveSans.length === 0) return;
    setIsReviewing(true);
    setShowReview(true);
    setReviewProgress({ completed: 0, total: gameState.moveSans.length });
    try {
      const review = await analyzeGame(
        gameState.moveSans,
        START_FEN,
        (completed, total) => setReviewProgress({ completed, total })
      );
      setGameReview(review);
    } catch (e) {
      console.error('Review failed', e);
      setEngineError('Review failed — engine unavailable.');
      setShowReview(false);
    } finally {
      setIsReviewing(false);
    }
  };

  const lastAnalysis = gameState.history.length > 0 ? gameState.history[gameState.history.length - 1] : null;

  if (!gameState.gameStarted) {
    return (
      <div className="w-screen h-screen bg-[#050510] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#0a0a1f] border border-[#00f5d4]/20 rounded-3xl p-8 text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-400">
            <Swords size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Coaching Pavilion</h2>
          <p className="text-white/50 text-sm mb-6">Select your side to begin — every move is analyzed live by the built-in Stockfish engine.</p>

          <div className="mb-6">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Computer difficulty</p>
            <div className="grid grid-cols-5 gap-2">
              {DIFFICULTY_LEVELS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { hapticTap(); setPendingDifficulty(d.id); }}
                  title={d.hint}
                  className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all border ${
                    pendingDifficulty === d.id
                      ? 'bg-[#00f5d4]/15 border-[#00f5d4]/50 text-[#00f5d4]'
                      : 'bg-white/5 border-white/10 text-white/50 hover:border-white/25 hover:text-white/80'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-white/30 text-xs mt-2">
              {DIFFICULTY_LEVELS.find(d => d.id === pendingDifficulty)?.hint}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => startGame('w')}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#00f5d4]/50 hover:bg-[#00f5d4]/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#0a0a1f]">
                <User size={24} />
              </div>
              <span className="text-white font-bold">Play White</span>
            </button>
            <button
              onClick={() => startGame('b')}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#ff4757]/50 hover:bg-[#ff4757]/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-[#141422] border border-white/20 flex items-center justify-center text-white">
                <User size={24} />
              </div>
              <span className="text-white font-bold">Play Black</span>
            </button>
          </div>
          
          <button
            onClick={() => { hapticTap(); setLocation('/coaching/spar'); }}
            className="mt-4 w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-[#00f5d4]/10 border border-[#00f5d4]/30 hover:bg-[#00f5d4]/20 transition-all"
          >
            <Swords size={20} className="text-[#00f5d4]" />
            <span className="text-left">
              <span className="block text-white font-bold text-sm">Sparring Board</span>
              <span className="block text-white/40 text-xs">Play openings move-by-move with live coaching</span>
            </span>
          </button>

          <button
            onClick={() => setLocation('/atlas')}
            className="mt-8 text-white/30 hover:text-white/60 text-xs uppercase tracking-widest transition-colors"
          >
            Return to Atlas
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#050510] overflow-hidden flex flex-col font-sans">
      <header className="h-20 border-b border-[#00f5d4]/10 bg-[#0a0a1f]/80 backdrop-blur-md flex items-center justify-between px-8 z-20">
        <div className="flex items-center gap-6">
          <button onClick={resetGame} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 transition-all border border-white/10">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Coaching Pavilion</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] animate-pulse" />
              <span className="text-[10px] text-[#00f5d4] uppercase tracking-[0.2em] font-bold opacity-80">Stockfish 18 · Live Engine</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 lg:p-8 gap-4 lg:gap-8">
        {engineError && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full">
            {engineError}
          </div>
        )}
        <div className="flex flex-col min-w-0 lg:flex-[1.2] w-full">
          <div className="flex items-center justify-center bg-[#0a0a1f] rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="w-full max-w-[600px] aspect-square p-4 z-10">
              <ChessBoard
                fen={gameState.isExploring ? gameState.explorationBoard : viewedFen}
                onMove={handleUserMove}
                glowColor={gameState.isExploring ? 'correct' : (gameState.isPaused ? 'incorrect' : 'idle')}
                interactive={(!gameState.isPaused || gameState.isExploring) && !isViewingHistory}
              />
            </div>
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0a0a1f]/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
                  <div className="bg-[#141422] border border-[#00f5d4]/30 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-2xl">
                    <div className="w-4 h-4 border-2 border-[#00f5d4] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[#00f5d4] font-bold text-sm uppercase tracking-widest">Analyzing</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-4 mt-4 lg:mt-6">
            <button onClick={resetGame} className="flex-1 py-3 lg:py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold hover:bg-white/10 transition-all">
              Reset Board
            </button>
            {maxPly > 0 && (
              <div className="flex-[2] flex items-center gap-2">
                <button
                  onClick={stepBack}
                  disabled={(gameState.viewPly ?? maxPly) <= 0}
                  className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  aria-label="Previous move"
                >
                  ‹
                </button>
                <button
                  onClick={isViewingHistory ? goLive : () => goToPly(0)}
                  className="flex-1 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  {isViewingHistory ? `Return to live` : `Move ${maxPly}`}
                </button>
                <button
                  onClick={stepForward}
                  disabled={!isViewingHistory}
                  className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  aria-label="Next move"
                >
                  ›
                </button>
              </div>
            )}
            {gameState.gameOver && !showReview && (
              <div className="flex-[2] flex gap-4">
                <button
                  onClick={startReview}
                  className="flex-1 py-3 lg:py-4 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold hover:bg-purple-500/30 transition-all"
                >
                  Review Game
                </button>
              </div>
            )}
            {gameState.isPaused && (
              <div className="flex-[2] flex gap-4">
                <button onClick={takeBackMove} className="flex-1 py-3 lg:py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold hover:bg-amber-500/20 transition-all">Take Back</button>
                <button onClick={resumeGame} className="flex-1 py-3 lg:py-4 rounded-2xl bg-[#00f5d4] text-[#0a0a1f] font-bold hover:bg-white transition-all">Resume Game</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 min-w-0 lg:min-w-[380px] lg:flex-1 w-full">
          <div className="flex-1 bg-[#0a0a1f] rounded-3xl border border-white/5 flex flex-col overflow-hidden shadow-xl p-6 space-y-6">
            {showReview ? (
              <>
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Game Review</h3>
                  <button
                    onClick={() => setShowReview(false)}
                    className="text-white/40 hover:text-white/70 text-xs uppercase tracking-widest"
                  >
                    Close
                  </button>
                </div>

                {isReviewing ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-white/50 text-sm">
                      Analyzing {reviewProgress.completed}/{reviewProgress.total} moves...
                    </p>
                    <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${reviewProgress.total > 0 ? (reviewProgress.completed / reviewProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ) : gameReview ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">White</p>
                        <p className="text-3xl font-black text-white">{gameReview.whiteAccuracy}%</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Black</p>
                        <p className="text-3xl font-black text-white">{gameReview.blackAccuracy}%</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 gap-1">
                        {Array.from({ length: Math.ceil(gameReview.moves.length / 2) }).map((_, moveNum) => (
                          <div key={moveNum} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5">
                            <span className="text-white/30 text-xs w-8">{moveNum + 1}.</span>
                            {[0, 1].map((offset) => {
                              const idx = moveNum * 2 + offset;
                              const analysis = gameReview.moves[idx];
                              if (!analysis) return <span key={offset} className="flex-1" />;
                              const isViewing = gameState.viewPly === idx + 1;
                              return (
                                <button
                                  key={offset}
                                  onClick={() => goToPly(idx + 1)}
                                  className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all ${
                                    isViewing ? 'bg-[#00f5d4]/15 border border-[#00f5d4]/30' : 'bg-white/5 border border-transparent hover:border-white/15'
                                  }`}
                                >
                                  <span className="text-white font-mono">{analysis.move}</span>
                                  <span
                                    className="text-xs font-black"
                                    style={{ color: classificationColors[analysis.classification] }}
                                    title={analysis.classification}
                                  >
                                    {classificationIcons[analysis.classification]}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {gameState.viewPly !== null && gameReview.moves[gameState.viewPly - 1] && (
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-bold font-mono">
                            {Math.ceil(gameState.viewPly / 2)}.{gameState.viewPly % 2 === 1 ? '' : '..'} {gameReview.moves[gameState.viewPly - 1].move}
                          </span>
                          <span
                            className="text-xs font-black uppercase"
                            style={{ color: classificationColors[gameReview.moves[gameState.viewPly - 1].classification] }}
                          >
                            {gameReview.moves[gameState.viewPly - 1].classification}
                          </span>
                        </div>
                        <p className="text-white/60 text-xs">{gameReview.moves[gameState.viewPly - 1].explanation}</p>
                        <p className="text-white/40 text-xs mt-1">
                          Best: {gameReview.moves[gameState.viewPly - 1].bestMove} ({gameReview.moves[gameState.viewPly - 1].cpLoss} cp loss)
                        </p>
                      </div>
                    )}
                  </>
                ) : null}
              </>
            ) : (
              <>
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] border-b border-white/5 pb-4">Engine Analysis</h3>
            
            <AnimatePresence mode="wait">
              {gameState.isPaused && lastAnalysis && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-red-500 font-bold uppercase text-xs">{lastAnalysis.classification}</h4>
                      <p className="text-white/80 text-sm mt-1">{lastAnalysis.explanation}</p>
                    </div>
                  </div>
                  {!gameState.isExploring && (
                    <button onClick={enterExploration} className="w-full py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold text-xs uppercase hover:bg-blue-500/30 transition-all">Explore Consequences</button>
                  )}
                </motion.div>
              )}
              {gameState.isExploring && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-4">
                  <p className="text-blue-400 font-bold text-xs uppercase">Exploration Mode</p>
                  <p className="text-white/70 text-sm">The engine grades every move you try here — hunt for the refutation.</p>
                  {explorationAnalysis && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white font-bold">{explorationAnalysis.move}</span>
                        <span className="font-black uppercase text-xs px-2 py-0.5 rounded" style={{ color: classificationColors[explorationAnalysis.classification] }}>
                          {explorationAnalysis.classification}
                        </span>
                      </div>
                      <p className="text-white/60 text-xs mt-1">{explorationAnalysis.explanation}</p>
                    </div>
                  )}
                  <button onClick={exitExploration} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase hover:bg-white/10 transition-all">Return to Game</button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">History</h4>
              {gameState.history.length === 0 ? (
                <p className="text-xs text-white/20 text-center py-12">No moves yet</p>
              ) : (
                [...gameState.history].reverse().map((analysis, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-bold">{analysis.move}</span>
                      <span className="font-black uppercase px-2 py-0.5 rounded" style={{ color: classificationColors[analysis.classification] }}>{analysis.classification}</span>
                    </div>
                    <p className="text-white/40">Loss: {analysis.cpLoss} cp</p>
                  </div>
                ))
              )}
            </div>
              </>
            )}
          </div>
        </div>
      </main>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .chess-board-light { background-color: #1a1a2e; }
        .chess-board-dark { background-color: #0f0f1f; }
      `}} />
    </div>
  );
}
