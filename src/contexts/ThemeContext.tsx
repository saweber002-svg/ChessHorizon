import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getBoardTheme, type BoardTheme } from '@/data/boardThemes';
import { getPieceColorTheme, type PieceColorTheme } from '@/data/pieceColors';
import { PIECE_STYLES, type PieceStyleId } from '@/components/pieceStyles';
import {
  DEFAULT_EVAL_BAR_POSITION,
  EVAL_BAR_POSITIONS,
  type EvalBarPosition,
} from '@/lib/evalBar';

const BOARD_KEY = 'chess_horizon_board_theme';
const STYLE_KEY = 'chess_horizon_piece_style';
const COLOR_KEY = 'chess_horizon_piece_color';
const EVAL_BAR_KEY = 'chess_horizon_eval_bar';

const DEFAULT_BOARD = 'mono';
const DEFAULT_STYLE: PieceStyleId = 'staunton';
const DEFAULT_COLOR = 'plain';

interface ThemeContextValue {
  // Board theme
  boardTheme: BoardTheme;
  boardThemeId: string;
  setBoardThemeId: (id: string) => void;
  // Piece style
  pieceStyleId: PieceStyleId;
  setPieceStyleId: (id: PieceStyleId) => void;
  // Piece color
  pieceColor: PieceColorTheme;
  pieceColorId: string;
  setPieceColorId: (id: string) => void;
  // Evaluation bar
  evalBarPosition: EvalBarPosition;
  setEvalBarPosition: (position: EvalBarPosition) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [boardThemeId, setBoardThemeIdState] = useState<string>(() => load(BOARD_KEY, DEFAULT_BOARD));
  const [pieceStyleId, setPieceStyleIdState] = useState<PieceStyleId>(
    () => load(STYLE_KEY, DEFAULT_STYLE) as PieceStyleId
  );
  const [pieceColorId, setPieceColorIdState] = useState<string>(() => load(COLOR_KEY, DEFAULT_COLOR));
  const [evalBarPosition, setEvalBarPositionState] = useState<EvalBarPosition>(() => {
    const saved = load(EVAL_BAR_KEY, DEFAULT_EVAL_BAR_POSITION);
    return EVAL_BAR_POSITIONS.includes(saved as EvalBarPosition)
      ? (saved as EvalBarPosition)
      : DEFAULT_EVAL_BAR_POSITION;
  });

  const boardTheme = getBoardTheme(boardThemeId);
  const pieceColor = getPieceColorTheme(pieceColorId);

  // If Horizon color is active but board is not dark, fall back to plain
  useEffect(() => {
    if (pieceColor.darkBoardsOnly && !boardTheme.isDark) {
      setPieceColorIdState(DEFAULT_COLOR);
      save(COLOR_KEY, DEFAULT_COLOR);
    }
  }, [pieceColor.darkBoardsOnly, boardTheme.isDark]);

  const setBoardThemeId = useCallback((id: string) => {
    setBoardThemeIdState(id);
    save(BOARD_KEY, id);
  }, []);

  const setPieceStyleId = useCallback((id: PieceStyleId) => {
    // Validate it's a known style
    if (PIECE_STYLES.some((s) => s.id === id)) {
      setPieceStyleIdState(id);
      save(STYLE_KEY, id);
    }
  }, []);

  const setPieceColorId = useCallback((id: string) => {
    setPieceColorIdState(id);
    save(COLOR_KEY, id);
  }, []);

  const setEvalBarPosition = useCallback((position: EvalBarPosition) => {
    if (EVAL_BAR_POSITIONS.includes(position)) {
      setEvalBarPositionState(position);
      save(EVAL_BAR_KEY, position);
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        boardTheme,
        boardThemeId,
        setBoardThemeId,
        pieceStyleId,
        setPieceStyleId,
        pieceColor,
        pieceColorId,
        setPieceColorId,
        evalBarPosition,
        setEvalBarPosition,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// Backwards compatibility for existing imports
export const BoardThemeProvider = ThemeProvider;
export function useBoardTheme() {
  const { boardTheme, boardThemeId, setBoardThemeId } = useTheme();
  return { theme: boardTheme, themeId: boardThemeId, setThemeId: setBoardThemeId };
}
