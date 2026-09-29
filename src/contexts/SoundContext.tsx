import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { soundEngine } from '@/audio/soundEngine';
import { getSoundPack, type SoundEvent } from '@/audio/soundPacks';

const PACK_KEY = 'chess_horizon_sound_pack';
const VOLUME_KEY = 'chess_horizon_sound_volume';
const ENABLED_KEY = 'chess_horizon_sound_enabled';

const DEFAULT_PACK = 'glass';
const DEFAULT_VOLUME = 0.7;

interface SoundContextValue {
  /** Current pack id */
  packId: string;
  setPackId: (id: string) => void;
  /** Volume 0-1 */
  volume: number;
  setVolume: (v: number) => void;
  /** Master enabled */
  enabled: boolean;
  setEnabled: (e: boolean) => void;
  /** Play a sound event (tier for prestige scaling) */
  play: (event: SoundEvent, tier?: number) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function load(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [packId, setPackIdState] = useState<string>(() => load(PACK_KEY, DEFAULT_PACK));
  const [volume, setVolumeState] = useState<number>(() => {
    const v = parseFloat(load(VOLUME_KEY, String(DEFAULT_VOLUME)));
    return isNaN(v) ? DEFAULT_VOLUME : Math.max(0, Math.min(1, v));
  });
  const [enabled, setEnabledState] = useState<boolean>(() => load(ENABLED_KEY, 'true') === 'true');

  // Sync engine with settings
  useEffect(() => {
    soundEngine.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    soundEngine.setEnabled(enabled);
  }, [enabled]);

  // Initialize audio on first user interaction (required by browsers)
  useEffect(() => {
    const initAudio = () => {
      soundEngine.init();
      soundEngine.resume();
    };
    window.addEventListener('pointerdown', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const setPackId = useCallback((id: string) => {
    setPackIdState(id);
    save(PACK_KEY, id);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    save(VOLUME_KEY, String(clamped));
  }, []);

  const setEnabled = useCallback((e: boolean) => {
    setEnabledState(e);
    save(ENABLED_KEY, String(e));
  }, []);

  const play = useCallback(
    (event: SoundEvent, tier?: number) => {
      if (!enabled) return;
      const pack = getSoundPack(packId);
      pack.play(event, tier);
    },
    [packId, enabled]
  );

  return (
    <SoundContext.Provider value={{ packId, setPackId, volume, setVolume, enabled, setEnabled, play }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}
