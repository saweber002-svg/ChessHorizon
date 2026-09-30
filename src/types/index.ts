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
  { kingdom: 'queendom', previousKingdom: 'dutch', prerequisiteVariation: 'dutch', starThreshold: 20 },
  { kingdom: 'coaching', starThreshold: 0 }, // Always accessible for live coaching
];

export const KINGDOM_POSITIONS: Record<KingdomId, { x: number; y: number }> = {
  // Measured from the baked top-down render of world-atlas.glb (4096px square,
  // node bounding-box centers projected through the ortho camera), 2026-09-29.
  // `coaching` has no node in the GLB (it never did — the 3D atlas used the
  // legacy fallback), so it keeps the centered legacy position.
  italian: { x: 50.18, y: 69.67 },
  spanish: { x: 24.01, y: 75.55 },
  sicilian: { x: 53.11, y: 79.05 },
  english: { x: 24.38, y: 48.57 },
  scandinavian: { x: 54.52, y: 35.64 },
  queendom: { x: 27.96, y: 53.89 },
  french: { x: 31.16, y: 63.52 },
  dutch: { x: 38.24, y: 54.14 },
  germany: { x: 46.04, y: 56.39 },
  wilderness: { x: 61.94, y: 64.59 },
  clearing: { x: 70.64, y: 63.79 },
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


