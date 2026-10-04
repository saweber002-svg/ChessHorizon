/**
 * Board + piece theme definitions for Chess Horizon.
 * The default "Black & White" theme is pure monochrome; "Classic" mirrors
 * the chess.com green board Scott uses.
 */
import type { PieceThemeColors } from '@/components/pieceStyles';

export interface BoardTheme {
  id: string;
  name: string;
  description: string;
  /** Light square color */
  lightSquare: string;
  /** Dark square color */
  darkSquare: string;
  /** Board border/frame color */
  frameColor: string;
  /** True for dark boards (required for the Horizon piece color) */
  isDark: boolean;
  /** Piece colors */
  pieces: PieceThemeColors;
  /** Selection highlight */
  selectColor: string;
  /** Last-move highlight */
  lastMoveLight: string;
  lastMoveDark: string;
  /** Legal-move dot color */
  dotColor: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'mono',
    name: 'Black & White',
    description: 'Pure monochrome — black and white squares',
    lightSquare: '#F5F5F5',
    darkSquare: '#212121',
    frameColor: '#111111',
    isDark: false,
    pieces: {
      whiteFill: '#FFFFFF',
      whiteStroke: '#1A1A1A',
      blackFill: '#1A1A1A',
      blackStroke: '#FFFFFF',
    },
    selectColor: 'rgba(255, 213, 79, 0.65)',
    lastMoveLight: '#D8D8D8',
    lastMoveDark: '#3F3F3F',
    dotColor: 'rgba(0, 0, 0, 0.25)',
  },
  {
    id: 'classic',
    name: 'Classic Green',
    description: 'The chess.com standard — green and cream',
    lightSquare: '#EEEED2',
    darkSquare: '#769656',
    frameColor: '#4A3728',
    isDark: false,
    pieces: {
      whiteFill: '#F9F9F9',
      whiteStroke: '#2B2B2B',
      blackFill: '#2B2B2B',
      blackStroke: '#F9F9F9',
    },
    selectColor: 'rgba(255, 213, 79, 0.65)',
    lastMoveLight: '#F5F682',
    lastMoveDark: '#B9CA43',
    dotColor: 'rgba(0, 0, 0, 0.25)',
  },
  {
    id: 'midnight',
    name: 'Midnight Nebula',
    description: 'Cosmic slate — keeps the fire-vs-ice soul',
    lightSquare: '#8E9AAF',
    darkSquare: '#3D4A63',
    frameColor: '#1A2332',
    isDark: true,
    pieces: {
      whiteFill: '#EDEFF5',
      whiteStroke: '#1A2332',
      blackFill: '#1A2332',
      blackStroke: '#EDEFF5',
    },
    selectColor: 'rgba(0, 245, 212, 0.45)',
    lastMoveLight: '#A8C0E0',
    lastMoveDark: '#5A7295',
    dotColor: 'rgba(0, 245, 212, 0.35)',
  },
  {
    id: 'walnut',
    name: 'Walnut',
    description: 'Warm wooden tournament board',
    lightSquare: '#F0D9B5',
    darkSquare: '#B58863',
    frameColor: '#5D4037',
    isDark: false,
    pieces: {
      whiteFill: '#FAFAFA',
      whiteStroke: '#3E2723',
      blackFill: '#3E2723',
      blackStroke: '#FAFAFA',
    },
    selectColor: 'rgba(255, 213, 79, 0.65)',
    lastMoveLight: '#F7F08A',
    lastMoveDark: '#D8B84A',
    dotColor: 'rgba(0, 0, 0, 0.25)',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Cool blue-gray, easy on the eyes',
    lightSquare: '#DEE3E6',
    darkSquare: '#8CA2AD',
    frameColor: '#37474F',
    isDark: true,
    pieces: {
      whiteFill: '#F5F7F8',
      whiteStroke: '#263238',
      blackFill: '#263238',
      blackStroke: '#F5F7F8',
    },
    selectColor: 'rgba(255, 213, 79, 0.65)',
    lastMoveLight: '#E8F4F8',
    lastMoveDark: '#9AB8C4',
    dotColor: 'rgba(0, 0, 0, 0.25)',
  },
];

export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}
