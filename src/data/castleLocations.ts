/**
 * Iconic real-world castles assigned to each drillable opening.
 *
 * Every opening in every drill kingdom gets one iconic castle from the
 * opening's home region, placed at the castle's TRUE geographic location on
 * the baked atlas (see latLngToMap below).
 */

/**
 * Minimum separation between castle markers, in map units (0-100 space).
 *
 * Kept just above the icon footprint (~1.9 units at the fitted interior
 * zoom) so icons never overlap at rest, but small enough that markers stay
 * near their true castle locations. A larger value (e.g. 5.0) shoves nodes
 * several map units away in dense kingdoms — Traxler was pushed 5+ units
 * north into the Alps — making them look misplaced.
 */
export const CASTLE_MIN_SEPARATION = 2.5;

/** Padding around the castle bounding box when fitting the interior camera. */
const FIT_PADDING = 0.35;

/** Maximum interior zoom (matches the previous fixed zoom). */
const MAX_ZOOM = 3.2;

export interface CastleLocation {
  /** Matches KingdomDrill.variationId, e.g. 'giuoco-piano'. */
  variationId: string;
  /** Iconic castle name, e.g. "Castel Sant'Angelo". */
  castle: string;
  /** Human-readable place, e.g. 'Rome, Italy'. */
  place: string;
  lat: number;
  lng: number;
}

