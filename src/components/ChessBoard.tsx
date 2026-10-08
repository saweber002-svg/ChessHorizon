import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';
import { useTheme } from '@/contexts/ThemeContext';
import ThemePiece from '@/components/ThemePiece';
import { tap as hapticTap } from '@/lib/haptics';

interface ChessBoardProps {
  fen: string;
  onMove: (from: Square, to: Square) => void;
  glowColor: 'idle' | 'correct' | 'incorrect';
  interactive?: boolean;
  hintSquares?: Square[];
  lastMove?: { from: Square; to: Square } | null;
  /** Which side sits at the bottom of the board. Defaults to 'white'. */
  orientation?: 'white' | 'black';
  /**
   * The drill's expected target square. On mobile, an invisible 20%-larger
   * tap area is rendered over it so streaks aren't lost to misclicks.
   */
  targetSquare?: Square | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

type PieceType = `${Color}${PieceSymbol}`;

/** How long a piece slide animation runs (ms). */
const ANIM_MS = 220;

interface AnimStep {
  from: Square;
  to: Square;
  /** The glyph that slides. For promotions this is the pawn; the static
   *  board shows the promoted piece once the slide finishes. */
  piece: PieceType;
}

/**
 * Diff two square->piece maps and, when the change looks like a single
 * chess move (normal move, capture, castling, en passant, promotion),
 * return the piece slides to animate. Anything else (position reset,
 * multi-ply undo, initial load) returns null so the board teleports
 * exactly as before.
 */
function diffToSteps(
  prev: Map<string, PieceType>,
  next: Map<string, PieceType>
): AnimStep[] | null {
  const removed: { square: Square; piece: PieceType }[] = [];
  const added: { square: Square; piece: PieceType }[] = [];
  for (const [sq, p] of prev) {
    if (next.get(sq) !== p) removed.push({ square: sq as Square, piece: p });
  }
  for (const [sq, p] of next) {
    if (prev.get(sq) !== p) added.push({ square: sq as Square, piece: p });
  }
  // A single move touches at most 2 squares each way (castling).
  if (removed.length === 0 || removed.length > 2 || added.length === 0 || added.length > 2) {
    return null;
  }

  const usedR = new Set<number>();
  const steps: AnimStep[] = [];

  // Pass 1: exact piece matches (normal moves, captures, castling, the
  // en-passant mover).
  for (const a of added) {
    const ri = removed.findIndex((r, i) => !usedR.has(i) && r.piece === a.piece);
    if (ri >= 0) {
      usedR.add(ri);
      steps.push({ from: removed[ri].square, to: a.square, piece: a.piece });
    }
  }
  // Pass 2: promotion — the leftover added piece is a promoted piece on the
  // last rank, paired with a leftover pawn of the same color.
  for (const a of added) {
    if (steps.some((s) => s.to === a.square)) continue;
    const color = a.piece[0];
    const lastRank = color === 'w' ? '8' : '1';
    if (a.piece[1] === 'p' || a.square[1] !== lastRank) return null;
    const ri = removed.findIndex((r, i) => !usedR.has(i) && r.piece === `${color}p`);
    if (ri < 0) return null;
    usedR.add(ri);
    steps.push({ from: removed[ri].square, to: a.square, piece: removed[ri].piece });
  }
  if (steps.length !== added.length) return null;
  // Every unpaired removed piece must be a capture victim sitting on a
  // landing square (captured piece, en-passant victim).
  const landings = new Set(steps.map((s) => s.to));
  for (let i = 0; i < removed.length; i++) {
    if (!usedR.has(i) && !landings.has(removed[i].square)) return null;
  }
  return steps;
}

function SlidingPiece({
  step,
  fromPos,
  toPos,
  durationMs,
  renderGlyph,
}: {
  step: AnimStep;
  fromPos: { r: number; c: number };
  toPos: { r: number; c: number };
  durationMs: number;
  renderGlyph: (piece: PieceType) => ReactNode;
}) {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    // Let the initial position paint before starting the transition.
    const t = setTimeout(() => setArrived(true), 20);
    return () => clearTimeout(t);
  }, []);
  const pos = arrived ? toPos : fromPos;
  return (
    <div
      className="absolute"
      style={{
        width: '12.5%',
        height: '12.5%',
        left: `${(pos.c / 8) * 100}%`,
        top: `${(pos.r / 8) * 100}%`,
        transition: `left ${durationMs}ms ease-out, top ${durationMs}ms ease-out`,
      }}
    >
      {renderGlyph(step.piece)}
    </div>
  );
}

