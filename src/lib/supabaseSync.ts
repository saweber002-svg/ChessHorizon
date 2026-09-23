import { supabase, supabaseConfigured } from './supabaseClient';
import type { ProgressState } from '@/types';

export async function syncProgressToSupabase(userId: string, progress: ProgressState) {
  if (!userId || !supabaseConfigured) return;

  try {
    const { error } = await supabase.from('progress').upsert(
      {
        user_id: userId,
        total_stars: progress.totalStars,
        prestige_streak: progress.prestigeStreak,
        move_progress: progress.moveProgress,
        unlocked_regions: progress.unlockedRegions,
        drill_mode: progress.drillMode,
        side_mode: progress.sideMode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Failed to sync progress:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error syncing progress to Supabase:', error);
  }
}

export async function fetchProgressFromSupabase(userId: string): Promise<ProgressState | null> {
  if (!userId || !supabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected on first login)
      console.error('Failed to fetch progress:', error);
      throw error;
    }

    if (!data) return null;

    return {
      totalStars: data.total_stars || 0,
      moveProgress: data.move_progress || {},
      prestigeStreak: data.prestige_streak || 0,
      unlockedRegions: data.unlocked_regions || [],
      drillMode: data.drill_mode || 'random',
      sideMode: data.side_mode || 'both',
    };
  } catch (error) {
    console.error('Error fetching progress from Supabase:', error);
    return null;
  }
}

export async function deleteAllProgressData(userId: string) {
  if (!userId || !supabaseConfigured) return;

  try {
    const { error } = await supabase.from('progress').delete().eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting progress:', error);
  }
}
