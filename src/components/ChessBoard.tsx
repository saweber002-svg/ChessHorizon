import { useState, useCallback, useMemo, useId } from 'react';
import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';
import {
  PIECE_SVG_BUILDERS,
  NEBULA_SLATE_PIECES,
  pieceGradientDefIds,
  buildGradientDefsMarkup,
} from './pieceSvgs';

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
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [draggedPiece, setDraggedPiece] = useState<{
    square: Square;
    piece: PieceType;
  } | null>(null);

  // Unique, DOM-safe id prefix for this board's piece gradient defs, so
  // multiple boards on one page never collide on gradient ids.
  const boardUid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradIds = pieceGradientDefIds(boardUid);

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
      className={`relative rounded-lg overflow-hidden border-2 border-[#2a2a3e] transition-all duration-300 ${getGlowClass()}`}
    >
      {/* Shared Nebula Slate piece gradients, referenced by url(#id) from each piece svg */}
      <svg
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: buildGradientDefsMarkup(boardUid) }}
      />
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
            const isWhitePiece = piece ? piece[0] === 'w' : false;
            const pieceTheme = isWhitePiece
              ? {
                  fill: `url(#${gradIds.white})`,
                  stroke: NEBULA_SLATE_PIECES.white.stroke,
                }
              : {
                  fill: `url(#${gradIds.black})`,
                  stroke: NEBULA_SLATE_PIECES.black.stroke,
                };
            const coordColor = isLight ? 'text-[#232c47]/60' : 'text-white/40';

            return (
              <div
                key={square}
                className={`
                  relative flex items-center justify-center cursor-pointer
                  ${isLight ? 'chess-board-light' : 'chess-board-dark'}
                  ${isSelected ? 'ring-2 ring-[#00f5d4] ring-inset z-10' : ''}
                  ${isHint ? 'after:absolute after:inset-0 after:bg-[#00f5d4]/20' : ''}
                  ${isLastMoveFrom || isLastMoveTo ? 'bg-[#f5c542]/20' : ''}
                `}
                onClick={() => handleSquareClick(square)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, square)}
              >
                {isLegalMove && !piece && (
                  <div className="absolute w-3 h-3 rounded-full bg-[#0d9488]/70" />
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
                      ${isWhitePiece ? 'ns-piece-white' : 'ns-piece-black'}
                    `}
                    dangerouslySetInnerHTML={{
                      __html: PIECE_SVG_BUILDERS[piece[1] as PieceSymbol](
                        pieceTheme
                      ),
                    }}
                  />
                )}
                {c === 0 && (
                  <span className={`absolute top-0.5 left-1 text-[10px] font-mono select-none ${coordColor}`}>
                    {rankOrder[r]}
                  </span>
                )}
                {r === 7 && (
                  <span className={`absolute bottom-0.5 right-1 text-[10px] font-mono select-none ${coordColor}`}>
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
