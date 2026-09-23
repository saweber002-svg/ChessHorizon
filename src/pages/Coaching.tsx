import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, AlertCircle, Swords, User } from 'lucide-react';
import { useLocation } from 'wouter';
import { Chess, type Square } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import { analyzeMove, type MoveAnalysis as AnalysisResult } from '@/lib/coachingAnalysis';

type MoveAnalysis = AnalysisResult;

interface GameState {
  fen: string;
  history: MoveAnalysis[];
  isPaused: boolean;
  pausedReason: string;
  isExploring: boolean;
  explorationBoard: string;
  userSide: 'w' | 'b';
  gameStarted: boolean;
}

export default function Coaching() {
  const [, setLocation] = useLocation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    history: [],
    isPaused: false,
    pausedReason: '',
    isExploring: false,
    explorationBoard: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    userSide: 'w',
    gameStarted: false,
  });

  const classificationColors: Record<string, string> = {
    'Best': '#10b981',
    'Excellent': '#3b82f6',
    'Good': '#8b5cf6',
    'Inaccuracy': '#f59e0b',
    'Mistake': '#ef4444',
    'Blunder': '#dc2626',
  };

  const handleUserMove = useCallback(async (from: Square, to: Square) => {
    if (gameState.isPaused && !gameState.isExploring) return;

    const currentFen = gameState.isExploring ? gameState.explorationBoard : gameState.fen;
    let tempGame: Chess;
    try {
      tempGame = new Chess(currentFen);
    } catch {
      tempGame = new Chess();
    }
    
    try {
      const result = tempGame.move({ from, to, promotion: 'q' });
      if (!result) return;

      const newFen = tempGame.fen();

      if (gameState.isExploring) {
        setGameState(prev => ({ ...prev, explorationBoard: newFen }));
      } else {
        setIsAnalyzing(true);
        const analysis = await analyzeMove(result.san, currentFen);
        analysis.move = result.san;
        
        if (['Inaccuracy', 'Mistake', 'Blunder'].includes(analysis.classification)) {
          setGameState(prev => ({
            ...prev,
            fen: newFen,
            history: [...prev.history, analysis],
            isPaused: true,
            pausedReason: `${analysis.classification} detected!`,
          }));
        } else {
          setGameState(prev => ({
            ...prev,
            fen: newFen,
            history: [...prev.history, analysis],
          }));

          // Trigger computer move if it's not the user's turn
          if (!tempGame.isGameOver()) {
            setTimeout(() => {
              makeComputerMove(newFen);
            }, 600);
          }
        }
      }
    } catch (e) {
      console.error("Invalid move", e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [gameState]);

  const makeComputerMove = (fen: string) => {
    const computerGame = new Chess(fen);
    const moves = computerGame.moves({ verbose: true });
    if (moves.length > 0) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      computerGame.move(randomMove);
      setGameState(prev => ({
        ...prev,
        fen: computerGame.fen(),
      }));
    }
  };

  useEffect(() => {
    // If user chose Black, computer moves first
    if (gameState.gameStarted && gameState.userSide === 'b' && gameState.history.length === 0) {
      const game = new Chess();
      if (game.turn() === 'w') {
        makeComputerMove(game.fen());
      }
    }
  }, [gameState.gameStarted, gameState.userSide, gameState.history.length]);

  const startGame = (side: 'w' | 'b') => {
    setGameState(prev => ({
      ...prev,
      userSide: side,
      gameStarted: true,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      history: [],
    }));
  };

  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      gameStarted: false,
      isPaused: false,
      isExploring: false,
      history: [],
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    }));
  };

  const enterExploration = () => setGameState(prev => ({ ...prev, isExploring: true, explorationBoard: prev.fen }));
  const exitExploration = () => setGameState(prev => ({ ...prev, isExploring: false }));
  const resumeGame = () => setGameState(prev => ({ ...prev, isPaused: false, pausedReason: '', isExploring: false }));
  
  const takeBackMove = () => {
    if (gameState.history.length === 0) return;
    const tempGame = new Chess();
    for (let i = 0; i < gameState.history.length - 1; i++) {
      tempGame.move(gameState.history[i].move);
    }
    setGameState(prev => ({
      ...prev,
      fen: tempGame.fen(),
      history: prev.history.slice(0, -1),
      isPaused: false,
      pausedReason: '',
      isExploring: false,
    }));
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
          <p className="text-white/50 text-sm mb-8">Select your side to begin the simulated analysis training session.</p>
          
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
              <span className="text-[10px] text-amber-300 uppercase tracking-[0.2em] font-bold opacity-80">Simulation Mode</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-8 gap-8">
        <div className="flex-[1.2] flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center bg-[#0a0a1f] rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="w-full max-w-[600px] aspect-square p-4 z-10">
              <ChessBoard
                fen={gameState.isExploring ? gameState.explorationBoard : gameState.fen}
                onMove={handleUserMove}
                glowColor={gameState.isExploring ? 'correct' : (gameState.isPaused ? 'incorrect' : 'idle')}
                interactive={!gameState.isPaused || gameState.isExploring}
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

          <div className="flex gap-4 mt-6">
            <button onClick={resetGame} className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold hover:bg-white/10 transition-all">
              Reset Board
            </button>
            {gameState.isPaused && (
              <div className="flex-[2] flex gap-4">
                <button onClick={takeBackMove} className="flex-1 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold hover:bg-amber-500/20 transition-all">Take Back</button>
                <button onClick={resumeGame} className="flex-1 py-4 rounded-2xl bg-[#00f5d4] text-[#0a0a1f] font-bold hover:bg-white transition-all">Resume Game</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6 min-w-[380px]">
          <div className="flex-1 bg-[#0a0a1f] rounded-3xl border border-white/5 flex flex-col overflow-hidden shadow-xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] border-b border-white/5 pb-4">Simulated Analysis</h3>
            
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
                  <p className="text-white/70 text-sm">The analysis simulator will respond to any move you make here.</p>
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
