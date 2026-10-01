/**
 * Coaching Analysis Service
 *
 * Move classification and analysis for the Coaching Pavilion, powered by the
 * real Stockfish WASM engine (see src/engine/stockfish.ts). The public
 * interface is unchanged from the old simulated version: analyzeMove() and
 * getTopMoves() now return genuine engine evaluations instead of random data.
 */
import { Chess } from 'chess.js';
import {
  getEngine,
  computeCpLoss,
  scoreToCp,
  EngineUnavailableError,
  type EngineScore,
} from '@/engine/stockfish';

export type MoveClassification =
  | 'Brilliant'
  | 'Great'
  | 'Best'
  | 'Excellent'
  | 'Good'
  | 'Book'
  | 'Inaccuracy'
  | 'Mistake'
  | 'Miss'
  | 'Blunder';

export interface MoveAnalysis {
  move: string;
  classification: MoveClassification;
  cpLoss: number;
  evalBefore: number;
  evalAfter: number;
  isMate: boolean;
  bestMove: string;
  pv: string[];
  explanation: string;
}

/** Analysis depth for coaching. 14 is fast (<1s desktop) and plenty accurate for move classification. */
const ANALYSIS_DEPTH = 14;

export { EngineUnavailableError };

/**
 * Classify a move using the chess.com-style hierarchy.
 *
 * @param cpLoss centipawns lost vs the engine's best move
 * @param opts context for special classifications:
 *   - isBest: the played move matches the engine's #1 choice
 *   - isTopMove: the played move is in the engine's top 3
 *   - isSacrifice: the best move gives up material but holds the position
 *   - isBook: the move is recognized opening theory
 *   - missedWin: the best move was decisively winning (mate or +800cp) but was missed
 */
export function classifyMove(
  cpLoss: number,
  opts: {
    isBest?: boolean;
    isTopMove?: boolean;
    isSacrifice?: boolean;
    isBook?: boolean;
    missedWin?: boolean;
  } = {}
): MoveClassification {
  const { isBest = false, isTopMove = false, isSacrifice = false, isBook = false, missedWin = false } = opts;

  if (isBook) return 'Book';
  if (missedWin) return 'Miss';
  if (isBest && isSacrifice) return 'Brilliant';
  if (isBest) return 'Best';
  if (isTopMove && cpLoss < 30) return 'Great';
  if (cpLoss <= 0) return 'Best';
  if (cpLoss < 50) return 'Excellent';
  if (cpLoss < 100) return 'Good';
  if (cpLoss < 200) return 'Inaccuracy';
  if (cpLoss < 400) return 'Mistake';
  return 'Blunder';
}

/**
 * Generate a human-readable explanation for a move.
 */
export function generateExplanation(
  classification: MoveClassification,
  cpLoss: number,
  bestMove: string
): string {
  const explanations: Record<MoveClassification, string> = {
    'Brilliant': `A brilliant sacrifice! ${bestMove} gives up material but is the strongest continuation.`,
    'Great': 'A great move — among the engine\'s top choices with minimal loss.',
    'Best': 'This is the best move in the position.',
    'Excellent': 'An excellent move with minimal loss.',
    'Good': 'A solid move, though not the strongest.',
    'Book': 'A recognized opening theory move.',
    'Inaccuracy': `This move loses about ${cpLoss} centipawns. Consider ${bestMove} instead.`,
    'Mistake': `This is a significant mistake, losing ${cpLoss} centipawns. The engine prefers ${bestMove}.`,
    'Miss': `A missed opportunity — ${bestMove} was decisively winning here.`,
    'Blunder': `This is a critical blunder, losing ${cpLoss} centipawns! The best move was ${bestMove}.`,
  };

  return explanations[classification];
}

/** Convert a UCI move (e2e4) to SAN in the given position. */
export function uciToSan(fen: string, uci: string): string {
  const game = new Chess(fen);
  const result = game.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  });
  return result.san;
}

