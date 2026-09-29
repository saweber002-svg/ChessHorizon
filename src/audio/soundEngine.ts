/**
 * Web Audio API sound synthesis engine for Chess Horizon.
 *
 * All sounds are synthesized in real-time — no audio files needed.
 *
 * Two synthesis approaches:
 * 1. Physical impacts (glass/marble/wood pieces on board) — noise burst +
 *    inharmonic resonant frequencies with exponential decay. Intensity scales
 *    for captures, checks, checkmates.
 * 2. Brass horns (prestige fanfares) — detuned sawtooths through lowpass
 *    filter with slow attack and subtle vibrato for natural brass swell.
 */

export interface ToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  variation?: number;
  delay?: number;
}

export interface NoiseOptions {
  duration: number;
  filterFreq?: number;
  filterType?: BiquadFilterType;
  volume?: number;
  delay?: number;
}

export interface ImpactOptions {
  /** Base volume 0-1 */
  volume?: number;
  /** Resonant frequencies for the material (inharmonic partials) */
  resonances: number[];
  /** Decay time in seconds */
  decay?: number;
  /** Noise burst duration */
  noiseDuration?: number;
  /** Noise filter frequency */
  noiseFilterFreq?: number;
  /** Pitch variation for natural feel */
  variation?: number;
  /** Delay before starting */
  delay?: number;
}

export interface HornOptions {
  /** Frequency in Hz */
  frequency: number;
  /** Duration in seconds */
  duration: number;
  /** Peak volume 0-1 */
  volume?: number;
  /** Attack time (brass swell) */
  attack?: number;
  /** Vibrato rate in Hz */
  vibratoRate?: number;
  /** Vibrato depth in Hz */
  vibratoDepth?: number;
  /** Delay before starting */
  delay?: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.7;
  private enabled = true;

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // Audio not supported
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setEnabled(e: boolean) {
    this.enabled = e;
  }

  get isEnabled() {
    return this.enabled;
  }

  get isReady() {
    return this.ctx !== null;
  }

  private ensure(): boolean {
    if (!this.enabled) return false;
    this.init();
    this.resume();
    return this.ctx !== null && this.masterGain !== null;
  }

  tone(opts: ToneOptions) {
    if (!this.ensure()) return;
    const ctx = this.ctx!;
    const master = this.masterGain!;

    const {
      frequency,
      duration,
      type = 'sine',
      volume = 0.5,
      attack = 0.005,
      variation = 0,
      delay = 0,
    } = opts;

    const t = ctx.currentTime + delay;
    const freq = variation > 0
      ? frequency * (1 + (Math.random() * 2 - 1) * variation)
      : frequency;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  noise(opts: NoiseOptions) {
    if (!this.ensure()) return;
    const ctx = this.ctx!;
    const master = this.masterGain!;

    const {
      duration,
      filterFreq = 2000,
      filterType = 'lowpass',
      volume = 0.3,
      delay = 0,
    } = opts;

    const t = ctx.currentTime + delay;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    source.start(t);
    source.stop(t + duration + 0.05);
  }

  sequence(tones: ToneOptions[]) {
    for (const tone of tones) {
      this.tone(tone);
    }
  }

  /**
   * Physical impact sound — like a glass/marble piece hitting the board.
   * Combines a short noise burst (the "thock") with inharmonic resonant
   * frequencies (the material's ring) that decay exponentially.
   */
  impact(opts: ImpactOptions) {
    if (!this.ensure()) return;
    const ctx = this.ctx!;
    const master = this.masterGain!;

    const {
      volume = 0.5,
      resonances,
      decay = 0.15,
      noiseDuration = 0.03,
      noiseFilterFreq = 3000,
      variation = 0.02,
      delay = 0,
    } = opts;

    const t = ctx.currentTime + delay;

    // Noise burst for the initial impact
    const bufferSize = Math.floor(ctx.sampleRate * noiseDuration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = noiseFilterFreq;
    noiseFilter.Q.value = 1;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseDuration);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noiseSrc.start(t);
    noiseSrc.stop(t + noiseDuration + 0.02);

    // Resonant partials for material character
    resonances.forEach((freq, idx) => {
      const f = variation > 0
        ? freq * (1 + (Math.random() * 2 - 1) * variation)
        : freq;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      // Higher partials are quieter and decay faster
      const partialVol = volume * (0.3 / (idx + 1));
      const partialDecay = decay / (1 + idx * 0.5);
      gain.gain.setValueAtTime(partialVol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + partialDecay);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + partialDecay + 0.05);
    });
  }

  /**
   * Brass horn note — detuned sawtooths through lowpass filter with
   * slow attack for natural swell and subtle vibrato.
   */
  horn(opts: HornOptions) {
    if (!this.ensure()) return;
    const ctx = this.ctx!;
    const master = this.masterGain!;

    const {
      frequency,
      duration,
      volume = 0.3,
      attack = 0.08,
      vibratoRate = 5,
      vibratoDepth = 4,
      delay = 0,
    } = opts;

    const t = ctx.currentTime + delay;

    // Two detuned saws for brass richness
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency * 4, t);
    filter.frequency.exponentialRampToValueAtTime(frequency * 2, t + duration);
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.setValueAtTime(volume, t + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // Vibrato LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.value = vibratoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = vibratoDepth;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(frequency, t);
    osc2.frequency.setValueAtTime(frequency * 1.003, t); // slight detune

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    const end = t + duration + 0.1;
    osc1.start(t); osc1.stop(end);
    osc2.start(t); osc2.stop(end);
    lfo.start(t); lfo.stop(end);
  }

  /**
   * Play a horn motif (sequence of horn notes).
   */
  hornMotif(notes: Array<{ freq: number; dur: number; delay: number; vol?: number }>) {
    for (const note of notes) {
      this.horn({
        frequency: note.freq,
        duration: note.dur,
        volume: note.vol ?? 0.3,
        delay: note.delay,
      });
    }
  }
}

export const soundEngine = new SoundEngine();
