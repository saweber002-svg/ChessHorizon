import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tap, success, error, isHapticsEnabled, setHapticsEnabled } from '@/lib/haptics';

describe('haptics', () => {
  const vibrate = vi.fn(() => true);
  let storage: Record<string, string>;

  beforeEach(() => {
    vibrate.mockClear();
    storage = {};
    vi.stubGlobal('navigator', { vibrate });
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in storage ? storage[k] : null),
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tap() vibrates faintly (10ms)', () => {
    tap();
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it('success() vibrates a double pulse', () => {
    success();
    expect(vibrate).toHaveBeenCalledWith([20, 50, 20]);
  });

  it('error() vibrates longer', () => {
    error();
    expect(vibrate).toHaveBeenCalledWith(120);
  });

  it('no-ops when navigator.vibrate is unavailable', () => {
    vi.stubGlobal('navigator', {});
    expect(() => tap()).not.toThrow();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('respects the disabled preference', () => {
    setHapticsEnabled(false);
    expect(isHapticsEnabled()).toBe(false);
    tap();
    success();
    error();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('defaults to enabled when no preference is stored', () => {
    expect(isHapticsEnabled()).toBe(true);
  });

  it('setHapticsEnabled(true) re-enables vibration', () => {
    setHapticsEnabled(false);
    setHapticsEnabled(true);
    tap();
    expect(vibrate).toHaveBeenCalledWith(10);
  });
});
