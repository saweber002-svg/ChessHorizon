/**
 * Sound pack definitions for Chess Horizon.
 *
 * Materials (not digital synths):
 * - Glass: bright, clear, longer ring — like crystal pieces
 * - Marble: deeper, warmer, medium ring — like stone pieces
 * - Wood: softest, most muted — like wooden pieces on felt
 *
 * Piece sounds use physical impact modeling (noise burst + resonant
 * frequencies). Intensity scales: move < capture < check < checkmate.
 *
 * Prestige uses brass horn fanfares:
 * - Piece prestige: single horn note, pitch rises with tier
 * - Opening/tactical prestige: short horn motif
 * - Journeyman/Master: iconic horn motif (with full-screen animation)
 */

import { soundEngine } from './soundEngine';

export type SoundEvent =
  | 'move'
  | 'capture'
  | 'check'
  | 'checkmate'
  | 'correct'
  | 'incorrect'
  | 'drillFailed'
  | 'drillCompleted'
  | 'perfectCompletion'
  | 'piecePrestige'
  | 'openingPrestige'
  | 'tacticalPrestige'
  | 'journeymanPrestige'
  | 'masterPrestige';

export interface SoundPack {
  id: string;
  name: string;
  description: string;
  play: (event: SoundEvent, tier?: number) => void;
}

function createPack(
  id: string,
  name: string,
  description: string,
  sounds: Record<string, (tier?: number) => void>
): SoundPack {
  return {
    id,
    name,
    description,
    play: (event: SoundEvent, tier?: number) => {
      soundEngine.init();
      const fn = sounds[event];
      if (fn) fn(tier);
    },
  };
}

// ---------------------------------------------------------------------------
// Material definitions — resonant frequencies for physical modeling
// ---------------------------------------------------------------------------
interface Material {
  resonances: number[];
  decay: number;
  noiseFreq: number;
}

const GLASS: Material = {
  resonances: [2200, 3300, 4400, 5500], // bright, inharmonic
  decay: 0.28,
  noiseFreq: 4000,
};

const MARBLE: Material = {
  resonances: [900, 1350, 1800, 2400], // warm, mid-range
  decay: 0.18,
  noiseFreq: 2500,
};

const WOOD: Material = {
  resonances: [500, 750, 1000, 1300], // soft, low
  decay: 0.12,
  noiseFreq: 1500,
};

// ---------------------------------------------------------------------------
// Shared horn motifs (same across packs — prestige is prestige)
// ---------------------------------------------------------------------------
function piecePrestigeHorn(tier = 0) {
  // Single horn note, pitch rises with prestige tier (0-4)
  const baseFreq = 196; // G3
  const freq = baseFreq * Math.pow(2, tier * 2 / 12); // up a whole step per tier
  soundEngine.horn({
    frequency: freq,
    duration: 0.8,
    volume: 0.28 + tier * 0.03,
    attack: 0.1,
  });
}

function openingPrestigeMotif() {
  // Short ascending horn motif
  soundEngine.hornMotif([
    { freq: 262, dur: 0.4, delay: 0, vol: 0.28 },      // C4
    { freq: 330, dur: 0.4, delay: 0.35, vol: 0.28 },   // E4
    { freq: 392, dur: 0.7, delay: 0.7, vol: 0.32 },    // G4
  ]);
}

function tacticalPrestigeMotif() {
  // Slightly different motif for tactical
  soundEngine.hornMotif([
    { freq: 294, dur: 0.4, delay: 0, vol: 0.28 },      // D4
    { freq: 370, dur: 0.4, delay: 0.35, vol: 0.28 },   // F#4
    { freq: 440, dur: 0.7, delay: 0.7, vol: 0.32 },    // A4
  ]);
}

function journeymanMotif() {
  // Iconic journeyman fanfare — bold and triumphant
  soundEngine.hornMotif([
    { freq: 392, dur: 0.3, delay: 0, vol: 0.3 },       // G4
    { freq: 392, dur: 0.3, delay: 0.28, vol: 0.3 },   // G4
    { freq: 523, dur: 0.5, delay: 0.56, vol: 0.32 },   // C5
    { freq: 659, dur: 0.8, delay: 1.0, vol: 0.35 },    // E5
  ]);
}

function masterMotif() {
  // Iconic master fanfare — the ultimate achievement
  soundEngine.hornMotif([
    { freq: 523, dur: 0.35, delay: 0, vol: 0.32 },     // C5
    { freq: 659, dur: 0.35, delay: 0.32, vol: 0.32 },  // E5
    { freq: 784, dur: 0.35, delay: 0.64, vol: 0.34 },  // G5
    { freq: 1047, dur: 1.0, delay: 0.96, vol: 0.38 },  // C6 — the peak
  ]);
  // Subtle shimmer underneath
  soundEngine.tone({ frequency: 2093, duration: 1.2, volume: 0.06, delay: 0.96 });
}

