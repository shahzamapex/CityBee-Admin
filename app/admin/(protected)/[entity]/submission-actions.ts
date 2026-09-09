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
  // Category-specific extras
  specialization?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  consultation_fee?: string | null;
  cuisine?: string | null;
  price_range?: string | null;
  veg_type?: string | null;
  hotel_type?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  amenities?: string | null;
  image_urls?: string | null;
}

/**
 * Shared conversion: submission row → real business (+ category link,
 * category-specific extension table, images). Used by single and bulk
 * approve.
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
      is_pure_veg: submission.veg_type === 'veg',
    })
    .select('id')
    .single();

  if (insertError) throw new Error(insertError.message);

  // Category link.
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

  // ── Doctor extension row ──────────────────────────────────────────
  if (submission.kind === 'doctor' && submission.specialization) {
    await client.from('doctors').insert({
      business_id: business.id,
      name: submission.business_name,
      specialization: submission.specialization,
      qualification: submission.qualification,
      experience_years: submission.experience_years ?? null,
      consultation_fee: submission.consultation_fee,
      bio: submission.description,
    });
  }

  // ── Restaurant extension row ──────────────────────────────────────
  if (submission.kind === 'restaurant' && (submission.cuisine || submission.veg_type)) {
    await client.from('restaurants').insert({
      business_id: business.id,
      cuisine: submission.cuisine,
      price_range: submission.price_range,
      veg_type: submission.veg_type ?? 'mixed',
    });
  }

  // ── Hotel extension row + amenities ───────────────────────────────
  if (submission.kind === 'hotel' && submission.hotel_type) {
    const { data: hotel, error: hotelError } = await client
      .from('hotels')
      .insert({
        business_id: business.id,
        hotel_type: submission.hotel_type,
        price_range: submission.price_range,
      })
      .select('id')
      .single();
    if (hotelError) throw new Error(hotelError.message);

    if (submission.amenities) {
      const list = submission.amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
        .slice(0, 12);
      if (list.length > 0) {
        await client
          .from('hotel_amenities')
          .insert(list.map((amenity) => ({ hotel_id: hotel.id, amenity })));
      }
    }
  }

  // ── Images → business_images (max 5, first is primary) ────────────
  if (submission.image_urls) {
    try {
      const urls = JSON.parse(submission.image_urls) as string[];
      const valid = urls
        .filter((u) => typeof u === 'string' && u.startsWith('https://'))
        .slice(0, 5);
      if (valid.length > 0) {
        await client.from('business_images').insert(
          valid.map((image_url, index) => ({
            business_id: business.id,
            image_url,
            public_id: null, // linked to submission uploads, not deletable here
            sort_order: index,
            is_primary: index === 0,
          })),
        );
      }
    } catch {
      // Malformed image JSON on an old submission — skip images, keep approval.
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
    redirect(`/admin/submissions?error=${encodeURIComponent('Submission not found')}`);
  }

  try {
    await convertToBusiness(client, submission as unknown as SubmissionRow);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Conversion failed';
    redirect(`/admin/submissions?error=${encodeURIComponent(message)}`);
  }

  await client
    .from('business_submissions')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath('/admin/submissions');
  revalidatePath('/admin/businesses');
  redirect('/admin/submissions?approved=1');
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

  revalidatePath('/admin/submissions');
  revalidatePath('/admin/businesses');
  const message =
    failed > 0 ? `${approved} approved, ${failed} failed` : `${approved} approved`;
  redirect(`/admin/submissions?approved=${encodeURIComponent(message)}`);
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

  revalidatePath('/admin/submissions');
  redirect('/admin/submissions?rejected=1');
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

  revalidatePath('/admin/submissions');
  redirect(`/admin/submissions?rejected=${encodeURIComponent(`${ids.length}`)}`);
}
