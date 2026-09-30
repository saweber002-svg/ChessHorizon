/**
 * Haptic feedback (vibration) for mobile.
 *
 * A single faint confirmation for moves and selections, an affirming double
 * pulse for wins/completions, and a longer buzz for mistakes/losses.
 *
 * All functions no-op gracefully when vibration is unavailable (desktop
 * browsers, iOS Safari) or when the user has disabled haptics. Haptics are
 * independent of the sound mute toggle — they have their own preference.
 */

const HAPTICS_KEY = 'chess_horizon_haptics_enabled';

/** Whether haptics are enabled. Defaults to on. */
export function isHapticsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(HAPTICS_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

/** Persist the haptics preference. */
export function setHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(HAPTICS_KEY, String(enabled));
  } catch {
    // storage unavailable — ignore
  }
}

function vibrate(pattern: number | number[]): boolean {
  if (!isHapticsEnabled()) return false;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      return navigator.vibrate(pattern);
    }
  } catch {
    // vibration unsupported — ignore
  }
  return false;
}

/**
 * Single faint confirmation — piece moves, menu selections, kingdom/opening
 * selections. Keep it subtle: a 10ms tick.
 */
export function tap(): boolean {
  return vibrate(10);
}

/** Affirming double pulse — drill completed, checkmate win. */
export function success(): boolean {
  return vibrate([20, 50, 20]);
}

/** Longer buzz — incorrect drill move, getting checkmated. */
export function error(): boolean {
  return vibrate(120);
}
