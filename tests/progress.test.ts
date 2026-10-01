import { describe, expect, it } from 'vitest';
import { progressReducer } from '@/contexts/ProgressContext';
import { reconcileUnlocks } from '@/types';
import type { KingdomId, ProgressState } from '@/types';

const initialState: ProgressState = {
  totalStars: 0,
  moveProgress: {},
  prestigeStreak: 0,
  unlockedRegions: ['italian', 'wilderness', 'clearing', 'coaching'],
  drillMode: 'random',
  sideMode: 'both',
  openingProgress: {},
  tacticalProgress: {},
};

describe('progress reducer', () => {
  it('records stars, attempts, streak, and tier state', () => {
    const once = progressReducer(initialState, {
      type: 'RECORD_DRILL',
      key: 'italian:giuoco-piano:0',
      stars: 3,
    });
    const twice = progressReducer(once, {
      type: 'RECORD_DRILL',
      key: 'italian:giuoco-piano:0',
      stars: 3,
    });

    expect(twice.totalStars).toBe(3);
    expect(twice.moveProgress['italian:giuoco-piano:0']).toMatchObject({
      stars: 3,
      attempts: 2,
      streak: 2,
      tier: 1,
    });
    expect(twice.prestigeStreak).toBe(2);
  });

  it('resets a move streak after a sub-three-star result while retaining best stars', () => {
    const mastered = progressReducer(initialState, {
      type: 'RECORD_DRILL',
      key: 'move-1',
      stars: 3,
    });
    const failed = progressReducer(mastered, {
      type: 'RECORD_DRILL',
      key: 'move-1',
      stars: 1,
    });

    expect(failed.moveProgress['move-1']).toMatchObject({
      stars: 3,
      attempts: 2,
      streak: 0,
      tier: 0,
    });
    expect(failed.prestigeStreak).toBe(2);
  });

  it('unlocks the next kingdom only after threshold and prerequisite conditions', () => {
    const withEightStars = progressReducer({
      ...initialState,
      moveProgress: {
        a: { stars: 3, tier: 1, lastDrilled: 1, attempts: 1, streak: 1 },
        b: { stars: 3, tier: 1, lastDrilled: 1, attempts: 1, streak: 1 },
        c: { stars: 2, tier: 1, lastDrilled: 1, attempts: 1, streak: 1 },
      },
    }, { type: 'RECORD_DRILL', key: 'unlocking', stars: 0 });

    expect(withEightStars.totalStars).toBe(8);
    expect(withEightStars.unlockedRegions).toContain('spanish');
    expect(withEightStars.unlockedRegions).not.toContain('french');
  });

  it('changes drill and side modes and resets cleanly', () => {
    const changed = progressReducer(initialState, { type: 'SET_DRILL_MODE', mode: 'in-order' });
    const sided = progressReducer(changed, { type: 'SET_SIDE_MODE', mode: 'black' });
    const reset = progressReducer(sided, { type: 'RESET_PROGRESS' });

    expect(sided).toMatchObject({ drillMode: 'in-order', sideMode: 'black' });
    expect(reset).toEqual(initialState);
  });
});

describe('kingdom unlock reconciliation', () => {
  // Regression: saves created before Scandinavia joined KINGDOM_UNLOCK_ORDER
  // showed it locked even with 18+ stars, because unlocks were only evaluated
  // when a drill was recorded. Reconciliation also runs on load.
  const staleRegions = [
    'italian', 'spanish', 'french', 'germany', 'sicilian',
    'english', 'dutch', 'wilderness', 'clearing', 'coaching',
  ] as KingdomId[];

  const eighteenStars = Object.fromEntries(
    ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => [
      k, { stars: 3, tier: 1, lastDrilled: 1, attempts: 1, streak: 1 },
    ]),
  );

  it('unlocks Scandinavia for a stale save that already earned 18 stars', () => {
    const regions = reconcileUnlocks(staleRegions, 18);
    expect(regions).toContain('scandinavian');
    // Queendom needs 20 stars, so it stays locked at 18.
    expect(regions).not.toContain('queendom');
  });

  it('keeps Scandinavia locked below its 18-star threshold', () => {
    expect(reconcileUnlocks(staleRegions, 17)).not.toContain('scandinavian');
  });

  it('is idempotent and never duplicates regions', () => {
    const once = reconcileUnlocks(staleRegions, 25);
    const twice = reconcileUnlocks(once, 25);
    expect(twice).toEqual(once);
    expect(twice.filter((r) => r === 'scandinavian')).toHaveLength(1);
  });

  it('grants Scandinavia on the next drill for a stale in-memory state', () => {
    const stale: ProgressState = {
      ...initialState,
      totalStars: 18,
      unlockedRegions: [...staleRegions],
      moveProgress: eighteenStars as ProgressState['moveProgress'],
    };
    const next = progressReducer(stale, { type: 'RECORD_DRILL', key: 'dutch:main:0', stars: 0 });
    expect(next.totalStars).toBe(18);
    expect(next.unlockedRegions).toContain('scandinavian');
  });
});

