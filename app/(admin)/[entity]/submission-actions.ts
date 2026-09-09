'use server';

import { getAdminClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Approve a public submission:
 *  1. Creates a real row in `businesses` (status 'pending' there too, so it
 *     goes through your existing verification flow — or set to 'approved'
 *     directly if you trust the review).
 *  2. Links business_categories when the submission named a category slug.
 *  3. Marks the submission approved with a timestamp.
 */
export async function approveSubmission(id: string): Promise<void> {
  await requireAdmin();
  const client = getAdminClient();

  const { data: submission, error: fetchError } = await client
    .from('business_submissions')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError || !submission) {
    redirect(`/submissions?error=${encodeURIComponent('Submission not found')}`);
  }

  // Resolve the city from the submitted slug (falls back to null → app picks default).
  const { data: city } = await client
    .from('cities')
    .select('id')
    .eq('slug', submission.city_slug)
    .maybeSingle();

  // Generate a slug from the business name.
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
      phone: submission.phone ?? submission.submitter_phone,
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

  if (insertError) {
    redirect(`/submissions?error=${encodeURIComponent(insertError.message)}`);
  }

  // Attach the category when a valid slug was supplied.
  if (submission.category_slug && business) {
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

  await client
    .from('business_submissions')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath('/submissions');
  revalidatePath('/businesses');
  redirect('/submissions?approved=1');
}

/** Reject a submission with an optional admin note. */
export async function rejectSubmission(id: string, note?: string): Promise<void> {
  await requireAdmin();
  const client = getAdminClient();

  await client
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
