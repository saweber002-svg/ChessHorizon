import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SOUND_PACKS, getSoundPack, type SoundEvent } from '@/audio/soundPacks';
import { soundEngine } from '@/audio/soundEngine';

// Mock the sound engine to avoid needing AudioContext in tests
vi.mock('@/audio/soundEngine', () => ({
  soundEngine: {
    init: vi.fn(),
    tone: vi.fn(),
    noise: vi.fn(),
    sequence: vi.fn(),
    impact: vi.fn(),
    horn: vi.fn(),
    hornMotif: vi.fn(),
  },
}));

const allEvents: SoundEvent[] = [
  'move',
  'capture',
  'check',
  'checkmate',
  'correct',
  'incorrect',
  'drillFailed',
  'drillCompleted',
  'perfectCompletion',
  'piecePrestige',
  'openingPrestige',
  'tacticalPrestige',
  'journeymanPrestige',
  'masterPrestige',
];

describe('Sound packs', () => {
  it('has 4 material packs', () => {
    expect(SOUND_PACKS).toHaveLength(4);
    expect(SOUND_PACKS.map((p) => p.id).sort()).toEqual(['classic', 'glass', 'marble', 'wood']);
  });

  it('each pack can play all events without throwing', () => {
    for (const pack of SOUND_PACKS) {
      for (const event of allEvents) {
        expect(() => pack.play(event)).not.toThrow();
      }
    }
  });

  it('piece prestige accepts a tier', () => {
    const pack = getSoundPack('glass');
    expect(() => pack.play('piecePrestige', 3)).not.toThrow();
    expect(soundEngine.horn).toHaveBeenCalled();
  });

  it('falls back to classic for unknown pack id', () => {
    expect(getSoundPack('nonexistent').id).toBe('classic');
  });

  it('move uses physical impact (not digital tone)', () => {
    const pack = getSoundPack('marble');
    pack.play('move');
    expect(soundEngine.impact).toHaveBeenCalled();
  });

  it('checkmate uses impact + ping', () => {
    const pack = getSoundPack('glass');
    pack.play('checkmate');
    expect(soundEngine.impact).toHaveBeenCalled();
    expect(soundEngine.tone).toHaveBeenCalled();
  });

  it('master prestige uses horn motif', () => {
    const pack = getSoundPack('wood');
    pack.play('masterPrestige');
    expect(soundEngine.hornMotif).toHaveBeenCalled();
  });
});

describe('Sound engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes impact and horn methods', () => {
    expect(typeof soundEngine.impact).toBe('function');
    expect(typeof soundEngine.horn).toBe('function');
    expect(typeof soundEngine.hornMotif).toBe('function');
  });
});
