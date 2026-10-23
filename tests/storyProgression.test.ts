// Story progression S2 (2026-10-23): Italy frontier-of-2, the §8
// expansion gates (rating tier / all-piece prestige / kingdom stars,
// OR semantics), and the global linear deviation+tactical thread.
import { describe, expect, it } from 'vitest';
import type { MoveProgress, ProgressState } from '@/types';
import { KINGDOM_VARIATION_SLOTS } from '@/data/kingdomSlots';
import {
  allPiecePrestigeTier,
  dueThreadItems,
  gateSignals,
  kingdomStars,
  playerRatingBand,
  THREAD_ORDER,
  variationStoryStatus,
} from '@/data/storyProgression';

const T = (stars: number, tier: number): MoveProgress =>
  ({ stars, tier, lastDrilled: 0, attempts: 1, streak: 0 }) as MoveProgress;

function emptyState(): ProgressState {
  return {
    totalStars: 0,
    moveProgress: {},
    prestigeStreak: 0,
    unlockedRegions: ['italian', 'wilderness', 'clearing', 'coaching'],
    drillMode: 'random',
    sideMode: 'both',
    openingProgress: {},
    tacticalProgress: {},
    completedPacks: {},
  };
}

/** Fill a variation's slots at uniform stars/tier and set its side tiers. */
function fillVariation(
  state: ProgressState,
  kingdom: 'italian',
  variationId: string,
  stars: number,
  tier: number,
): ProgressState {
  const next = { ...state, moveProgress: { ...state.moveProgress }, openingProgress: { ...state.openingProgress } };
  for (const v of KINGDOM_VARIATION_SLOTS[kingdom] ?? []) {
    if (v.variationId !== variationId) continue;
    for (const slot of v.slots) next.moveProgress[slot.key] = T(stars, tier);
  }
  for (const side of ['white', 'black'] as const) {
    next.openingProgress![`${kingdom}:${variationId}:${side}`] = {
      totalAttempts: 1,
      perfectStreak: tier,
      tier: tier as never,
      lastWatchAttempt: -1,
    };
  }
  return next;
}

describe('Italy frontier-of-2', () => {
  it('starts with only Giuoco Piano available', () => {
    const s = emptyState();
    expect(variationStoryStatus(s, 'italian', 'giuoco-piano')).toBe('available');
    expect(variationStoryStatus(s, 'italian', 'giuoco-pianissimo')).toBe('locked');
    expect(variationStoryStatus(s, 'italian', 'two-knights')).toBe('locked');
    expect(variationStoryStatus(s, 'italian', 'evans-gambit')).toBe('locked');
    expect(variationStoryStatus(s, 'italian', 'greco-counter-attack')).toBe('locked');
  });

  it('walks the chain and opens the Evans/Greco branch together (frontier of 2)', () => {
    let s = fillVariation(emptyState(), 'italian', 'giuoco-piano', 1, 0);
    expect(variationStoryStatus(s, 'italian', 'giuoco-piano')).toBe('cleared');
    expect(variationStoryStatus(s, 'italian', 'giuoco-pianissimo')).toBe('available');
    expect(variationStoryStatus(s, 'italian', 'evans-gambit')).toBe('locked');
    s = fillVariation(s, 'italian', 'giuoco-pianissimo', 1, 0);
    expect(variationStoryStatus(s, 'italian', 'two-knights')).toBe('available');
    s = fillVariation(s, 'italian', 'two-knights', 1, 0);
    expect(variationStoryStatus(s, 'italian', 'evans-gambit')).toBe('available');
    expect(variationStoryStatus(s, 'italian', 'greco-counter-attack')).toBe('available');
  });

  it('one unstarred slot keeps the variation (and its successors) uncleared', () => {
    let s = fillVariation(emptyState(), 'italian', 'giuoco-piano', 1, 0);
    s = { ...s, moveProgress: { ...s.moveProgress, 'italian:giuoco-piano:0': T(0, 0) } };
    expect(variationStoryStatus(s, 'italian', 'giuoco-piano')).toBe('available');
    expect(variationStoryStatus(s, 'italian', 'giuoco-pianissimo')).toBe('locked');
  });
});

