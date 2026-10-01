export type Tier = 0 | 1 | 2 | 3 | 4;

export type KingdomId =
  | 'italian'
  | 'spanish'
  | 'sicilian'
  | 'english'
  | 'scandinavian'
  | 'queendom'
  | 'french'
  | 'dutch'
  | 'germany'
  | 'wilderness'
  | 'clearing'
  | 'coaching';

export interface Variation {
  id: string;
  name: string;
  moveCount: number;
  moves: string[];
}

export interface Opening {
  name: string;
  kingdom: KingdomId;
  description: string;
  heroImage: string;
  starThreshold: number;
  variations: Variation[];
}

export interface OpeningsData {
  [openingId: string]: Opening;
}

export interface DrillData {
  fen: string;
  moves: string[];
  metadata: {
    opening: string;
    variation: string;
    moveIndex: number;
    side: 'white' | 'black';
  };
}

export interface MoveProgress {
  stars: number;
  tier: Tier;
  lastDrilled: number;
  attempts: number;
  streak: number;
}

/**
 * Local opening-drill progress, keyed `${openingId}:${variationId}:${side}`.
 * tier comes from the streak of perfect completions of the opening drill;
 * this is what unmoved pieces on the trophy board prestige by.
 */
export interface OpeningProgressLocal {
  totalAttempts: number;
  perfectStreak: number;
  tier: Tier;
  /** totalAttempts value the last time a watch was consumed; -1 = never. */
  lastWatchAttempt: number;
}

/**
 * Local tactical-drill progress, keyed `${openingId}:${variationId}:${tacticLineId}`.
 * tier comes from the streak of perfect completions, gated identically to
 * opening prestige (1/3/5/10).
 */
export interface TacticalProgressLocal {
  totalAttempts: number;
  perfectStreak: number;
  tier: Tier;
}

export interface ProgressState {
  totalStars: number;
  moveProgress: Record<string, MoveProgress>;
  prestigeStreak: number;
  unlockedRegions: KingdomId[];
  drillMode: 'random' | 'in-order';
  sideMode: 'white' | 'black' | 'both';
  /** Optional so older saved states and hand-built test states keep working. */
  openingProgress?: Record<string, OpeningProgressLocal>;
  tacticalProgress?: Record<string, TacticalProgressLocal>;
}

export type GlowColor = 'idle' | 'correct' | 'incorrect';

// Wilderness custom opening
export interface CustomOpening {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  variations: CustomVariation[];
}

export interface CustomVariation {
  id: string;
  name: string;
  moves: string[];
}

// PVP Game state
export interface PVPGameState {
  fen: string;
  status: 'waiting' | 'active' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout';
  turn: 'w' | 'b';
  whiteTime: number;
  blackTime: number;
  whitePlayer: string;
  blackPlayer: string;
  moves: string[];
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
}

export const TIER_NAMES: Record<Tier, string> = {
  0: 'Locked',
  1: 'Novice',
  2: 'Apprentice',
  3: 'Journeyman',
  4: 'Master',
};

export const TIER_COLORS: Record<Tier, string> = {
  0: '#3f3f46', // Zinc-700
  1: '#9ca3af', // Gray-400
  2: '#14b8a6', // Teal-500
  3: '#06b6d4', // Cyan-500
  4: '#00f5d4', // Aquamarine
};

/** Requirements in consecutive 3-star completions */
export const TIER_THRESHOLDS: Record<Tier, number> = {
  0: 0,
  1: 1,
  2: 3,
  3: 5,
  4: 10,
};

export const KINGDOM_UNLOCK_STARS: Partial<Record<KingdomId, number>> = {
  sicilian: 15,
  spanish: 8,
  english: 12,
  scandinavian: 18,
  french: 10,
  dutch: 14,
  germany: 12,
  queendom: 20,
  coaching: 0,
};

export const KINGDOM_UNLOCK_ORDER: Array<{
  kingdom: KingdomId;
  previousKingdom?: KingdomId;
  prerequisiteVariation?: string;
  starThreshold: number;
}> = [
  { kingdom: 'italian', starThreshold: 0 },
  { kingdom: 'spanish', previousKingdom: 'italian', prerequisiteVariation: 'italian', starThreshold: 8 },
  { kingdom: 'french', previousKingdom: 'spanish', prerequisiteVariation: 'spanish', starThreshold: 10 },
  { kingdom: 'germany', previousKingdom: 'french', prerequisiteVariation: 'french', starThreshold: 12 },
  { kingdom: 'sicilian', previousKingdom: 'germany', prerequisiteVariation: 'german', starThreshold: 15 },
  { kingdom: 'english', previousKingdom: 'sicilian', prerequisiteVariation: 'sicilian', starThreshold: 12 },
  { kingdom: 'dutch', previousKingdom: 'english', prerequisiteVariation: 'english', starThreshold: 14 },
  { kingdom: 'scandinavian', previousKingdom: 'dutch', prerequisiteVariation: 'dutch', starThreshold: 18 },
  { kingdom: 'queendom', previousKingdom: 'dutch', prerequisiteVariation: 'dutch', starThreshold: 20 },
  { kingdom: 'coaching', starThreshold: 0 }, // Always accessible for live coaching
];

export const KINGDOM_POSITIONS: Record<KingdomId, { x: number; y: number }> = {
  // Calibrated to the Age of Exploration atlas map (2744x1568), 2026-09-30.
  // Derived from the lat/lng affine projection in castleLocations.ts.
  // `coaching` has no map node, so it keeps the centered legacy position.
  italian: { x: 53.44, y: 77.03 },
  spanish: { x: 29.9, y: 83.2 },
  sicilian: { x: 54.84, y: 89.13 },
  english: { x: 32.39, y: 51.41 },
  scandinavian: { x: 57.68, y: 32.12 },
  queendom: { x: 35.65, y: 57.16 },
  french: { x: 39.08, y: 67.58 },
  dutch: { x: 43.35, y: 55.34 },
  germany: { x: 49.95, y: 57.98 },
  wilderness: { x: 90.06, y: 40.67 },
  clearing: { x: 62.48, y: 67.01 },
  coaching: { x: 50, y: 50 },
};

export function getTierColor(tier: Tier): string {
  return TIER_COLORS[tier];
}

export function getTierLabel(tier: Tier): string {
  return TIER_NAMES[tier];
}

export function calculateTier(streak: number): Tier {
  if (streak >= TIER_THRESHOLDS[4]) return 4;
  if (streak >= TIER_THRESHOLDS[3]) return 3;
  if (streak >= TIER_THRESHOLDS[2]) return 2;
  if (streak >= TIER_THRESHOLDS[1]) return 1;
  return 0;
}


