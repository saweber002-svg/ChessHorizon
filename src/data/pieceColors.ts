/**
 * Piece color themes for Chess Horizon.
 *
 * - Plain: no color, no glow — traditional black/white.
 * - Horizon: the Chess Horizon signature — white pieces stay white with a
 *   glowing cyan outline, black pieces stay black with a subtly brighter red
 *   glow. Only available on dark boards.
 * - Emerald/Gold/Violet: white pieces take the color with a subtle glow
 *   (outline stays black); black pieces stay black with the color as outline
 *   plus a subtle glow.
 */
export interface PieceColorTheme {
  id: string;
  name: string;
  description: string;
  whiteFill: string;
  whiteStroke: string;
  blackFill: string;
  blackStroke: string;
  /** Glow color for white pieces, null = no glow */
  whiteGlow: string | null;
  /** Glow color for black pieces, null = no glow */
  blackGlow: string | null;
  /** Glow blur radius in px (subtle) */
  glowBlur: number;
  /** If true, only selectable on dark boards */
  darkBoardsOnly: boolean;
}

export const PIECE_COLOR_THEMES: PieceColorTheme[] = [
  {
    id: 'plain',
    name: 'Plain',
    description: 'No color, no glow — just black and white',
    whiteFill: '#F9F9F9',
    whiteStroke: '#1A1A1A',
    blackFill: '#1A1A1A',
    blackStroke: '#F9F9F9',
    whiteGlow: null,
    blackGlow: null,
    glowBlur: 0,
    darkBoardsOnly: false,
  },
  {
    id: 'horizon',
    name: 'Horizon',
    description: 'Cyan glow on white, red glow on black — dark boards only',
    whiteFill: '#FFFFFF',
    whiteStroke: '#00F5D4',
    blackFill: '#0A0A0A',
    blackStroke: '#FF4757',
    whiteGlow: '#00F5D4',
    blackGlow: '#FF6B7A',
    glowBlur: 5,
    darkBoardsOnly: true,
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Green pieces with a subtle glow',
    whiteFill: '#00D97A',
    whiteStroke: '#1A1A1A',
    blackFill: '#0A0A0A',
    blackStroke: '#00D97A',
    whiteGlow: '#00D97A',
    blackGlow: '#00D97A',
    glowBlur: 4,
    darkBoardsOnly: false,
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Golden pieces with a subtle glow',
    whiteFill: '#F5B942',
    whiteStroke: '#1A1A1A',
    blackFill: '#0A0A0A',
    blackStroke: '#F5B942',
    whiteGlow: '#F5B942',
    blackGlow: '#F5B942',
    glowBlur: 4,
    darkBoardsOnly: false,
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Purple pieces with a subtle glow',
    whiteFill: '#A78BFA',
    whiteStroke: '#1A1A1A',
    blackFill: '#0A0A0A',
    blackStroke: '#A78BFA',
    whiteGlow: '#A78BFA',
    blackGlow: '#A78BFA',
    glowBlur: 4,
    darkBoardsOnly: false,
  },
];

export function getPieceColorTheme(id: string): PieceColorTheme {
  return PIECE_COLOR_THEMES.find((t) => t.id === id) ?? PIECE_COLOR_THEMES[0];
}
