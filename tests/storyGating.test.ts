import { describe, expect, it } from 'vitest';
import {
  isKingdomCleared,
  isVariationCleared,
  slotsForLine,
  type MoveSlot,
} from '../shared/progressRules';
import { reconcileUnlocks, type KingdomId } from '@/types';
import { KINGDOM_VARIATION_SLOTS } from '@/data/kingdomSlots';
import { buildUnlockGates, kingdomCleared, variationCleared } from '@/data/unlockGates';

type Progress = Record<string, { stars: number }>;

function fill(slots: readonly MoveSlot[], stars: number, into: Progress = {}): Progress {
  for (const slot of slots) into[slot.key] = { stars };
  return into;
}

function italySlots(): MoveSlot[] {
  return (KINGDOM_VARIATION_SLOTS.italian ?? []).flatMap((v) => v.slots);
}

describe('slotsForLine', () => {
  it('keys slots by global line index and alternates sides from White', () => {
    const slots = slotsForLine('italian', 'giuoco-piano', 4);
    expect(slots.map((s) => s.key)).toEqual([
      'italian:giuoco-piano:0',
      'italian:giuoco-piano:1',
      'italian:giuoco-piano:2',
      'italian:giuoco-piano:3',
    ]);
    expect(slots.map((s) => s.side)).toEqual(['white', 'black', 'white', 'black']);
  });

  it('alternates from Black for black-to-move lines', () => {
    const slots = slotsForLine('sicilian', 'sicilian-classical', 3, 'black');
    expect(slots.map((s) => s.side)).toEqual(['black', 'white', 'black']);
  });
});

describe('cleared predicates', () => {
  const slots = slotsForLine('italian', 'giuoco-piano', 4);

  it('variation cleared: every slot at >= 1 star, both colors', () => {
    expect(isVariationCleared(fill(slots, 1), slots)).toBe(true);
  });

  it('variation not cleared when any single slot is at 0 stars', () => {
    const progress = fill(slots, 2);
    progress['italian:giuoco-piano:3'] = { stars: 0 }; // a Black slot
    expect(isVariationCleared(progress, slots)).toBe(false);
  });

  it('variation not cleared when only one color has been played', () => {
    const whiteOnly = fill(slots.filter((s) => s.side === 'white'), 3);
    expect(isVariationCleared(whiteOnly, slots)).toBe(false);
  });

  it('kingdom standard is stricter: 1 star everywhere is not a kingdom clear', () => {
    expect(isVariationCleared(fill(slots, 1), slots, 1)).toBe(true);
    expect(isKingdomCleared(fill(slots, 1), [slots], 2)).toBe(false);
    expect(isKingdomCleared(fill(slots, 2), [slots], 2)).toBe(true);
  });

  it('empty slot sets are never vacuously cleared', () => {
    expect(isVariationCleared({}, [])).toBe(false);
    expect(isKingdomCleared({}, [])).toBe(false);
    expect(isKingdomCleared({}, [[]])).toBe(false);
  });
});

describe('generated Italy slots', () => {
  it('cover the four Italy variations with 85 slots partitioned by color', () => {
    const variations = KINGDOM_VARIATION_SLOTS.italian ?? [];
    expect(variations.map((v) => v.variationId)).toEqual([
      'giuoco-piano',
      'giuoco-pianissimo',
      'two-knights',
      'greco-counter-attack',
    ]);
    const slots = italySlots();
    expect(slots).toHaveLength(85);
    expect(slots.every((s) => s.key.startsWith('italian:'))).toBe(true);
    expect(slots.some((s) => s.side === 'white')).toBe(true);
    expect(slots.some((s) => s.side === 'black')).toBe(true);
  });
});

describe('story gating end-to-end (the old bug case)', () => {
  const startRegions = ['italian', 'wilderness', 'clearing', 'coaching'] as KingdomId[];

  it('does NOT unlock Spanish on raw stars alone when Italy is not cleared', () => {
    // The pre-Patch-43 bug: 8+ total stars anywhere opened Spain. Scatter
    // 30 stars across non-Italy keys and a partial Italy — Italy is not
    // cleared, so Spain must stay shut.
    const progress: Progress = {};
    for (let i = 0; i < 10; i++) progress[`spanish:ruy-lopez-berlin:${i}`] = { stars: 3 };
    fill(italySlots().slice(0, 20), 3, progress);
    const regions = reconcileUnlocks(startRegions, buildUnlockGates(progress));
    expect(regions).not.toContain('spanish');
    expect(kingdomCleared(progress, 'italian')).toBe(false);
  });

  it('unlocks Spanish when Italy is cleared at the kingdom standard', () => {
    const progress = fill(italySlots(), 2);
    expect(kingdomCleared(progress, 'italian')).toBe(true);
    expect(variationCleared(progress, 'giuoco-piano')).toBe(true);
    const regions = reconcileUnlocks(startRegions, buildUnlockGates(progress));
    expect(regions).toContain('spanish');
    // The chain stops there: Spain itself is not cleared, so France stays shut.
    expect(regions).not.toContain('french');
  });

  it('1 star everywhere in Italy is a variation clear but NOT a kingdom clear', () => {
    const progress = fill(italySlots(), 1);
    expect(variationCleared(progress, 'giuoco-piano')).toBe(true);
    expect(kingdomCleared(progress, 'italian')).toBe(false);
    const regions = reconcileUnlocks(startRegions, buildUnlockGates(progress));
    expect(regions).not.toContain('spanish');
  });
});
