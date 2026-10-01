import { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw, Save, Undo2, Eraser } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { Chess, type Square } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import BoardWithEval from '@/components/BoardWithEval';
import { useWilderness } from '@/contexts/WildernessContext';
import { SPAR_START_FEN, positionsAfterMoves } from '@/lib/sparring';

/**
 * Board-based opening editor for the Wilderness. Instead of typing algebraic
 * notation, you build the opening line by moving the pieces — both sides are
 * always playable. Saving writes the line back to the opening's main variation.
 */
export default function WildernessBoard() {
  const [, setLocation] = useLocation();
  const params = useParams<{ openingId: string }>();
  const { openings, updateVariationMoves } = useWilderness();

  const opening = openings.find((o) => o.id === params.openingId);
  const variationId = opening?.variations[0]?.id ?? 'main';
  const baseMoves = opening?.variations[0]?.moves ?? [];

  const [moveSans, setMoveSans] = useState<string[]>(baseMoves);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  useEffect(() => {
    if (!opening) setLocation('/wilderness');
  }, [opening, setLocation]);

  if (!opening) return null;

  const positions = positionsAfterMoves(SPAR_START_FEN, moveSans);
  const fen = positions[positions.length - 1];

  const handleMove = (from: Square, to: Square) => {
    const game = new Chess(fen);
    let result;
    try {
      result = game.move({ from, to, promotion: 'q' });
    } catch {
      return;
    }
    setMoveSans((m) => [...m, result.san]);
    setLastMove({ from, to });
  };

  const handleUndo = () => {
    setMoveSans((m) => m.slice(0, -1));
    setLastMove(null);
  };

  const handleSave = () => {
    updateVariationMoves(opening.id, variationId, moveSans);
    setLocation('/wilderness');
  };

  return (
    <div className="min-h-screen bg-[#0a0a1f]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a1f]/95 backdrop-blur-md border-b border-[#2a2a3e]/50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/wilderness')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Back to Wilderness"
              >
                <ArrowLeft size={20} className="text-white/60" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-white">Build opening</h1>
                <p className="text-xs text-white/40">{opening.name}</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-[#0a0a1f] text-sm font-semibold hover:bg-emerald-400 transition-colors"
            >
              <Save size={16} />
              Save moves
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Board */}
          <div>
            <div className="max-w-[560px] mx-auto">
              <BoardWithEval fen={fen}>
                <ChessBoard
                  fen={fen}
                  onMove={handleMove}
                  glowColor="idle"
                  interactive
                  lastMove={lastMove}
                />
              </BoardWithEval>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-white/40">
                  Move the pieces for both sides — {new Chess(fen).turn() === 'w' ? 'White' : 'Black'} to move
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={moveSans.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Undo2 size={14} />
                    Undo
                  </button>
                  <button
                    onClick={() => {
                      setMoveSans([]);
                      setLastMove(null);
                    }}
                    disabled={moveSans.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Eraser size={14} />
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      setMoveSans(baseMoves);
                      setLastMove(null);
                    }}
                    disabled={moveSans.length === baseMoves.length && moveSans.every((m, i) => m === baseMoves[i])}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Move list */}
          <div className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e] h-fit">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Line</h3>
              <span className="text-xs text-white/30">{moveSans.length} moves</span>
            </div>
            {moveSans.length === 0 ? (
              <p className="text-sm text-white/30">No moves yet — move a piece on the board to begin.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-0.5">
                {Array.from({ length: Math.ceil(moveSans.length / 2) }).map((_, moveNum) => (
                  <div key={moveNum} className="flex items-center gap-2 py-0.5">
                    <span className="text-white/30 text-xs w-7">{moveNum + 1}.</span>
                    {[0, 1].map((offset) => {
                      const san = moveSans[moveNum * 2 + offset];
                      return (
                        <span
                          key={offset}
                          className="flex-1 px-2.5 py-1.5 rounded-lg text-sm bg-white/5 text-white font-mono"
                        >
                          {san ?? ''}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleSave}
              className="mt-4 w-full py-3 rounded-xl bg-emerald-500 text-[#0a0a1f] font-semibold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Save {moveSans.length} move{moveSans.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
