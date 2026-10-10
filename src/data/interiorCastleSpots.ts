/**
 * Castle positions on the baked kingdom interior textures.
 *
 * Each kingdom has its own interior texture at
 * `public/atlas/interiors/<kingdom>.webp` with the castles baked in.
 * This file maps each opening's variationId to its castle's position
 * on that interior, in 0-100 normalized coordinates.
 *
 * Positions derived from Scott's new interior art (2026-10-09). If Scott
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
    { variationId: 'two-knights', x: 29.5, y: 21.5 }, // Castello di Fénis (NW, Alps)
    { variationId: 'giuoco-pianissimo', x: 39.2, y: 24.7 }, // Castello Sforzesco (N)
    { variationId: 'giuoco-piano', x: 50.2, y: 49.7 }, // Castel Sant'Angelo (center)
    { variationId: 'greco-counter-attack', x: 69.6, y: 56.1 }, // Castel del Monte (SE)
  ],
  sicilian: [
    { variationId: 'sicilian-najdorf', x: 30.6, y: 37.8 }, // La Zisa (Palermo, NW)
    { variationId: 'sicilian-sveshnikov', x: 48.5, y: 48.2 }, // Castello di Mussomeli (center)
    { variationId: 'sicilian-scheveningen', x: 58.3, y: 41.6 }, // Castello di Paternò (near Etna)
    { variationId: 'sicilian-classical', x: 74.6, y: 52.7 }, // Castello Ursino (Catania, E coast)
    { variationId: 'sicilian-dragon', x: 63.2, y: 70.4 }, // Castello di Donnafugata (S)
    { variationId: 'sicilian-kan', x: 80.3, y: 72.0 }, // Castello Maniace (Syracuse, SE)
  ],
  french: [
    { variationId: 'french-rubinstein', x: 47.4, y: 30.5 }, // Versailles (N)
    { variationId: 'french-advance', x: 47.3, y: 41.3 }, // Chambord (N-center)
    { variationId: 'french-tarrasch', x: 32.3, y: 41.2 }, // Villandry (W)
    { variationId: 'french-classical', x: 48.5, y: 46.8 }, // Chenonceau (center)
    { variationId: 'french-exchange', x: 36.0, y: 48.8 }, // Azay-le-Rideau (W-center)
    { variationId: 'french-winawer', x: 45.1, y: 77.8 }, // Carcassonne (S)
  ],
  germany: [
    { variationId: 'caro-kann-exchange', x: 57.6, y: 40.6 }, // Wartburg (N-center)
    { variationId: 'caro-kann-panov', x: 27.8, y: 57.7 }, // Heidelberg (W)
    { variationId: 'caro-kann-fantasy', x: 48.0, y: 69.4 }, // Hohenzollern (center-S)
    { variationId: 'caro-kann-classical', x: 17.4, y: 38.2 }, // Burg Eltz (W)
    { variationId: 'caro-kann-advance', x: 65.5, y: 80.7 }, // Neuschwanstein (S)
  ],
  dutch: [
    { variationId: 'dutch-leningrad', x: 44.4, y: 37.2 }, // Muiderslot (N)
    { variationId: 'dutch-classical', x: 48.5, y: 52.0 }, // De Haar (center)
    { variationId: 'dutch-stonewall', x: 63.6, y: 58.6 }, // Doorwerth (E)
  ],
  spanish: [
    { variationId: 'ruy-lopez-open', x: 60.0, y: 21.5 }, // Palace of Olite (N)
    { variationId: 'ruy-lopez-berlin', x: 44.0, y: 33.5 }, // Alcázar of Segovia (N-center)
    { variationId: 'ruy-lopez-morphy', x: 53.4, y: 50.4 }, // Alcázar of Toledo (center)
    { variationId: 'ruy-lopez-exchange', x: 49.8, y: 70.4 }, // Alhambra (S)
  ],
  english: [
    { variationId: 'english-four-knights', x: 57.7, y: 30.1 }, // Bamburgh (far N)
    { variationId: 'english-kings-fianchetto', x: 56.8, y: 32.5 }, // Alnwick (N)
    { variationId: 'london-vs-kings-indian', x: 60.2, y: 66.1 }, // Hampton Court (W)
    { variationId: 'english-mikenas-carls', x: 49.3, y: 53.6 }, // Warwick (center)
    { variationId: 'english-agincourt', x: 48.8, y: 53.7 }, // Kenilworth (center)
    { variationId: 'english-main', x: 58.5, y: 59.1 }, // Windsor (center-S)
    { variationId: 'london-system', x: 72.7, y: 67.5 }, // Tower of London (E)
    { variationId: 'english-reversed-sicilian', x: 65.9, y: 75.4 }, // Leeds (SE)
    { variationId: 'english-bremen', x: 64.6, y: 72.3 }, // Bodiam (S)
    { variationId: 'english-reti', x: 74.9, y: 70.1 }, // Pevensey (SE coast)
    { variationId: 'london-vs-qgd', x: 80.6, y: 73.4 }, // Dover (SE coast)
  ],
  scandinavian: [
    { variationId: 'scandinavian-nf6', x: 40.5, y: 58.5 }, // Akershus (Oslo, W)
    { variationId: 'scandinavian-defense', x: 33.8, y: 75.8 }, // Kronborg (Denmark, S)
    { variationId: 'scandinavian-qd6', x: 70.0, y: 74.2 }, // Kalmar (Sweden, E)
  ],
  queendom: [
    { variationId: 'queen-gambit-declined', x: 43.8, y: 25.3 }, // Prague Castle (N)
    { variationId: 'slav-defense', x: 30.5, y: 41.4 }, // Karlštejn (W)
    { variationId: 'queen-gambit-accepted', x: 33.7, y: 77.9 }, // Český Krumlov (S)
  ],
};
