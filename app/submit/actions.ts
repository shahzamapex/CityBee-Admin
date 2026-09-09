'use server';

import { getPublicClient } from '@/lib/public-client';

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

/**
 * Public server action — anyone can submit a listing request.
 * RLS (anon insert-only policy) enforces this server-side; the action
 * validates input before it ever reaches Postgres.
 */
export async function submitBusiness(formData: FormData): Promise<SubmitResult> {
  const get = (name: string) => String(formData.get(name) ?? '').trim();

  const submitter_name = get('submitter_name');
  const submitter_phone = get('submitter_phone');
  const business_name = get('business_name');
  const kind = get('kind') || 'service';
  const city_slug = get('city_slug') || 'moradabad';

  // Validation — required fields.
  if (submitter_name.length < 2) {
    return { ok: false, error: 'Please enter your name.' };
  }
  if (!/^[0-9+\-\s()]{8,15}$/.test(submitter_phone)) {
    return { ok: false, error: 'Please enter a valid phone number.' };
  }
  if (business_name.length < 2) {
    return { ok: false, error: 'Please enter the business name.' };
  }
  const email = get('submitter_email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  const website = get('website');
  if (website && !/^https?:\/\/.+\..+/.test(website)) {
    return { ok: false, error: 'Website must be a full URL (https://…).' };
  }

  const { error } = await getPublicClient().from('business_submissions').insert({
    submitter_name,
    submitter_phone,
    submitter_email: email || null,
    business_name,
    kind,
    category_slug: get('category_slug') || null,
    tagline: get('tagline'),
    description: get('description'),
    phone: get('phone') || submitter_phone,
    whatsapp: get('whatsapp') || null,
    address: get('address'),
    locality: get('locality') || null,
    city_slug,
    opening_hours: get('opening_hours') || null,
    website: website || null,
  });

  if (error) {
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' };
  }
  return { ok: true };
}
