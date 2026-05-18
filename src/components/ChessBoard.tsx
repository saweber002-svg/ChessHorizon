import { useState, useCallback, useMemo } from 'react';
import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';

interface ChessBoardProps {
  fen: string;
  onMove: (from: Square, to: Square) => void;
  glowColor: 'idle' | 'correct' | 'incorrect';
  interactive?: boolean;
  hintSquares?: Square[];
  lastMove?: { from: Square; to: Square } | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

type PieceType = `${Color}${PieceSymbol}`;

const PIECE_SVGS: Record<PieceSymbol, (color: Color) => string> = {
  p: (color: Color) => `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" 
    fill="${color === 'w' ? '#00f5d4' : '#ff4757'}" stroke="${color === 'w' ? '#00d4b8' : '#e03e4d'}" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  r: (color: Color) => `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="${color === 'w' ? '#00f5d4' : '#ff4757'}" stroke="${color === 'w' ? '#00d4b8' : '#e03e4d'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/>
      <path d="M14 29v-13h17v13H14z" fill="none" stroke-width="1"/>
      <path d="M5 16v-3h3v-2h4v2h6v-2h4v2h6v-2h4v2h3v3H5z"/>
    </g>
  </svg>`,
  n: (color: Color) => `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="${color === 'w' ? '#00f5d4' : '#ff4757'}" stroke="${color === 'w' ? '#00d4b8' : '#e03e4d'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.034-.5-2-.5-3-1.5-1-2.5.5-2.5.5s-1.13 2.25-2.5 2.25c-.24 0-.5 0-.5-.5C8.5 17 11 12 11 12s3.13-4 6.5-4c3.5 0 6.5 2 6.5 6"/>
      <circle cx="17.5" cy="9" r="1.5" fill="none"/>
    </g>
  </svg>`,
  b: (color: Color) => `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="${color === 'w' ? '#00f5d4' : '#ff4757'}" stroke="${color === 'w' ? '#00d4b8' : '#e03e4d'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
      <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
      <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" fill="none"/>
    </g>
  </svg>`,
  q: (color: Color) => `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="${color === 'w' ? '#00f5d4' : '#ff4757'}" stroke="${color === 'w' ? '#00d4b8' : '#e03e4d'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.7 13.6-3-14.5-3 14.5-5.7-13.6-.3 14.1-7.5-11.5L9 26z"/>
      <path d="M9 26c0 2 1.5 2 2.5 4 1 2.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5h24s2-1 .5-2.5c0 0-.5-1.5-1.5-2.5-.5-2.5-.5-1 .5-3.5 1-2 2.5-2 2.5-4"/>
      <circle cx="11" cy="14" r="1.5" fill="none"/>
      <circle cx="22.5" cy="9" r="1.5" fill="none"/>
      <circle cx="34" cy="14" r="1.5" fill="none"/>
    </g>
  </svg>`,
  k: (color: Color) => `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="${color === 'w' ? '#00f5d4' : '#ff4757'}" stroke="${color === 'w' ? '#00d4b8' : '#e03e4d'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22.5 11.63V6M20 8h5"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="none"/>
      <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-1-5 5-8 9-3.5-3.5-2.5-9-8-9-5.5 0-4.5 5.5-8 9-3-4-4-10-8-9-3 6 6 10.5 6 10.5v7z"/>
      <path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0" fill="none"/>
    </g>
  </svg>`,
};

export default function ChessBoard({
  fen,
  onMove,
  glowColor,
  interactive = true,
  hintSquares = [],
  lastMove,
}: ChessBoardProps) {
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

  const getSquareFromRC = useCallback(
    (r: number, c: number): Square => {
      return `${FILES[c]}${RANKS[r]}` as Square;
    },
    []
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!interactive) return;

      const piece = chess.get(square);

      if (selectedSquare) {
        if (legalMoves.includes(square)) {
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
      className={`relative rounded-lg overflow-hidden border-2 border-[#2a2a3e] transition-all duration-300 ${getGlowClass()}`}
    >
      <div className="grid grid-cols-8 grid-rows-8 aspect-square">
        {RANKS.map((_, r) =>
          FILES.map((_, c) => {
            const square = getSquareFromRC(r, c);
            const piece = board[r][c];
            const isLight = (r + c) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isLegalMove = legalMoves.includes(square);
            const isHint = hintSquares.includes(square);
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;

            return (
              <div
                key={square}
                className={`
                  relative flex items-center justify-center cursor-pointer
                  ${isLight ? 'chess-board-light' : 'chess-board-dark'}
                  ${isSelected ? 'ring-2 ring-[#00f5d4] ring-inset z-10' : ''}
                  ${isHint ? 'after:absolute after:inset-0 after:bg-[#00f5d4]/20' : ''}
                  ${isLastMoveFrom || isLastMoveTo ? 'bg-[#00f5d4]/15' : ''}
                `}
                onClick={() => handleSquareClick(square)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, square)}
              >
                {isLegalMove && !piece && (
                  <div className="absolute w-3 h-3 rounded-full bg-[#00f5d4]/40" />
                )}
                {isLegalMove && piece && (
                  <div className="absolute inset-0 border-2 border-[#00f5d4]/50 rounded-sm" />
                )}
                {piece && (
                  <div
                    draggable={interactive}
                    onDragStart={(e) =>
                      handleDragStart(e, square, piece)
                    }
                    onDragEnd={handleDragEnd}
                    className={`
                      w-full h-full p-1 transition-transform
                      ${interactive ? 'hover:scale-105 cursor-grab active:cursor-grabbing' : ''}
                      ${piece[0] === 'w' ? 'neon-piece-white' : 'neon-piece-black'}
                    `}
                    dangerouslySetInnerHTML={{
                      __html: PIECE_SVGS[piece[1] as PieceSymbol](
                        piece[0] as Color
                      ),
                    }}
                  />
                )}
                {c === 0 && (
                  <span className="absolute top-0.5 left-1 text-[10px] font-mono text-white/40 select-none">
                    {RANKS[r]}
                  </span>
                )}
                {r === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-mono text-white/40 select-none">
                    {FILES[c]}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
