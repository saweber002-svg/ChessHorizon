/**
 * Story progression engine (S2, 2026-10-23): the Italy frontier, the
 * deviation/tactical expansion gates, and the global linear thread.
 * Design: your_files/chess-horizon-story-s2-spec-2026-10-23.md (scope §8).
 *
 * Pure functions over ProgressState — no React, no storage. Kingdom
 * gating between kingdoms lives in S1 (unlockGates/reconcileUnlocks);
 * this module gates WITHIN the story: which variation is next, and when
 * deviation/tactical lessons weave into the lesson plan.
 */
import type { KingdomId, ProgressState } from '@/types';
import { KINGDOM_UNLOCK_ORDER } from '@/types';
import { KINGDOM_VARIATION_SLOTS } from './kingdomSlots';
import { variationCleared } from './unlockGates';
import { getKingdomDrills } from './kingdomDrills';
import { ALL_DRILL_FILE_IDS, TACTICAL_FILE_IDS } from './drillRegistry';
import { TACTICAL_VARIATIONS } from './tacticalVariations';
import { REALM_TOTAL_MOVES } from './realmDrillTotals';

/** Italy's story order: the Evans capstone and the Greco sibling branch
 *  off Two Knights (frontier-of-2). Settled 2026-10-14 / scope §3. */
export const ITALY_STORY_ORDER = [
  'giuoco-piano',
  'giuoco-pianissimo',
  'two-knights',
  'evans-gambit',
  'greco-counter-attack',
] as const;

const ITALY_ORDER_INDEX = new Map<string, number>(
  ITALY_STORY_ORDER.map((id, i) => [id, i]),
);

const ITALY_PREDECESSOR: Record<string, string | null> = {
  'giuoco-piano': null,
  'giuoco-pianissimo': 'giuoco-piano',
  'two-knights': 'giuoco-pianissimo',
  'evans-gambit': 'two-knights',
  'greco-counter-attack': 'two-knights',
};

/** Drill openingId for a kingdom (italian is the odd one out historically). */
export function openingIdForKingdom(kingdom: KingdomId): string {
  return kingdom;
}

export type StoryStatus = 'cleared' | 'available' | 'locked';

/**
 * A variation's place in the story. Cleared uses the S1 predicate
 * (≥1★ on every slot, both colors). Only Italy is frontier-gated in S2;
 * other kingdoms report 'available' (their internal order is S5).
 */
export function variationStoryStatus(
  state: ProgressState,
  kingdom: KingdomId,
  variationId: string,
): StoryStatus {
  if (variationCleared(state.moveProgress, variationId)) return 'cleared';
  if (kingdom !== 'italian') return 'available';
  const predecessor = ITALY_PREDECESSOR[variationId];
  if (predecessor === null || predecessor === undefined) return 'available';
  return variationCleared(state.moveProgress, predecessor) ? 'available' : 'locked';
}

/**
 * Scott's all-piece prestige tier for a variation (scope §8): the tier
 * the WHOLE opening has reached — every moved piece (operationalized as
 * the per-slot tiers of the main line) AND the unmoved pieces (the
 * openingProgress perfect-completion tiers, both sides) — i.e. the
 * minimum across all of them. Board prestige is NOT part of this.
 */
export function allPiecePrestigeTier(
  state: ProgressState,
  kingdom: KingdomId,
  variationId: string,
): number {
  const entry = (KINGDOM_VARIATION_SLOTS[kingdom] ?? []).find(
    (v) => v.variationId === variationId,
  );
  if (!entry || entry.slots.length === 0) return 0;
  const openingId = openingIdForKingdom(kingdom);
  let min = Infinity;
  for (const slot of entry.slots) {
    min = Math.min(min, state.moveProgress[slot.key]?.tier ?? 0);
  }
  for (const side of ['white', 'black'] as const) {
    const sideTier =
      state.openingProgress?.[`${openingId}:${variationId}:${side}`]?.tier ?? 0;
    min = Math.min(min, sideTier);
  }
  return min === Infinity ? 0 : min;
}

/**
 * The player's rating band, using the deviation system's own band map
 * (prestige 0–1 → 1200, 2 → 1600, 3–4 → 2000) over the player's best
 * all-piece tier anywhere. Stand-in until the parked personalization
 * work (scope §6) supplies a real hidden estimate — gate evaluation
 * takes the band as a value, so swapping the source changes nothing
 * downstream.
 */
export function playerRatingBand(state: ProgressState): 1200 | 1600 | 2000 {
  let best = 0;
  for (const kingdom of Object.keys(KINGDOM_VARIATION_SLOTS) as KingdomId[]) {
    for (const v of KINGDOM_VARIATION_SLOTS[kingdom] ?? []) {
      best = Math.max(best, allPiecePrestigeTier(state, kingdom, v.variationId));
    }
  }
  return best >= 3 ? 2000 : best === 2 ? 1600 : 1200;
}

/** Total stars earned inside a kingdom (all of its openings' keys). */
export function kingdomStars(state: ProgressState, kingdom: KingdomId): number {
  const openingIds = new Set(getKingdomDrills(kingdom).map((d) => d.openingId));
  let total = 0;
  for (const [key, p] of Object.entries(state.moveProgress)) {
    const openingId = key.split(':')[0];
    if (openingIds.has(openingId)) total += p.stars ?? 0;
  }
  return total;
}

