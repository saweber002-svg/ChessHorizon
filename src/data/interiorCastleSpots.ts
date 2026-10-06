/**
 * Castle positions on the baked kingdom interior textures.
 *
 * Each kingdom (except scandinavian) has its own interior texture at
 * `public/atlas/interiors/<kingdom>.webp` with the castles baked in.
 * This file maps each opening's variationId to its castle's position
 * on that interior, in 0-100 normalized coordinates.
 *
 * Positions derived from Scott's new interior art (2026-10-06). If Scott
 * re-bakes an interior with moved castles, update the coordinates here —
 * the texture files are drag-and-drop replaceable.
 *
 * NOTE: Germany's caro-kann-classical and caro-kann-advance are at TEMPORARY
 * positions — the new Germany art has no castles for them. Scott will send
 * updated art with the castles added; remap when it lands.
 */

import type { KingdomId } from '@/types';

export interface InteriorCastleSpot {
  variationId: string;
  /** 0-100 x on the interior texture. */
  x: number;
  /** 0-100 y on the interior texture. */
  y: number;
}

/** Interior texture URL for a kingdom, or null if it uses the main atlas. */
export const INTERIOR_TEXTURE_URL = (kingdom: KingdomId): string | null => {
  // Scandinavian has no baked interior; it falls back to the main atlas.
  if (kingdom === 'scandinavian') return null;
  return `${import.meta.env.BASE_URL}atlas/interiors/${kingdom}.webp`;
};

/**
 * Castle spots on the main atlas for kingdoms without a baked interior.
 * Currently only scandinavian. Positions are 0-100 on the 1170×1170 atlas.
 */
export const MAIN_ATLAS_CASTLE_SPOTS: InteriorCastleSpot[] = [
  { variationId: 'scandinavian-nf6', x: 53.5, y: 30.5 }, // Akershus (Oslo)
  { variationId: 'scandinavian-defense', x: 60.0, y: 33.5 }, // Kronborg (Danish strait)
  { variationId: 'scandinavian-qd6', x: 68.0, y: 28.5 }, // Kalmar (SE Sweden)
];

export const INTERIOR_CASTLE_SPOTS: Record<
  Exclude<KingdomId, 'scandinavian' | 'wilderness' | 'clearing' | 'coaching'>,
  InteriorCastleSpot[]
> = {
  italian: [
    { variationId: 'two-knights', x: 31.9, y: 31.2 }, // Castello di Fénis (NW, Alps)
    { variationId: 'giuoco-pianissimo', x: 41.5, y: 34.2 }, // Castello Sforzesco (N)
    { variationId: 'giuoco-piano', x: 50.9, y: 55.6 }, // Castel Sant'Angelo (center)
    { variationId: 'greco-counter-attack', x: 60.6, y: 61.3 }, // Castel del Monte (SE)
  ],
  sicilian: [
    { variationId: 'sicilian-najdorf', x: 27.2, y: 36.4 }, // La Zisa (Palermo, NW)
    { variationId: 'sicilian-sveshnikov', x: 36.7, y: 49.9 }, // Castello di Mussomeli (center)
    { variationId: 'sicilian-scheveningen', x: 50.4, y: 70.6 }, // Castello di Paternò (E)
    { variationId: 'sicilian-classical', x: 57.4, y: 52.8 }, // Castello Ursino (Catania, E coast)
    { variationId: 'sicilian-dragon', x: 50.7, y: 44.5 }, // Castello di Donnafugata (S)
    { variationId: 'sicilian-kan', x: 60.3, y: 72.5 }, // Castello Maniace (Syracuse, SE)
  ],
  french: [
    { variationId: 'french-rubinstein', x: 45.4, y: 21.6 }, // Versailles (N)
    { variationId: 'french-advance', x: 44.6, y: 32.8 }, // Chambord (N-center)
    { variationId: 'french-tarrasch', x: 31.9, y: 34.9 }, // Villandry (W)
    { variationId: 'french-classical', x: 49.2, y: 38.3 }, // Chenonceau (center)
    { variationId: 'french-exchange', x: 35.6, y: 42.2 }, // Azay-le-Rideau (W-center)
    { variationId: 'french-winawer', x: 46.1, y: 70.0 }, // Carcassonne (S)
  ],
  germany: [
    { variationId: 'caro-kann-classical', x: 18.0, y: 22.0 }, // Burg Eltz (NW, TEMPORARY - no castle in art)
    { variationId: 'caro-kann-panov', x: 36.5, y: 38.5 }, // Heidelberg (W-center)
    { variationId: 'caro-kann-exchange', x: 46.6, y: 29.1 }, // Wartburg (N)
    { variationId: 'caro-kann-fantasy', x: 41.0, y: 61.8 }, // Hohenzollern (center-S)
    { variationId: 'caro-kann-advance', x: 58.0, y: 82.0 }, // Neuschwanstein (S, TEMPORARY - no castle in art)
  ],
  dutch: [
    { variationId: 'dutch-leningrad', x: 44.4, y: 37.2 }, // Muiderslot (N)
    { variationId: 'dutch-classical', x: 48.5, y: 52.0 }, // De Haar (center)
    { variationId: 'dutch-stonewall', x: 63.6, y: 58.6 }, // Doorwerth (E)
  ],
  spanish: [
    { variationId: 'ruy-lopez-open', x: 59.2, y: 22.2 }, // Palace of Olite (N)
    { variationId: 'ruy-lopez-berlin', x: 47.4, y: 33.6 }, // Alcázar of Segovia (N-center)
    { variationId: 'ruy-lopez-morphy', x: 53.7, y: 47.1 }, // Alcázar of Toledo (center)
    { variationId: 'ruy-lopez-exchange', x: 50.2, y: 66.3 }, // Alhambra (S)
  ],
  english: [
    { variationId: 'english-four-knights', x: 53.7, y: 11.9 }, // Bamburgh (far N)
    { variationId: 'english-kings-fianchetto', x: 37.8, y: 35.5 }, // Alnwick (N-center)
    { variationId: 'london-vs-kings-indian', x: 20.4, y: 49.8 }, // Hampton Court (W)
    { variationId: 'english-mikenas-carls', x: 48.2, y: 41.0 }, // Warwick (center)
    { variationId: 'london-system', x: 62.5, y: 50.9 }, // Tower of London (E-center)
    { variationId: 'english-agincourt', x: 59.5, y: 43.2 }, // Kenilworth (center-E)
    { variationId: 'english-main', x: 49.4, y: 47.2 }, // Windsor (center-S)
    { variationId: 'english-reversed-sicilian', x: 67.4, y: 42.7 }, // Leeds (SE)
    { variationId: 'english-reti', x: 76.2, y: 54.3 }, // Pevensey (SE coast)
    { variationId: 'london-vs-qgd', x: 84.0, y: 60.0 }, // Dover (far SE coast, estimated)
    { variationId: 'english-bremen', x: 57.6, y: 56.1 }, // Bodiam (S)
  ],
  queendom: [
    { variationId: 'queen-gambit-declined', x: 43.8, y: 25.3 }, // Prague Castle (N)
    { variationId: 'slav-defense', x: 30.5, y: 41.4 }, // Karlštejn (W)
    { variationId: 'queen-gambit-accepted', x: 33.7, y: 77.9 }, // Český Krumlov (S)
  ],
};
