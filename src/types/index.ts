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
  /** S2: intro video has been shown (first atlas entry gate). */
  introVideoSeen?: boolean;
  /** S2: story mode on/off. Absent = on (the default path). */
  storyMode?: boolean;
  /** S2: drill packs completed at least once (thread cursor backing). */
  completedPacks?: Record<string, true>;
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
  /**
   * Legacy display hint only (KingdomPanel's "stars to unlock" meter).
   * NOT a gate since Patch 43 — kingdom gates are cleared-based; see
   * reconcileUnlocks. S4 replaces the meter with cleared-progress.
   */
  starThreshold: number;
}> = [
  { kingdom: 'italian', starThreshold: 0 },
  // Prerequisite variation = the previous kingdom's first story variation
  // (registry order). For spanish the previous kingdom is Italy, whose order
  // is settled: Giuoco Piano first. Later prerequisites are provisional in
  // the same way until Scott's pedagogical pass on those kingdoms (S5).
  { kingdom: 'spanish', previousKingdom: 'italian', prerequisiteVariation: 'giuoco-piano', starThreshold: 8 },
  { kingdom: 'french', previousKingdom: 'spanish', prerequisiteVariation: 'ruy-lopez-berlin', starThreshold: 10 },
  { kingdom: 'germany', previousKingdom: 'french', prerequisiteVariation: 'french-advance', starThreshold: 12 },
  { kingdom: 'sicilian', previousKingdom: 'germany', prerequisiteVariation: 'caro-kann-advance', starThreshold: 15 },
  { kingdom: 'english', previousKingdom: 'sicilian', prerequisiteVariation: 'sicilian-classical', starThreshold: 12 },
  { kingdom: 'dutch', previousKingdom: 'english', prerequisiteVariation: 'english-agincourt', starThreshold: 14 },
  { kingdom: 'scandinavian', previousKingdom: 'dutch', prerequisiteVariation: 'dutch-classical', starThreshold: 18 },
  { kingdom: 'queendom', previousKingdom: 'dutch', prerequisiteVariation: 'dutch-classical', starThreshold: 20 },
  { kingdom: 'coaching', starThreshold: 0 }, // Always accessible for live coaching
];

/** Cleared-state lookups reconcileUnlocks gates on (see src/data/unlockGates.ts). */
export interface UnlockGates {
  kingdomCleared: (kingdom: KingdomId) => boolean;
  variationCleared: (variationId: string) => boolean;
}

/**
 * Recompute kingdom unlocks from KINGDOM_UNLOCK_ORDER (Patch 43): a kingdom
 * opens when its previous kingdom is unlocked AND cleared (>= 2 stars on
 * every slot of every variation, both colors) AND its prerequisite
 * variation — the previous kingdom's first story variation — is cleared
 * (>= 1 star on every slot). Raw star totals no longer gate anything.
 *
 * Add-only and idempotent: regions already in `unlockedRegions` are never
 * removed, so saves that unlocked kingdoms under the old star thresholds
 * keep every unlock they had.
 *
 * Run on load (so saves created before a kingdom joined the order — e.g.
 * Scandinavia — pick it up immediately) and after every recorded drill.
 */
export function reconcileUnlocks(
  unlockedRegions: KingdomId[],
  gates: UnlockGates,
): KingdomId[] {
  const unlocked = [...unlockedRegions];
  for (const unlockDef of KINGDOM_UNLOCK_ORDER) {
    // Skip if already unlocked (add-only: existing unlocks are never revoked)
    if (unlocked.includes(unlockDef.kingdom)) {
      continue;
    }

    // Kingdoms with no predecessor (italian, coaching) are always open
    if (!unlockDef.previousKingdom) {
      unlocked.push(unlockDef.kingdom);
      continue;
    }

    // Previous kingdom must be unlocked and cleared
    if (!unlocked.includes(unlockDef.previousKingdom)) {
      continue;
    }
    if (!gates.kingdomCleared(unlockDef.previousKingdom)) {
      continue;
    }

    // Prerequisite variation (entry-point sanity) must be cleared
    if (
      unlockDef.prerequisiteVariation &&
      !gates.variationCleared(unlockDef.prerequisiteVariation)
    ) {
      continue;
    }

    // All conditions met, unlock this kingdom
    unlocked.push(unlockDef.kingdom);
  }
  return unlocked;
}

export const KINGDOM_POSITIONS: Record<KingdomId, { x: number; y: number }> = {
  // Measured on Scott's Age of Exploration atlas pass 2 (1170x1170 square), 2026-10-10.
  // Both axes are 0-100. Geographic kingdoms were pin-pointed with visual
  // grounding against the new artwork. Queendom is offset SE of Germany for
  // UI separation (Czechia sits inside German territory geographically).
  // Wilderness/clearing/coaching are design placements.
  italian: { x: 52.0, y: 60.0 },
  spanish: { x: 22.8, y: 66.2 },
  sicilian: { x: 58.0, y: 74.0 },
  english: { x: 28.5, y: 37.5 },
  scandinavian: { x: 42.0, y: 30.0 },
  queendom: { x: 42.5, y: 47.0 },
  french: { x: 35.2, y: 52.1 },
  dutch: { x: 46.3, y: 40.4 },
  germany: { x: 52.5, y: 42.5 },
  wilderness: { x: 82.0, y: 68.0 },
  clearing: { x: 50.0, y: 50.0 },
  coaching: { x: 71.0, y: 34.0 },
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


