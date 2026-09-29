import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getBoardTheme, type BoardTheme } from '@/data/boardThemes';

const STORAGE_KEY = 'chess_horizon_board_theme';
const DEFAULT_THEME_ID = 'classic';

interface BoardThemeContextValue {
  theme: BoardTheme;
  themeId: string;
  setThemeId: (id: string) => void;
}

const BoardThemeContext = createContext<BoardThemeContextValue | null>(null);

function loadThemeId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch {
    // ignore
  }
  return DEFAULT_THEME_ID;
}

export function BoardThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(loadThemeId);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {
      // ignore
    }
  }, [themeId]);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
  }, []);

  const theme = getBoardTheme(themeId);

  return (
    <BoardThemeContext.Provider value={{ theme, themeId, setThemeId }}>
      {children}
    </BoardThemeContext.Provider>
  );
}

export function useBoardTheme(): BoardThemeContextValue {
  const ctx = useContext(BoardThemeContext);
  if (!ctx) throw new Error('useBoardTheme must be used within BoardThemeProvider');
  return ctx;
}