/** Flip an engine score to the other side's perspective. */
function flipScore(score: EngineScore): EngineScore {
  return { type: score.type, value: -score.value };
}

/** Simple material values for sacrifice detection. */
const PIECE_VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

/** Count material for a side in centipawns. */
function countMaterial(fen: string, color: 'w' | 'b'): number {
  const game = new Chess(fen);
  let total = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (piece && piece.color === color) {
        total += PIECE_VALUES[piece.type] ?? 0;
      }
    }
  }
  return total;
}

/** Extract the ply number (0-indexed) from a FEN. */
function fenToPly(fen: string): number {
  const parts = fen.split(' ');
  const fullmove = parseInt(parts[5] ?? '1', 10);
  const turn = parts[1] ?? 'w';
  return (fullmove - 1) * 2 + (turn === 'b' ? 1 : 0);
}

/**
 * Analyze a move with the real engine.
 *
 * @param moveSan the move just played, in SAN
 * @param fenBefore the position before the move
 * @param depth search depth (default 14). Callers on slower devices or with
 *   tighter latency budgets can pass a lower depth; classification quality
 *   degrades gracefully.
 */
export async function analyzeMove(moveSan: string, fenBefore: string, depth: number = ANALYSIS_DEPTH): Promise<MoveAnalysis> {
  const engine = getEngine();

  const game = new Chess(fenBefore);
  const mover = game.turn();
  const applied = game.move(moveSan);
  const fenAfter = game.fen();
  const ply = fenToPly(fenBefore);

  // The mover just ended the game: no engine search needed.
  if (game.isGameOver()) {
    if (game.isCheckmate()) {
      return {
        move: moveSan,
        classification: 'Best',
        cpLoss: 0,
        evalBefore: 0,
        evalAfter: 10000,
        isMate: true,
        bestMove: moveSan,
        pv: [moveSan],
        explanation: 'Checkmate! A perfect finish.',
      };
    }
    // Stalemate or draw: the game is drawn regardless of the prior eval.
    const [before] = await engine.analyze(fenBefore, { depth });
    const evalBefore = scoreToCp(before.score);
    const cpLoss = Math.max(0, evalBefore);
    const classification = classifyMove(cpLoss);
    return {
      move: moveSan,
      classification,
      cpLoss,
      evalBefore,
      evalAfter: 0,
      isMate: before.score.type === 'mate',
      bestMove: uciToSan(fenBefore, before.pv[0]),
      pv: pvToSan(fenBefore, before.pv),
      explanation: generateExplanation(classification, cpLoss, uciToSan(fenBefore, before.pv[0])),
    };
  }

  // MultiPV=3 to distinguish Best/Great and detect sacrifices.
  const lines = await engine.analyze(fenBefore, { depth, multiPv: 3 });
  const [afterLines] = await engine.analyze(fenAfter, { depth });

  const before = lines[0];
  const afterMoverPerspective = flipScore(afterLines.score);

  const cpLoss = computeCpLoss(before.score, afterMoverPerspective);
  const bestMoveUci = before.pv[0];
  const bestMoveSan = uciToSan(fenBefore, bestMoveUci);

  // Was the played move the engine's top choice?
  const playedUci = (() => {
    const g = new Chess(fenBefore);
    const m = g.move(moveSan);
    // Reconstruct UCI from the move
    return m ? `${m.from}${m.to}${m.promotion ?? ''}` : '';
  })();
  const isBest = playedUci === bestMoveUci;
  const isTopMove = lines.some((line) => line.pv[0] === playedUci);

  // Sacrifice? Mover gave up material but the best move holds.
  let isSacrifice = false;
  if (isBest) {
    const matBefore = countMaterial(fenBefore, mover);
    const matAfter = countMaterial(fenAfter, mover);
    // Gave up >= 200cp (a minor piece) but eval didn't collapse
    isSacrifice = matBefore - matAfter >= 200 && scoreToCp(before.score) > -100;
  }

  // Book? Early opening, best move.
  const isBook = ply < 12 && isBest;

  // Missed win? Best was mate or +800cp, but we didn't play it.
  let missedWin = false;
  if (!isBest) {
    const bestScore = before.score;
    const isWinning = bestScore.type === 'mate' ||
      (bestScore.type === 'cp' && bestScore.value > 800);
    if (isWinning) {
      // Did our move also win? Check if we're still winning.
      const ourScore = afterMoverPerspective;
      const stillWinning = ourScore.type === 'mate' ||
        (ourScore.type === 'cp' && ourScore.value > 800);
      missedWin = !stillWinning;
    }
  }

  const classification = classifyMove(cpLoss, { isBest, isTopMove, isSacrifice, isBook, missedWin });

  return {
    move: applied.san,
    classification,
    cpLoss,
    evalBefore: scoreToCp(before.score),
    evalAfter: scoreToCp(afterMoverPerspective),
    isMate: before.score.type === 'mate' || afterLines.score.type === 'mate',
    bestMove: bestMoveSan,
    pv: pvToSan(fenBefore, before.pv),
    explanation: generateExplanation(classification, cpLoss, bestMoveSan),
  };
}

