import { useState, useCallback, useMemo } from 'react';
import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';
import { useTheme } from '@/contexts/ThemeContext';
import { getPieceSvg } from '@/components/pieceStyles';

interface ChessBoardProps {
  fen: string;
  onMove: (from: Square, to: Square) => void;
  glowColor: 'idle' | 'correct' | 'incorrect';
  interactive?: boolean;
  hintSquares?: Square[];
  lastMove?: { from: Square; to: Square } | null;
  /** Which side sits at the bottom of the board. Defaults to 'white'. */
  orientation?: 'white' | 'black';
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

type PieceType = `${Color}${PieceSymbol}`;

export default function ChessBoard({
  fen,
  onMove,
  glowColor,
  interactive = true,
  hintSquares = [],
  lastMove,
  orientation = 'white',
}: ChessBoardProps) {
  const { boardTheme: theme, pieceStyleId, pieceColor } = useTheme();
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
      className={`relative rounded-lg overflow-hidden border-2 transition-all duration-300 ${getGlowClass()}`}
      style={{ borderColor: theme.frameColor }}
    >
      <div className="grid grid-cols-8 grid-rows-8 aspect-square">
        {rankOrder.map((_, r) =>
          fileOrder.map((_, c) => {
            // `board` is indexed rank 8..1 / file a..h; flip indices for black orientation.
            const br = orientation === 'black' ? 7 - r : r;
            const bc = orientation === 'black' ? 7 - c : c;
            const square = getSquareFromRC(r, c);
            const piece = board[br][bc];
            const isLight = (r + c) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isLegalMove = legalMoves.includes(square);
            const isHint = hintSquares.includes(square);
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isLastMove = isLastMoveFrom || isLastMoveTo;

            const squareBg = isLastMove
              ? (isLight ? theme.lastMoveLight : theme.lastMoveDark)
              : (isLight ? theme.lightSquare : theme.darkSquare);

            return (
              <div
                key={square}
                className={`
                  relative flex items-center justify-center cursor-pointer
                  ${isSelected ? 'z-10' : ''}
                `}
                style={{
                  backgroundColor: squareBg,
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
                {piece && (
                  <div
                    draggable={interactive}
                    onDragStart={(e) =>
                      handleDragStart(e, square, piece)
                    }
                    onDragEnd={handleDragEnd}
                    className={`
                      w-full h-full p-[2px] transition-transform
                      ${interactive ? 'hover:scale-105 cursor-grab active:cursor-grabbing' : ''}
                    `}
                    style={{
                      filter: (() => {
                        const glow = piece[0] === 'w' ? pieceColor.whiteGlow : pieceColor.blackGlow;
                        return glow ? `drop-shadow(0 0 ${pieceColor.glowBlur}px ${glow})` : undefined;
                      })(),
                    }}
                    dangerouslySetInnerHTML={{
                      __html: getPieceSvg(
                        pieceStyleId,
                        piece[1] as PieceSymbol,
                        piece[0] as Color,
                        {
                          whiteFill: pieceColor.whiteFill,
                          whiteStroke: pieceColor.whiteStroke,
                          blackFill: pieceColor.blackFill,
                          blackStroke: pieceColor.blackStroke,
                        }
                      ),
                    }}
                  />
                )}
                {c === 0 && (
                  <span className="absolute top-0.5 left-1 text-[10px] font-mono select-none"
                    style={{ color: isLight ? theme.darkSquare : theme.lightSquare, opacity: 0.9 }}>
                    {rankOrder[r]}
                  </span>
                )}
                {r === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-mono select-none"
                    style={{ color: isLight ? theme.darkSquare : theme.lightSquare, opacity: 0.9 }}>
                    {fileOrder[c]}
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
