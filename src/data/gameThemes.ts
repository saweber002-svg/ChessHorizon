/**
 * Unified Chess Horizon themes — exact artwork edition.
 *
 * One theme = exact board image + exact piece sprites + menu/UI aesthetic,
 * all extracted from Scott's reference images (2026-10-04). There is no
 * mix-and-match: selecting a theme selects the whole package.
 *
 * Board: each theme ships a full board background (empty 8x8 squares plus
 * the ornate frame) as a JPG. `grid` gives the playable 8x8 area as
 * fractions of the image, so pieces and overlays align exactly.
 * Pieces: 12 transparent PNG sprites per theme (w/b × p/n/b/r/q/k),
 * extracted from the reference images.
 */
export interface ThemeBoard {
  /** Board background image (empty squares + frame). */
  image: string;
  /** Playable grid as fractions of the image: left, top, width, height. */
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  /** Selection highlight (applied over the image). */
  selectColor: string;
  /** Last-move highlight (applied over the image). */
  lastMoveColor: string;
  /** Move-dot color. */
  dotColor: string;
  /** Fallback square colors if the image fails to load. */
  lightSquare: string;
  darkSquare: string;
  frameColor: string;
}

export interface ThemePieces {
  /** Base URL for sprites; full URL is `${spriteBase}/${color}_${piece}.png`. */
  spriteBase: string;
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

const BASE = import.meta.env.BASE_URL;

interface BoardGeom {
  x: number;
  y: number;
  w: number;
  h: number;
}

function makeBoard(
  id: string,
  geom: BoardGeom,
  overlay: { selectColor: string; lastMoveColor: string; dotColor: string },
  fallback: { lightSquare: string; darkSquare: string; frameColor: string }
): ThemeBoard {
  return {
    image: `${BASE}boards/${id}.jpg`,
    gridX: geom.x,
    gridY: geom.y,
    gridW: geom.w,
    gridH: geom.h,
    ...overlay,
    ...fallback,
  };
}

function makePieces(id: string): ThemePieces {
  return { spriteBase: `${BASE}pieces/${id}` };
}

/** Sprite URL for a piece. `piece` is like 'wp', 'bk' (color + symbol). */
export function pieceSpriteUrl(theme: GameTheme, piece: string): string {
  return `${theme.pieces.spriteBase}/${piece[0]}_${piece.slice(1)}.png`;
}

export const GAME_THEMES: GameTheme[] = [
  {
    id: 'horizon',
    name: 'Chess Horizon',
    description: 'Fire vs ice — the signature Chess Horizon theme',
    board: makeBoard(
      'horizon',
      { x: 0.0155, y: 0.0157, w: 0.9691, h: 0.9686 },
      {
        selectColor: 'rgba(125, 211, 252, 0.45)',
        lastMoveColor: 'rgba(125, 211, 252, 0.28)',
        dotColor: 'rgba(125, 211, 252, 0.5)',
      },
      { lightSquare: '#334B62', darkSquare: '#1D2C3C', frameColor: '#102233' }
    ),
    pieces: makePieces('horizon'),
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
    description: 'Art-deco gold and navy',
    board: makeBoard(
      'gatsby',
      { x: 0.0582, y: 0.0607, w: 0.8836, h: 0.8786 },
      {
        selectColor: 'rgba(255, 213, 79, 0.5)',
        lastMoveColor: 'rgba(255, 213, 79, 0.3)',
        dotColor: 'rgba(240, 200, 120, 0.55)',
      },
      { lightSquare: '#D3B16D', darkSquare: '#13263B', frameColor: '#142437' }
    ),
    pieces: makePieces('gatsby'),
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
    description: 'Glazed ceramic teal and rust',
    board: makeBoard(
      'terracotta',
      { x: 0.0591, y: 0.0575, w: 0.8818, h: 0.8851 },
      {
        selectColor: 'rgba(255, 213, 79, 0.5)',
        lastMoveColor: 'rgba(255, 213, 79, 0.28)',
        dotColor: 'rgba(0, 0, 0, 0.35)',
      },
      { lightSquare: '#E9CEA6', darkSquare: '#BD6137', frameColor: '#104753' }
    ),
    pieces: makePieces('terracotta'),
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
    board: makeBoard(
      'plum',
      { x: 0.0395, y: 0.0404, w: 0.921, h: 0.9193 },
      {
        selectColor: 'rgba(216, 180, 255, 0.45)',
        lastMoveColor: 'rgba(216, 180, 255, 0.28)',
        dotColor: 'rgba(230, 210, 240, 0.45)',
      },
      { lightSquare: '#B5ADBB', darkSquare: '#452340', frameColor: '#2E1834' }
    ),
    pieces: makePieces('plum'),
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
    board: makeBoard(
      'glacier',
      { x: 0.054, y: 0.0548, w: 0.8919, h: 0.8904 },
      {
        selectColor: 'rgba(125, 211, 252, 0.5)',
        lastMoveColor: 'rgba(125, 211, 252, 0.3)',
        dotColor: 'rgba(160, 220, 250, 0.5)',
      },
      { lightSquare: '#94DDE8', darkSquare: '#0247AE', frameColor: '#013388' }
    ),
    pieces: makePieces('glacier'),
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
    description: 'Tournament forest green',
    board: makeBoard(
      'emerald',
      { x: 0.0419, y: 0.0428, w: 0.9162, h: 0.9145 },
      {
        selectColor: 'rgba(255, 213, 79, 0.55)',
        lastMoveColor: 'rgba(255, 213, 79, 0.3)',
        dotColor: 'rgba(0, 0, 0, 0.35)',
      },
      { lightSquare: '#EDE1BC', darkSquare: '#185439', frameColor: '#185338' }
    ),
    pieces: makePieces('emerald'),
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
    description: 'Lacquered crimson and cream',
    board: makeBoard(
      'crimson',
      { x: 0.0223, y: 0.0223, w: 0.9553, h: 0.9553 },
      {
        selectColor: 'rgba(255, 120, 120, 0.45)',
        lastMoveColor: 'rgba(255, 120, 120, 0.28)',
        dotColor: 'rgba(255, 180, 180, 0.45)',
      },
      { lightSquare: '#690D10', darkSquare: '#171B1E', frameColor: '#5A0A0A' }
    ),
    pieces: makePieces('crimson'),
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
