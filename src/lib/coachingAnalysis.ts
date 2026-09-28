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

export type MoveClassification = 'Best' | 'Excellent' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';

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
 * Classify a move based on centipawn loss.
 * Thresholds based on Chess.com Game Review standards.
 */
export function classifyMove(cpLoss: number): MoveClassification {
  if (cpLoss <= 0) return 'Best';
  if (cpLoss < 50) return 'Excellent';
  if (cpLoss < 100) return 'Good';
  if (cpLoss < 300) return 'Inaccuracy';
  if (cpLoss < 500) return 'Mistake';
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
    'Best': 'This is the best move in the position.',
    'Excellent': 'An excellent move with minimal loss.',
    'Good': 'A solid move, though not the strongest.',
    'Inaccuracy': `This move loses about ${cpLoss} centipawns. Consider ${bestMove} instead.`,
    'Mistake': `This is a significant mistake, losing ${cpLoss} centipawns. The engine prefers ${bestMove}.`,
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

/**
 * Analyze a move with the real engine.
 *
 * @param moveSan the move just played, in SAN
 * @param fenBefore the position before the move
 */
export async function analyzeMove(moveSan: string, fenBefore: string): Promise<MoveAnalysis> {
  const engine = getEngine();

  const game = new Chess(fenBefore);
  const applied = game.move(moveSan);
  const fenAfter = game.fen();

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
    const [before] = await engine.analyze(fenBefore, { depth: ANALYSIS_DEPTH });
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
      pv: before.pv.map((m) => uciToSan(fenBefore, m)),
      explanation: generateExplanation(classification, cpLoss, uciToSan(fenBefore, before.pv[0])),
    };
  }

  const [beforeLines] = await engine.analyze(fenBefore, { depth: ANALYSIS_DEPTH });
  const [afterLines] = await engine.analyze(fenAfter, { depth: ANALYSIS_DEPTH });

  const before = beforeLines;
  const afterMoverPerspective = flipScore(afterLines.score);

  const cpLoss = computeCpLoss(before.score, afterMoverPerspective);
  const classification = classifyMove(cpLoss);
  const bestMoveSan = uciToSan(fenBefore, before.pv[0]);

  return {
    move: applied.san,
    classification,
    cpLoss,
    evalBefore: scoreToCp(before.score),
    evalAfter: scoreToCp(afterMoverPerspective),
    isMate: before.score.type === 'mate' || afterLines.score.type === 'mate',
    bestMove: bestMoveSan,
    pv: before.pv.map((m) => uciToSan(fenBefore, m)),
    explanation: generateExplanation(classification, cpLoss, bestMoveSan),
  };
}

/**
 * Get the engine's top moves for a position.
 * Used during exploration mode to show alternatives.
 */
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
