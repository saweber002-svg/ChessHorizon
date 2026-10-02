import type { Tier } from '@/types';

/**
 * Tactical variations registry — the approved catalog
 * (~/workspace/your_files/chess-horizon-tactical-catalog.md).
 *
 * A tactic is a discrete named variation (gambit, sacrifice, or trap) that
 * deviates from one or more parent openings. Visibility is gated by the
 * parent opening's unmoved-piece prestige for the tactic's EXECUTING color:
 * the side whose tactical idea it is (White executes the Fried Liver,
 * Black executes the Traxler) — not necessarily who moves first at the
 * divergence point.
 *
 * Gate tiers (prestige tier names): 1 = Novice (club level),
 * 2 = Apprentice (strong at IM, not GM), 3 = Journeyman (GM level).
 * Tier 0 (Locked) unlocks nothing.
 *
 * Tactics with no catalog parent are orphans: they form the boss-puzzle
 * pool for the future Puzzles kingdom.
 *
 * This file is metadata + pure gating logic only. Drill content (packs)
 * is built per catalog slices C–F; `line` records each tactic's verified
 * SAN line from the initial position through its defining move.
 */
export type TacticGateTier = 1 | 2 | 3;
export type TacticColor = 'w' | 'b';

export interface TacticalVariation {
  /** Stable variation id; becomes the drill-pack id prefix when built. */
  id: string;
  name: string;
  /** The side whose tactical idea it is; gating uses this side's prestige. */
  executingColor: TacticColor;
  gateTier: TacticGateTier;
  /**
   * Parent variation ids this tactic is listed under. A parent may be an
   * opening (e.g. 'two-knights') or another tactic (sub-traps such as the
   * Magnus Smith Trap live under the Smith-Morra Gambit). Empty = orphan.
   */
  parents: string[];
  /** Full SAN line from the initial position through the defining move. */
  line: string[];
  /** Instructive note for fallback placements (similar position, no deviation). */
  placementNote?: string;
}

const OPEN_GAME_PARENTS = [
  'giuoco-piano',
  'giuoco-pianissimo',
  'ruy-lopez-morphy',
  'ruy-lopez-berlin',
  'ruy-lopez-exchange',
  'ruy-lopez-open',
  'two-knights',
] as const;

const SICILIAN_PARENTS = [
  'sicilian-classical',
  'sicilian-dragon',
  'sicilian-kan',
  'sicilian-najdorf',
  'sicilian-scheveningen',
  'sicilian-sveshnikov',
] as const;

