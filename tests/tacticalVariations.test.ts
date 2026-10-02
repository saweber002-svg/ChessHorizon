import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { MAIN_DRILLS } from '@/data/drillRegistry';
import {
  TACTICAL_VARIATIONS,
  getTacticalVariation,
  isTacticUnlocked,
  tacticsListedUnder,
  unlockedTacticsUnder,
  lockedTacticsUnder,
  orphanTactics,
} from '@/data/tacticalVariations';

const OPENING_IDS = new Set(MAIN_DRILLS.map((d) => d.id.replace(/-main$/, '')));
const TACTIC_IDS = new Set(TACTICAL_VARIATIONS.map((t) => t.id));

describe('tacticalVariations data integrity', () => {
  it('registers the full approved catalog (42 parented + 3 orphans + 6 Slice-G deviations)', () => {
    expect(TACTICAL_VARIATIONS).toHaveLength(51);
    expect(orphanTactics().map((t) => t.id).sort()).toEqual([
      'cochrane-gambit',
      'halloween-gambit',
      'stafford-gambit',
    ]);
  });

  it('has unique ids and valid fields', () => {
    expect(TACTIC_IDS.size).toBe(TACTICAL_VARIATIONS.length);
    for (const t of TACTICAL_VARIATIONS) {
      expect([1, 2, 3]).toContain(t.gateTier);
      expect(['w', 'b']).toContain(t.executingColor);
      expect(t.line.length).toBeGreaterThan(0);
      expect(t.name.length).toBeGreaterThan(0);
    }
  });

  it('every registered line is chess.js-legal from the initial position', () => {
    for (const t of TACTICAL_VARIATIONS) {
      const chess = new Chess();
      for (const san of t.line) {
        expect(() => chess.move(san), `${t.id}: ${san}`).not.toThrow();
      }
    }
  });

  it('every parent resolves to a catalog opening or another tactic', () => {
    for (const t of TACTICAL_VARIATIONS) {
      for (const parent of t.parents) {
        expect(
          OPENING_IDS.has(parent) || TACTIC_IDS.has(parent),
          `${t.id} -> ${parent}`
        ).toBe(true);
      }
    }
  });

  it('sub-traps hang under their parent tactic', () => {
    expect(getTacticalVariation('magnus-smith-trap')?.parents).toEqual(['smith-morra-gambit']);
    expect(getTacticalVariation('lasker-trap')?.parents).toEqual(['albin-countergambit']);
  });
});

describe('tactic gating', () => {
  it('tier 0 (Locked) unlocks nothing; gates open at their tier', () => {
    const jerome = getTacticalVariation('jerome-gambit')!;
    const milnerBarry = getTacticalVariation('milner-barry-gambit')!;
    const evans = getTacticalVariation('evans-gambit')!;
    expect(isTacticUnlocked(jerome, 0)).toBe(false);
    expect(isTacticUnlocked(jerome, 1)).toBe(true);
    expect(isTacticUnlocked(milnerBarry, 1)).toBe(false);
    expect(isTacticUnlocked(milnerBarry, 2)).toBe(true);
    expect(isTacticUnlocked(evans, 2)).toBe(false);
    expect(isTacticUnlocked(evans, 3)).toBe(true);
    expect(isTacticUnlocked(evans, 4)).toBe(true);
  });

  it('gates are per executing color: White prestige never unlocks Black tactics', () => {
    // Two Knights: Fried Liver + Max Lange execute as White; Traxler +
    // Ulvestad execute as Black. White at Journeyman, Black Locked.
    const unlocked = unlockedTacticsUnder('two-knights', 3, 0).map((t) => t.id);
    expect(unlocked).toContain('fried-liver-attack');
    expect(unlocked).toContain('max-lange-attack');
    expect(unlocked).not.toContain('traxler-counter-attack');
    expect(unlocked).not.toContain('ulvestad-variation');
    const locked = lockedTacticsUnder('two-knights', 3, 0).map((t) => t.id);
    expect(locked).toContain('traxler-counter-attack');
    // And the mirror: Black at Journeyman, White Locked.
    const mirror = unlockedTacticsUnder('two-knights', 0, 3).map((t) => t.id);
    expect(mirror).toContain('traxler-counter-attack');
    expect(mirror).not.toContain('fried-liver-attack');
  });

  it('club tactics open at Novice under their parent', () => {
    const unlocked = unlockedTacticsUnder('giuoco-piano', 1, 1).map((t) => t.id);
    expect(unlocked).toContain('jerome-gambit');
    expect(unlocked).toContain('blackburne-shilling-gambit');
    expect(unlocked).not.toContain('evans-gambit'); // Journeyman gate
    expect(unlocked).not.toContain('moeller-attack'); // Journeyman gate
  });

  it('multi-parent tactics are listed under every relevant opening', () => {
    for (const parent of [
      'giuoco-piano',
      'giuoco-pianissimo',
      'ruy-lopez-morphy',
      'ruy-lopez-berlin',
      'ruy-lopez-exchange',
      'ruy-lopez-open',
      'two-knights',
    ]) {
      expect(tacticsListedUnder(parent).map((t) => t.id)).toContain('danish-gambit');
    }
    for (const parent of [
      'sicilian-classical',
      'sicilian-dragon',
      'sicilian-kan',
      'sicilian-najdorf',
      'sicilian-scheveningen',
      'sicilian-sveshnikov',
    ]) {
      const ids = tacticsListedUnder(parent).map((t) => t.id);
      expect(ids).toContain('wing-gambit');
      expect(ids).toContain('smith-morra-gambit');
    }
  });

  it('orphans are listed under no opening', () => {
    for (const openingId of OPENING_IDS) {
      const ids = tacticsListedUnder(openingId).map((t) => t.id);
      expect(ids).not.toContain('stafford-gambit');
      expect(ids).not.toContain('cochrane-gambit');
      expect(ids).not.toContain('halloween-gambit');
    }
  });
});

describe('tactic selection helpers', () => {
  it('prestigeSourceVariationId walks through tactic parents to the opening', async () => {
    const { prestigeSourceVariationId, GATE_TIER_NAMES } = await import('@/data/tacticalVariations');
    // Sub-tactic -> parent tactic -> opening
    expect(prestigeSourceVariationId('fried-liver-bb3-deviation')).toBe('two-knights');
    expect(prestigeSourceVariationId('ulvestad-cxd4-deviation')).toBe('two-knights');
    // Tactic -> opening (single step)
    expect(prestigeSourceVariationId('traxler-counter-attack')).toBe('two-knights');
    // Opening -> itself
    expect(prestigeSourceVariationId('two-knights')).toBe('two-knights');
    expect(prestigeSourceVariationId('giuoco-piano')).toBe('giuoco-piano');
    // Tier names
    expect(GATE_TIER_NAMES[1]).toBe('Novice');
    expect(GATE_TIER_NAMES[2]).toBe('Apprentice');
    expect(GATE_TIER_NAMES[3]).toBe('Journeyman');
  });

  it('demoted tactics are listed under their parent openings', async () => {
    const { tacticsListedUnder } = await import('@/data/tacticalVariations');
    const twoKnights = tacticsListedUnder('two-knights').map((t) => t.id);
    expect(twoKnights).toContain('traxler-counter-attack');
    expect(twoKnights).toContain('fried-liver-attack');
    expect(twoKnights).toContain('ulvestad-variation');
    expect(twoKnights).toContain('max-lange-attack');
    const giuoco = tacticsListedUnder('giuoco-piano').map((t) => t.id);
    expect(giuoco).toContain('evans-gambit');
    expect(giuoco).toContain('moeller-attack');
  });
});
