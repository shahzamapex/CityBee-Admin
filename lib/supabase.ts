import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service-role key.
 *
 * Security notes:
 *  - This file must only ever be imported from Server Components / Route
 *    Handlers / Server Actions (never shipped to the browser).
 *  - Every request passes through the `requireAdmin()` gate in
 *    lib/auth.ts, so the key is exercised only behind the admin password.
 *  - RLS is bypassed by design for admin operations, mirroring the
 *    CityBee NestJS backend's own admin pattern.
 */
let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase env vars are not configured');
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
