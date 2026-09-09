import { createClient } from '@supabase/supabase-js';

/**
 * Anonymous Supabase client for the public submission form.
 *
 * Uses the anon key only — RLS limits this credential to a single
 * operation: INSERT into business_submissions (no reads, no updates,
 * no access to any other table). The service-role key never ships here.
 */
export function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase env vars are not configured');
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
