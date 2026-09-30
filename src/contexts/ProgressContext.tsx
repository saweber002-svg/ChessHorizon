import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { MoveProgress, OpeningProgressLocal, ProgressState, KingdomId, TacticalProgressLocal, Tier } from '@/types';
import { calculateTier, KINGDOM_UNLOCK_ORDER } from '@/types';
import { getWatchStatus, isPerfectCompletion, type OpeningProgressSnapshot, type WatchStatus } from '../../shared/progressRules';
import { useAuth } from './AuthContext';
import { trpc } from '@/lib/trpc';

const STORAGE_KEY = 'chess_horizon_progress';

const defaultState: ProgressState = {
  totalStars: 0,
  moveProgress: {},
  prestigeStreak: 0,
  unlockedRegions: ['italian', 'wilderness', 'clearing', 'coaching'],
  drillMode: 'random',
  sideMode: 'both',
  openingProgress: {},
  tacticalProgress: {},
};

function loadState(): ProgressState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const state = { ...defaultState, ...parsed };
      
      // Migration: Ensure default regions are always present
      const defaults: KingdomId[] = ['italian', 'wilderness', 'clearing', 'coaching'];
      defaults.forEach(region => {
        if (!state.unlockedRegions.includes(region)) {
          state.unlockedRegions.push(region);
        }
      });
      
      return state;
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

export type ProgressAction =
  | { type: 'RECORD_DRILL'; key: string; stars: number }
  | { type: 'RECORD_OPENING_COMPLETION'; key: string; isPerfect: boolean }
  | { type: 'RECORD_TACTICAL_COMPLETION'; key: string; isPerfect: boolean }
  | { type: 'CONSUME_WATCH'; key: string }
  | { type: 'SET_DRILL_MODE'; mode: 'random' | 'in-order' }
  | { type: 'SET_SIDE_MODE'; mode: 'white' | 'black' | 'both' }
  | { type: 'RESET_PROGRESS' }
  | { type: 'LOAD_STATE'; state: ProgressState };

function nextOpeningProgress(
  existing: OpeningProgressLocal | undefined,
  isPerfect: boolean,
): OpeningProgressLocal {
  const totalAttempts = (existing?.totalAttempts ?? 0) + 1;
  const perfectStreak = isPerfect ? (existing?.perfectStreak ?? 0) + 1 : 0;
  return {
    totalAttempts,
    perfectStreak,
    tier: calculateTier(perfectStreak),
    lastWatchAttempt: existing?.lastWatchAttempt ?? -1,
  };
}

function nextTacticalProgress(
  existing: TacticalProgressLocal | undefined,
  isPerfect: boolean,
): TacticalProgressLocal {
  const totalAttempts = (existing?.totalAttempts ?? 0) + 1;
  const perfectStreak = isPerfect ? (existing?.perfectStreak ?? 0) + 1 : 0;
  return {
    totalAttempts,
    perfectStreak,
    tier: calculateTier(perfectStreak),
  };
}

function toOpeningSnapshot(existing: OpeningProgressLocal | undefined): OpeningProgressSnapshot {
  return {
    totalAttempts: existing?.totalAttempts ?? 0,
    perfectCompletionStreak: existing?.perfectStreak ?? 0,
    prestigeTier: (existing?.tier ?? 0) as OpeningProgressSnapshot['prestigeTier'],
    lastWatchAttempt: existing?.lastWatchAttempt ?? -1,
  };
}

