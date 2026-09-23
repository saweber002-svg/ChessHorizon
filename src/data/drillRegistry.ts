import { isQuarantinedTacticalFileId } from './quarantinedTacticalRegistry';

/**
 * Production-visible drill files only. Invalid tactical packs are preserved in
 * public/drill-data but listed in quarantinedTacticalRegistry.ts instead.
 */
export const ALL_DRILL_FILE_IDS = [
  'caro-kann-advance-main',
  'caro-kann-advance-tacticals',
  'caro-kann-classical-main',
  'dutch-leningrad-main',
  'english-main-main',
  'english-reversed-sicilian-main',
  'english-reversed-sicilian-tacticals',
  'evans-gambit-main',
  'french-advance-main',
  'french-classical-main',
  'french-winawer-main',
  'fried-liver-attack-main',
  'german-berlin-tacticals',
  'giuoco-pianissimo-main',
  'giuoco-piano-main',
  'greco-counter-attack-main',
  'london-system-main',
  'london-vs-kings-indian-main',
  'london-vs-qgd-main',
  'london-vs-qgd-tacticals',
  'moeller-attack-main',
  'queen-gambit-accepted-main',
  'queen-gambit-declined-main',
  'ruy-lopez-berlin-main',
  'ruy-lopez-berlin-tacticals',
  'ruy-lopez-exchange-main',
  'ruy-lopez-morphy-main',
  'ruy-lopez-morphy-tacticals',
  'ruy-lopez-open-main',
  'scandinavian-defense-main',
  'scandinavian-nf6-main',
  'scandinavian-qd6-main',
  'sicilian-classical-black-tacticals',
  'sicilian-classical-main',
  'sicilian-classical-tacticals',
  'sicilian-dragon-main',
  'sicilian-dragon-tacticals',
  'sicilian-kan-main',
  'sicilian-najdorf-main',
  'sicilian-scheveningen-main',
  'sicilian-sveshnikov-main',
  'slav-defense-main',
  'slav-defense-tacticals',
  'traxler-counter-attack-main',
  'two-knights-main',
  'ulvestad-variation-main',
] as const;

function prettify(id: string) {
  return id
    .replace(/-main$|-(tacticals|black-tacticals)$/i, '')
    .replace(/-/g, ' ')
    .replace(/\b(\w)/g, (m) => m.toUpperCase());
}

export const DRILLS = ALL_DRILL_FILE_IDS.map((id) => ({ id, label: prettify(id) }));

export const MAIN_DRILLS = DRILLS.filter((d) => /-main$/.test(d.id));

/** Tactical variants that are safe to expose in the active product. */
export const TACTICAL_FILE_IDS: string[] = ALL_DRILL_FILE_IDS.filter(
  (id) => id.includes('-tacticals') && !isQuarantinedTacticalFileId(id)
);

export function hasTacticalDrills(variationId: string): boolean {
  const t1 = `${variationId}-tacticals`;
  const t2 = `${variationId}-black-tacticals`;
  return TACTICAL_FILE_IDS.includes(t1) || TACTICAL_FILE_IDS.includes(t2);
}

export default DRILLS;
