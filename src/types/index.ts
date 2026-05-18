export type Tier = 0 | 1 | 2 | 3;

export type KingdomId = 'italian' | 'spanish' | 'sicilian' | 'english' | 'scandinavian' | 'queendom' | 'wilderness' | 'clearing';

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
  0: 'Novice',
  1: 'Apprentice',
  2: 'Journeyman',
  3: 'Master',
};

export const TIER_COLORS: Record<Tier, string> = {
  0: '#9ca3af',
  1: '#14b8a6',
  2: '#06b6d4',
  3: '#00f5d4',
};

export const TIER_THRESHOLDS: Record<Tier, number> = {
  0: 0,
  1: 3,
  2: 6,
  3: 9,
};

export const KINGDOM_UNLOCK_STARS: Partial<Record<KingdomId, number>> = {
  sicilian: 5,
  spanish: 10,
  english: 15,
  scandinavian: 20,
};

export const KINGDOM_POSITIONS: Record<KingdomId, { x: number; y: number }> = {
  italian: { x: 35, y: 65 },
  spanish: { x: 18, y: 50 },
  sicilian: { x: 55, y: 80 },
  english: { x: 42, y: 22 },
  scandinavian: { x: 65, y: 12 },
  queendom: { x: 78, y: 40 },
  wilderness: { x: 82, y: 75 },
  clearing: { x: 15, y: 15 },
};

export function getTierColor(tier: Tier): string {
  return TIER_COLORS[tier];
}

export function getTierLabel(tier: Tier): string {
  return TIER_NAMES[tier];
}

export function calculateTier(cumulativeStars: number): Tier {
  if (cumulativeStars >= TIER_THRESHOLDS[3]) return 3;
  if (cumulativeStars >= TIER_THRESHOLDS[2]) return 2;
  if (cumulativeStars >= TIER_THRESHOLDS[1]) return 1;
  return 0;
}


