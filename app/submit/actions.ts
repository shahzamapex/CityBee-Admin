'use server';

import { getPublicClient } from '@/lib/public-client';

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

/** Category slug → business kind (single picklist drives both). */
const CATEGORY_KIND: Record<string, string> = {
  dining: 'restaurant',
  doctors: 'doctor',
  hotels: 'hotel',
  salons: 'salon',
  barbers: 'salon',
  fashion: 'shop',
  grocery: 'shop',
  malls: 'mall',
  cinemas: 'service',
  heritage: 'shop',
};

/** Country code → expected digit count (mirrors the form dropdown). */
const COUNTRY_DIGITS: Record<string, { min: number; max: number; starts: RegExp }> = {
  '+91': { min: 10, max: 10, starts: /^[6-9]/ },
  '+1': { min: 10, max: 10, starts: /^[2-9]/ },
  '+44': { min: 10, max: 10, starts: /^[7-9]/ },
  '+971': { min: 9, max: 9, starts: /^[5]/ },
  '+966': { min: 9, max: 9, starts: /^[5]/ },
  '+61': { min: 9, max: 9, starts: /^[4]/ },
  '+92': { min: 10, max: 10, starts: /^[3]/ },
  '+977': { min: 10, max: 10, starts: /^[9]/ },
};

/** Allowed Cloudinary-hosted image URLs only. */
function sanitizeImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as { url?: unknown; publicId?: unknown }[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (img) =>
          typeof img?.url === 'string' &&
          /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(img.url) &&
          typeof img?.publicId === 'string',
      )
      .slice(0, 5)
      .map((img) => String(img.url));
  } catch {
    return [];
  }
}

/**
 * Public server action — anyone can submit a listing request.
 * RLS (anon insert-only policy) enforces this server-side; this action
 * validates every field before it reaches Postgres, mirroring the client.
 */
export async function submitBusiness(formData: FormData): Promise<SubmitResult> {
  const get = (name: string) => String(formData.get(name) ?? '').trim();

  const submitter_name = get('submitter_name');
  const submitter_phone = get('submitter_phone');
  const country_code = get('country_code') || '+91';
  const business_name = get('business_name');
  const category = get('category');

  // ── Validation ──────────────────────────────────────────────────────
  if (submitter_name.length < 2) {
    return { ok: false, error: 'Please enter your name.' };
  }

  const digits = submitter_phone.replace(/[^0-9]/g, '');
  const rules = COUNTRY_DIGITS[country_code] ?? { min: 10, max: 10, starts: /^[6-9]/ };
  if (!digits || !rules.starts.test(digits) || digits.length < rules.min || digits.length > rules.max) {
    return { ok: false, error: `Please enter a valid ${country_code} mobile number.` };
  }

  const email = get('submitter_email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  if (!category || !CATEGORY_KIND[category]) {
    return { ok: false, error: 'Please choose a category.' };
  }
  if (business_name.length < 2) {
    return { ok: false, error: 'Please enter the business name.' };
  }
  if (get('address').length < 6) {
    return { ok: false, error: 'Please enter the full address.' };
  }

  const open = get('opening_time');
  const close = get('closing_time');
  if ((open && !close) || (!open && close)) {
    return { ok: false, error: 'Select both opening and closing time.' };
  }

  const website = get('website');
  if (website && !/^https?:\/\/.+\..+/.test(website)) {
    return { ok: false, error: 'Website must be a full URL (https://…).' };
  }

  if (category === 'doctors' && get('specialization').length < 2) {
    return { ok: false, error: 'Please enter your specialization.' };
  }
  if (category === 'hotels' && get('hotel_type').length < 2) {
    return { ok: false, error: 'Please choose the hotel type.' };
  }

  const experience_years = get('experience_years');
  if (experience_years && (!/^\d+$/.test(experience_years) || Number(experience_years) > 60)) {
    return { ok: false, error: 'Experience must be a number of years (0–60).' };
  }

  // ── Category-specific extras ────────────────────────────────────────
  const amenities = formData.getAll('amenities').map(String).filter(Boolean).slice(0, 12);

  // ── Insert (RLS: anon may only insert here) ────────────────────────
  const { error } = await getPublicClient().from('business_submissions').insert({
    submitter_name,
    submitter_phone: `${country_code}${digits}`,
    submitter_email: email || null,
    business_name,
    kind: CATEGORY_KIND[category],
    category_slug: category,
    tagline: get('tagline'),
    description: get('description'),
    phone: `${country_code}${digits}`,
    address: get('address'),
    locality: get('locality') || null,
    city_slug: get('city_slug') || 'moradabad',
    opening_hours: open && close ? `${open} – ${close}` : null,
    website: website || null,
    // Doctor extras
    specialization: category === 'doctors' ? get('specialization') : null,
    qualification: category === 'doctors' ? get('qualification') || null : null,
    experience_years: category === 'doctors' && experience_years ? Number(experience_years) : null,
    consultation_fee: category === 'doctors' ? get('consultation_fee') || null : null,
    // Restaurant extras
    cuisine: category === 'dining' ? get('cuisine') || null : null,
    price_range: category === 'dining' || category === 'hotels' ? get('price_range') || null : null,
    veg_type: category === 'dining' ? get('veg_type') || null : null,
    // Hotel extras
    hotel_type: category === 'hotels' ? get('hotel_type') : null,
    check_in_time: category === 'hotels' ? get('check_in_time') || null : null,
    check_out_time: category === 'hotels' ? get('check_out_time') || null : null,
    amenities: category === 'hotels' && amenities.length > 0 ? amenities.join(', ') : null,
    // Images (validated Cloudinary URLs)
    image_urls: sanitizeImages(get('images_json')).length > 0
      ? JSON.stringify(sanitizeImages(get('images_json')))
      : null,
  });

  if (error) {
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' };
  }
  return { ok: true };
}
