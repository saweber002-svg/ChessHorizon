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

/**
 * Tactical drills prestige exactly like openings: the tier comes from the
 * streak of perfect completions, gated at 1/3/5/10. Tactical progress has no
 * watch quota, so there is no lastWatchAttempt.
 */
export interface TacticalProgressSnapshot {
  totalAttempts: number;
  perfectCompletionStreak: number;
  prestigeTier: PrestigeTier;
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

export function applyTacticalCompletion(
  previous: TacticalProgressSnapshot,
  isPerfect: boolean,
): TacticalProgressSnapshot {
  const totalAttempts = previous.totalAttempts + 1;
  const perfectCompletionStreak = isPerfect ? previous.perfectCompletionStreak + 1 : 0;
  return {
    totalAttempts,
    perfectCompletionStreak,
    prestigeTier: calculatePrestigeTier(perfectCompletionStreak),
  };
}

/**
 * Board prestige for a trophy board: the minimum prestige tier across every
 * tactical drill for the opening. The board never displays a level that has
 * not been reached by every tactical drill. Empty input (no tactical drills)
 * yields tier 0; callers fall back to the opening tier in that case.
 */
export function minPrestigeTier(tiers: readonly PrestigeTier[]): PrestigeTier {
  if (tiers.length === 0) return 0;
  let min: PrestigeTier = 4;
  for (const t of tiers) {
    if (t < min) min = t;
  }
  return min;
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

/**
 * Story-progression cleared predicates (Patch 43).
 *
 * Move-progress keys are `${openingId}:${variationId}:${moveIndex}` where
 * moveIndex is the GLOBAL index into the variation's main line (confirmed in
 * DrillSession: `playerMoveIndices` are global line indices, filtered by
 * whose turn it is). A line's slots therefore partition by color on their
 * own: the slots where White moves are White's, the slots where Black moves
 * are Black's, and "cleared on both colors" is measurable from the
 * move-progress record alone. Tactical packs write under a `:tactical:`
 * infix and are never part of a variation's slot set.
 */
export interface MoveSlot {
  key: string;
  side: DrillSide;
}

/** Minimal structural view of a move-progress record (best stars per key). */
export type MoveStarsLookup = Readonly<Record<string, { stars: number } | undefined>>;

/**
 * Derive a line's slot set from its length and the side to move first.
 * Sides alternate every ply, so slot i belongs to `startSide` when the
 * number of plies since the start is even, and to the other side when odd.
 */
export function slotsForLine(
  openingId: string,
  variationId: string,
  moveCount: number,
  startSide: DrillSide = "white",
): MoveSlot[] {
  const slots: MoveSlot[] = [];
  for (let i = 0; i < moveCount; i++) {
    const side = i % 2 === 0 ? startSide : startSide === "white" ? "black" : "white";
    slots.push({ key: `${openingId}:${variationId}:${i}`, side });
  }
  return slots;
}

/** Variation standard: every slot (both colors) at >= minStars. Empty slot set is never cleared. */
export function isVariationCleared(
  moveProgress: MoveStarsLookup,
  slots: readonly MoveSlot[],
  minStars = 1,
): boolean {
  if (slots.length === 0) return false;
  return slots.every((slot) => (moveProgress[slot.key]?.stars ?? 0) >= minStars);
}

/** Kingdom standard: every variation non-empty, and every slot (both colors) at >= minStars. */
export function isKingdomCleared(
  moveProgress: MoveStarsLookup,
  kingdomSlots: readonly (readonly MoveSlot[])[],
  minStars = 2,
): boolean {
  if (kingdomSlots.length === 0) return false;
  return kingdomSlots.every((slots) => isVariationCleared(moveProgress, slots, minStars));
}
