/**
 * Castle positions on the baked kingdom interior textures.
 *
 * Each kingdom (except scandinavian) has its own interior texture at
 * `public/atlas/interiors/<kingdom>.webp` with the castles baked in.
 * This file maps each opening's variationId to its castle's position
 * on that interior, in 0-100 normalized coordinates.
 *
 * Positions were derived from the baked art (2026-10-03). If Scott
 * re-bakes an interior with moved castles, update the coordinates here —
 * the texture files are drag-and-drop replaceable.
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
    { variationId: 'two-knights', x: 23.0, y: 16.5 }, // Castello di Fénis (NW, Alps)
    { variationId: 'giuoco-pianissimo', x: 36.0, y: 20.5 }, // Castello Sforzesco (N)
    { variationId: 'giuoco-piano', x: 51.3, y: 46.0 }, // Castel Sant'Angelo (center)
    { variationId: 'greco-counter-attack', x: 75.3, y: 54.1 }, // Castel del Monte (SE)
  ],
  sicilian: [
    { variationId: 'sicilian-najdorf', x: 27.3, y: 34.8 }, // La Zisa (Palermo, NW)
    { variationId: 'sicilian-sveshnikov', x: 47.7, y: 49.1 }, // Castello di Mussomeli (center)
    { variationId: 'sicilian-scheveningen', x: 66.9, y: 40.8 }, // Castello di Paternò (near Etna)
    { variationId: 'sicilian-classical', x: 78.9, y: 52.0 }, // Castello Ursino (Catania, E coast)
    { variationId: 'sicilian-dragon', x: 68.3, y: 73.5 }, // Castello di Donnafugata (S)
    { variationId: 'sicilian-kan', x: 88.2, y: 74.8 }, // Castello Maniace (Syracuse, SE tip)
  ],
  french: [
    { variationId: 'french-rubinstein', x: 46.2, y: 22.4 }, // Versailles (N)
    { variationId: 'french-advance', x: 45.6, y: 33.3 }, // Chambord (N-center)
    { variationId: 'french-tarrasch', x: 30.2, y: 35.7 }, // Villandry (W)
    { variationId: 'french-classical', x: 50.2, y: 39.3 }, // Chenonceau (center)
    { variationId: 'french-exchange', x: 34.2, y: 44.1 }, // Azay-le-Rideau (W-center)
    { variationId: 'french-winawer', x: 45.7, y: 75.1 }, // Carcassonne (S)
  ],
  germany: [
    { variationId: 'caro-kann-classical', x: 17.6, y: 36.0 }, // Burg Eltz (NW)
    { variationId: 'caro-kann-panov', x: 27.5, y: 55.4 }, // Heidelberg (W)
    { variationId: 'caro-kann-exchange', x: 57.4, y: 39.6 }, // Wartburg (N-center)
    { variationId: 'caro-kann-fantasy', x: 45.6, y: 67.3 }, // Hohenzollern (center-S)
    { variationId: 'caro-kann-advance', x: 63.6, y: 77.2 }, // Neuschwanstein (S, near Alps)
  ],
  dutch: [
    { variationId: 'dutch-leningrad', x: 48.6, y: 33.1 }, // Muiderslot (N)
    { variationId: 'dutch-classical', x: 56.1, y: 49.7 }, // De Haar (center)
    { variationId: 'dutch-stonewall', x: 84.8, y: 56.9 }, // Doorwerth (E)
  ],
  spanish: [
    { variationId: 'ruy-lopez-open', x: 60.7, y: 20.6 }, // Palace of Olite (N)
    { variationId: 'ruy-lopez-berlin', x: 43.1, y: 33.9 }, // Alcázar of Segovia (N-center)
    { variationId: 'ruy-lopez-morphy', x: 53.7, y: 52.0 }, // Alcázar of Toledo (center)
    { variationId: 'ruy-lopez-exchange', x: 47.9, y: 78.5 }, // Alhambra (S)
  ],
  english: [
    { variationId: 'english-four-knights', x: 49.6, y: 15.8 }, // Bamburgh (far N)
    { variationId: 'london-vs-kings-indian', x: 36.9, y: 45.1 }, // Hampton Court (W)
    { variationId: 'english-mikenas-carls', x: 55.1, y: 52.2 }, // Warwick (center)
    { variationId: 'london-system', x: 70.1, y: 54.2 }, // Tower of London (E-center)
    { variationId: 'english-main', x: 56.2, y: 59.3 }, // Windsor (center-S)
    { variationId: 'english-reversed-sicilian', x: 77.0, y: 64.0 }, // Leeds (SE)
    { variationId: 'london-vs-qgd', x: 89.3, y: 71.1 }, // Dover (far SE coast)
    { variationId: 'english-bremen', x: 64.2, y: 73.8 }, // Bodiam (S)
  ],
  queendom: [
    { variationId: 'queen-gambit-declined', x: 43.8, y: 25.3 }, // Prague Castle (N)
    { variationId: 'slav-defense', x: 30.5, y: 41.4 }, // Karlštejn (W)
    { variationId: 'queen-gambit-accepted', x: 33.7, y: 77.9 }, // Český Krumlov (S)
  ],
};
