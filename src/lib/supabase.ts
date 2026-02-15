import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser client (lazy-initialized, uses anon key)
let _browser: SupabaseClient | null = null;
export function getSupabase() {
  if (!_browser) {
    _browser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _browser;
}

// Server client (uses service role key, bypasses RLS)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
