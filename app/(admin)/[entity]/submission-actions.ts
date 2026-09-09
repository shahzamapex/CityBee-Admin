'use server';

import { getAdminClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

interface SubmissionRow {
  id: string;
  business_name: string;
  kind: string;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  address: string | null;
  locality: string | null;
  city_slug: string | null;
  category_slug: string | null;
  opening_hours: string | null;
}

/**
 * Shared conversion: submission row → real business (+ category link).
 * Used by both single and bulk approve.
 */
async function convertToBusiness(
  client: SupabaseClient,
  submission: SubmissionRow,
): Promise<void> {
  const { data: city } = await client
    .from('cities')
    .select('id')
    .eq('slug', submission.city_slug ?? 'moradabad')
    .maybeSingle();

  const slug = String(submission.business_name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

  const { data: business, error: insertError } = await client
    .from('businesses')
    .insert({
      name: submission.business_name,
      slug,
      kind: submission.kind,
      tagline: submission.tagline ?? '',
      description: submission.description ?? '',
      phone: submission.phone,
      whatsapp: submission.whatsapp,
      website: submission.website,
      address: submission.address ?? '',
      locality: submission.locality,
      city_id: city?.id ?? null,
      opening_hours: submission.opening_hours,
      status: 'approved',
      is_verified: false,
    })
    .select('id')
    .single();

  if (insertError) throw new Error(insertError.message);

  if (submission.category_slug) {
    const { data: category } = await client
      .from('categories')
      .select('id')
      .eq('slug', submission.category_slug)
      .maybeSingle();
    if (category) {
      await client.from('business_categories').insert({
        business_id: business.id,
        category_id: category.id,
      });
    }
  }
}

/** Approve a single submission → creates a live business. */
export async function approveSubmission(id: string): Promise<void> {
  await requireAdmin();
  const client = getAdminClient();
  const { data: submission } = await client
    .from('business_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (!submission) {
    redirect(`/submissions?error=${encodeURIComponent('Submission not found')}`);
  }

  try {
    await convertToBusiness(client, submission as unknown as SubmissionRow);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Conversion failed';
    redirect(`/submissions?error=${encodeURIComponent(message)}`);
  }

  await client
    .from('business_submissions')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath('/submissions');
  revalidatePath('/businesses');
  redirect('/submissions?approved=1');
}

/** Bulk approve: converts every selected submission in one go. */
export async function approveSubmissionsBulk(ids: string[]): Promise<void> {
  await requireAdmin();
  if (ids.length === 0) return;
  const client = getAdminClient();

  const { data: submissions } = await client
    .from('business_submissions')
    .select('*')
    .in('id', ids)
    .eq('status', 'pending');

  let approved = 0;
  let failed = 0;
  for (const submission of (submissions ?? []) as unknown as SubmissionRow[]) {
    try {
      await convertToBusiness(client, submission);
      await client
        .from('business_submissions')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', (submission as unknown as { id: string }).id);
      approved++;
    } catch {
      failed++;
    }
  }

  revalidatePath('/submissions');
  revalidatePath('/businesses');
  const message =
    failed > 0 ? `${approved} approved, ${failed} failed` : `${approved} approved`;
  redirect(`/submissions?approved=${encodeURIComponent(message)}`);
}

/** Reject a submission with an optional admin note. */
export async function rejectSubmission(id: string, note?: string): Promise<void> {
  await requireAdmin();
  await getAdminClient()
    .from('business_submissions')
    .update({
      status: 'rejected',
      admin_note: note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  revalidatePath('/submissions');
  redirect('/submissions?rejected=1');
}

/** Bulk reject. */
export async function rejectSubmissionsBulk(ids: string[]): Promise<void> {
  await requireAdmin();
  if (ids.length === 0) return;
  await getAdminClient()
    .from('business_submissions')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    })
    .in('id', ids);

  revalidatePath('/submissions');
  redirect(`/submissions?rejected=${encodeURIComponent(`${ids.length}`)}`);
}