/**
 * Calculate accuracy for a list of moves (chess.com-style).
 * Uses exponential decay based on average centipawn loss.
 */
export function calculateAccuracy(analyses: MoveAnalysis[]): number {
  if (analyses.length === 0) return 0;
  const total = analyses.reduce((sum, a) => {
    // Per-move accuracy: 103.1668 * e^(-0.04354 * cpLoss) - 3.1669, clamped [0, 100]
    const acc = 103.1668 * Math.exp(-0.04354 * Math.max(0, a.cpLoss)) - 3.1669;
    return sum + Math.max(0, Math.min(100, acc));
  }, 0);
  return Math.round(total / analyses.length);
}

export interface GameReview {
  /** Per-move analyses, in order. */
  moves: MoveAnalysis[];
  /** Accuracy 0-100 for White. */
  whiteAccuracy: number;
  /** Accuracy 0-100 for Black. */
  blackAccuracy: number;
  /** Counts per classification, for the summary. */
  classificationCounts: Record<MoveClassification, number>;
}

/**
 * Analyze a complete game for post-game review.
 * @param moveSans SAN moves in order
 * @param startFen starting position (default: standard)
 * @param onProgress callback(completed, total) for progress UI
 */
export async function analyzeGame(
  moveSans: string[],
  startFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  onProgress?: (completed: number, total: number) => void
): Promise<GameReview> {
  const moves: MoveAnalysis[] = [];
  const game = new Chess(startFen);

  for (let i = 0; i < moveSans.length; i++) {
    const fenBefore = game.fen();
    const analysis = await analyzeMove(moveSans[i], fenBefore);
    moves.push(analysis);
    game.move(moveSans[i]);
    onProgress?.(i + 1, moveSans.length);
  }

  // Split by color: White moves at even indices, Black at odd.
  const whiteMoves = moves.filter((_, i) => i % 2 === 0);
  const blackMoves = moves.filter((_, i) => i % 2 === 1);

  const classificationCounts = {} as Record<MoveClassification, number>;
  for (const m of moves) {
    classificationCounts[m.classification] = (classificationCounts[m.classification] ?? 0) + 1;
  }

  return {
    moves,
    whiteAccuracy: calculateAccuracy(whiteMoves),
    blackAccuracy: calculateAccuracy(blackMoves),
    classificationCounts,
  };
}
export async function getTopMoves(fen: string, count: number = 3): Promise<Array<{ move: string; eval: number }>> {
  const engine = getEngine();
  const lines = await engine.analyze(fen, { depth: ANALYSIS_DEPTH, multiPv: count });
  return lines.slice(0, count).map((line) => ({
    move: uciToSan(fen, line.pv[0]),
    eval: scoreToCp(line.score),
  }));
}

// ---------------------------------------------------------------------------
// Drill deviation analysis: "I played a bad move in a drill — why was it bad?"
// ---------------------------------------------------------------------------

