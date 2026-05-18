import type { KingdomId } from '@/types';
import { percentToWorld3D } from '@/lib/mapCoordinates';
import { KINGDOM_POSITIONS } from '@/types';

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
  position: [number, number, number];
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
  const pos = KINGDOM_POSITIONS[kingdom];
  return {
    id,
    name,
    subname,
    kingdom,
    openingId,
    variationId: opts?.variationId,
    drillFileId: opts?.drillFileId,
    position: percentToWorld3D(pos.x, pos.y),
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
  loc('spain', 'spanish', 'spanish', 'Kingdom of Spain', 'Ruy Lopez & Berlin', '♘', '#f5a623', 'Named after a 16th-century priest — cornerstone of classical chess.', 10),
  loc('england', 'english', 'english', 'Kingdom of England', 'English Opening', '♙', '#e8d5a3', 'Hypermodern flank play with flexible structures.', 15),
  loc('scandinavia', 'scandinavian', 'scandinavian', 'Realm of Scandinavia', 'Scandinavian Defense', '♛', '#7ec8e3', 'Bold counter-attack from move one.', 20),
  loc('queendom', 'queendom', 'queendom', 'Queendom of the Queen', "Queen's Pawn Openings", '♕', '#d6b6ff', 'A realm built on d4, gambits, and central ambition.', 25, { variationId: 'queen-gambit-declined' }),
  loc('wilderness', 'wilderness', 'wilderness', 'The Wilderness', 'Custom Openings', '🌿', '#10b981', 'Forge your own paths beyond the charted kingdoms.', 0),
  loc('clearing', 'clearing', 'clearing', 'The Clearing', 'PvP Arena', '⚔', '#f59e0b', 'Test your steel against fellow travelers.', 0),
  // Featured drill hotspot on Italy (Giuoco Piano — wired to JSON)
  {
    id: 'giuoco-piano-main',
    name: 'Giuoco Piano',
    subname: 'Main Line — Drill Ready',
    kingdom: 'italian',
    openingId: 'italian',
    variationId: 'giuoco-piano',
    drillFileId: 'giuoco-piano-main',
    position: percentToWorld3D(42, 58),
    color: '#00f5d4',
    glowColor: 'rgba(0,245,212,0.6)',
    symbol: '★',
    description: 'The Italian Game with 4.c3 — practice the full main line from provided drill data.',
    starThreshold: 0,
  },
];

export const ITALIAN_DRILL_VARIATIONS = [
  { variationId: 'giuoco-piano', drillFileId: 'giuoco-piano-main', label: 'Giuoco Piano' },
  { variationId: 'giuoco-pianissimo', drillFileId: 'giuoco-pianissimo-main', label: 'Giuoco Pianissimo' },
  { variationId: 'evans-gambit', drillFileId: 'evans-gambit-main', label: 'Evans Gambit' },
  { variationId: 'two-knights', drillFileId: 'two-knights-main', label: 'Two Knights' },
  { variationId: 'fried-liver', drillFileId: 'fried-liver-attack-main', label: 'Fried Liver Attack' },
] as const;