export const TACTICAL_VARIATIONS: TacticalVariation[] = [
  // ——— Journeyman gate (GM level), Tier 1: already built ———
  { id: 'traxler-counter-attack', name: 'Traxler Counter Attack', executingColor: 'b', gateTier: 3, parents: ['two-knights'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'Bc5'] },
  { id: 'fried-liver-attack', name: 'Fried Liver Attack', executingColor: 'w', gateTier: 3, parents: ['two-knights'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5'] },
  { id: 'ulvestad-variation', name: 'Ulvestad Variation', executingColor: 'b', gateTier: 3, parents: ['two-knights'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'b5'] },
  { id: 'evans-gambit', name: 'Evans Gambit', executingColor: 'w', gateTier: 3, parents: ['giuoco-piano'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'] },
  { id: 'moeller-attack', name: 'Moeller Attack', executingColor: 'w', gateTier: 3, parents: ['giuoco-piano'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Nc3'] },
  { id: 'icelandic-gambit', name: 'Icelandic Gambit', executingColor: 'b', gateTier: 3, parents: ['scandinavian-nf6'], line: ['e4', 'd5', 'exd5', 'Nf6', 'c4', 'e6'] },
  { id: 'dutch-staunton-gambit', name: 'Staunton Gambit', executingColor: 'w', gateTier: 3, parents: ['dutch-classical'], line: ['d4', 'f5', 'e4'] },

  // ——— Journeyman gate, mid-line deviations (rebased Slice G) ———
  { id: 'fried-liver-bb3-deviation', name: 'Fried Liver: 9.Bb3', executingColor: 'w', gateTier: 3, parents: ['fried-liver-attack'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3', 'Nb4', 'Bb3'], placementNote: 'White sideline: 9.Bb3 instead of the main line 9.O-O.' },
  { id: 'moeller-oo-deviation', name: 'Moeller: 11...O-O', executingColor: 'b', gateTier: 3, parents: ['moeller-attack'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Nc3', 'Nxe4', 'O-O', 'Bxc3', 'd5', 'Bf6', 'Re1', 'Ne7', 'Rxe4', 'O-O'], placementNote: 'Black sideline: 11...O-O instead of the main line 11...d6.' },
  { id: 'slav-exchange-deviation', name: 'Slav: 3.cxd5 (Exchange)', executingColor: 'w', gateTier: 3, parents: ['slav-defense'], line: ['d4', 'd5', 'c4', 'c6', 'cxd5'], placementNote: 'White sideline: the Exchange Slav 3.cxd5 instead of 3.Nf3.' },
  { id: 'slav-e4-deviation', name: 'Slav: 3.e4', executingColor: 'w', gateTier: 3, parents: ['slav-defense'], line: ['d4', 'd5', 'c4', 'c6', 'e4'], placementNote: 'White sideline: the gambit 3.e4 instead of 3.Nf3.' },
  { id: 'traxler-qe7-deviation', name: 'Traxler: 8...Qe7', executingColor: 'b', gateTier: 3, parents: ['traxler-counter-attack'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'Bc5', 'Nxf7', 'Bxf2+', 'Kxf2', 'Nxe4+', 'Ke3', 'Qh4', 'g3', 'Qe7'], placementNote: 'Black sideline: 8...Qe7 instead of the main line 8...Nxg3.' },
  { id: 'ulvestad-cxd4-deviation', name: 'Ulvestad: 8.cxd4', executingColor: 'w', gateTier: 3, parents: ['ulvestad-variation'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'b5', 'Bf1', 'Nd4', 'c3', 'Nxd5', 'cxd4'], placementNote: 'White sideline: 8.cxd4 instead of the main line 8.Ne4.' },

  // ——— Journeyman gate, Tier 2 (approved) ———
  { id: 'winawer-poisoned-pawn', name: 'Winawer Poisoned Pawn', executingColor: 'w', gateTier: 3, parents: ['french-winawer'], line: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7', 'Qg4', 'Qc7', 'Qxg7'] },
  { id: 'najdorf-poisoned-pawn', name: 'Najdorf Poisoned Pawn', executingColor: 'w', gateTier: 3, parents: ['sicilian-najdorf'], line: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5', 'e6', 'f4', 'Qb6', 'Qd2', 'Qxb2'] },
  { id: 'marshall-attack', name: 'Marshall Attack', executingColor: 'b', gateTier: 3, parents: ['ruy-lopez-morphy'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'O-O', 'c3', 'd5'] },
  { id: 'schliemann-gambit', name: 'Schliemann Gambit', executingColor: 'b', gateTier: 3, parents: ['ruy-lopez-morphy'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'f5'] },
  { id: 'albin-countergambit', name: 'Albin Countergambit', executingColor: 'b', gateTier: 3, parents: ['queen-gambit-accepted'], line: ['d4', 'd5', 'c4', 'e5'] },
  { id: 'smith-morra-gambit', name: 'Smith-Morra Gambit', executingColor: 'w', gateTier: 3, parents: [...SICILIAN_PARENTS], line: ['e4', 'c5', 'd4', 'cxd4', 'c3'] },

  // ——— Journeyman gate, additions ———
  { id: 'maccutcheon-variation', name: 'MacCutcheon Variation', executingColor: 'b', gateTier: 3, parents: ['french-classical'], line: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Bb4'] },
  { id: 'max-lange-attack', name: 'Max Lange Attack', executingColor: 'w', gateTier: 3, parents: ['two-knights'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd4', 'exd4', 'O-O', 'Bc5', 'e5'] },
  { id: 'geller-gambit', name: 'Geller Gambit', executingColor: 'w', gateTier: 3, parents: ['slav-defense'], line: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'e4'] },

  // ——— Apprentice gate (strong at IM, not GM) ———
  { id: 'milner-barry-gambit', name: 'Milner-Barry Gambit', executingColor: 'w', gateTier: 2, parents: ['french-advance'], line: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Bd3', 'cxd4', 'O-O'] },
  { id: 'winawer-countergambit', name: 'Winawer Countergambit', executingColor: 'b', gateTier: 2, parents: ['slav-defense'], line: ['d4', 'd5', 'c4', 'c6', 'Nc3', 'e5'] },
  { id: 'portuguese-variation', name: 'Portuguese Variation', executingColor: 'b', gateTier: 2, parents: ['scandinavian-nf6'], line: ['e4', 'd5', 'exd5', 'Nf6', 'd4', 'Bg4'] },
  { id: 'alekhine-chatard-attack', name: 'Alekhine-Chatard Attack', executingColor: 'w', gateTier: 2, parents: ['french-classical'], line: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e5', 'Nfd7', 'h4'] },

  // ——— Novice gate (club level, usable 600–700+) ———
  { id: 'jerome-gambit', name: 'Jerome Gambit', executingColor: 'w', gateTier: 1, parents: ['giuoco-piano'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Bxf7+'] },
  { id: 'blackburne-shilling-gambit', name: 'Blackburne Shilling Gambit', executingColor: 'b', gateTier: 1, parents: ['giuoco-piano'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4'] },
  { id: 'rousseau-gambit', name: 'Rousseau Gambit', executingColor: 'b', gateTier: 1, parents: ['giuoco-piano'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'f5'] },
  { id: 'legal-trap', name: 'Légal Trap', executingColor: 'w', gateTier: 1, parents: ['giuoco-piano'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'd6', 'Nc3', 'Bg4', 'h3', 'Bh5', 'Nxe5'] },
  { id: 'noahs-ark-trap', name: "Noah's Ark Trap", executingColor: 'b', gateTier: 1, parents: ['ruy-lopez-morphy'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'd6', 'd4', 'b5', 'Bb3', 'Nxd4', 'Nxd4', 'exd4'] },
  { id: 'tarrasch-trap', name: 'Tarrasch Trap', executingColor: 'w', gateTier: 1, parents: ['ruy-lopez-morphy'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'd6', 'd4', 'Bd7', 'Nc3', 'Nf6', 'Bxc6', 'Bxc6', 'Qd3', 'exd4', 'Nxd4', 'g6', 'Nxc6'] },
  { id: 'mortimer-trap', name: 'Mortimer Trap', executingColor: 'b', gateTier: 1, parents: ['ruy-lopez-berlin'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'd3', 'Ne7'] },
  { id: 'fishing-pole-trap', name: 'Fishing Pole Trap', executingColor: 'b', gateTier: 1, parents: ['ruy-lopez-berlin'], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Ng4', 'h3', 'h5'] },
  { id: 'elephant-trap', name: 'Elephant Trap', executingColor: 'b', gateTier: 1, parents: ['queen-gambit-declined'], line: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'cxd5', 'exd5', 'Nxd5', 'Nxd5'] },
  { id: 'magnus-smith-trap', name: 'Magnus Smith Trap', executingColor: 'w', gateTier: 1, parents: ['smith-morra-gambit'], line: ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3', 'e6', 'Bc4', 'Bb4', 'O-O', 'Nge7', 'Ng5'] },
  { id: 'lasker-trap', name: 'Lasker Trap', executingColor: 'b', gateTier: 1, parents: ['albin-countergambit'], line: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3', 'Nc6', 'a3', 'Bg4', 'Nbd2', 'Qe7', 'h3', 'Bxf3'] },
  { id: 'danish-gambit', name: 'Danish Gambit', executingColor: 'w', gateTier: 1, parents: [...OPEN_GAME_PARENTS], line: ['e4', 'e5', 'd4', 'exd4', 'c3'] },
  { id: 'elephant-gambit', name: 'Elephant Gambit', executingColor: 'b', gateTier: 1, parents: [...OPEN_GAME_PARENTS], line: ['e4', 'e5', 'Nf3', 'd5'] },
  { id: 'latvian-gambit', name: 'Latvian Gambit', executingColor: 'b', gateTier: 1, parents: [...OPEN_GAME_PARENTS], line: ['e4', 'e5', 'Nf3', 'f5'] },
  { id: 'blackmar-diemer-gambit', name: 'Blackmar-Diemer Gambit', executingColor: 'w', gateTier: 1, parents: ['queen-gambit-accepted', 'queen-gambit-declined'], line: ['d4', 'd5', 'e4'] },
  { id: 'wing-gambit', name: 'Wing Gambit', executingColor: 'w', gateTier: 1, parents: [...SICILIAN_PARENTS], line: ['e4', 'c5', 'b4'] },
  { id: 'krejcik-gambit', name: 'Krejcik Gambit', executingColor: 'w', gateTier: 1, parents: ['dutch-classical'], line: ['d4', 'f5', 'g4'] },
  { id: 'hopton-attack', name: 'Hopton Attack', executingColor: 'w', gateTier: 1, parents: ['dutch-classical'], line: ['d4', 'f5', 'Bg5'] },
  { id: 'bellon-gambit', name: 'Bellon Gambit', executingColor: 'b', gateTier: 1, parents: ['english-reversed-sicilian', 'english-main'], line: ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'e4', 'Ng5', 'b5'] },
  { id: 'rasa-studier-gambit', name: 'Rasa-Studier Gambit', executingColor: 'w', gateTier: 1, parents: ['caro-kann-classical'], line: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'f3'] },
  { id: 'orthoschnapp-gambit', name: 'Orthoschnapp Gambit', executingColor: 'w', gateTier: 1, parents: ['french-tarrasch'], line: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'c5', 'exd5', 'Qxd5', 'Ngf3', 'cxd4', 'Bc4'] },
  { id: 'slav-gambit', name: 'Slav Gambit', executingColor: 'w', gateTier: 1, parents: ['slav-defense'], line: ['d4', 'd5', 'c4', 'c6', 'Nc3', 'Nf6', 'e4'] },

  // ——— Orphans: no catalog parent — boss-puzzle pool for the Puzzles kingdom ———
  { id: 'stafford-gambit', name: 'Stafford Gambit', executingColor: 'b', gateTier: 1, parents: [], line: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6'] },
  { id: 'cochrane-gambit', name: 'Cochrane Gambit', executingColor: 'w', gateTier: 1, parents: [], line: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nxf7'] },
  { id: 'halloween-gambit', name: 'Halloween Gambit', executingColor: 'w', gateTier: 1, parents: [], line: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Nxe5'] },
];

export function getTacticalVariation(id: string): TacticalVariation | undefined {
  return TACTICAL_VARIATIONS.find((t) => t.id === id);
}

/**
 * A tactic is unlocked when the parent opening's unmoved-piece prestige for
 * the tactic's executing color has reached the tactic's gate tier.
 * `tierForExecutingColor` is that side's tier (0 Locked … 4 Master).
 */
export function isTacticUnlocked(
  tactic: TacticalVariation,
  tierForExecutingColor: Tier
): boolean {
  return tierForExecutingColor >= tactic.gateTier;
}

/** Every tactic listed under a variation (opening or tactic), any gate state. */
export function tacticsListedUnder(variationId: string): TacticalVariation[] {
  return TACTICAL_VARIATIONS.filter((t) => t.parents.includes(variationId));
}

function tierFor(tactic: TacticalVariation, whiteTier: Tier, blackTier: Tier): Tier {
  return tactic.executingColor === 'w' ? whiteTier : blackTier;
}

/**
 * Tactics listed under `variationId` that are unlocked given that
 * variation's per-color unmoved-piece prestige tiers.
 */
export function unlockedTacticsUnder(
  variationId: string,
  whiteTier: Tier,
  blackTier: Tier
): TacticalVariation[] {
  return tacticsListedUnder(variationId).filter((t) =>
    isTacticUnlocked(t, tierFor(t, whiteTier, blackTier))
  );
}

/** Tactics listed under `variationId` that are still locked at those tiers. */
export function lockedTacticsUnder(
  variationId: string,
  whiteTier: Tier,
  blackTier: Tier
): TacticalVariation[] {
  return tacticsListedUnder(variationId).filter(
    (t) => !isTacticUnlocked(t, tierFor(t, whiteTier, blackTier))
  );
}

/** Orphan tactics: no parent opening — the boss-puzzle pool. */
export function orphanTactics(): TacticalVariation[] {
  return TACTICAL_VARIATIONS.filter((t) => t.parents.length === 0);
}

/**
 * Find the prestige-source variation for gating: walk up the parents chain
 * until we hit an opening (a variation id that is not itself a tactic).
 * Used by the tactic selection UI to look up the correct (openingId,
 * variationId) prestige tiers for sub-tactics nested under tactics.
 */
export function prestigeSourceVariationId(variationId: string): string {
  let current = variationId;
  const seen = new Set<string>();
  while (getTacticalVariation(current) && !seen.has(current)) {
    seen.add(current);
    const parents = getTacticalVariation(current)!.parents;
    if (parents.length === 0) break; // orphan — no prestige source
    current = parents[0];
  }
  return current;
}

/** Tier display names for gate badges and lock messages. */
export const GATE_TIER_NAMES: Record<TacticGateTier, string> = {
  1: 'Novice',
  2: 'Apprentice',
  3: 'Journeyman',
};
