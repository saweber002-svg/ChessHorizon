import { describe, expect, it } from 'vitest';
import { progressReducer } from '@/contexts/ProgressContext';
import type { ProgressState } from '@/types';

const initialState: ProgressState = {
  totalStars: 0,
  moveProgress: {},
  prestigeStreak: 0,
  unlockedRegions: ['italian', 'wilderness', 'clearing', 'coaching'],
  drillMode: 'random',
  sideMode: 'both',
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
