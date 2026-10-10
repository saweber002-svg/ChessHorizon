/**
 * Castle positions on the baked kingdom interior textures.
 *
 * Each kingdom has its own interior texture at
 * `public/atlas/interiors/<kingdom>.webp` with the castles baked in.
 * This file maps each opening's variationId to its castle's position
 * on that interior, in 0-100 normalized coordinates.
 *
 * Positions derived from Scott's interior art pass 2 (2026-10-10). If Scott
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

/** Interior texture URL for a kingdom. */
export const INTERIOR_TEXTURE_URL = (kingdom: KingdomId): string | null => {
  // Wilderness, clearing, and coaching use the main atlas, not interiors.
  if (kingdom === 'wilderness' || kingdom === 'clearing' || kingdom === 'coaching') return null;
  return `${import.meta.env.BASE_URL}atlas/interiors/${kingdom}.webp`;
};

export const INTERIOR_CASTLE_SPOTS: Record<
  Exclude<KingdomId, 'wilderness' | 'clearing' | 'coaching'>,
  InteriorCastleSpot[]
> = {
  italian: [
    { variationId: 'two-knights', x: 27.1, y: 19.4 }, // Castello di Fénis (NW, Alps)
    { variationId: 'giuoco-pianissimo', x: 36.8, y: 23.5 }, // Castello Sforzesco (N)
    { variationId: 'giuoco-piano', x: 49.5, y: 45.8 }, // Castel Sant'Angelo (center)
    { variationId: 'greco-counter-attack', x: 69.6, y: 53.8 }, // Castel del Monte (SE)
  ],
  sicilian: [
    { variationId: 'sicilian-najdorf', x: 27.8, y: 36.2 }, // La Zisa (Palermo, NW)
    { variationId: 'sicilian-sveshnikov', x: 47.3, y: 52.4 }, // Castello di Mussomeli (center)
    { variationId: 'sicilian-scheveningen', x: 61.3, y: 49.2 }, // Castello di Paternò (near Etna)
    { variationId: 'sicilian-classical', x: 70.6, y: 55.2 }, // Castello Ursino (Catania, E coast)
    { variationId: 'sicilian-dragon', x: 61.0, y: 69.8 }, // Castello di Donnafugata (S)
    { variationId: 'sicilian-kan', x: 78.8, y: 73.2 }, // Castello Maniace (Syracuse, SE)
  ],
  french: [
    { variationId: 'french-rubinstein', x: 47.5, y: 30.5 }, // Versailles (N)
    { variationId: 'french-advance', x: 47.0, y: 41.5 }, // Chambord (N-center)
    { variationId: 'french-tarrasch', x: 32.2, y: 43.8 }, // Villandry (W)
    { variationId: 'french-classical', x: 49.8, y: 47.0 }, // Chenonceau (center)
    { variationId: 'french-exchange', x: 36.5, y: 51.3 }, // Azay-le-Rideau (W-center)
    { variationId: 'french-winawer', x: 46.4, y: 77.3 }, // Carcassonne (S)
  ],
  germany: [
    { variationId: 'caro-kann-exchange', x: 59.0, y: 41.2 }, // Wartburg (N-center)
    { variationId: 'caro-kann-panov', x: 30.5, y: 54.4 }, // Heidelberg (W)
    { variationId: 'caro-kann-fantasy', x: 46.2, y: 65.4 }, // Hohenzollern (center-S)
    { variationId: 'caro-kann-classical', x: 20.2, y: 38.6 }, // Burg Eltz (W)
    { variationId: 'caro-kann-advance', x: 64.3, y: 74.2 }, // Neuschwanstein (S)
  ],
  dutch: [
    { variationId: 'dutch-leningrad', x: 42.6, y: 33.8 }, // Muiderslot (N)
    { variationId: 'dutch-classical', x: 51.2, y: 46.5 }, // De Haar (center)
    { variationId: 'dutch-stonewall', x: 72.4, y: 54.8 }, // Doorwerth (E)
  ],
  spanish: [
    { variationId: 'ruy-lopez-open', x: 57.5, y: 20.0 }, // Palace of Olite (N)
    { variationId: 'ruy-lopez-berlin', x: 43.0, y: 32.5 }, // Alcázar of Segovia (N-center)
    { variationId: 'ruy-lopez-morphy', x: 53.2, y: 49.4 }, // Alcázar of Toledo (center)
    { variationId: 'ruy-lopez-exchange', x: 48.9, y: 70.7 }, // Alhambra (S)
  ],
  english: [
    { variationId: 'english-four-knights', x: 62.1, y: 31.8 }, // Bamburgh (far N)
    { variationId: 'english-kings-fianchetto', x: 57.0, y: 30.0 }, // Alnwick (N)
    { variationId: 'london-vs-kings-indian', x: 60.9, y: 65.9 }, // Hampton Court (W)
    { variationId: 'english-mikenas-carls', x: 51.0, y: 55.2 }, // Warwick (center)
    { variationId: 'english-agincourt', x: 50.0, y: 53.7 }, // Kenilworth (center)
    { variationId: 'english-main', x: 62.5, y: 61.1 }, // Windsor (center-S)
    { variationId: 'london-system', x: 71.2, y: 63.0 }, // Tower of London (E)
    { variationId: 'english-reversed-sicilian', x: 75.8, y: 69.8 }, // Leeds (SE)
    { variationId: 'english-bremen', x: 65.4, y: 74.8 }, // Bodiam (S)
    { variationId: 'english-reti', x: 64.5, y: 73.0 }, // Pevensey (SE coast)
    { variationId: 'london-vs-qgd', x: 81.8, y: 74.1 }, // Dover (SE coast)
  ],
  scandinavian: [
    { variationId: 'scandinavian-nf6', x: 39.8, y: 60.2 }, // Akershus (Oslo, W)
    { variationId: 'scandinavian-defense', x: 35.3, y: 80.1 }, // Kronborg (Denmark, S)
    { variationId: 'scandinavian-qd6', x: 70.2, y: 74.9 }, // Kalmar (Sweden, E)
  ],
  queendom: [
    { variationId: 'queen-gambit-declined', x: 46.4, y: 27.3 }, // Prague Castle (N)
    { variationId: 'slav-defense', x: 34.2, y: 39.4 }, // Karlštejn (W)
    { variationId: 'queen-gambit-accepted', x: 39.8, y: 69.4 }, // Český Krumlov (S)
  ],
};
