/**
 * Tactical packs preserved for future repair but excluded from production.
 *
 * These files remain in public/drill-data so their original content is recoverable.
 * Restore an ID only after the restoration contract in QUARANTINE.md is satisfied.
 */
export const QUARANTINED_TACTICAL_FILE_IDS = [
  'caro-kann-classical-tacticals',
  'dutch-leningrad-tacticals',
  'english-main-black-tacticals',
  'english-main-tacticals',
  'english-reversed-sicilian-black-tacticals',
  'evans-gambit-black-tacticals',
  'evans-gambit-tacticals',
  'french-advance-tacticals',
  'french-classical-tacticals',
  'french-winawer-tacticals',
  'fried-liver-attack-black-tacticals',
  'fried-liver-attack-tacticals',
  'giuoco-pianissimo-black-tacticals',
  'giuoco-pianissimo-tacticals',
  'giuoco-piano-black-tacticals',
  'giuoco-piano-tacticals',
  'greco-counter-attack-black-tacticals',
  'greco-counter-attack-tacticals',
  'london-system-black-tacticals',
  'london-system-tacticals',
  'london-vs-kings-indian-black-tacticals',
  'london-vs-kings-indian-tacticals',
  'london-vs-qgd-black-tacticals',
  'moeller-attack-black-tacticals',
  'moeller-attack-tacticals',
  'queen-gambit-accepted-tacticals',
  'queen-gambit-declined-tacticals',
  'ruy-lopez-berlin-black-tacticals',
  'ruy-lopez-exchange-black-tacticals',
  'ruy-lopez-exchange-tacticals',
  'ruy-lopez-morphy-black-tacticals',
  'ruy-lopez-open-black-tacticals',
  'ruy-lopez-open-tacticals',
  'scandinavian-defense-black-tacticals',
  'scandinavian-defense-tacticals',
  'scandinavian-nf6-black-tacticals',
  'scandinavian-nf6-tacticals',
  'scandinavian-qd6-black-tacticals',
  'scandinavian-qd6-tacticals',
  'sicilian-dragon-black-tacticals',
  'sicilian-kan-black-tacticals',
  'sicilian-kan-tacticals',
  'sicilian-najdorf-black-tacticals',
  'sicilian-najdorf-tacticals',
  'sicilian-scheveningen-black-tacticals',
  'sicilian-scheveningen-tacticals',
  'sicilian-sveshnikov-black-tacticals',
  'sicilian-sveshnikov-tacticals',
  'traxler-counter-attack-black-tacticals',
  'traxler-counter-attack-tacticals',
  'two-knights-black-tacticals',
  'two-knights-tacticals',
  'ulvestad-variation-black-tacticals',
  'ulvestad-variation-tacticals',
] as const;

export type QuarantinedTacticalFileId = (typeof QUARANTINED_TACTICAL_FILE_IDS)[number];

export function isQuarantinedTacticalFileId(id: string): boolean {
  return QUARANTINED_TACTICAL_FILE_IDS.includes(id as QuarantinedTacticalFileId);
}
