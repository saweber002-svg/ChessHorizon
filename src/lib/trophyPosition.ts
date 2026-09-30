import { Chess, type PieceSymbol, type Color, type Square } from 'chess.js';

export interface TrophyPieceInfo {
  square: Square;
  type: PieceSymbol;
  color: Color;
  /**
   * Identity of the individual piece, traced through the replay. Initialized
   * to the piece's starting square; a promoted pawn keeps its pawn identity.
   */
  pieceId: string;
}

export interface TrophyPosition {
  finalFen: string;
  pieces: TrophyPieceInfo[];
  /** Piece types lost by black (captured by white). */
  capturedByWhite: PieceSymbol[];
  /** Piece types lost by white (captured by black). */
  capturedByBlack: PieceSymbol[];
  /**
   * Move index -> `${color}${type}` of the piece that moved.
   * Used to attribute prestige tiers to piece types.
   */
  moverAtIndex: Map<number, string>;
  /**
   * Move index -> pieceId of the individual piece that moved.
   * Used to prestige each moved piece independently on the trophy board.
   */
  moverIdAtIndex: Map<number, string>;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

export interface PieceTrace {
  /**
   * Move index -> `${color}${type}` of the piece that moved.
   * Used to attribute prestige tiers to piece types.
   */
  moverAtIndex: Map<number, string>;
  /**
   * Move index -> pieceId of the individual piece that moved.
   * Used to prestige each moved piece independently on the trophy board.
   */
  moverIdAtIndex: Map<number, string>;
  /** Move index -> color of the piece that moved. */
  moverColorAtIndex: Map<number, Color>;
  /**
   * Square -> pieceId snapshots, one per ply. Index 0 is the start position,
   * index k the position after k moves. Lets callers map a piece's square
   * in a mid-line position back to its identity in the opening.
   */
  idAtSquareByPly: Map<Square, string>[];
  /** FEN after k moves; index 0 is the start FEN. */
  fenByPly: string[];
  finalFen: string;
  finalPieces: TrophyPieceInfo[];
}

/**
 * Trace each individual piece through a replay. Piece ids start as the
 * piece's starting square; a promoted pawn keeps its pawn identity.
 * Castling moves the rook implicitly and en passant removes a pawn that
 * isn't on the destination square, so both need explicit bookkeeping.
 *
 * An illegal move stops the trace instead of throwing, so best-effort
 * attribution never crashes on imperfect drill data.
 */
export function tracePieceIdentities(startFen: string, moves: string[]): PieceTrace {
  const chess = new Chess(startFen);

  const moverAtIndex = new Map<number, string>();
  const moverIdAtIndex = new Map<number, string>();
  const moverColorAtIndex = new Map<number, Color>();

  const idAtSquare = new Map<Square, string>();
  for (const f of FILES) {
    for (const r of RANKS) {
      const sq = `${f}${r}` as Square;
      if (chess.get(sq)) idAtSquare.set(sq, sq);
    }
  }
  const idAtSquareByPly = [new Map(idAtSquare)];
  const fenByPly = [chess.fen()];

  moves.forEach((san, i) => {
    const before = chess.turn();
    let mv;
    try {
      mv = chess.move(san);
    } catch {
      return;
    }
    moverAtIndex.set(i, `${before}${mv.piece}`);
    const pieceId = idAtSquare.get(mv.from) ?? `${before}${mv.piece}@${i}`;
    moverIdAtIndex.set(i, pieceId);
    moverColorAtIndex.set(i, before);
    if (mv.flags.includes('e')) {
      // En passant: the captured pawn sits beside the destination square.
      idAtSquare.delete(`${mv.to[0]}${mv.from[1]}` as Square);
    }
    idAtSquare.delete(mv.from);
    idAtSquare.set(mv.to, pieceId);
    if (mv.flags.includes('k') || mv.flags.includes('q')) {
      const rank = mv.from[1];
      const rookFrom = (mv.flags.includes('k') ? `h${rank}` : `a${rank}`) as Square;
      const rookTo = (mv.flags.includes('k') ? `f${rank}` : `d${rank}`) as Square;
      const rookId = idAtSquare.get(rookFrom);
      if (rookId) {
        idAtSquare.delete(rookFrom);
        idAtSquare.set(rookTo, rookId);
      }
    }
    idAtSquareByPly.push(new Map(idAtSquare));
    fenByPly.push(chess.fen());
  });

  const finalPieces: TrophyPieceInfo[] = [];
  for (const f of FILES) {
    for (const r of RANKS) {
      const sq = `${f}${r}` as Square;
      const p = chess.get(sq);
      if (!p) continue;
      finalPieces.push({
        square: sq,
        type: p.type,
        color: p.color,
        pieceId: idAtSquare.get(sq) ?? sq,
      });
    }
  }

  return {
    moverAtIndex,
    moverIdAtIndex,
    moverColorAtIndex,
    idAtSquareByPly,
    fenByPly,
    finalFen: chess.fen(),
    finalPieces,
  };
}

/**
 * Replay a drill line from its start FEN and return the completed position:
 * every piece on its final square plus the captured pieces per side.
 */
export function computeTrophyPosition(startFen: string, moves: string[]): TrophyPosition {
  const chess = new Chess(startFen);

  const initialCounts = new Map<string, number>();
  for (const row of chess.board()) {
    for (const p of row) {
      if (p) initialCounts.set(`${p.color}${p.type}`, (initialCounts.get(`${p.color}${p.type}`) ?? 0) + 1);
    }
  }

  const trace = tracePieceIdentities(startFen, moves);

  const pieces = trace.finalPieces;
  const finalCounts = new Map<string, number>();
  for (const p of pieces) {
    const key = `${p.color}${p.type}`;
    finalCounts.set(key, (finalCounts.get(key) ?? 0) + 1);
  }

  const capturedByWhite: PieceSymbol[] = [];
  const capturedByBlack: PieceSymbol[] = [];
  for (const [key, initial] of initialCounts) {
    const missing = initial - (finalCounts.get(key) ?? 0);
    const color = key[0] as Color;
    const type = key[1] as PieceSymbol;
    for (let k = 0; k < missing; k++) {
      (color === 'b' ? capturedByWhite : capturedByBlack).push(type);
    }
  }
  const order: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];
  capturedByWhite.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  capturedByBlack.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return {
    finalFen: trace.finalFen,
    pieces,
    capturedByWhite,
    capturedByBlack,
    moverAtIndex: trace.moverAtIndex,
    moverIdAtIndex: trace.moverIdAtIndex,
  };
}