describe('opening and tactical progress', () => {
  it('tracks perfect-completion streaks and tiers per opening and side', () => {
    const key = 'italian:giuoco-piano:white';
    const once = progressReducer(initialState, {
      type: 'RECORD_OPENING_COMPLETION',
      key,
      isPerfect: true,
    });
    expect(once.openingProgress?.[key]).toMatchObject({
      totalAttempts: 1,
      perfectStreak: 1,
      tier: 1,
      lastWatchAttempt: -1,
    });

    let s = once;
    for (let i = 0; i < 2; i++) {
      s = progressReducer(s, { type: 'RECORD_OPENING_COMPLETION', key, isPerfect: true });
    }
    expect(s.openingProgress?.[key]?.tier).toBe(2);

    const imperfect = progressReducer(s, {
      type: 'RECORD_OPENING_COMPLETION',
      key,
      isPerfect: false,
    });
    expect(imperfect.openingProgress?.[key]).toMatchObject({
      totalAttempts: 4,
      perfectStreak: 0,
      tier: 0,
    });
  });

  it('keeps opening progress independent per side', () => {
    const w = progressReducer(initialState, {
      type: 'RECORD_OPENING_COMPLETION',
      key: 'italian:giuoco-piano:white',
      isPerfect: true,
    });
    const b = progressReducer(w, {
      type: 'RECORD_OPENING_COMPLETION',
      key: 'italian:giuoco-piano:black',
      isPerfect: true,
    });
    expect(b.openingProgress?.['italian:giuoco-piano:white']?.perfectStreak).toBe(1);
    expect(b.openingProgress?.['italian:giuoco-piano:black']?.perfectStreak).toBe(1);
  });

  it('tracks tactical completions per tactic line with identical gating', () => {
    const key = 'italian:giuoco-piano:giuoco-piano-tacticals-t0';
    let s = initialState;
    for (let i = 0; i < 5; i++) {
      s = progressReducer(s, { type: 'RECORD_TACTICAL_COMPLETION', key, isPerfect: true });
    }
    expect(s.tacticalProgress?.[key]).toMatchObject({
      totalAttempts: 5,
      perfectStreak: 5,
      tier: 3,
    });
    s = progressReducer(s, { type: 'RECORD_TACTICAL_COMPLETION', key, isPerfect: false });
    expect(s.tacticalProgress?.[key]?.tier).toBe(0);
    expect(s.tacticalProgress?.[key]?.totalAttempts).toBe(6);
  });

  it('consumes a local watch only when the quota allows', () => {
    const key = 'italian:giuoco-piano:white';
    // Fresh tier-0 progress: 1 attempt required since the last watch, and
    // lastWatchAttempt starts at -1, so the first watch is available.
    const consumed = progressReducer(initialState, { type: 'CONSUME_WATCH', key });
    expect(consumed.openingProgress?.[key]?.lastWatchAttempt).toBe(0);
    // Immediately again: 0 attempts since the last watch -> refused, state untouched.
    const again = progressReducer(consumed, { type: 'CONSUME_WATCH', key });
    expect(again).toBe(consumed);
    // After one more drill attempt, the quota is earned again.
    const attempted = progressReducer(consumed, {
      type: 'RECORD_OPENING_COMPLETION',
      key,
      isPerfect: false,
    });
    const reconsumed = progressReducer(attempted, { type: 'CONSUME_WATCH', key });
    expect(reconsumed.openingProgress?.[key]?.lastWatchAttempt).toBe(1);
  });
});
