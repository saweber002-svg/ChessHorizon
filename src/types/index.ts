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

/**
 * Recompute kingdom unlocks from KINGDOM_UNLOCK_ORDER: any kingdom whose star
 * threshold is met and whose previous kingdom is already unlocked gets added.
 * Idempotent — only ever adds regions, never removes.
 *
 * Run on load (so saves created before a kingdom joined the order — e.g.
 * Scandinavia — pick it up immediately) and after every recorded drill.
 */
export function reconcileUnlocks(
  unlockedRegions: KingdomId[],
  totalStars: number,
): KingdomId[] {
  const unlocked = [...unlockedRegions];
  for (const unlockDef of KINGDOM_UNLOCK_ORDER) {
    // Skip if already unlocked
    if (unlocked.includes(unlockDef.kingdom)) {
      continue;
    }

    // Check if total stars threshold is met
    if (totalStars < unlockDef.starThreshold) {
      continue;
    }

    // If there's a previous kingdom requirement, check if it's unlocked
    if (unlockDef.previousKingdom && !unlocked.includes(unlockDef.previousKingdom)) {
      continue;
    }

    // All conditions met, unlock this kingdom
    unlocked.push(unlockDef.kingdom);
  }
  return unlocked;
}

export const KINGDOM_POSITIONS: Record<KingdomId, { x: number; y: number }> = {
  // Measured on Scott's Age of Exploration atlas (1170x1170 square), 2026-10-03.
  // Both axes are 0-100. Geographic kingdoms were pin-pointed with visual
  // grounding against the new artwork. Queendom is offset SE of Germany for
  // UI separation (Czechia sits inside German territory geographically).
  // Wilderness/clearing/coaching are design placements.
  italian: { x: 57.5, y: 64.0 },
  spanish: { x: 24.0, y: 68.5 },
  sicilian: { x: 56.5, y: 75.5 },
  english: { x: 32.2, y: 40.5 },
  scandinavian: { x: 63.5, y: 22.5 },
  queendom: { x: 46.0, y: 48.5 },
  french: { x: 35.5, y: 53.0 },
  dutch: { x: 44.2, y: 39.0 },
  germany: { x: 56.0, y: 44.0 },
  wilderness: { x: 85.0, y: 55.0 },
  clearing: { x: 58.0, y: 56.0 },
  coaching: { x: 68.0, y: 30.0 },
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