/** Possible stars in a kingdom: 3 per drill move in the realm totals. */
export function kingdomStarsPossible(kingdom: KingdomId): number {
  return (REALM_TOTAL_MOVES[kingdom] ?? 0) * 3;
}

export type GateKind = 'deviation' | 'tactical';

/**
 * Default gate values (Scott approved the shape 2026-10-23; the numbers
 * are his to retune — they live here and only here). OR semantics: ANY
 * one signal trips the gate.
 */
export const GATE_DEFAULTS: Record<
  GateKind,
  { prestigeTier: number; kingdomStarsPct: number; ratingBand: number }
> = {
  deviation: { prestigeTier: 2, kingdomStarsPct: 0.4, ratingBand: 1600 },
  tactical: { prestigeTier: 3, kingdomStarsPct: 0.7, ratingBand: 2000 },
};

export interface GateSignals {
  prestige: boolean;
  kingdomStars: boolean;
  ratingBand: boolean;
  tripped: boolean;
}

/** Which of the three §8 signals trip a gate for one parent variation. */
export function gateSignals(
  state: ProgressState,
  kingdom: KingdomId,
  variationId: string,
  kind: GateKind,
): GateSignals {
  const t = GATE_DEFAULTS[kind];
  const possible = kingdomStarsPossible(kingdom);
  const signals = {
    prestige: allPiecePrestigeTier(state, kingdom, variationId) >= t.prestigeTier,
    kingdomStars:
      possible > 0 && kingdomStars(state, kingdom) / possible >= t.kingdomStarsPct,
    ratingBand: playerRatingBand(state) >= t.ratingBand,
  };
  return { ...signals, tripped: signals.prestige || signals.kingdomStars || signals.ratingBand };
}

export function gateTripped(
  state: ProgressState,
  kingdom: KingdomId,
  variationId: string,
  kind: GateKind,
): boolean {
  return gateSignals(state, kingdom, variationId, kind).tripped;
}

// ---------------------------------------------------------------------------
// The deviation/tactical thread (scope §8 hard constraint: linear, global,
// starts from the beginning regardless of the player's opening position).
// ---------------------------------------------------------------------------

export interface ThreadItem {
  packId: string;
  kingdom: KingdomId;
  /** The variation the lesson belongs to (a catalog tactic's own id for children). */
  variationId: string;
  /** The opening variation whose gate controls this item. */
  parentVariationId: string;
  kind: GateKind;
}

function buildThreadOrder(): ThreadItem[] {
  const items: ThreadItem[] = [];
  const packSet = new Set<string>(ALL_DRILL_FILE_IDS);
  const tacticalSet = new Set<string>(TACTICAL_FILE_IDS);
  for (const { kingdom } of KINGDOM_UNLOCK_ORDER) {
    const drills = getKingdomDrills(kingdom);
    if (drills.length === 0) continue;
    const ordered =
      kingdom === 'italian'
        ? [...drills].sort(
            (a, b) =>
              (ITALY_ORDER_INDEX.get(a.variationId) ?? 99) -
              (ITALY_ORDER_INDEX.get(b.variationId) ?? 99),
          )
        : drills;
    for (const d of ordered) {
      for (const band of [1200, 1600, 2000]) {
        const packId = `${d.variationId}-deviations-${band}`;
        if (packSet.has(packId)) {
          items.push({ packId, kingdom, variationId: d.variationId, parentVariationId: d.variationId, kind: 'deviation' });
        }
      }
      for (const suffix of ['-tacticals', '-black-tacticals', '-puzzles'] as const) {
        const packId = `${d.variationId}${suffix}`;
        if (tacticalSet.has(packId)) {
          items.push({ packId, kingdom, variationId: d.variationId, parentVariationId: d.variationId, kind: 'tactical' });
        }
      }
      for (const t of TACTICAL_VARIATIONS) {
        if (!t.parents.includes(d.variationId)) continue;
        const packId = `${t.packPrefix ?? t.id}-tacticals`;
        if (tacticalSet.has(packId)) {
          items.push({ packId, kingdom, variationId: t.id, parentVariationId: d.variationId, kind: 'tactical' });
        }
      }
    }
  }
  return items;
}

export const THREAD_ORDER: ThreadItem[] = buildThreadOrder();

/**
 * The next due thread lessons, strictly in thread order: an item is due
 * when its kind's gate has tripped for its parent variation and the pack
 * is not yet in completedPacks. The thread always starts from the
 * beginning — a player who speedran to Sicily still gets Italy's due
 * lessons first.
 */
export function dueThreadItems(state: ProgressState, limit = 5): ThreadItem[] {
  const completed = state.completedPacks ?? {};
  const due: ThreadItem[] = [];
  for (const item of THREAD_ORDER) {
    if (completed[item.packId]) continue;
    if (!gateTripped(state, item.kingdom, item.parentVariationId, item.kind)) continue;
    due.push(item);
    if (due.length >= limit) break;
  }
  return due;
}
