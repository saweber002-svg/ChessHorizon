import { describe, it, expect } from 'vitest';
import { GAME_THEMES, getGameTheme, pieceSpriteUrl } from '@/data/gameThemes';

describe('unified theme system', () => {
  it('has exactly the seven shipped themes, no Black & White', () => {
    const ids = GAME_THEMES.map((t) => t.id);
    expect(ids).toEqual([
      'horizon',
      'gatsby',
      'terracotta',
      'violet',
      'cobalt',
      'emerald',
      'crimson',
    ]);
    expect(ids).not.toContain('mono');
    expect(ids).not.toContain('chess-horizon');
  });

  it('defaults to the fire-vs-ice Chess Horizon theme', () => {
    expect(GAME_THEMES[0].id).toBe('horizon');
    expect(getGameTheme('nope').id).toBe('horizon');
  });

  it('gives every theme a complete board/pieces/UI package', () => {
    for (const theme of GAME_THEMES) {
      expect(theme.name.length).toBeGreaterThan(0);
      // Board image + grid geometry
      expect(theme.board.image, `${theme.id}.board.image`).toMatch(/\.jpg$/);
      for (const key of ['gridX', 'gridY', 'gridW', 'gridH'] as const) {
        const v = theme.board[key];
        expect(typeof v, `${theme.id}.board.${key}`).toBe('number');
        expect(v, `${theme.id}.board.${key}`).toBeGreaterThan(0);
        expect(v, `${theme.id}.board.${key}`).toBeLessThanOrEqual(1);
      }
      // Grid must fit inside the image
      expect(theme.board.gridX + theme.board.gridW, `${theme.id} grid right`).toBeLessThanOrEqual(1.001);
      expect(theme.board.gridY + theme.board.gridH, `${theme.id} grid bottom`).toBeLessThanOrEqual(1.001);
      for (const key of ['selectColor', 'lastMoveColor', 'dotColor'] as const) {
        expect(theme.board[key], `${theme.id}.board.${key}`).toMatch(/^#|rgba/);
      }
      for (const key of ['lightSquare', 'darkSquare', 'frameColor'] as const) {
        expect(theme.board[key], `${theme.id}.board.${key}`).toMatch(/^#/);
      }
      // Piece sprites
      expect(theme.pieces.spriteBase.length, `${theme.id}.pieces.spriteBase`).toBeGreaterThan(0);
      for (const key of [
        'bg',
        'panel',
        'border',
        'text',
        'muted',
        'accent',
        'accentInk',
        'accentSoft',
      ] as const) {
        expect(theme.ui[key], `${theme.id}.ui.${key}`).toMatch(/^#|rgba/);
      }
    }
  });

  it('builds sprite URLs for all 12 pieces per theme', () => {
    for (const theme of GAME_THEMES) {
      for (const color of ['w', 'b']) {
        for (const symbol of ['p', 'n', 'b', 'r', 'q', 'k']) {
          const url = pieceSpriteUrl(theme, `${color}${symbol}`);
          expect(url, `${theme.id} ${color}${symbol}`).toMatch(
            new RegExp(`pieces/${theme.id}/${color}_${symbol}\\.png$`)
          );
        }
      }
    }
  });
});
