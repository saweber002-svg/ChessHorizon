import type { KingdomId } from '@/types';
import {
  isKingdomCleared,
  isVariationCleared,
  type MoveStarsLookup,
} from '../../shared/progressRules';
import { KINGDOM_VARIATION_SLOTS } from './kingdomSlots';

/**
 * Cleared-state gates for reconcileUnlocks (Patch 43, story progression S1).
 *
 * Kingdom gate standard: the previous kingdom is "cleared" when every slot
 * of every one of its variations sits at >= 2 stars (both colors — slots
 * partition by color on their own; see shared/progressRules.ts). Variation
 * standard: >= 1 star on every slot. Slot sets are generated from the drill
 * packs by scripts/compute-kingdom-slots.mjs.
 */
export const VARIATION_CLEAR_MIN_STARS = 1;
export const KINGDOM_CLEAR_MIN_STARS = 2;

export function variationCleared(
  moveProgress: MoveStarsLookup,
  variationId: string,
  minStars: number = VARIATION_CLEAR_MIN_STARS,
): boolean {
  for (const variations of Object.values(KINGDOM_VARIATION_SLOTS)) {
    const entry = variations?.find((v) => v.variationId === variationId);
    if (entry) return isVariationCleared(moveProgress, entry.slots, minStars);
  }
  return false;
}

export function kingdomCleared(
  moveProgress: MoveStarsLookup,
  kingdom: KingdomId,
  minStars: number = KINGDOM_CLEAR_MIN_STARS,
): boolean {
  const variations = KINGDOM_VARIATION_SLOTS[kingdom];
  if (!variations || variations.length === 0) return false;
  return isKingdomCleared(
    moveProgress,
    variations.map((v) => v.slots),
    minStars,
  );
}

/** Gate closures in the shape reconcileUnlocks consumes. */
export function buildUnlockGates(moveProgress: MoveStarsLookup) {
  return {
    kingdomCleared: (kingdom: KingdomId) => kingdomCleared(moveProgress, kingdom),
    variationCleared: (variationId: string) => variationCleared(moveProgress, variationId),
  };
}