export const CASTLE_LOCATIONS: CastleLocation[] = [
  // -- Italian kingdom: the Italian Game family --------------------------------
  // Coordinates verified 2026-09-29 against Wikipedia infoboxes / GPS sources.
  { variationId: 'giuoco-piano', castle: "Castel Sant'Angelo", place: 'Rome, Italy', lat: 41.9031, lng: 12.4663 },
  { variationId: 'giuoco-pianissimo', castle: 'Castello Sforzesco', place: 'Milan, Italy', lat: 45.47, lng: 9.1786 },
  { variationId: 'two-knights', castle: 'Castello di Fénis', place: 'Aosta Valley, Italy', lat: 45.7374, lng: 7.4896 },
  { variationId: 'greco-counter-attack', castle: 'Castel del Monte', place: 'Andria, Italy', lat: 41.0848, lng: 16.2709 },
  // -- Queendom: queen's-pawn openings ------------------------------------------
  { variationId: 'london-system', castle: 'Tower of London', place: 'London, England', lat: 51.5081, lng: -0.0761 },
  { variationId: 'london-vs-kings-indian', castle: 'Hampton Court Palace', place: 'London, England', lat: 51.4036, lng: -0.3378 },
  { variationId: 'london-vs-qgd', castle: 'Dover Castle', place: 'Kent, England', lat: 51.1296, lng: 1.3213 },
  { variationId: 'queen-gambit-accepted', castle: 'Český Krumlov Castle', place: 'Český Krumlov, Czechia', lat: 48.8125, lng: 14.3153 },
  { variationId: 'queen-gambit-declined', castle: 'Prague Castle', place: 'Prague, Czechia', lat: 50.0909, lng: 14.4005 },
  { variationId: 'slav-defense', castle: 'Karlštejn Castle', place: 'Karlštejn, Czechia', lat: 49.9408, lng: 14.1878 },
  // -- French kingdom ------------------------------------------------------------
  { variationId: 'french-advance', castle: 'Château de Chambord', place: 'Loire Valley, France', lat: 47.6161, lng: 1.5172 },
  { variationId: 'french-classical', castle: 'Château de Chenonceau', place: 'Loire Valley, France', lat: 47.3246, lng: 1.0704 },
  { variationId: 'french-winawer', castle: 'Cité de Carcassonne', place: 'Carcassonne, France', lat: 43.2066, lng: 2.364 },
  { variationId: 'french-tarrasch', castle: 'Château de Villandry', place: 'Loire Valley, France', lat: 47.3408, lng: 0.5156 },
  { variationId: 'french-exchange', castle: "Château d'Azay-le-Rideau", place: 'Loire Valley, France', lat: 47.2591, lng: 0.4659 },
  { variationId: 'french-rubinstein', castle: 'Palace of Versailles', place: 'Versailles, France', lat: 48.8049, lng: 2.1204 },
  // -- Dutch kingdom ---------------------------------------------------------------
  { variationId: 'dutch-leningrad', castle: 'Muiderslot', place: 'Muiden, Netherlands', lat: 52.3343, lng: 5.0714 },
  { variationId: 'dutch-classical', castle: 'De Haar Castle', place: 'Utrecht, Netherlands', lat: 52.1213, lng: 4.9172 },
  { variationId: 'dutch-stonewall', castle: 'Doorwerth Castle', place: 'Doorwerth, Netherlands', lat: 51.9776, lng: 5.5997 },
  // -- Spanish kingdom: Ruy Lopez ---------------------------------------------------
  { variationId: 'ruy-lopez-berlin', castle: 'Alcázar of Segovia', place: 'Segovia, Spain', lat: 40.9525, lng: -4.1325 },
  { variationId: 'ruy-lopez-exchange', castle: 'Alhambra', place: 'Granada, Spain', lat: 37.176, lng: -3.5883 },
  { variationId: 'ruy-lopez-morphy', castle: 'Alcázar of Toledo', place: 'Toledo, Spain', lat: 39.8581, lng: -4.0206 },
  { variationId: 'ruy-lopez-open', castle: 'Palace of Olite', place: 'Olite, Spain', lat: 42.4817, lng: -1.6494 },
  // -- German kingdom: Caro-Kann -------------------------------------------------------
  { variationId: 'caro-kann-advance', castle: 'Neuschwanstein Castle', place: 'Bavaria, Germany', lat: 47.5575, lng: 10.7494 },
  { variationId: 'caro-kann-classical', castle: 'Burg Eltz', place: 'Rhineland-Palatinate, Germany', lat: 50.2052, lng: 7.3365 },
  { variationId: 'caro-kann-panov', castle: 'Heidelberg Castle', place: 'Heidelberg, Germany', lat: 49.4107, lng: 8.7134 },
  { variationId: 'caro-kann-exchange', castle: 'Wartburg Castle', place: 'Eisenach, Germany', lat: 50.9662, lng: 10.3064 },
  { variationId: 'caro-kann-fantasy', castle: 'Hohenzollern Castle', place: 'Baden-Württemberg, Germany', lat: 48.3237, lng: 8.9675 },
  // -- Sicilian kingdom -----------------------------------------------------------------
  { variationId: 'sicilian-classical', castle: 'Castello Ursino', place: 'Catania, Sicily', lat: 37.4989, lng: 15.0847 },
  { variationId: 'sicilian-dragon', castle: 'Castello di Donnafugata', place: 'Ragusa, Sicily', lat: 36.8819, lng: 14.5636 },
  { variationId: 'sicilian-kan', castle: 'Castello Maniace', place: 'Syracuse, Sicily', lat: 37.0538, lng: 15.295 },
  { variationId: 'sicilian-najdorf', castle: 'La Zisa', place: 'Palermo, Sicily', lat: 38.1167, lng: 13.3414 },
  { variationId: 'sicilian-scheveningen', castle: 'Castello di Paternò', place: 'Paternò, Sicily', lat: 37.5653, lng: 14.8937 },
  { variationId: 'sicilian-sveshnikov', castle: 'Castello di Mussomeli', place: 'Mussomeli, Sicily', lat: 37.5775, lng: 13.7715 },
  // -- Scandinavian kingdom --------------------------------------------------------------
  { variationId: 'scandinavian-defense', castle: 'Kronborg Castle', place: 'Helsingør, Denmark', lat: 56.0386, lng: 12.6219 },
  { variationId: 'scandinavian-nf6', castle: 'Akershus Fortress', place: 'Oslo, Norway', lat: 59.9067, lng: 10.7364 },
  { variationId: 'scandinavian-qd6', castle: 'Kalmar Castle', place: 'Kalmar, Sweden', lat: 56.658, lng: 16.355 },
  // -- English kingdom ----------------------------------------------------------------------
  { variationId: 'english-main', castle: 'Windsor Castle', place: 'Windsor, England', lat: 51.4839, lng: -0.6044 },
  { variationId: 'english-reversed-sicilian', castle: 'Leeds Castle', place: 'Kent, England', lat: 51.2486, lng: 0.6301 },
  { variationId: 'english-four-knights', castle: 'Bamburgh Castle', place: 'Northumberland, England', lat: 55.6082, lng: -1.7116 },
  { variationId: 'english-mikenas-carls', castle: 'Warwick Castle', place: 'Warwick, England', lat: 52.2793, lng: -1.5852 },
  { variationId: 'english-bremen', castle: 'Bodiam Castle', place: 'East Sussex, England', lat: 51.0025, lng: 0.5436 },
];

