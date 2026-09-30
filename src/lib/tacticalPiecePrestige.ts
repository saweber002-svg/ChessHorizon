import type { Square } from 'chess.js';
import { getPlayerColorFromFen } from './drillLoader';
import { tracePieceIdentities } from './trophyPosition';
import type { Tier } from '@/types';

export interface TacticForAttribution {
  /** Where the tactic starts (line.startFen ?? pack.startFen). */
  startFen: string;
  /** The tactic's solution moves. */
  moves: string[];
  /**
   * The tactic line's prestige tier (1/3/5/10 perfect completions). Each
   * piece the hero side moved in the tactic earns this tier; the piece's
   * own prestige is the best tier across every tactic line it appeared in.
   * Tier 0 earns nothing.
   */
  tier: Tier;
}

/**
 * Only the piece placement and the side to move identify a position for
 * mapping. Move counters and castling rights are ignored: tactics are
 * matched against the opening replay by where the pieces stand.
 */
function positionKey(fen: string): string {
  const parts = fen.split(' ');
  return `${parts[0]} ${parts[1]}`;
}

/**
 * Credit each tactic line's prestige tier to the individual opening pieces
 * the hero side (side to move) moved in that tactic.
 *
 * A tactic's start position is matched against the opening's main-line
 * replay; the tactic piece's square at tactic start maps back to the
 * opening piece standing on that square at the matched ply, which yields
 * the opening pieceId used on the trophy board. Tactics that don't match
 * any main-line position (sidelines, composed positions) credit nothing
 * rather than guessing.
 *
 * Returns opening pieceId -> best tactical tier earned by that piece.
 */
export function attributeTacticPieces(
  openingStartFen: string,
  openingMoves: string[],
  tactics: TacticForAttribution[]
): Map<string, Tier> {
  const result = new Map<string, Tier>();
  if (tactics.length === 0) return result;

  const openingTrace = tracePieceIdentities(openingStartFen, openingMoves);
  const keysByPly = openingTrace.fenByPly.map(positionKey);

  for (const tactic of tactics) {
    if (tactic.tier < 1) continue;
    const ply = keysByPly.indexOf(positionKey(tactic.startFen));
    if (ply < 0 || ply >= openingTrace.idAtSquareByPly.length) continue;
    const openingIds = openingTrace.idAtSquareByPly[ply];
    const heroColor = getPlayerColorFromFen(tactic.startFen);
    const tacticTrace = tracePieceIdentities(tactic.startFen, tactic.moves);
    for (const [idx, tacticPieceId] of tacticTrace.moverIdAtIndex) {
      if (tacticTrace.moverColorAtIndex.get(idx) !== heroColor) continue;
      const openingPieceId = openingIds.get(tacticPieceId as Square);
      if (!openingPieceId) continue;
      const best = Math.max(result.get(openingPieceId) ?? 0, tactic.tier);
      result.set(openingPieceId, best as Tier);
    }
  }
  return result;
}
