/**
 * Unified Chess Horizon themes.
 *
 * One theme = board colors + piece paint + menu/UI aesthetic.
 * There is no mix-and-match on color: selecting a theme selects the whole
 * package. The piece *silhouette* (Staunton / Alpha / Pirouetti / Chessnut)
 * remains an independent user choice — every theme's paint (gradients,
 * metallic trim, texture filters, glows) applies to any silhouette.
 *
 * Piece artwork was rebuilt from Scott's reference images (2026-10-04):
 * solid metallic gold vs ivory (Gatsby), flat ceramic teal/rust with cream
 * outlines (Terracotta), engraved inner linework (Plum), neon rims (Glacier,
 * Horizon), flat outlined silhouettes (Emerald, Crimson).
 */
import type { PieceStyleId, PieceThemeColors } from '@/components/pieceStyles';

export interface ThemeBoard {
  lightSquare: string;
  darkSquare: string;
  frameColor: string;
  selectColor: string;
  lastMoveLight: string;
  lastMoveDark: string;
  dotColor: string;
}

export interface ThemePieces extends PieceThemeColors {
  /**
   * Signature silhouette used for this theme's previews and as the default
   * suggestion. The user may still pick any of the four designs.
   */
  styleId: PieceStyleId;
  whiteGlow: string | null;
  blackGlow: string | null;
  glowBlur: number;
  /**
   * Optional SVG <defs> (gradients/filters), injected into each piece SVG.
   * IDs must be unique per theme (prefix with the theme id).
   */
  defs?: string;
}

export interface ThemeUI {
  /** Page background */
  bg: string;
  /** Cards, menus, dialogs */
  panel: string;
  /** Borders and rings on panels */
  border: string;
  /** Primary text */
  text: string;
  /** Secondary text */
  muted: string;
  /** Primary accent (buttons, highlights, active rings) */
  accent: string;
  /** Text on top of the accent color */
  accentInk: string;
  /** Soft accent wash (badges, selected rows) */
  accentSoft: string;
}

export interface GameTheme {
  id: string;
  name: string;
  description: string;
  board: ThemeBoard;
  pieces: ThemePieces;
  ui: ThemeUI;
}

const vgrad = (id: string, stops: string): string =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`;

const stop = (offset: string, color: string): string =>
  `<stop offset="${offset}" stop-color="${color}"/>`;

/**
 * 3D metallic emboss: directional specular highlight + soft drop shadow.
 * Color-agnostic — works for both gold and ivory.
 */
const embossFilter = (id: string): string =>
  `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">` +
  `<feGaussianBlur in="SourceAlpha" stdDeviation="0.7" result="blur"/>` +
  `<feSpecularLighting in="blur" surfaceScale="2.2" specularConstant="0.9" specularExponent="16" lighting-color="#ffffff" result="spec">` +
  `<feDistantLight azimuth="235" elevation="55"/></feSpecularLighting>` +
  `<feComposite in="spec" in2="SourceAlpha" operator="in" result="specClip"/>` +
  `<feComposite in="SourceGraphic" in2="specClip" operator="arithmetic" k1="0" k2="1" k3="0.9" k4="0" result="lit"/>` +
  `<feDropShadow in="lit" dx="0" dy="1.2" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.45"/>` +
  `</filter>`;

/**
 * Engraved inner contour line following the piece silhouette,
 * e.g. the light linework inside the Royal Plum pieces.
 */
const innerLineFilter = (id: string, color: string): string =>
  `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">` +
  `<feMorphology in="SourceAlpha" operator="erode" radius="2.2" result="eroded"/>` +
  `<feComposite in="SourceAlpha" in2="eroded" operator="out" result="ring"/>` +
  `<feFlood flood-color="${color}" flood-opacity="0.85" result="lc"/>` +
  `<feComposite in="lc" in2="ring" operator="in" result="line"/>` +
  `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="line"/></feMerge>` +
  `</filter>`;

