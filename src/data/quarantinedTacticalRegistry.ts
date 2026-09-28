/**
 * Tactical packs preserved for future repair but excluded from production.
 *
 * These files remain in public/drill-data so their original content is recoverable.
 * Restore an ID only after the restoration contract in QUARANTINE.md is satisfied.
 */
export const QUARANTINED_TACTICAL_FILE_IDS = [
  'caro-kann-classical-tacticals',
  'english-main-tacticals',
  'english-reversed-sicilian-black-tacticals',
  'evans-gambit-black-tacticals',
  'french-advance-tacticals',
  'french-classical-tacticals',
  'french-winawer-tacticals',
  'giuoco-pianissimo-black-tacticals',
  'giuoco-pianissimo-tacticals',
  'giuoco-piano-black-tacticals',
  'giuoco-piano-tacticals',
  'london-system-black-tacticals',
  'london-vs-kings-indian-black-tacticals',
  'london-vs-kings-indian-tacticals',
  'london-vs-qgd-black-tacticals',
  'queen-gambit-declined-tacticals',
  'ruy-lopez-exchange-black-tacticals',
  'ruy-lopez-exchange-tacticals',
  'ruy-lopez-morphy-black-tacticals',
  'ruy-lopez-open-tacticals',
  'scandinavian-defense-black-tacticals',
  'sicilian-kan-black-tacticals',
  'sicilian-kan-tacticals',
  'sicilian-najdorf-tacticals',
] as const;

export type QuarantinedTacticalFileId = (typeof QUARANTINED_TACTICAL_FILE_IDS)[number];

export function isQuarantinedTacticalFileId(id: string): boolean {
  return QUARANTINED_TACTICAL_FILE_IDS.includes(id as QuarantinedTacticalFileId);
}
