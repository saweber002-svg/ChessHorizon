import type { KingdomId } from '@/types';

export interface MapLocation {
  id: string;
  name: string;
  subname: string;
  kingdom: KingdomId;
  openingId: string;
  /** Variation id in openings.json */
  variationId?: string;
  /** Drill JSON file id without .json */
  drillFileId?: string;
  color: string;
  glowColor: string;
  symbol: string;
  description: string;
  starThreshold: number;
}

function loc(
  id: string,
  kingdom: KingdomId,
  openingId: string,
  name: string,
  subname: string,
  symbol: string,
  color: string,
  description: string,
  starThreshold: number,
  opts?: { variationId?: string; drillFileId?: string }
): MapLocation {
  return {
    id,
    name,
    subname,
    kingdom,
    openingId,
    variationId: opts?.variationId,
    drillFileId: opts?.drillFileId,
    color,
    glowColor: `${color}88`,
    symbol,
    description,
    starThreshold,
  };
}

export const MAP_LOCATIONS: MapLocation[] = [
  loc('italy', 'italian', 'italian', 'Kingdom of Italy', 'Italian Game & Two Knights', '♗', '#00f5d4', 'Renaissance courts — classical development and sharp tactics.', 0),
  loc('sicily', 'sicilian', 'sicilian', 'Queendom of Sicily', 'Sicilian Defense', '♚', '#ff7b72', 'The most combative reply to 1.e4.', 5),
  loc('spain', 'spanish', 'spanish', 'Kingdom of Spain', 'Ruy Lopez (Spanish Opening)', '♘', '#f5a623', 'Named after a 16th-century priest — cornerstone of classical chess.', 10),
  loc('england', 'english', 'english', 'Kingdom of England', 'English Opening', '♙', '#e8d5a3', 'Hypermodern flank play with flexible structures.', 15),
  loc('scandinavia', 'scandinavian', 'scandinavian', 'Realm of Scandinavia', 'Scandinavian Defense', '♛', '#7ec8e3', 'Bold counter-attack from move one.', 20),
  loc('queendom', 'queendom', 'queendom', 'The Queendom', "Queen's Pawn Openings", '♕', '#d6b6ff', 'A realm built on d4, gambits, and central ambition.', 25, { variationId: 'queen-gambit-declined' }),
  loc('french', 'french', 'french', 'Kingdom of France', 'French Defense', '♞', '#c026d3', 'The solid and counter-attacking choice against 1.e4.', 8),
  loc('dutch', 'dutch', 'dutch', 'Kingdom of the Netherlands', 'Dutch Defense', '♟', '#e11d48', 'Aggressive f5 counter against 1.d4.', 12),
  loc('germany', 'germany', 'germany', 'Kingdom of Germany', 'Caro-Kann & German Defenses', '♜', '#854d0e', 'Home of the rock-solid Caro-Kann and other sturdy German systems.', 18),
  loc('wilderness', 'wilderness', 'wilderness', 'The Wilderness', 'Custom Openings', '🌿', '#10b981', 'Forge your own paths beyond the charted kingdoms.', 0),
  loc('clearing', 'clearing', 'clearing', 'The Clearing', 'PvP Arena', '⚔', '#f59e0b', 'Test your steel against fellow travelers.', 0),
  loc('coaching', 'coaching', 'coaching', 'The Coaching Pavilion', 'Simulated Analysis Practice', '🎓', '#a78bfa', 'Practice with simulated move feedback while the engine integration remains future work.', 0),

];

export const ITALIAN_DRILL_VARIATIONS = [
  { variationId: 'giuoco-pianissimo', drillFileId: 'giuoco-pianissimo-main', label: 'Giuoco Pianissimo' },
  { variationId: 'evans-gambit', drillFileId: 'evans-gambit-main', label: 'Evans Gambit' },
  { variationId: 'two-knights', drillFileId: 'two-knights-main', label: 'Two Knights' },
  { variationId: 'fried-liver-attack', drillFileId: 'fried-liver-attack-main', label: 'Fried Liver Attack' },
] as const;

// =============================================================================
// 2D ATLAS NOTES
// =============================================================================
//
// The atlas is rendered by src/components/world-map/Atlas2D.tsx as a flat SVG.
// Realm markers are placed directly from KINGDOM_POSITIONS in src/types/index.ts
// (percent coordinates in 0–100 space) — no 3D transforms involved.
//
// TO ADD A NEW KINGDOM:
// - Add to the KingdomId union in src/types/index.ts
// - Add a fallback entry in KINGDOM_POSITIONS (src/types/index.ts)
// - Add an entry in KINGDOM_UNLOCK_STARS if gated
// - Add a loc(...) entry to MAP_LOCATIONS above
//
// TO CHANGE COLORS / METADATA: edit the loc() call in the MAP_LOCATIONS array.
