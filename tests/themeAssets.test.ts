import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicRoot = resolve(process.cwd(), 'public');
const themes = ['horizon', 'gatsby', 'emerald', 'terracotta', 'glacier', 'plum', 'crimson'];
const pieces = ['b_b', 'b_k', 'b_n', 'b_p', 'b_q', 'b_r', 'w_b', 'w_k', 'w_n', 'w_p', 'w_q', 'w_r'];

describe('seven-theme production assets', () => {
  it('ships one non-empty board image for every theme', () => {
    for (const theme of themes) {
      const path = resolve(publicRoot, 'boards', `${theme}.jpg`);
      expect(existsSync(path), path).toBe(true);
      expect(statSync(path).size, path).toBeGreaterThan(10_000);
      expect(readFileSync(path).subarray(0, 2).toString('hex')).toBe('ffd8');
    }
  });

  it('ships all twelve transparent PNG sprites for every theme', () => {
    for (const theme of themes) {
      for (const piece of pieces) {
        const path = resolve(publicRoot, 'pieces', theme, `${piece}.png`);
        expect(existsSync(path), path).toBe(true);
        expect(statSync(path).size, path).toBeGreaterThan(500);
        expect(readFileSync(path).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      }
    }
  });
});
