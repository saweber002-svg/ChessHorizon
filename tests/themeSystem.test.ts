import { describe, it, expect } from 'vitest';
import { GAME_THEMES, getGameTheme } from '@/data/gameThemes';
import { PIECE_STYLES, getPieceSvg } from '@/components/pieceStyles';

describe('unified theme system', () => {
  it('has exactly the seven shipped themes, no Black & White', () => {
    const ids = GAME_THEMES.map((t) => t.id);
    expect(ids).toEqual([
      'chess-horizon',
      'gatsby',
      'terracotta',
      'plum',
      'glacier',
      'emerald',
      'crimson',
    ]);
    expect(ids).not.toContain('mono');
  });

  it('defaults to the fire-vs-ice Chess Horizon theme', () => {
    expect(GAME_THEMES[0].id).toBe('chess-horizon');
    expect(getGameTheme('nope').id).toBe('chess-horizon');
  });

  it('gives every theme a complete board/pieces/UI package', () => {
    for (const theme of GAME_THEMES) {
      expect(theme.name.length).toBeGreaterThan(0);
      for (const key of [
        'lightSquare',
        'darkSquare',
        'frameColor',
        'selectColor',
        'lastMoveLight',
        'lastMoveDark',
        'dotColor',
      ] as const) {
        expect(theme.board[key], `${theme.id}.board.${key}`).toMatch(/^#|rgba/);
      }
      for (const key of ['whiteFill', 'whiteStroke', 'blackFill', 'blackStroke'] as const) {
        expect(theme.pieces[key].length, `${theme.id}.pieces.${key}`).toBeGreaterThan(0);
      }
      expect(typeof theme.pieces.glowBlur).toBe('number');
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

  it('uses only valid piece style ids', () => {
    const valid = new Set(PIECE_STYLES.map((s) => s.id));
    for (const theme of GAME_THEMES) {
      expect(valid.has(theme.pieces.styleId), theme.id).toBe(true);
    }
  });

  it('keeps gradient ids unique per theme', () => {
    const seen = new Set<string>();
    for (const theme of GAME_THEMES) {
      for (const match of theme.pieces.defs?.matchAll(/id="([^"]+)"/g) ?? []) {
        expect(seen.has(match[1]), `duplicate gradient id ${match[1]}`).toBe(false);
        seen.add(match[1]);
      }
    }
  });

  it('references only gradients and filters the theme defines, and injects defs into SVGs', () => {
    for (const theme of GAME_THEMES) {
      const defined = new Set(
        [...(theme.pieces.defs?.matchAll(/id="([^"]+)"/g) ?? [])].map((m) => m[1])
      );
      for (const ref of [
        ...theme.pieces.whiteFill.matchAll(/url\(#([^)]+)\)/g),
        ...theme.pieces.blackFill.matchAll(/url\(#([^)]+)\)/g),
      ]) {
        expect(defined.has(ref[1]), `${theme.id} references #${ref[1]}`).toBe(true);
      }
      for (const f of [theme.pieces.whiteFilter, theme.pieces.blackFilter]) {
        if (f) {
          const id = f.match(/url\(#([^)]+)\)/)?.[1];
          expect(id, `${theme.id} filter ${f}`).toBeTruthy();
          expect(defined.has(id!), `${theme.id} defines filter #${id}`).toBe(true);
        }
      }
      const svg = getPieceSvg(theme.pieces.styleId, 'n', 'w', {
        whiteFill: theme.pieces.whiteFill,
        whiteStroke: theme.pieces.whiteStroke,
        blackFill: theme.pieces.blackFill,
        blackStroke: theme.pieces.blackStroke,
        defs: theme.pieces.defs,
      });
      if (theme.pieces.defs) {
        expect(svg).toContain('<defs>');
        expect(svg).not.toContain('__FILL__');
      }
      expect(svg).not.toContain('__STROKE__');
    }
  });
});
