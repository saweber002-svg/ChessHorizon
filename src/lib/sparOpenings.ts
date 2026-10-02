/**
 * The "start from an opening" catalog for the sparring board: every built-in
 * opening in the app, grouped by kingdom in atlas order.
 *
 * Built from the same sources the atlas and kingdom interiors use
 * (MAP_LOCATIONS + getKingdomDrills), so a new drill pack shows up here
 * automatically. Each entry's drillFileId is its `-main` pack; the pack's
 * first line is the SAN move list the sparring board preloads.
 */

import { MAP_LOCATIONS } from '@/data/mapLocations';
import { getKingdomDrills, kingdomHasDrills } from '@/data/kingdomDrills';

export interface SparOpeningOption {
  /** Drill pack id of the opening's main line, e.g. "traxler-counter-attack-main" */
  drillFileId: string;
  label: string;
}

export interface SparKingdomGroup {
  kingdomId: string;
  kingdomName: string;
  openings: SparOpeningOption[];
}

/** Built-in openings grouped by kingdom, in atlas order. */
export function builtinSparKingdoms(): SparKingdomGroup[] {
  return MAP_LOCATIONS.filter((loc) => kingdomHasDrills(loc.kingdom)).map((loc) => ({
    kingdomId: loc.kingdom,
    kingdomName: loc.name,
    openings: getKingdomDrills(loc.kingdom).map((d) => ({
      drillFileId: d.drillFileId,
      label: d.label,
    })),
  }));
}
