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

export interface ProgressState {
  totalStars: number;
  moveProgress: Record<string, MoveProgress>;
  prestigeStreak: number;
  unlockedRegions: KingdomId[];
  drillMode: 'random' | 'in-order';
  sideMode: 'white' | 'black' | 'both';
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
  italian: { x: 35, y: 65 },
  spanish: { x: 18, y: 50 },
  sicilian: { x: 55, y: 80 },
  english: { x: 42, y: 22 },
  scandinavian: { x: 65, y: 12 },
  queendom: { x: 78, y: 40 },
  french: { x: 28, y: 38 },
  dutch: { x: 52, y: 28 },
  germany: { x: 48, y: 42 },
  wilderness: { x: 82, y: 75 },
  clearing: { x: 15, y: 15 },
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