export const GAME_THEMES: GameTheme[] = [
  {
    id: 'chess-horizon',
    name: 'Chess Horizon',
    description: 'Fire vs ice — the signature Chess Horizon theme',
    board: {
      lightSquare: '#334B62',
      darkSquare: '#1D2C3C',
      frameColor: '#102233',
      selectColor: 'rgba(125, 211, 252, 0.5)',
      lastMoveLight: '#476A8A',
      lastMoveDark: '#2A4258',
      dotColor: 'rgba(125, 211, 252, 0.4)',
    },
    pieces: {
      styleId: 'alpha',
      whiteFill: 'url(#horizon-frost)',
      whiteStroke: '#4DD8FF',
      blackFill: 'url(#horizon-ember)',
      blackStroke: '#FF7A54',
      whiteGlow: '#22D3EE',
      blackGlow: '#FF4757',
      glowBlur: 8,
      defs:
        vgrad('horizon-frost', stop('0', '#EAF5FA') + stop('0.5', '#BDDDF0') + stop('1', '#8FC3D8')) +
        vgrad('horizon-ember', stop('0', '#6E1A26') + stop('0.5', '#47101A') + stop('1', '#220709')),
    },
    ui: {
      bg: '#070C14',
      panel: '#0E1622',
      border: '#1E2C3D',
      text: '#E8F1F8',
      muted: '#8496AC',
      accent: '#22D3EE',
      accentInk: '#04202A',
      accentSoft: 'rgba(34, 211, 238, 0.14)',
    },
  },
  {
    id: 'gatsby',
    name: 'Gatsby Gold',
    description: 'Art-deco solid gold and ivory',
    board: {
      lightSquare: '#D3B16D',
      darkSquare: '#13263B',
      frameColor: '#142437',
      selectColor: 'rgba(255, 213, 79, 0.6)',
      lastMoveLight: '#E0BE76',
      lastMoveDark: '#1F3A5C',
      dotColor: 'rgba(240, 200, 120, 0.4)',
    },
    pieces: {
      styleId: 'staunton',
      whiteFill: 'url(#gatsby-ivory)',
      whiteStroke: '#7A6A44',
      blackFill: 'url(#gatsby-gold)',
      blackStroke: '#5E4517',
      whiteGlow: null,
      blackGlow: null,
      glowBlur: 0,
      whiteFilter: 'url(#gatsby-emboss)',
      blackFilter: 'url(#gatsby-emboss)',
      defs:
        vgrad('gatsby-gold', stop('0', '#F7E2A0') + stop('0.35', '#E3B95C') + stop('0.7', '#B8892F') + stop('1', '#7A5A1E')) +
        vgrad('gatsby-ivory', stop('0', '#FFFDF6') + stop('0.4', '#F4E4B6') + stop('0.75', '#DCC084') + stop('1', '#B8975A')) +
        embossFilter('gatsby-emboss'),
    },
    ui: {
      bg: '#0A0F1C',
      panel: '#131C33',
      border: '#2A3A5E',
      text: '#F2E8D0',
      muted: '#9C8C6E',
      accent: '#D4AF37',
      accentInk: '#1A1405',
      accentSoft: 'rgba(212, 175, 55, 0.14)',
    },
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    description: 'Glazed ceramic teal and rust with cream outlines',
    board: {
      lightSquare: '#E9CEA6',
      darkSquare: '#BD6137',
      frameColor: '#104753',
      selectColor: 'rgba(255, 213, 79, 0.6)',
      lastMoveLight: '#F2DCAE',
      lastMoveDark: '#D3763A',
      dotColor: 'rgba(0, 0, 0, 0.25)',
    },
    pieces: {
      styleId: 'staunton',
      whiteFill: 'url(#terracotta-rust)',
      whiteStroke: '#EAD3AC',
      blackFill: 'url(#terracotta-teal)',
      blackStroke: '#EAD3AC',
      whiteGlow: null,
      blackGlow: null,
      glowBlur: 0,
      defs:
        vgrad('terracotta-rust', stop('0', '#E08A4C') + stop('0.5', '#C06632') + stop('1', '#96501F')) +
        vgrad('terracotta-teal', stop('0', '#2E7185') + stop('0.5', '#1B4F5F') + stop('1', '#0E2E38')),
    },
    ui: {
      bg: '#0D2227',
      panel: '#14343B',
      border: '#2A5560',
      text: '#F7EEDC',
      muted: '#B89B78',
      accent: '#E07B39',
      accentInk: '#2A1508',
      accentSoft: 'rgba(224, 123, 57, 0.14)',
    },
  },
  {
    id: 'plum',
    name: 'Royal Plum',
    description: 'Royal plum with engraved linework',
    board: {
      lightSquare: '#B5ADBB',
      darkSquare: '#452340',
      frameColor: '#2E1834',
      selectColor: 'rgba(216, 180, 255, 0.5)',
      lastMoveLight: '#C6B8D2',
      lastMoveDark: '#5E3A5E',
      dotColor: 'rgba(230, 210, 240, 0.35)',
    },
    pieces: {
      styleId: 'staunton',
      whiteFill: 'url(#plum-light)',
      whiteStroke: '#4A2A4E',
      blackFill: 'url(#plum-dark)',
      blackStroke: '#CDBCE0',
      whiteGlow: null,
      blackGlow: null,
      glowBlur: 0,
      whiteFilter: 'url(#plum-line-w)',
      blackFilter: 'url(#plum-line-b)',
      defs:
        vgrad('plum-light', stop('0', '#F8F3FC') + stop('0.5', '#DCD0E6') + stop('1', '#B9A8CC')) +
        vgrad('plum-dark', stop('0', '#6B3F6E') + stop('0.5', '#4A2A50') + stop('1', '#2E1834')) +
        innerLineFilter('plum-line-w', '#4A2A4E') +
        innerLineFilter('plum-line-b', '#D9C8E6'),
    },
    ui: {
      bg: '#170D20',
      panel: '#241430',
      border: '#43284F',
      text: '#EDE4F2',
      muted: '#A184B4',
      accent: '#C084FC',
      accentInk: '#280E33',
      accentSoft: 'rgba(192, 132, 252, 0.14)',
    },
  },
  {
    id: 'glacier',
    name: 'Glacier',
    description: 'Neon glacier rims',
    board: {
      lightSquare: '#94DDE8',
      darkSquare: '#0247AE',
      frameColor: '#013388',
      selectColor: 'rgba(125, 211, 252, 0.55)',
      lastMoveLight: '#A9DFF2',
      lastMoveDark: '#1A5FAE',
      dotColor: 'rgba(160, 220, 250, 0.4)',
    },
    pieces: {
      styleId: 'alpha',
      whiteFill: 'url(#glacier-ice)',
      whiteStroke: '#1E6FB8',
      blackFill: 'url(#glacier-deep)',
      blackStroke: '#7DD3FC',
      whiteGlow: '#7DD3FC',
      blackGlow: '#38BDF8',
      glowBlur: 8,
      defs:
        vgrad('glacier-ice', stop('0', '#F2FBFE') + stop('0.5', '#C4EAF6') + stop('1', '#93D5E8')) +
        vgrad('glacier-deep', stop('0', '#14509F') + stop('0.5', '#0B3580') + stop('1', '#051F4E')),
    },
    ui: {
      bg: '#050F1B',
      panel: '#0A2033',
      border: '#17456A',
      text: '#E2F4FB',
      muted: '#7BA3BE',
      accent: '#38BDF8',
      accentInk: '#062033',
      accentSoft: 'rgba(56, 189, 248, 0.14)',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Tournament forest green with cream outlines',
    board: {
      lightSquare: '#EDE1BC',
      darkSquare: '#185439',
      frameColor: '#185338',
      selectColor: 'rgba(255, 213, 79, 0.65)',
      lastMoveLight: '#F5ECC8',
      lastMoveDark: '#1A7A4A',
      dotColor: 'rgba(0, 0, 0, 0.25)',
    },
    pieces: {
      styleId: 'staunton',
      whiteFill: 'url(#emerald-pale)',
      whiteStroke: '#185439',
      blackFill: 'url(#emerald-dark)',
      blackStroke: '#EDE1BC',
      whiteGlow: null,
      blackGlow: null,
      glowBlur: 0,
      defs:
        vgrad('emerald-pale', stop('0', '#FDFBF2') + stop('0.5', '#F0E8CC') + stop('1', '#D8C89E')) +
        vgrad('emerald-dark', stop('0', '#235C40') + stop('0.5', '#16402C') + stop('1', '#0B2418')),
    },
    ui: {
      bg: '#08170F',
      panel: '#0E2A1D',
      border: '#1E4D36',
      text: '#F0EFE2',
      muted: '#8AA392',
      accent: '#34D399',
      accentInk: '#052A1A',
      accentSoft: 'rgba(52, 211, 153, 0.14)',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    description: 'Lacquered crimson and cream silhouettes',
    board: {
      lightSquare: '#690D10',
      darkSquare: '#171B1E',
      frameColor: '#5A0A0A',
      selectColor: 'rgba(255, 120, 120, 0.5)',
      lastMoveLight: '#8A2424',
      lastMoveDark: '#2E2E2E',
      dotColor: 'rgba(255, 180, 180, 0.35)',
    },
    pieces: {
      styleId: 'staunton',
      whiteFill: 'url(#crimson-cream)',
      whiteStroke: '#A8825A',
      blackFill: 'url(#crimson-red)',
      blackStroke: '#5E0A0A',
      whiteGlow: null,
      blackGlow: null,
      glowBlur: 0,
      defs:
        vgrad('crimson-cream', stop('0', '#F8EEDB') + stop('0.5', '#E9D4AC') + stop('1', '#C6A172')) +
        vgrad('crimson-red', stop('0', '#DE4444') + stop('0.5', '#B02020') + stop('1', '#7E1212')),
    },
    ui: {
      bg: '#120808',
      panel: '#230F0F',
      border: '#471C1C',
      text: '#F2E2D8',
      muted: '#A98585',
      accent: '#EF4444',
      accentInk: '#2A0808',
      accentSoft: 'rgba(239, 68, 68, 0.14)',
    },
  },
];

export function getGameTheme(id: string): GameTheme {
  return GAME_THEMES.find((t) => t.id === id) ?? GAME_THEMES[0];
}
