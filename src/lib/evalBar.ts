/**
 * Evaluation-bar math and the user's bar-position preference.
 *
 * Engine scores arrive from the side to move's perspective (see
 * src/engine/stockfish.ts). The bar always speaks from White's perspective:
 * the white share of the bar is White's winning chances, and the label is
 * signed for White (+ = White better, M = mate).
 */

import type { EngineScore } from '@/engine/stockfish';
import { scoreToCp } from '@/engine/stockfish';

export type EvalBarPosition = 'left' | 'top' | 'off';

export const EVAL_BAR_POSITIONS: EvalBarPosition[] = ['left', 'top', 'off'];

export const EVAL_BAR_LABELS: Record<EvalBarPosition, string> = {
  left: 'Left',
  top: 'Top',
  off: 'Off',
};

export const DEFAULT_EVAL_BAR_POSITION: EvalBarPosition = 'left';

/** Whose turn a FEN says it is. Defaults to White on a malformed FEN. */
export function sideToMove(fen: string): 'w' | 'b' {
  return fen.split(/\s+/)[1] === 'b' ? 'b' : 'w';
}

/** Flip an engine score (side-to-move perspective) to White's perspective. */
export function toWhitePerspective(score: EngineScore, turn: 'w' | 'b'): EngineScore {
  if (turn === 'w') return score;
  return { type: score.type, value: score.value === 0 ? 0 : -score.value };
}

/**
 * White's share of the bar, 0..1, from a White-perspective score.
 * Uses the lichess win-chance sigmoid so big advantages saturate smoothly
 * instead of slamming to the ends at +3.
 */
export function whiteShare(score: EngineScore): number {
  if (score.type === 'mate') {
    if (score.value > 0) return 1;
    if (score.value < 0) return 0;
    return 0.5;
  }
  const cp = scoreToCp(score);
  const winPct = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  return Math.min(1, Math.max(0, winPct / 100));
}

/** Label for a White-perspective score: "+1.2", "-0.8", "0.0", "M3", "-M2". */
export function formatEval(score: EngineScore): string {
  if (score.type === 'mate') {
    if (score.value > 0) return `M${score.value}`;
    if (score.value < 0) return `-M${-score.value}`;
    return 'M0';
  }
  if (score.value === 0) return '0.0';
  const sign = score.value > 0 ? '+' : '-';
  return `${sign}${(Math.abs(score.value) / 100).toFixed(1)}`;
}