// ---------------------------------------------------------------------------
// Pack factory — builds a material pack with intensity-scaled impacts
// ---------------------------------------------------------------------------
function materialPack(
  id: string,
  name: string,
  description: string,
  mat: Material
): SoundPack {
  return createPack(id, name, description, {
    // Move: light piece placement
    move: () => {
      soundEngine.impact({
        volume: 0.4,
        resonances: mat.resonances,
        decay: mat.decay,
        noiseFilterFreq: mat.noiseFreq,
      });
    },
    // Capture: heavier, slightly lower
    capture: () => {
      soundEngine.impact({
        volume: 0.55,
        resonances: mat.resonances.map((f) => f * 0.9),
        decay: mat.decay * 1.2,
        noiseFilterFreq: mat.noiseFreq * 0.8,
      });
    },
    // Check: heavy + subtle high ping behind it
    check: () => {
      soundEngine.impact({
        volume: 0.6,
        resonances: mat.resonances.map((f) => f * 0.85),
        decay: mat.decay * 1.3,
        noiseFilterFreq: mat.noiseFreq * 0.7,
      });
      // Subtle ping behind
      soundEngine.tone({
        frequency: mat.resonances[0] * 2,
        duration: 0.3,
        volume: 0.08,
        delay: 0.05,
      });
    },
    // Checkmate: heaviest + more pronounced ping
    checkmate: () => {
      soundEngine.impact({
        volume: 0.7,
        resonances: mat.resonances.map((f) => f * 0.8),
        decay: mat.decay * 1.5,
        noiseFilterFreq: mat.noiseFreq * 0.6,
      });
      soundEngine.tone({
        frequency: mat.resonances[0] * 2,
        duration: 0.5,
        volume: 0.12,
        delay: 0.05,
      });
      soundEngine.tone({
        frequency: mat.resonances[1] * 2,
        duration: 0.4,
        volume: 0.06,
        delay: 0.1,
      });
    },
    // Correct: soft, satisfying tick (lighter than move)
    correct: () => {
      soundEngine.impact({
        volume: 0.3,
        resonances: mat.resonances.slice(0, 2),
        decay: mat.decay * 0.8,
        noiseFilterFreq: mat.noiseFreq,
      });
    },
    // Incorrect: dull, muted thud (low, no ring)
    incorrect: () => {
      soundEngine.impact({
        volume: 0.35,
        resonances: [200, 300],
        decay: 0.08,
        noiseFilterFreq: 800,
      });
    },
    // Drill failed: gentle descending, muted
    drillFailed: () => {
      soundEngine.impact({
        volume: 0.3,
        resonances: [400, 600],
        decay: 0.15,
        noiseFilterFreq: 1000,
      });
      soundEngine.impact({
        volume: 0.25,
        resonances: [300, 450],
        decay: 0.15,
        noiseFilterFreq: 800,
        delay: 0.18,
      });
    },
    // Drill completed: pleasant ascending ticks
    drillCompleted: () => {
      soundEngine.impact({
        volume: 0.35,
        resonances: mat.resonances.slice(0, 3),
        decay: mat.decay,
        noiseFilterFreq: mat.noiseFreq,
      });
      soundEngine.impact({
        volume: 0.4,
        resonances: mat.resonances.slice(0, 3).map((f) => f * 1.2),
        decay: mat.decay * 1.2,
        noiseFilterFreq: mat.noiseFreq,
        delay: 0.15,
      });
    },
    // Perfect: brighter ascending
    perfectCompletion: () => {
      [1, 1.25, 1.5].forEach((mult, i) => {
        soundEngine.impact({
          volume: 0.38,
          resonances: mat.resonances.slice(0, 3).map((f) => f * mult),
          decay: mat.decay * 1.1,
          noiseFilterFreq: mat.noiseFreq,
          delay: i * 0.14,
        });
      });
    },
    // Prestige horns (shared across packs)
    piecePrestige: (tier) => piecePrestigeHorn(tier),
    openingPrestige: () => openingPrestigeMotif(),
    tacticalPrestige: () => tacticalPrestigeMotif(),
    journeymanPrestige: () => journeymanMotif(),
    masterPrestige: () => masterMotif(),
  });
}

export const SOUND_PACKS: SoundPack[] = [
  materialPack('glass', 'Glass', 'Crystal clear — bright and resonant', GLASS),
  materialPack('marble', 'Marble', 'Warm stone — deep and solid', MARBLE),
  materialPack('wood', 'Wood', 'Soft timber — muted and gentle', WOOD),
];

export function getSoundPack(id: string): SoundPack {
  return SOUND_PACKS.find((p) => p.id === id) ?? SOUND_PACKS[0];
}
