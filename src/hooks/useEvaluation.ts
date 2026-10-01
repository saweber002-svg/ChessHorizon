import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { getEngine, type EngineScore } from '@/engine/stockfish';
import { sideToMove, toWhitePerspective } from '@/lib/evalBar';

const EVAL_DEPTH = 12;
const DEBOUNCE_MS = 150;

/** Evaluations are White-perspective and cached per FEN for the session. */
const cache = new Map<string, EngineScore>();

/**
 * White-perspective score for a finished game, or null if it is still live.
 * The engine has no move to report in a mated/stalemated position, so these
 * are answered locally instead of queueing a search that would throw.
 */
function gameOverScore(fen: string): EngineScore | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  if (chess.isCheckmate()) {
    // The side to move has been mated: White mated = -M, Black mated = +M.
    return { type: 'mate', value: chess.turn() === 'w' ? -1 : 1 };
  }
  if (chess.isStalemate() || chess.isDraw()) {
    return { type: 'cp', value: 0 };
  }
  return null;
}

/**
 * Live engine evaluation of a position, from White's perspective.
 * Returns null until the first evaluation lands. While a new position is
 * being evaluated the previous score stays on screen so the bar animates
 * from it instead of snapping back to neutral on every move.
 */
export function useEvaluation(fen: string, enabled: boolean): EngineScore | null {
  const [score, setScore] = useState<EngineScore | null>(() => cache.get(fen) ?? null);

  useEffect(() => {
    if (!enabled) return;

    const over = gameOverScore(fen);
    if (over) {
      setScore(over);
      return;
    }
    const hit = cache.get(fen);
    if (hit) {
      setScore(hit);
      return;
    }

    // The cleanup flips `cancelled`, so a search that lands after the board
    // has moved on to another position is dropped instead of overwriting it.
    let cancelled = false;
    const timer = setTimeout(() => {
      getEngine()
        .analyze(fen, { depth: EVAL_DEPTH })
        .then((lines) => {
          if (cancelled || !lines[0]) return;
          const white = toWhitePerspective(lines[0].score, sideToMove(fen));
          cache.set(fen, white);
          setScore(white);
        })
        .catch(() => {
          // Engine unavailable — keep showing the previous score.
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fen, enabled]);

  return score;
}
