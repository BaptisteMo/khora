import { createClient } from '@supabase/supabase-js';

// These types will ensure type safety with Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          host_id: string;
          game_url: string;
          created_at: string;
          ended_at: string | null;
          title: string;
          status: string;
          settings: unknown;
          winner_id: string | null;
        };
        Insert: {
          id?: string;
          host_id: string;
          game_url?: string;
          created_at?: string;
          ended_at?: string | null;
          title: string;
          status?: string;
          settings?: unknown;
          winner_id?: string | null;
        };
        Update: {
          id?: string;
          host_id?: string;
          game_url?: string;
          ended_at?: string | null;
          title?: string;
          status?: string;
          settings?: unknown;
          winner_id?: string | null;
        };
      };
      game_participants: {
        Row: {
          id: string;
          game_id: string;
          user_id: string;
          joined_at: string;
          score: number | null;
          status: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          user_id: string;
          joined_at?: string;
          score?: number | null;
          status?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          user_id?: string;
          score?: number | null;
          status?: string;
        };
      };
    };
  };
};

// Ensure environment variables are available
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a singleton instance of the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to get the current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper function to sign out
export const signOut = async () => {
  return await supabase.auth.signOut();
}; 