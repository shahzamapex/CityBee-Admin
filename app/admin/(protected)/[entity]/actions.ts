'use server';

import { getAdminClient } from '@/lib/supabase';
import { adminDelete } from '@/lib/backend';
import { requireAdmin } from '@/lib/auth';
import { getEntity } from '@/lib/entities';
import { formToPayload } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/** Kind-specific form fields that live in extension tables, not businesses. */
const EXTENSION_KEYS = [
  'category', 'doctorName', 'specialization', 'qualification', 'experienceYears', 'consultationFee',
  'cuisine', 'vegType', 'priceRange', 'hotelType', 'checkInTime', 'checkOutTime', 'amenities',
] as const;

/** "12:00 PM" / "23:45" → Postgres time string; null when unparsable. */
function toTime(s: unknown): string | null {
  if (typeof s !== 'string' || !s.trim()) return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}:00`;
}

type Ext = Partial<Record<(typeof EXTENSION_KEYS)[number], unknown>>;

/** Splits the form payload into business columns + extension extras. */
function splitPayload(payload: Record<string, unknown>): {
  base: Record<string, unknown>;
  ext: Ext;
} {
  const base: Record<string, unknown> = {};
  const ext: Ext = {};
  for (const [k, v] of Object.entries(payload)) {
    if ((EXTENSION_KEYS as readonly string[]).includes(k)) ext[k as keyof Ext] = v;
    else base[k] = v;
  }
  return { base, ext };
}

/** City fields from the LocationPicker → cities upsert → businesses.city_id. */
async function applyCity(
  base: Record<string, unknown>,
  form: FormData,
): Promise<void> {
  const name = String(form.get('city_name') ?? '').trim();
  if (!name) return;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const lat = Number(form.get('city_lat'));
  const lng = Number(form.get('city_lng'));
  const values: Record<string, unknown> = {
    slug,
    name,
    state_region: String(form.get('city_state') ?? '').trim() || null,
    country: String(form.get('city_country') ?? '').trim() || null,
    country_code: String(form.get('city_country_code') ?? '').trim() || null,
    latitude: Number.isFinite(lat) && lat !== 0 ? lat : null,
    longitude: Number.isFinite(lng) && lng !== 0 ? lng : null,
    google_place_id: String(form.get('city_place_id') ?? '').trim() || null,
  };
  const { data: city, error } = await getAdminClient()
    .from('cities')
    .upsert(values, { onConflict: 'slug' })
    .select('id')
    .single();
  if (!error && city) base.city_id = city.id;
  // City choice also fills the business's state/country columns.
  const state = String(form.get('city_state') ?? '').trim();
  const country = String(form.get('city_country') ?? '').trim();
  if (state) base.state_region = state;
  if (country) base.country = country;
}

/** Category select ("slug|defaultKind") → kind + geo + place id columns. */
function applyCategory(
  base: Record<string, unknown>,
  form: FormData,
): string | null {
  const raw = String(form.get('category') ?? '');
  if (!raw.includes('|')) return null;
  const [slug, kind] = raw.split('|');
  if (kind) base.kind = kind;

  const lat = Number(form.get('latitude'));
  const lng = Number(form.get('longitude'));
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    base.location = `POINT(${lng} ${lat})`;
  }
  const placeId = String(form.get('googlePlaceId') ?? '').trim();
  if (placeId) base.google_place_id = placeId;
  return slug;
}

/** Combines the country-code select + digits input into "+CCdddd" values. */
function mergePhones(base: Record<string, unknown>, form: FormData): void {
  for (const name of ['phone', 'whatsapp']) {
    const raw = form.get(name);
    if (raw === null) continue; // field not in this form
    const digits = String(raw).replace(/\D/g, '');
    const cc = String(form.get(`${name}_cc`) ?? '+91');
    base[name] = digits ? `${cc}${digits}` : null;
  }
}

/** Writes the kind extension row(s) (doctors/restaurants/hotels + amenities). */
async function upsertExtension(
  businessId: string,
  kind: string,
  ext: Ext,
): Promise<string | null> {
  const client = getAdminClient();
  if (kind === 'doctor' && (ext.specialization || ext.qualification || ext.consultationFee)) {
    const { error } = await client.from('doctors').upsert(
      {
        business_id: businessId,
        name: (ext.doctorName as string) ?? '',
        specialization: (ext.specialization as string) ?? '',
        qualification: (ext.qualification as string) ?? null,
        experience_years:
          ext.experienceYears != null && ext.experienceYears !== ''
            ? Number(ext.experienceYears)
            : null,
        consultation_fee: (ext.consultationFee as string) ?? null,
      },
      { onConflict: 'business_id' },
    );
    if (error) return error.message;
  }
  if (kind === 'restaurant' && (ext.cuisine || ext.vegType || ext.priceRange)) {
    const { error } = await client.from('restaurants').upsert(
      {
        business_id: businessId,
        cuisine: (ext.cuisine as string) ?? null,
        price_range: (ext.priceRange as string) ?? null,
        veg_type: (ext.vegType as string) ?? 'mixed',
      },
      { onConflict: 'business_id' },
    );
    if (error) return error.message;
  }
  if (kind === 'hotel' && (ext.hotelType || ext.priceRange)) {
    const { data: hotel, error: hotelError } = await client
      .from('hotels')
      .upsert(
        {
          business_id: businessId,
          hotel_type: (ext.hotelType as string) ?? null,
          price_range: (ext.priceRange as string) ?? null,
          check_in: toTime(ext.checkInTime),
          check_out: toTime(ext.checkOutTime),
        },
        { onConflict: 'business_id' },
      )
      .select('id')
      .single();
    if (hotelError) return hotelError.message;

    const list =
      typeof ext.amenities === 'string'
        ? ext.amenities.split(',').map((a) => a.trim()).filter(Boolean).slice(0, 12)
        : [];
    if (hotel && list.length > 0) {
      await client.from('hotel_amenities').delete().eq('hotel_id', hotel.id);
      const { error: amenityError } = await client
        .from('hotel_amenities')
        .insert(list.map((amenity) => ({ hotel_id: hotel.id, amenity })));
      if (amenityError) return amenityError.message;
    }
  }
  return null;
}

/** Links the business to the chosen category slug (replaces old links). */
async function linkCategory(businessId: string, slug: string): Promise<string | null> {
  const client = getAdminClient();
  const { data: category } = await client
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (!category) return null;
  await client.from('business_categories').delete().eq('business_id', businessId);
  const { error } = await client
    .from('business_categories')
    .insert({ business_id: businessId, category_id: category.id });
  if (error && !error.message.includes('duplicate')) return error.message;
  return null;
}

export async function createRow(entityKey: string, form: FormData): Promise<void> {
  await requireAdmin();
  const entity = getEntity(entityKey);
  if (!entity) throw new Error('Unknown entity');

  const payload = formToPayload(entity, form, true);

  if (entityKey === 'businesses') {
    const { base, ext } = splitPayload(payload);
    mergePhones(base, form);
    const categorySlug = applyCategory(base, form);
    await applyCity(base, form);
    const { data: row, error } = await getAdminClient()
      .from('businesses')
      .insert(base)
      .select('id')
      .single();
    if (error || !row) {
      redirect(`/admin/${entityKey}/new?error=${encodeURIComponent(error?.message ?? 'Insert failed')}`);
    }
    const extError = await upsertExtension(row.id, String(base.kind ?? 'service'), ext);
    if (!extError && categorySlug) {
      await linkCategory(row.id, categorySlug);
    }
    if (extError) {
      redirect(`/admin/${entityKey}/new?error=${encodeURIComponent(extError)}`);
    }
    revalidatePath(`/admin/${entityKey}`);
    redirect(`/admin/${entityKey}?created=1`);
  }

  const { error } = await getAdminClient().from(entity.table).insert(payload);
  revalidatePath(`/admin/${entityKey}`);
  if (error) {
    redirect(`/admin/${entityKey}/new?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/admin/${entityKey}?created=1`);
}

export async function updateRow(entityKey: string, id: string, form: FormData): Promise<void> {
  await requireAdmin();
  const entity = getEntity(entityKey);
  if (!entity) throw new Error('Unknown entity');

  const payload = formToPayload(entity, form, true);

  if (entityKey === 'businesses') {
    const { base, ext } = splitPayload(payload);
    mergePhones(base, form);
    const categorySlug = applyCategory(base, form);
    await applyCity(base, form);
    const { error } = await getAdminClient().from('businesses').update(base).eq('id', id);
    if (error) {
      redirect(`/admin/${entityKey}/${id}/edit?error=${encodeURIComponent(error.message)}`);
    }
    const extError = await upsertExtension(id, String(base.kind ?? 'service'), ext);
    if (!extError && categorySlug) {
      await linkCategory(id, categorySlug);
    }
    if (extError) {
      redirect(`/admin/${entityKey}/${id}/edit?error=${encodeURIComponent(extError)}`);
    }
    revalidatePath(`/admin/${entityKey}`);
    revalidatePath(`/${entityKey}/${id}`);
    redirect(`/admin/${entityKey}?updated=1`);
  }

  const { error } = await getAdminClient()
    .from(entity.table)
    .update(payload)
    .eq('id', id);

  revalidatePath(`/admin/${entityKey}`);
  revalidatePath(`/${entityKey}/${id}`);
  if (error) {
    redirect(`/admin/${entityKey}/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/admin/${entityKey}?updated=1`);
}

export async function deleteRow(entityKey: string, id: string): Promise<void> {
  const session = await requireAdmin();
  const entity = getEntity(entityKey);
  if (!entity) throw new Error('Unknown entity');

  try {
    await adminDelete(entityKey, id, session.jwt);
    revalidatePath(`/admin/${entityKey}`);
    redirect(`/admin/${entityKey}?deleted=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (!message.includes('Cannot') && !message.includes('404')) {
      redirect(`/admin/${entityKey}?error=${encodeURIComponent(message)}`);
    }
  }

  const { error } = await getAdminClient().from(entity.table).delete().eq('id', id);
  revalidatePath(`/admin/${entityKey}`);
  if (error) {
    redirect(`/admin/${entityKey}?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/admin/${entityKey}?deleted=1`);
}
