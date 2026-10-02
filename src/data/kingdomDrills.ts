import type { KingdomId } from '@/types';
import DRILLS from '@/data/drillRegistry';
import { ITALIAN_DRILL_VARIATIONS } from '@/data/mapLocations';

export interface KingdomDrill {
  /** Drill JSON file id without .json (e.g. "giuoco-piano-main") */
  drillFileId: string;
  /** Opening id used for progress keys */
  openingId: string;
  /** Variation id used for progress keys */
  variationId: string;
  label: string;
}

/**
 * Variations that the tactical catalog reclassifies as TACTICS rather than
 * standalone openings. Their drill packs stay in the registry (reachable via
 * the tactic selection flow), but they get no kingdom-interior node, no castle
 * marker, and no castle icon — tactics are a selection screen after completing
 * a parent opening drill, never atlas destinations of their own.
 */
export const DEMOTED_TACTIC_VARIATION_IDS: ReadonlySet<string> = new Set([
  'evans-gambit',
  'fried-liver-attack',
  'traxler-counter-attack',
  'ulvestad-variation',
  'moeller-attack',
  'dutch-staunton-gambit',
  'scandinavian-icelandic-gambit',
]);

/**
 * Every drillable opening inside a kingdom, in display order.
 * Mirrors the mapping previously embedded in KingdomPanel so the atlas panel
 * and the kingdom interior view stay in sync.
 */
export function getKingdomDrills(kingdom: KingdomId): KingdomDrill[] {
  if (kingdom === 'italian') {
    return ITALIAN_DRILL_VARIATIONS.filter((v) => !DEMOTED_TACTIC_VARIATION_IDS.has(v.variationId)).map((v) => ({
      drillFileId: v.drillFileId,
      openingId: 'italian',
      variationId: v.variationId,
      label: v.label,
    }));
  }

  const prefixFor = (k: KingdomId): string[] | null => {
    switch (k) {
      case 'queendom':
        return ['queen-', 'slav-', 'budapest-', 'blackmar-', 'london-'];
      case 'french':
        return ['french-'];
      case 'dutch':
        return ['dutch-'];
      // Drill file ids don't always match the kingdom's opening id:
      // Spain's packs are filed under ruy-lopez-*, Germany's Caro-Kann packs under caro-*.
      case 'spanish':
        return ['ruy-lopez-'];
      case 'germany':
        return ['caro-'];
      case 'wilderness':
      case 'clearing':
      case 'coaching':
        return null;
      default:
        return [`${k}-`];
    }
  };

  const prefixes = prefixFor(kingdom);
  if (!prefixes) return [];

  const openingId = kingdom;

  return DRILLS.filter(
    (d) =>
      d.id.endsWith('-main') &&
      !DEMOTED_TACTIC_VARIATION_IDS.has(d.id.replace(/-main$/, '')) &&
      prefixes.some((p) => d.id.startsWith(p))
  ).map((d) => ({
    drillFileId: d.id,
    openingId,
    variationId: d.id.replace(/-main$|-(tacticals|black-tacticals|puzzles)$/i, ''),
    label: d.label,
  }));
}

/** True for kingdoms that contain drillable openings (i.e. get an interior view). */
export function kingdomHasDrills(kingdom: KingdomId): boolean {
  return getKingdomDrills(kingdom).length > 0;
}
