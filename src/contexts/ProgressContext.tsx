import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { MoveProgress, ProgressState, KingdomId, Tier } from '@/types';
import { calculateTier, KINGDOM_UNLOCK_STARS } from '@/types';
import { syncProgressToSupabase, fetchProgressFromSupabase } from '@/lib/supabaseSync';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'chess_horizon_progress';

const defaultState: ProgressState = {
  totalStars: 0,
  moveProgress: {},
  prestigeStreak: 0,
  unlockedRegions: ['italian', 'wilderness', 'clearing'],
  drillMode: 'random',
  sideMode: 'both',
};

function loadState(): ProgressState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultState, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...defaultState };
}

function saveState(state: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

type Action =
  | { type: 'RECORD_DRILL'; key: string; stars: number }
  | { type: 'SET_DRILL_MODE'; mode: 'random' | 'in-order' }
  | { type: 'SET_SIDE_MODE'; mode: 'white' | 'black' | 'both' }
  | { type: 'RESET_PROGRESS' }
  | { type: 'LOAD_STATE'; state: ProgressState };

function reducer(state: ProgressState, action: Action): ProgressState {
  let newState: ProgressState;

  switch (action.type) {
    case 'RECORD_DRILL': {
      const existing = state.moveProgress[action.key] || {
        stars: 0,
        tier: 0,
        lastDrilled: 0,
        attempts: 0,
      };

      const newStars = Math.max(existing.stars, action.stars);
      const cumulativeStars = newStars;
      const tier = calculateTier(cumulativeStars);
      const attempts = existing.attempts + 1;

      const moveProgress: Record<string, MoveProgress> = {
        ...state.moveProgress,
        [action.key]: {
          stars: newStars,
          tier,
          lastDrilled: Date.now(),
          attempts,
        },
      };

      // Recalculate total stars
      const totalStars = Object.values(moveProgress).reduce(
        (sum, mp) => sum + mp.stars,
        0
      );

      // Check kingdom unlocks
      const unlockedRegions = [...state.unlockedRegions];
      const kingdomEntries = Object.entries(KINGDOM_UNLOCK_STARS) as [
        KingdomId,
        number,
      ][];
      for (const [kingdom, threshold] of kingdomEntries) {
        if (
          !unlockedRegions.includes(kingdom) &&
          totalStars >= threshold
        ) {
          unlockedRegions.push(kingdom);
        }
      }

      // Update streak
      let prestigeStreak = state.prestigeStreak;
      if (action.stars === 0) {
        prestigeStreak = 0;
      } else {
        prestigeStreak += 1;
      }

      newState = {
        ...state,
        moveProgress,
        totalStars,
        unlockedRegions,
        prestigeStreak,
      };
      break;
    }
    case 'SET_DRILL_MODE':
      newState = { ...state, drillMode: action.mode };
      break;
    case 'SET_SIDE_MODE':
      newState = { ...state, sideMode: action.mode };
      break;
    case 'RESET_PROGRESS':
      newState = { ...defaultState };
      break;
    case 'LOAD_STATE':
      newState = action.state;
      break;
    default:
      return state;
  }

  saveState(newState);
  return newState;
}

interface ProgressContextValue {
  state: ProgressState;
  recordDrillResult: (key: string, stars: number) => void;
  setDrillMode: (mode: 'random' | 'in-order') => void;
  setSideMode: (mode: 'white' | 'black' | 'both') => void;
  resetProgress: () => void;
  getMoveProgress: (key: string) => MoveProgress;
  getMasteredCount: (
    openingId: string,
    variationId: string,
    moveCount: number
  ) => number;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);
  const { user, isLoading: authLoading } = useAuth();

  // Load remote progress when user logs in
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchProgressFromSupabase(user.id).then((remoteProgress) => {
        if (remoteProgress) {
          // Merge remote progress with local, preferring remote
          const merged: ProgressState = {
            ...state,
            ...remoteProgress,
          };
          dispatch({
            type: 'LOAD_STATE',
            state: merged,
          });
        }
      });
    }
  }, [user, authLoading]);

  // Sync progress to Supabase whenever it changes
  useEffect(() => {
    if (user && !authLoading) {
      syncProgressToSupabase(user.id, state).catch((error) => {
        console.error('Failed to sync progress:', error);
      });
    }
  }, [state, user, authLoading]);

  const recordDrillResult = useCallback((key: string, stars: number) => {
    dispatch({ type: 'RECORD_DRILL', key, stars });
  }, []);

  const setDrillMode = useCallback((mode: 'random' | 'in-order') => {
    dispatch({ type: 'SET_DRILL_MODE', mode });
    try {
      localStorage.setItem('ch_drill_mode', mode);
    } catch { /* ignore */ }
  }, []);

  const setSideMode = useCallback((mode: 'white' | 'black' | 'both') => {
    dispatch({ type: 'SET_SIDE_MODE', mode });
    try {
      localStorage.setItem('ch_side_mode', mode);
    } catch { /* ignore */ }
  }, []);

  const resetProgress = useCallback(() => {
    dispatch({ type: 'RESET_PROGRESS' });
  }, []);

  const getMoveProgress = useCallback(
    (key: string): MoveProgress => {
      return (
        state.moveProgress[key] || {
          stars: 0,
          tier: 0 as Tier,
          lastDrilled: 0,
          attempts: 0,
        }
      );
    },
    [state.moveProgress]
  );

  const getMasteredCount = useCallback(
    (openingId: string, variationId: string, moveCount: number) => {
      let mastered = 0;
      for (let i = 0; i < moveCount; i++) {
        const key = `${openingId}:${variationId}:${i}`;
        const progress = state.moveProgress[key];
        if (progress && progress.tier === 3) {
          mastered++;
        }
      }
      return mastered;
    },
    [state.moveProgress]
  );

  return (
    <ProgressContext.Provider
      value={{
        state,
        recordDrillResult,
        setDrillMode,
        setSideMode,
        resetProgress,
        getMoveProgress,
        getMasteredCount,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}
