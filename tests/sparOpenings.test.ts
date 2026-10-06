import { describe, expect, it } from 'vitest';
import { builtinSparKingdoms } from '@/lib/sparOpenings';
import { ALL_DRILL_FILE_IDS } from '@/data/drillRegistry';

describe('builtinSparKingdoms', () => {
  const groups = builtinSparKingdoms();

  it('covers the nine opening kingdoms in atlas order', () => {
    expect(groups.map((g) => g.kingdomId)).toEqual([
      'italian',
      'sicilian',
      'spanish',
      'english',
      'scandinavian',
      'queendom',
      'french',
      'dutch',
      'germany',
    ]);
  });

  it('includes every non-demoted built-in main-line pack exactly once (45 openings)', () => {
    const ids = groups.flatMap((g) => g.openings.map((o) => o.drillFileId));
    expect(ids).toHaveLength(45);
    expect(new Set(ids).size).toBe(45);
    expect(ids.every((id) => id.endsWith('-main'))).toBe(true);
    expect(ids.every((id) => ALL_DRILL_FILE_IDS.includes(id))).toBe(true);
  });

  it('gives every group a name and labelled openings', () => {
    for (const group of groups) {
      expect(group.kingdomName.length).toBeGreaterThan(0);
      expect(group.openings.length).toBeGreaterThan(0);
      for (const opening of group.openings) {
        expect(opening.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('files the remaining Italian lines under Italy (demoted tactics excluded)', () => {
    const italy = groups.find((g) => g.kingdomId === 'italian');
    const ids = italy?.openings.map((o) => o.drillFileId) ?? [];
    expect(ids).toContain('two-knights-main');
    expect(ids).toContain('giuoco-piano-main');
    // Reclassified as tactics: no interior node, no spar entry.
    expect(ids).not.toContain('traxler-counter-attack-main');
    expect(ids).not.toContain('fried-liver-attack-main');
    expect(ids).not.toContain('evans-gambit-main');
    expect(ids).not.toContain('ulvestad-variation-main');
    expect(ids).not.toContain('moeller-attack-main');
  });
});
