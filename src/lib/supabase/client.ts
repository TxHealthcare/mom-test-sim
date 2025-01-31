import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required!');
}

// Singleton Supabase instance with cookie handling
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);

export const createClient = () => supabase;