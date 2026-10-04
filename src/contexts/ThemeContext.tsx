/**
 * Unified theme context for Chess Horizon.
 *
 * One theme selects everything — board colors, piece design + colors, and the
 * menu/UI aesthetic. There is no mix-and-match.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GAME_THEMES, getGameTheme, type GameTheme } from '@/data/gameThemes';
import { PIECE_STYLES, type PieceStyleId } from '@/components/pieceStyles';
import {
  DEFAULT_EVAL_BAR_POSITION,
  EVAL_BAR_POSITIONS,
  type EvalBarPosition,
} from '@/lib/evalBar';

const THEME_KEY = 'chess_horizon_theme';
const LEGACY_BOARD_KEY = 'chess_horizon_board_theme';
const PIECE_STYLE_KEY = 'chess_horizon_piece_style';
const EVAL_BAR_KEY = 'chess_horizon_eval_bar';

const DEFAULT_THEME = 'chess-horizon';

const CSS_VARS: Array<[string, keyof GameTheme['ui']]> = [
  ['--th-bg', 'bg'],
  ['--th-panel', 'panel'],
  ['--th-border', 'border'],
  ['--th-text', 'text'],
  ['--th-muted', 'muted'],
  ['--th-accent', 'accent'],
  ['--th-accent-ink', 'accentInk'],
  ['--th-accent-soft', 'accentSoft'],
];

function applyUiVars(ui: GameTheme['ui']) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [varName, key] of CSS_VARS) {
    root.style.setProperty(varName, ui[key]);
  }
}

function loadThemeId(): string {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && GAME_THEMES.some((t) => t.id === saved)) return saved;
    // Migrate the legacy separate board-theme choice when it still exists.
    const legacy = localStorage.getItem(LEGACY_BOARD_KEY);
    if (legacy && GAME_THEMES.some((t) => t.id === legacy)) return legacy;
  } catch {
    // ignore
  }
  return DEFAULT_THEME;
}

function load(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

interface ThemeContextValue {
  theme: GameTheme;
  themeId: string;
  setThemeId: (id: string) => void;
  /** Independent piece silhouette choice — every theme's paint works with any design. */
  pieceStyleId: PieceStyleId;
  setPieceStyleId: (id: PieceStyleId) => void;
  evalBarPosition: EvalBarPosition;
  setEvalBarPosition: (position: EvalBarPosition) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(loadThemeId);
  const [pieceStyleId, setPieceStyleIdState] = useState<PieceStyleId>(() => {
    const saved = load(PIECE_STYLE_KEY, 'staunton');
    return PIECE_STYLES.some((s) => s.id === saved) ? (saved as PieceStyleId) : 'staunton';
  });
  const [evalBarPosition, setEvalBarPositionState] = useState<EvalBarPosition>(() => {
    const saved = load(EVAL_BAR_KEY, DEFAULT_EVAL_BAR_POSITION);
    return EVAL_BAR_POSITIONS.includes(saved as EvalBarPosition)
      ? (saved as EvalBarPosition)
      : DEFAULT_EVAL_BAR_POSITION;
  });

  const theme = getGameTheme(themeId);

  // Apply the theme's UI variables to the document root.
  useEffect(() => {
    applyUiVars(theme.ui);
  }, [theme]);

  const setThemeId = useCallback((id: string) => {
    if (GAME_THEMES.some((t) => t.id === id)) {
      setThemeIdState(id);
      save(THEME_KEY, id);
    }
  }, []);

  const setPieceStyleId = useCallback((id: PieceStyleId) => {
    if (PIECE_STYLES.some((s) => s.id === id)) {
      setPieceStyleIdState(id);
      save(PIECE_STYLE_KEY, id);
    }
  }, []);

  const setEvalBarPosition = useCallback((position: EvalBarPosition) => {
    if (EVAL_BAR_POSITIONS.includes(position)) {
      setEvalBarPositionState(position);
      save(EVAL_BAR_KEY, position);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId, pieceStyleId, setPieceStyleId, evalBarPosition, setEvalBarPosition }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
