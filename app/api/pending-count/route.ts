import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Pending-submission count for the header badge / sidebar pill — fetched
 * client-side after first paint so navigation never waits on it.
 */
export async function GET() {
  try {
    await requireAdmin();
    const { count } = await getAdminClient()
      .from('business_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }
}