export default function ChessBoard({
  fen,
  onMove,
  glowColor,
  interactive = true,
  hintSquares = [],
  lastMove,
  orientation = 'white',
  targetSquare = null,
}: ChessBoardProps) {
  const { theme: gameTheme } = useTheme();

  // Mobile target-square tap expansion: compute the target's grid position
  // so we can render a 20%-larger invisible hit area over it (mobile only).
  const targetPos = useMemo(() => {
    if (!targetSquare) return null;
    const file = targetSquare.charCodeAt(0) - 97; // a=0..h=7
    const rank = parseInt(targetSquare[1], 10); // 1..8
    if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;
    // Grid row 0 is the top rank; flip for black orientation.
    const c = orientation === 'black' ? 7 - file : file;
    const r = orientation === 'black' ? rank - 1 : 8 - rank;
    // Each square is 12.5%; overlay is 15% (20% larger), centered.
    return { left: c * 12.5 - 1.25, top: r * 12.5 - 1.25 };
  }, [targetSquare, orientation]);
  const theme = gameTheme.board;
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [draggedPiece, setDraggedPiece] = useState<{
    square: Square;
    piece: PieceType;
  } | null>(null);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const board = useMemo(() => {
    const b: (PieceType | null)[][] = [];
    for (let r = 0; r < 8; r++) {
      b[r] = [];
      for (let c = 0; c < 8; c++) {
        b[r][c] = null;
      }
    }
    chess.board().forEach((row, r) => {
      row.forEach((piece, c) => {
        if (piece) {
          b[r][c] = `${piece.color}${piece.type}` as PieceType;
        }
      });
    });
    return b;
  }, [chess]);

  // Display order of ranks/files. For 'black' orientation the board is flipped
  // so the player's own side sits at the bottom.
  const rankOrder = useMemo(
    () => (orientation === 'black' ? [...RANKS].reverse() : RANKS),
    [orientation]
  );
  const fileOrder = useMemo(
    () => (orientation === 'black' ? [...FILES].reverse() : FILES),
    [orientation]
  );

  // --- Piece slide animation ------------------------------------------------
  // When the FEN changes by a single move, the moving piece(s) glide from
  // the old square to the new one instead of teleporting. Anything else
  // (reset, multi-ply undo, initial load) teleports as before.
  const [anim, setAnim] = useState<{ id: number; steps: AnimStep[] } | null>(null);
  const prevPosRef = useRef<Map<string, PieceType> | null>(null);
  const animIdRef = useRef(0);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const squareToDisplay = useCallback(
    (sq: Square) => ({
      r: rankOrder.indexOf(sq[1] as (typeof rankOrder)[number]),
      c: fileOrder.indexOf(sq[0] as (typeof fileOrder)[number]),
    }),
    [fileOrder, rankOrder]
  );

  useEffect(() => {
    const pos = new Map<string, PieceType>();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) pos.set(`${FILES[c]}${RANKS[r]}`, p);
      }
    }
    const prev = prevPosRef.current;
    prevPosRef.current = pos;
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    if (!prev) {
      setAnim(null);
      return;
    }
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const steps = reduced ? null : diffToSteps(prev, pos);
    if (!steps) {
      setAnim(null);
      return;
    }
    const id = ++animIdRef.current;
    setAnim({ id, steps });
    animTimerRef.current = setTimeout(() => {
      setAnim((a) => (a && a.id === id ? null : a));
    }, ANIM_MS + 60);
    return () => {
      if (animTimerRef.current) {
        clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
      }
    };
  }, [fen, board]);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  /** Squares whose static piece is hidden while its slide animation runs. */
  const animDests = useMemo(() => new Set((anim?.steps ?? []).map((s) => s.to)), [anim]);

  const renderGlyph = useCallback(
    (piece: PieceType) => (
      <div className="w-full h-full">
        <ThemePiece theme={gameTheme} piece={piece} />
      </div>
    ),
    [gameTheme]
  );

  const getSquareFromRC = useCallback(
    (r: number, c: number): Square => {
      return `${fileOrder[c]}${rankOrder[r]}` as Square;
    },
    [fileOrder, rankOrder]
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!interactive) return;

      const piece = chess.get(square);

      if (selectedSquare) {
        if (legalMoves.includes(square)) {
          hapticTap();
          onMove(selectedSquare, square);
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }

        if (piece && piece.color === chess.turn()) {
          setSelectedSquare(square);
          const moves = chess.moves({ square, verbose: true });
          setLegalMoves(moves.map((m) => m.to));
          return;
        }

        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
        const moves = chess.moves({ square, verbose: true });
        setLegalMoves(moves.map((m) => m.to));
      }
    },
    [selectedSquare, legalMoves, chess, onMove, interactive]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, square: Square, piece: PieceType) => {
      if (!interactive) {
        e.preventDefault();
        return;
      }
      const pieceData = chess.get(square);
      if (!pieceData || pieceData.color !== chess.turn()) {
        e.preventDefault();
        return;
      }
      setDraggedPiece({ square, piece });
      const moves = chess.moves({ square, verbose: true });
      setLegalMoves(moves.map((m) => m.to));
      e.dataTransfer.effectAllowed = 'move';
    },
    [chess, interactive]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, square: Square) => {
      e.preventDefault();
      if (draggedPiece && legalMoves.includes(square)) {
        hapticTap();
        onMove(draggedPiece.square, square);
      }
      setDraggedPiece(null);
      setLegalMoves([]);
    },
    [draggedPiece, legalMoves, onMove]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedPiece(null);
    setLegalMoves([]);
  }, []);

  const getGlowClass = () => {
    switch (glowColor) {
      case 'correct':
        return 'border-glow-green';
      case 'incorrect':
        return 'border-glow-red';
      default:
        return 'border-glow-teal';
    }
  };

  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 transition-all duration-300 ${getGlowClass()}`}
      style={{ borderColor: theme.frameColor, backgroundColor: theme.frameColor }}
    >
      {/* Exact board artwork (empty squares + ornate frame) */}
      <img
        src={theme.image}
        alt=""
        draggable={false}
        className="block w-full select-none"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      {/* Playable grid overlay — positioned over the image's 8x8 area */}
      <div
        className="absolute"
        style={{
          left: `${theme.gridX * 100}%`,
          top: `${theme.gridY * 100}%`,
          width: `${theme.gridW * 100}%`,
          height: `${theme.gridH * 100}%`,
        }}
      >
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
          {rankOrder.map((_, r) =>
            fileOrder.map((_, c) => {
              // `board` is indexed rank 8..1 / file a..h; flip indices for black orientation.
              const br = orientation === 'black' ? 7 - r : r;
              const bc = orientation === 'black' ? 7 - c : c;
              const square = getSquareFromRC(r, c);
              const piece = board[br][bc];
              const isSelected = selectedSquare === square;
              const isLegalMove = legalMoves.includes(square);
              const isHint = hintSquares.includes(square);
              const isLastMoveFrom = lastMove?.from === square;
              const isLastMoveTo = lastMove?.to === square;
              const isLastMove = isLastMoveFrom || isLastMoveTo;

              return (
                <div
                  key={square}
                  className={`
                    relative flex items-center justify-center cursor-pointer
                    ${isSelected ? 'z-10' : ''}
                  `}
                  style={{
                    backgroundColor: isLastMove ? theme.lastMoveColor : undefined,
                    boxShadow: isSelected ? `inset 0 0 0 3px ${theme.selectColor}` : undefined,
                  }}
                  onClick={() => handleSquareClick(square)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, square)}
                >
                  {isHint && (
                    <div className="absolute inset-0" style={{ backgroundColor: theme.selectColor, opacity: 0.35 }} />
                  )}
                  {isLegalMove && !piece && (
                    <div className="absolute w-3 h-3 rounded-full" style={{ backgroundColor: theme.dotColor }} />
                  )}
                  {isLegalMove && piece && (
                    <div className="absolute inset-0 rounded-sm border-2" style={{ borderColor: theme.dotColor }} />
                  )}
                  {piece && !animDests.has(square) && (
                    <div
                      draggable={interactive}
                      onDragStart={(e) =>
                        handleDragStart(e, square, piece)
                      }
                      onDragEnd={handleDragEnd}
                      className={`
                        w-full h-full transition-transform
                        ${interactive ? 'hover:scale-105 cursor-grab active:cursor-grabbing' : ''}
                      `}
                    >
                      <ThemePiece theme={gameTheme} piece={piece} draggable={interactive} />
                    </div>
                  )}
                  {c === 0 && (
                    <span className="absolute top-0.5 left-1 text-[10px] font-mono select-none text-white"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)', opacity: 0.9 }}>
                      {rankOrder[r]}
                    </span>
                  )}
                  {r === 7 && (
                    <span className="absolute bottom-0.5 right-1 text-[10px] font-mono select-none text-white"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)', opacity: 0.9 }}>
                      {fileOrder[c]}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
        {/* Mobile: 20%-larger invisible tap area over the drill's target square. */}
        {targetPos && targetSquare && (
          <div
            className="absolute z-30 md:hidden"
            style={{
              left: `${targetPos.left}%`,
              top: `${targetPos.top}%`,
              width: '15%',
              height: '15%',
            }}
            onClick={() => handleSquareClick(targetSquare)}
            aria-hidden="true"
          />
        )}
        {/* Sliding pieces: absolutely positioned sprites that glide from the
            old square to the new one while the static piece stays hidden. */}
        {anim && (
          <div className="absolute inset-0 z-20 pointer-events-none" aria-hidden="true">
            {anim.steps.map((s) => (
              <SlidingPiece
                key={`${anim.id}-${s.from}-${s.to}`}
                step={s}
                fromPos={squareToDisplay(s.from)}
                toPos={squareToDisplay(s.to)}
                durationMs={ANIM_MS}
                renderGlyph={renderGlyph}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