export function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  let newState: ProgressState;

  switch (action.type) {
    case 'RECORD_DRILL': {
      const existing = state.moveProgress[action.key] || {
        stars: 0,
        tier: 0 as Tier,
        lastDrilled: 0,
        attempts: 0,
        streak: 0,
      };

      // Streak logic from tech spec: 
      // - Increments on 3-star result
      // - Resets to 0 on < 3-star result
      let newStreak = existing.streak || 0;
      if (action.stars === 3) {
        newStreak += 1;
      } else {
        newStreak = 0;
      }

      const newStars = Math.max(existing.stars, action.stars);
      const tier = calculateTier(newStreak);
      const attempts = existing.attempts + 1;

      const moveProgress: Record<string, MoveProgress> = {
        ...state.moveProgress,
        [action.key]: {
          stars: newStars,
          tier,
          lastDrilled: Date.now(),
          attempts,
          streak: newStreak,
        },
      };

      // Recalculate total stars
      const totalStars = Object.values(moveProgress).reduce(
        (sum, mp) => sum + mp.stars,
        0
      );

      // Check kingdom unlocks based on KINGDOM_UNLOCK_ORDER
      const unlockedRegions = [...state.unlockedRegions];
      for (const unlockDef of KINGDOM_UNLOCK_ORDER) {
        // Skip if already unlocked
        if (unlockedRegions.includes(unlockDef.kingdom)) {
          continue;
        }
        
        // Check if total stars threshold is met
        if (totalStars < unlockDef.starThreshold) {
          continue;
        }
        
        // If there's a previous kingdom requirement, check if it's unlocked
        if (unlockDef.previousKingdom && !unlockedRegions.includes(unlockDef.previousKingdom)) {
          continue;
        }
        
        // All conditions met, unlock this kingdom
        unlockedRegions.push(unlockDef.kingdom);
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
    case 'RECORD_OPENING_COMPLETION': {
      const openingProgress = {
        ...(state.openingProgress ?? {}),
        [action.key]: nextOpeningProgress(state.openingProgress?.[action.key], action.isPerfect),
      };
      newState = { ...state, openingProgress };
      break;
    }
    case 'RECORD_TACTICAL_COMPLETION': {
      const tacticalProgress = {
        ...(state.tacticalProgress ?? {}),
        [action.key]: nextTacticalProgress(state.tacticalProgress?.[action.key], action.isPerfect),
      };
      newState = { ...state, tacticalProgress };
      break;
    }
    case 'CONSUME_WATCH': {
      const existing = state.openingProgress?.[action.key];
      const status = getWatchStatus(toOpeningSnapshot(existing));
      if (!status.available) {
        // Quota not earned: leave state untouched.
        return state;
      }
      const openingProgress = {
        ...(state.openingProgress ?? {}),
        [action.key]: {
          ...(existing ?? { perfectStreak: 0, tier: 0 as Tier, lastWatchAttempt: -1 }),
          totalAttempts: existing?.totalAttempts ?? 0,
          lastWatchAttempt: existing?.totalAttempts ?? 0,
        } satisfies OpeningProgressLocal,
      };
      newState = { ...state, openingProgress };
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
  recordOpeningCompletion: (input: {
    openingId: string;
    variationId: string;
    side: 'white' | 'black';
    moveResults: Array<{ moveIndex: number; stars: 0 | 1 | 2 | 3 }>;
    /**
     * When set, this completion belongs to a tactical drill (tactic line id),
     * not the opening drill: it feeds tactical prestige instead of opening
     * prestige. The server mutation is still sent with the variation's
     * identity, matching historical behavior.
     */
    tacticKey?: string;
  }) => Promise<void>;
  setDrillMode: (mode: 'random' | 'in-order') => void;
  setSideMode: (mode: 'white' | 'black' | 'both') => void;
  resetProgress: () => void;
  getMoveProgress: (key: string) => MoveProgress;
  getMasteredCount: (
    openingId: string,
    variationId: string,
    moveCount: number
  ) => number;
  /** Local watch quota for anonymous/offline drills. Signed-in drills use the server. */
  getLocalWatchStatus: (openingId: string, variationId: string, side: 'white' | 'black') => WatchStatus;
  /** Consumes one local watch when the quota allows; returns false when it doesn't. */
  consumeLocalWatch: (openingId: string, variationId: string, side: 'white' | 'black') => boolean;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(progressReducer, null, loadState);
  const { user, isLoading: authLoading } = useAuth();
  const recordCompletionMutation = trpc.progress.recordDrillCompletion.useMutation();
  const latestState = useRef(state);

  useEffect(() => {
    latestState.current = state;
  }, [state]);

  // Server-authoritative progress is submitted through the tRPC progress API.
  // Local state remains an anonymous/offline cache until completion mutations
  // are wired into each drill surface.
  useEffect(() => {
    if (!authLoading && user) latestState.current = state;
  }, [user, authLoading, state]);

  const recordDrillResult = useCallback((key: string, stars: number) => {
    dispatch({ type: 'RECORD_DRILL', key, stars });
  }, []);

  const recordOpeningCompletion = useCallback(async (input: {
    openingId: string;
    variationId: string;
    side: 'white' | 'black';
    moveResults: Array<{ moveIndex: number; stars: 0 | 1 | 2 | 3 }>;
    tacticKey?: string;
  }) => {
    const isPerfect = isPerfectCompletion(input.moveResults);
    if (input.tacticKey) {
      dispatch({
        type: 'RECORD_TACTICAL_COMPLETION',
        key: `${input.openingId}:${input.variationId}:${input.tacticKey}`,
        isPerfect,
      });
    } else {
      dispatch({
        type: 'RECORD_OPENING_COMPLETION',
        key: `${input.openingId}:${input.variationId}:${input.side}`,
        isPerfect,
      });
    }
    if (!user) return;
    const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    // tacticKey is local-only; the server keeps the historical variation identity.
    const { tacticKey: _localOnly, ...serverInput } = input;
    await recordCompletionMutation.mutateAsync({ ...serverInput, idempotencyKey });
  }, [recordCompletionMutation, user]);

  const getLocalWatchStatus = useCallback(
    (openingId: string, variationId: string, side: 'white' | 'black'): WatchStatus => {
      const key = `${openingId}:${variationId}:${side}`;
      return getWatchStatus(toOpeningSnapshot(latestState.current.openingProgress?.[key]));
    },
    []
  );

  const consumeLocalWatch = useCallback(
    (openingId: string, variationId: string, side: 'white' | 'black'): boolean => {
      const key = `${openingId}:${variationId}:${side}`;
      const existing = latestState.current.openingProgress?.[key];
      if (!getWatchStatus(toOpeningSnapshot(existing)).available) return false;
      dispatch({ type: 'CONSUME_WATCH', key });
      return true;
    },
    []
  );

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
          streak: 0,
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
        // Mastered now means Tier 4 (Master) according to the new spec
        if (progress && progress.tier === 4) {
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
        recordOpeningCompletion,
        setDrillMode,
        setSideMode,
        resetProgress,
        getMoveProgress,
        getMasteredCount,
        getLocalWatchStatus,
        consumeLocalWatch,
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
