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
