import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Flag,
  Handshake,
  RotateCcw,
  Clock,
  Trophy,
  Shield,
  CircleDot,
  Crown,
  Swords as SwordsIcon,
  Home,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { Chess, type Square, type Move } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';

const GAME_TIME = 600; // 10 minutes in seconds

interface GameEndState {
  winner: 'white' | 'black' | 'draw' | null;
  reason: string;
}

export default function Clearing() {
  const [, setLocation] = useLocation();
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'ended'>('menu');
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [glowColor, setGlowColor] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [whiteTime, setWhiteTime] = useState(GAME_TIME);
  const [blackTime, setBlackTime] = useState(GAME_TIME);
  const [moves, setMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEndState | null>(null);
  const [showDrawOffer, setShowDrawOffer] = useState(false);
  const [whiteName, setWhiteName] = useState('Player 1');
  const [blackName, setBlackName] = useState('Player 2');

  const chess = useMemo(() => new Chess(fen), [fen]);
  const turn = chess.turn();
  const isCheck = chess.isCheck();
  const isCheckmate = chess.isCheckmate();
  const isDraw = chess.isDraw();
  const isStalemate = chess.isStalemate();
  const isGameOver = chess.isGameOver();

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      if (isGameOver) {
        clearInterval(interval);
        return;
      }
      if (turn === 'w') {
        setWhiteTime((t) => {
          if (t <= 1) {
            setGameEnd({ winner: 'black', reason: 'Timeout' });
            setGameState('ended');
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime((t) => {
          if (t <= 1) {
            setGameEnd({ winner: 'white', reason: 'Timeout' });
            setGameState('ended');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, turn, isGameOver]);

  // Check for game over conditions
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (isCheckmate) {
      const winner = turn === 'w' ? 'black' : 'white';
      setGameEnd({ winner, reason: 'Checkmate' });
      setGameState('ended');
    } else if (isStalemate) {
      setGameEnd({ winner: 'draw', reason: 'Stalemate' });
      setGameState('ended');
    } else if (isDraw) {
      setGameEnd({ winner: 'draw', reason: 'Draw' });
      setGameState('ended');
    }
  }, [isCheckmate, isStalemate, isDraw, gameState, turn]);

  const handleMove = useCallback(
    (from: Square, to: Square) => {
      if (gameState !== 'playing') return;

      try {
        const newChess = new Chess(fen);
        const move = newChess.move({ from, to, promotion: 'q' });
        if (!move) return;

        setFen(newChess.fen());
        setLastMove({ from, to });
        setMoves((prev) => [...prev, move]);

        if (newChess.isCheck()) {
          setGlowColor('correct');
          setTimeout(() => setGlowColor('idle'), 400);
        }
      } catch {
        // Invalid move
      }
    },
    [fen, gameState]
  );

  const handleResign = useCallback(() => {
    if (gameState !== 'playing') return;
    const winner = turn === 'w' ? 'black' : 'white';
    setGameEnd({ winner, reason: 'Resignation' });
    setGameState('ended');
  }, [gameState, turn]);

  const handleDrawOffer = useCallback(() => {
    setShowDrawOffer(true);
  }, []);

  const acceptDraw = useCallback(() => {
    setGameEnd({ winner: 'draw', reason: 'Draw by agreement' });
    setGameState('ended');
    setShowDrawOffer(false);
  }, []);

  const startGame = useCallback(() => {
    setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    setWhiteTime(GAME_TIME);
    setBlackTime(GAME_TIME);
    setMoves([]);
    setLastMove(null);
    setGameEnd(null);
    setGameState('playing');
    setGlowColor('idle');
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Menu screen
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-[#0a0a1f]">
        <div className="sticky top-0 z-30 bg-[#0a0a1f]/95 backdrop-blur-md border-b border-[#2a2a3e]/50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => setLocation('/atlas')} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} className="text-white/60" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <SwordsIcon size={16} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">The Clearing</h1>
                <p className="text-xs text-white/40">PVP Arena</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Crown size={40} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">The Clearing</h2>
            <p className="text-white/40">Face off in local PVP matches. Both players share this device.</p>
          </motion.div>

          {/* Player names */}
          <div className="space-y-3 mb-8">
            <div className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]">
              <label className="text-xs text-white/40 mb-1 block">White Player</label>
              <input
                type="text"
                value={whiteName}
                onChange={(e) => setWhiteName(e.target.value)}
                className="w-full bg-transparent text-white font-semibold focus:outline-none"
                placeholder="Player 1"
              />
            </div>
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-[#2a2a3e] flex items-center justify-center">
                <SwordsIcon size={14} className="text-white/30" />
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]">
              <label className="text-xs text-white/40 mb-1 block">Black Player</label>
              <input
                type="text"
                onChange={(e) => setBlackName(e.target.value)}
                value={blackName}
                className="w-full bg-transparent text-white font-semibold focus:outline-none"
                placeholder="Player 2"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startGame}
            className="w-full py-4 rounded-2xl bg-amber-500 text-[#0a0a1f] font-bold text-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
          >
            <SwordsIcon size={20} />
            Start Match
          </motion.button>

          <p className="text-center text-xs text-white/20 mt-4">
            {Math.floor(GAME_TIME / 60)}:00 rapid - Pass device between turns
          </p>
        </div>
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
              <button onClick={() => setGameState('menu')} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <ArrowLeft size={20} className="text-white/60" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <SwordsIcon size={14} className="text-amber-400" />
                </div>
                <span className="text-sm font-semibold text-white">The Clearing</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDrawOffer}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                title="Offer Draw"
              >
                <Handshake size={18} />
              </button>
              <button
                onClick={handleResign}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                title="Resign"
              >
                <Flag size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Board Area */}
          <div className="flex flex-col items-center">
            {/* Black player info */}
            <div className="w-full max-w-md mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2a2a3e] border border-[#3a3a4e] flex items-center justify-center">
                  <Shield size={16} className="text-white/50" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white">{blackName}</span>
                  {turn === 'b' && !isGameOver && (
                    <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">Turn</span>
                  )}
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-xl bg-[#141422] border border-[#2a2a3e] font-mono text-sm ${
                turn === 'b' && blackTime < 60 ? 'text-red-400' : 'text-white/60'
              }`}>
                <Clock size={14} className="inline mr-1" />
                {formatTime(blackTime)}
              </div>
            </div>

            {/* Chess Board */}
            <div className="w-full max-w-md">
              <ChessBoard
                fen={fen}
                onMove={handleMove}
                glowColor={glowColor}
                interactive={!isGameOver}
                lastMove={lastMove}
              />
            </div>

            {/* White player info */}
            <div className="w-full max-w-md mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2a2a3e] border border-[#3a3a4e] flex items-center justify-center">
                  <Crown size={16} className="text-white/50" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white">{whiteName}</span>
                  {turn === 'w' && !isGameOver && (
                    <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">Turn</span>
                  )}
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-xl bg-[#141422] border border-[#2a2a3e] font-mono text-sm ${
                turn === 'w' && whiteTime < 60 ? 'text-red-400' : 'text-white/60'
              }`}>
                <Clock size={14} className="inline mr-1" />
                {formatTime(whiteTime)}
              </div>
            </div>

            {/* Check indicator */}
            {isCheck && !isCheckmate && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium"
              >
                <CircleDot size={12} className="inline mr-1" />
                Check!
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Game Status */}
            <div className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]">
              <h3 className="text-sm font-medium text-white/60 mb-2">Game Status</h3>
              <p className="text-sm text-white/80">
                {isGameOver
                  ? 'Game Over'
                  : turn === 'w'
                  ? `${whiteName}'s turn (White)`
                  : `${blackName}'s turn (Black)`}
              </p>
              {moves.length > 0 && (
                <p className="text-xs text-white/40 mt-1">{moves.length} moves played</p>
              )}
            </div>

            {/* Move History */}
            <div className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]">
              <h3 className="text-sm font-medium text-white/60 mb-3">Move History</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {moves.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-4">No moves yet</p>
                ) : (
                  Array.from({ length: Math.ceil(moves.length / 2) }).map((_, i) => {
                    const whiteMove = moves[i * 2];
                    const blackMove = moves[i * 2 + 1];
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-xs font-mono text-white/30 w-6">{i + 1}.</span>
                        <span className="font-mono text-white/70 flex-1">{whiteMove?.san}</span>
                        {blackMove && <span className="font-mono text-white/70 flex-1">{blackMove.san}</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirm('Resign this game?')) handleResign();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                <Flag size={14} />
                Resign
              </button>
              <button
                onClick={handleDrawOffer}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white/60 text-sm font-medium hover:border-amber-500/30 hover:text-amber-400 transition-colors"
              >
                <Handshake size={14} />
                Draw
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Draw Offer Modal */}
      <AnimatePresence>
        {showDrawOffer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowDrawOffer(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#141422] border border-[#2a2a3e] rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white mb-4">Draw Offered</h2>
              <p className="text-sm text-white/60 mb-6">
                {turn === 'w' ? blackName : whiteName} offers a draw. Do you accept?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDrawOffer(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#2a2a3e] text-white/60 font-medium hover:bg-[#2a2a3e]/80 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={acceptDraw}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-[#0a0a1f] font-semibold hover:bg-amber-400 transition-colors"
                >
                  Accept Draw
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState === 'ended' && gameEnd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[#141422] border border-[#2a2a3e] rounded-2xl p-8 max-w-sm w-full text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <Trophy size={32} className="text-amber-400" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {gameEnd.winner === 'draw'
                  ? 'Draw!'
                  : gameEnd.winner === 'white'
                  ? `${whiteName} Wins!`
                  : `${blackName} Wins!`}
              </h2>
              <p className="text-sm text-white/50 mb-2">
                by {gameEnd.reason}
              </p>
              <p className="text-xs text-white/30 mb-6">
                {moves.length} moves played
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setGameState('menu')}
                  className="flex-1 py-3 rounded-xl bg-[#2a2a3e] text-white/60 font-medium hover:bg-[#2a2a3e]/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Home size={16} />
                  Menu
                </button>
                <button
                  onClick={startGame}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-[#0a0a1f] font-semibold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  Rematch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