/** Depth for deviation checks: a little shallower than coaching for speed. */
const DEVIATION_DEPTH = 12;

export interface DeviationAnalysis {
  /** The user's move, SAN */
  move: string;
  classification: MoveClassification;
  cpLoss: number;
  /** Eval before/after from the mover's perspective, centipawns (mate ~ +/-10000) */
  evalBefore: number;
  evalAfter: number;
  /** The engine's top move in the position, SAN */
  engineBest: string;
  /** The punishing reply: engine PV after the user's move, SAN, opponent to move first */
  refutation: string[];
  /** The drill's book move, SAN */
  bookMove: string;
}

/** Convert a UCI PV into SAN by walking forward from fen. Stops at the first illegal move. */
export function pvToSan(fen: string, pv: string[]): string[] {
  const game = new Chess(fen);
  const sans: string[] = [];
  for (const uci of pv) {
    try {
      const m = game.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
      sans.push(m.san);
    } catch {
      break;
    }
  }
  return sans;
}

/** Format a centipawn eval for display: "+1.2", "-0.8", or "#" for mate. */
export function formatEval(cp: number): string {
  if (Math.abs(cp) >= 9000) return '#';
  const pawns = cp / 100;
  return (pawns > 0 ? '+' : '') + pawns.toFixed(1);
}

/**
 * Analyze a move that deviated from the drill's book line.
 *
 * @param moveSan the move just played, in SAN
 * @param fenBefore the position before the move
 * @param bookMove the drill's expected move, in SAN
 */
export async function analyzeDeviation(
  moveSan: string,
  fenBefore: string,
  bookMove: string,
): Promise<DeviationAnalysis> {
  const engine = getEngine();
  const game = new Chess(fenBefore);
  game.move(moveSan);
  const fenAfter = game.fen();

  if (game.isGameOver()) {
    // Mating (or stalemating) when the book wanted something else: reuse the
    // game-over handling from analyzeMove; there is no refutation to show.
    const a = await analyzeMove(moveSan, fenBefore);
    return {
      move: a.move,
      classification: a.classification,
      cpLoss: a.cpLoss,
      evalBefore: a.evalBefore,
      evalAfter: a.evalAfter,
      engineBest: a.bestMove,
      refutation: [],
      bookMove,
    };
  }

  const [before] = await engine.analyze(fenBefore, { depth: DEVIATION_DEPTH });
  const [after] = await engine.analyze(fenAfter, { depth: DEVIATION_DEPTH });

  const afterMoverPerspective = flipScore(after.score);
  const cpLoss = computeCpLoss(before.score, afterMoverPerspective);

  return {
    move: moveSan,
    classification: classifyMove(cpLoss),
    cpLoss,
    evalBefore: scoreToCp(before.score),
    evalAfter: scoreToCp(afterMoverPerspective),
    engineBest: uciToSan(fenBefore, before.pv[0]),
    refutation: pvToSan(fenAfter, after.pv).slice(0, 4),
    bookMove,
  };
}

export interface DeviationCopy {
  mild: boolean;
  title: string;
  detail: string;
  refutationLine: string | null;
}

/** Human copy for the drill deviation panel. */
export function deviationCopy(d: DeviationAnalysis): DeviationCopy {
  if (d.cpLoss < 50) {
    return {
      mild: true,
      title: 'Not the book move — but no damage',
      detail: `${d.move} holds the position (${formatEval(d.evalAfter)}). This drill is teaching ${d.bookMove} here.`,
      refutationLine: null,
    };
  }
  const swing = `${formatEval(d.evalBefore)} → ${formatEval(d.evalAfter)}`;
  return {
    mild: false,
    title: `${d.classification} — ${d.move} (${swing})`,
    detail:
      `Book plays ${d.bookMove}.` +
      (d.engineBest !== d.bookMove ? ` The engine's top choice is ${d.engineBest}.` : ''),
    refutationLine: d.refutation.length > 0 ? d.refutation.join(' ') : null,
  };
}
