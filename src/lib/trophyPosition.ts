import { Chess, type PieceSymbol, type Color, type Square } from 'chess.js';

export interface TrophyPieceInfo {
  square: Square;
  type: PieceSymbol;
  color: Color;
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
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

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

  const moverAtIndex = new Map<number, string>();
  moves.forEach((san, i) => {
    const before = chess.turn();
    const mv = chess.move(san);
    moverAtIndex.set(i, `${before}${mv.piece}`);
  });

  const pieces: TrophyPieceInfo[] = [];
  const finalCounts = new Map<string, number>();
  for (const f of FILES) {
    for (const r of RANKS) {
      const sq = `${f}${r}` as Square;
      const p = chess.get(sq);
      if (!p) continue;
      const key = `${p.color}${p.type}`;
      finalCounts.set(key, (finalCounts.get(key) ?? 0) + 1);
      pieces.push({ square: sq, type: p.type, color: p.color });
    }
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
    finalFen: chess.fen(),
    pieces,
    capturedByWhite,
    capturedByBlack,
    moverAtIndex,
  };
}
