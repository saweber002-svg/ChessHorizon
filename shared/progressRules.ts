export type PrestigeTier = 0 | 1 | 2 | 3 | 4;
export type DrillSide = "white" | "black";

export const PRESTIGE_THRESHOLDS: Record<PrestigeTier, number> = {
  0: 0,
  1: 1,
  2: 3,
  3: 5,
  4: 10,
};

export interface MoveProgressSnapshot {
  bestStars: number;
  currentStreak: number;
  prestigeTier: PrestigeTier;
  totalAttempts: number;
}

export interface OpeningProgressSnapshot {
  totalAttempts: number;
  perfectCompletionStreak: number;
  prestigeTier: PrestigeTier;
  lastWatchAttempt: number;
}

export interface MoveResult {
  moveIndex: number;
  stars: 0 | 1 | 2 | 3;
}

export function calculatePrestigeTier(streak: number): PrestigeTier {
  if (streak >= PRESTIGE_THRESHOLDS[4]) return 4;
  if (streak >= PRESTIGE_THRESHOLDS[3]) return 3;
  if (streak >= PRESTIGE_THRESHOLDS[2]) return 2;
  if (streak >= PRESTIGE_THRESHOLDS[1]) return 1;
  return 0;
}

export function applyMoveResult(
  previous: MoveProgressSnapshot,
  stars: 0 | 1 | 2 | 3,
): MoveProgressSnapshot {
  const currentStreak = stars === 3 ? previous.currentStreak + 1 : 0;
  return {
    bestStars: Math.max(previous.bestStars, stars),
    currentStreak,
    prestigeTier: calculatePrestigeTier(currentStreak),
    totalAttempts: previous.totalAttempts + 1,
  };
}

export function applyOpeningCompletion(
  previous: OpeningProgressSnapshot,
  isPerfect: boolean,
): OpeningProgressSnapshot {
  const totalAttempts = previous.totalAttempts + 1;
  const perfectCompletionStreak = isPerfect ? previous.perfectCompletionStreak + 1 : 0;
  return {
    totalAttempts,
    perfectCompletionStreak,
    prestigeTier: calculatePrestigeTier(perfectCompletionStreak),
    lastWatchAttempt: previous.lastWatchAttempt,
  };
}

export function isPerfectCompletion(
  results: readonly MoveResult[],
  expectedMoveCount?: number,
): boolean {
  if (results.length === 0) return false;
  if (expectedMoveCount !== undefined && results.length !== expectedMoveCount) return false;
  return results.every((result) => result.stars === 3);
}

export function watchRequirementForTier(tier: PrestigeTier): number | null {
  switch (tier) {
    case 0:
      return 1;
    case 1:
      return 3;
    case 2:
      return 5;
    case 3:
      return 10;
    case 4:
      return null;
  }
}

export interface WatchStatus {
  tier: PrestigeTier;
  unlimited: boolean;
  available: boolean;
  attemptsSinceLastWatch: number;
  attemptsRequired: number | null;
  autoOnly: boolean;
}

export function getWatchStatus(progress: OpeningProgressSnapshot): WatchStatus {
  const attemptsSinceLastWatch = Math.max(
    0,
    progress.totalAttempts - progress.lastWatchAttempt,
  );
  const attemptsRequired = watchRequirementForTier(progress.prestigeTier);
  const unlimited = attemptsRequired === null;
  return {
    tier: progress.prestigeTier,
    unlimited,
    available: unlimited || attemptsSinceLastWatch >= attemptsRequired,
    attemptsSinceLastWatch,
    attemptsRequired,
    autoOnly: progress.prestigeTier === 3,
  };
}

export function consumeWatch(progress: OpeningProgressSnapshot): OpeningProgressSnapshot {
  const status = getWatchStatus(progress);
  if (!status.available) {
    throw new Error("Watch mode is not available for this opening yet");
  }
  return { ...progress, lastWatchAttempt: progress.totalAttempts };
}