describe('expansion gates (§8: any one signal trips)', () => {
  it('nothing is tripped for a fresh player', () => {
    const s = emptyState();
    expect(gateSignals(s, 'italian', 'giuoco-piano', 'deviation').tripped).toBe(false);
    expect(gateSignals(s, 'italian', 'giuoco-piano', 'tactical').tripped).toBe(false);
    expect(playerRatingBand(s)).toBe(1200);
  });

  it('all-piece prestige tier 2 trips deviations but not tactics', () => {
    const s = fillVariation(emptyState(), 'italian', 'giuoco-piano', 3, 2);
    expect(allPiecePrestigeTier(s, 'italian', 'giuoco-piano')).toBe(2);
    const dev = gateSignals(s, 'italian', 'giuoco-piano', 'deviation');
    expect(dev.prestige).toBe(true);
    expect(dev.tripped).toBe(true);
    expect(gateSignals(s, 'italian', 'giuoco-piano', 'tactical').tripped).toBe(false);
  });

  it('a single low piece holds the all-piece tier down (min semantics)', () => {
    let s = fillVariation(emptyState(), 'italian', 'giuoco-piano', 3, 3);
    s = { ...s, moveProgress: { ...s.moveProgress, 'italian:giuoco-piano:5': T(3, 1) } };
    expect(allPiecePrestigeTier(s, 'italian', 'giuoco-piano')).toBe(1);
  });

  it('kingdom stars trip the gate on their own (40% deviations / 70% tactics)', () => {
    // Italy possible = 183 moves * 3 = 549 stars. 220 stars = 40.07%.
    let s = emptyState();
    s = { ...s, moveProgress: { 'italian:giuoco-piano:0': T(3, 0) } };
    // Spread synthetic star keys across the kingdom (stars only, no tiers).
    const mp: Record<string, MoveProgress> = {};
    let remaining = 220;
    let i = 0;
    while (remaining > 0) {
      const stars = Math.min(3, remaining);
      mp[`italian:giuoco-pianissimo:${100 + i}`] = T(stars, 0);
      remaining -= stars;
      i++;
    }
    s = { ...s, moveProgress: { ...s.moveProgress, ...mp } };
    expect(kingdomStars(s, 'italian')).toBeGreaterThanOrEqual(220);
    const dev = gateSignals(s, 'italian', 'two-knights', 'deviation');
    expect(dev.kingdomStars).toBe(true);
    expect(dev.prestige).toBe(false);
    expect(dev.tripped).toBe(true);
    expect(gateSignals(s, 'italian', 'two-knights', 'tactical').kingdomStars).toBe(false);
  });

  it('the rating band signal is global: mastery anywhere raises the band everywhere', () => {
    const s = fillVariation(emptyState(), 'italian', 'giuoco-piano', 3, 3);
    expect(playerRatingBand(s)).toBe(2000);
    // Two Knights itself is untouched, yet its tactical gate trips via band.
    const tac = gateSignals(s, 'italian', 'two-knights', 'tactical');
    expect(tac.ratingBand).toBe(true);
    expect(tac.tripped).toBe(true);
  });
});

describe('the thread (linear, from the beginning)', () => {
  it('orders Italy first, Giuoco deviations (bands ascending) at the head', () => {
    expect(THREAD_ORDER.length).toBeGreaterThan(30);
    expect(THREAD_ORDER[0]).toMatchObject({ packId: 'giuoco-piano-deviations-1200', kind: 'deviation' });
    expect(THREAD_ORDER[1]).toMatchObject({ packId: 'giuoco-piano-deviations-1600' });
    expect(THREAD_ORDER[2]).toMatchObject({ packId: 'giuoco-piano-deviations-2000' });
    const firstSpanish = THREAD_ORDER.findIndex((t) => t.kingdom === 'spanish');
    const lastItalian = THREAD_ORDER.map((t) => t.kingdom).lastIndexOf('italian');
    expect(firstSpanish).toBeGreaterThan(lastItalian);
  });

  it('includes catalog tactic children under their parents (Traxler under Two Knights)', () => {
    const traxler = THREAD_ORDER.find((t) => t.packId === 'traxler-counter-attack-tacticals');
    expect(traxler).toMatchObject({ parentVariationId: 'two-knights', kind: 'tactical' });
  });

  it('nothing is due before any gate trips', () => {
    expect(dueThreadItems(emptyState())).toEqual([]);
  });

  it('due items serve in thread order and completed packs drop out', () => {
    const s = fillVariation(emptyState(), 'italian', 'giuoco-piano', 3, 2);
    const due = dueThreadItems(s, 3);
    expect(due.map((d) => d.packId)).toEqual([
      'giuoco-piano-deviations-1200',
      'giuoco-piano-deviations-1600',
      'giuoco-piano-deviations-2000',
    ]);
    const s2 = { ...s, completedPacks: { 'giuoco-piano-deviations-1200': true as const } };
    expect(dueThreadItems(s2, 1)[0].packId).toBe('giuoco-piano-deviations-1600');
  });
});