export const CASTLE_BY_VARIATION: Record<string, CastleLocation> = Object.fromEntries(
  CASTLE_LOCATIONS.map((c) => [c.variationId, c]),
);

// =============================================================================
// Baked-atlas geo-referencing
// =============================================================================
//
// The atlas (public/atlas/atlas-map.webp, 1170x1023) is an Age of Exploration
// illustrated map. MAP_ASPECT is its width/height ratio; the SVG/div coordinate
// system uses x in 0-100 across the width and y in 0-MAP_H down the height,
// so the image renders undistorted. The affine fit below maps real lat/lng to
// file fractions, converted to this coordinate space.

export const MAP_ASPECT = 1170 / 1023;
export const MAP_H = 100 / MAP_ASPECT; // ~87.43
// Affine coefficients below were refit 2026-10-01 by least squares on 8 city
// anchors pin-pointed on this exact image (London, Paris, Madrid, Rome,
// Berlin, Vienna, Amsterdam, Copenhagen). Residuals: max 2.8 map units
// (Madrid, where the artwork stretches Iberia), most under 2.2 — plenty for
// castle markers (~4-5 units wide).

const GEO_AX = 0.017992;
const GEO_BX = 0.004097;
const GEO_CX = 0.126006;
const GEO_AY = 0.001307;
const GEO_BY = -0.020144;
const GEO_CY = 1.450545;

export interface MapPoint {
  /** 0-100 map space, matching KINGDOM_POSITIONS. */
  x: number;
  y: number;
}

/** True map-space position of a lat/lng on the baked atlas. */
export function latLngToMap(lat: number, lng: number): MapPoint {
  return {
    x: (GEO_AX * lng + GEO_BX * lat + GEO_CX) * 100,
    y: (GEO_AY * lng + GEO_BY * lat + GEO_CY) * MAP_H,
  };
}

/**
 * Deterministic de-collision: pushes markers apart until every pair is at
 * least `minDist` map units apart. Keeps markers near their true positions —
 * total displacement is minimal — while guaranteeing legible labels.
 */
export function declutterPositions(points: MapPoint[], minDist: number): MapPoint[] {
  const pts = points.map((p) => ({ ...p }));
  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const d = Math.hypot(dx, dy);
        if (d < minDist) {
          // Deterministic direction even for coincident points.
          const ux = d > 1e-9 ? dx / d : (i % 2 === 0 ? 1 : -1);
          const uy = d > 1e-9 ? dy / d : (j % 2 === 0 ? 1 : -1);
          const push = (minDist - d) / 2;
          pts[i].x -= ux * push;
          pts[i].y -= uy * push;
          pts[j].x += ux * push;
          pts[j].y += uy * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return pts;
}

export interface FitView {
  zoom: number;
  centerX: number;
  centerY: number;
}

/**
 * Camera fit for the interior view: centers on the castle bounding box and
 * zooms so every castle is visible (capped at MAX_ZOOM for the close-up feel).
 */
export function fitCastlesView(points: MapPoint[]): FitView {
  if (points.length === 0) return { zoom: MAX_ZOOM, centerX: 50, centerY: 50 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const w = Math.max(maxX - minX, 2);
  const h = Math.max(maxY - minY, 2);
  // Vertical span in screen space is h/MAP_ASPECT map-width units, so the
  // vertical fit allows a proportionally larger zoom.
  const zoom = Math.min(MAX_ZOOM, 100 / (w * (1 + FIT_PADDING)), (100 * MAP_ASPECT) / (h * (1 + FIT_PADDING)));
  return { zoom, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
}
