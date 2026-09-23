import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured) {
  console.warn('⚠️ Supabase credentials not configured. Auth will be disabled.');
}

function createNoopSupabase() {
  const noop = async () => ({ data: null, error: null });
  const from = () => ({
    upsert: noop,
    select: () => ({
      eq: async () => ({ data: null, error: null, single: async () => ({ data: null, error: null }) }),
    }),
    delete: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
  });

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signUp: noop,
      signInWithPassword: noop,
      signOut: noop,
    },
    from,
  } as any;
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createNoopSupabase();

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          created_at: string;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          avatar_url?: string | null;
        };
      };
      progress: {
        Row: {
          id: string;
          user_id: string;
          total_stars: number;
          prestige_streak: number;
          move_progress: Record<string, any>;
          unlocked_regions: string[];
          drill_mode: 'random' | 'in-order';
          side_mode: 'white' | 'black' | 'both';
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_stars?: number;
          prestige_streak?: number;
          move_progress?: Record<string, any>;
          unlocked_regions?: string[];
          drill_mode?: 'random' | 'in-order';
          side_mode?: 'white' | 'black' | 'both';
        };
      };
    };
  };
};
