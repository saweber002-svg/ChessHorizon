import { describe, it, expect } from 'vitest';
import { getPieceSvg, PIECE_STYLES, type PieceStyleId } from '@/components/pieceStyles';
import { PIECE_COLOR_THEMES, getPieceColorTheme } from '@/data/pieceColors';
import { BOARD_THEMES, getBoardTheme } from '@/data/boardThemes';
import type { PieceSymbol, Color } from 'chess.js';

const theme = {
  whiteFill: '#FFFFFF',
  whiteStroke: '#000000',
  blackFill: '#000000',
  blackStroke: '#FFFFFF',
};

const symbols: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q', 'k'];
const colors: Color[] = ['w', 'b'];
const styleIds: PieceStyleId[] = ['staunton', 'alpha', 'pirouetti', 'chessnut'];

describe('Piece styles', () => {
  it('has 4 styles', () => {
    expect(PIECE_STYLES).toHaveLength(4);
    expect(PIECE_STYLES.map((s) => s.id).sort()).toEqual(['alpha', 'chessnut', 'pirouetti', 'staunton']);
  });

  it('generates valid SVG for all styles, pieces, and colors', () => {
    for (const style of styleIds) {
      for (const color of colors) {
        for (const symbol of symbols) {
          const svg = getPieceSvg(style, symbol, color, theme);
          expect(svg).toContain('<svg');
          expect(svg).toContain('</svg>');
          expect(svg).not.toContain('__FILL__');
          expect(svg).not.toContain('__STROKE__');
          // Should contain the theme colors
          const expectedFill = color === 'w' ? theme.whiteFill : theme.blackFill;
          expect(svg).toContain(expectedFill);
        }
      }
    }
  });
});

describe('Piece colors', () => {
  it('has 5 color themes', () => {
    expect(PIECE_COLOR_THEMES).toHaveLength(5);
    expect(PIECE_COLOR_THEMES.map((c) => c.id).sort()).toEqual(['emerald', 'gold', 'horizon', 'plain', 'violet']);
  });

  it('plain has no glow', () => {
    const plain = getPieceColorTheme('plain');
    expect(plain.whiteGlow).toBeNull();
    expect(plain.blackGlow).toBeNull();
  });

  it('horizon is dark-boards-only with cyan/red glows', () => {
    const horizon = getPieceColorTheme('horizon');
    expect(horizon.darkBoardsOnly).toBe(true);
    expect(horizon.whiteGlow).toBeTruthy();
    expect(horizon.blackGlow).toBeTruthy();
    // White stays white, black stays black
    expect(horizon.whiteFill).toBe('#FFFFFF');
    expect(horizon.blackFill).toBe('#0A0A0A');
  });

  it('falls back to plain for unknown id', () => {
    expect(getPieceColorTheme('nonexistent').id).toBe('plain');
  });
});

describe('Board themes', () => {
  it('marks dark boards correctly', () => {
    const midnight = getBoardTheme('midnight');
    const ocean = getBoardTheme('ocean');
    const classic = getBoardTheme('classic');
    const walnut = getBoardTheme('walnut');
    expect(midnight.isDark).toBe(true);
    expect(ocean.isDark).toBe(true);
    expect(classic.isDark).toBe(false);
    expect(walnut.isDark).toBe(false);
  });

  it('still has 4 board themes', () => {
    expect(BOARD_THEMES).toHaveLength(4);
  });
});
