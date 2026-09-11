import { getAdminClient } from './supabase';
import { getEntity, type Entity, type Field } from './entities';
import { requireAdmin } from './auth';

export interface ListResult {
  rows: Record<string, unknown>[];
  count: number;
  error?: string;
}

/** Coerce a submitted string value back to the field's DB type. */
export function coerceValue(field: Field, raw: FormDataEntryValue | null): unknown {
  const value = typeof raw === 'string' ? raw.trim() : raw;
  switch (field.type) {
    case 'boolean':
      return value === 'on' || value === 'true';
    case 'number': {
      if (value === null || value === '') return null;
      const n = Number(value);
      return Number.isNaN(n) ? null : n;
    }
    case 'uuid':
      return value ? String(value) : null;
    case 'date':
      return value ? String(value) : null;
    default:
      return value === '' ? null : value;
  }
}

/** Build the insert/update payload from a submitted form. */
export function formToPayload(entity: Entity, form: FormData, partial = false): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of entity.fields) {
    // Checkboxes are absent when unchecked — send `false` explicitly.
    const raw = field.type === 'boolean' ? (form.get(field.name) ?? '') : form.get(field.name);
    payload[field.name] = coerceValue(field, raw);
  }
  if (partial) {
    // For updates, drop nulls so unset optional fields stay unchanged.
    for (const key of Object.keys(payload)) {
      if (payload[key] === null) delete payload[key];
    }
  }
  return payload;
}

export async function listEntity(
  entityKey: string,
  opts: { page?: number; perPage?: number; search?: string } = {},
): Promise<ListResult> {
  await requireAdmin();
  const entity = getEntity(entityKey);
  if (!entity) return { rows: [], count: 0, error: 'Unknown entity' };

  const perPage = opts.perPage ?? 25;
  const page = Math.max(1, opts.page ?? 1);

  let query = getAdminClient()
    .from(entity.table)
    .select('*', { count: 'exact' })
    .order(entity.defaultOrder.column, { ascending: entity.defaultOrder.ascending })
    .range((page - 1) * perPage, page * perPage - 1);

  if (opts.search) {
    query = query.ilike(entity.nameField, `%${opts.search}%`);
  }

  const { data, count, error } = await query;
  if (error) return { rows: [], count: 0, error: error.message };
  return { rows: data ?? [], count: count ?? 0 };
}

export async function getRow(entityKey: string, id: string): Promise<Record<string, unknown> | null> {
  await requireAdmin();
  const entity = getEntity(entityKey);
  if (!entity) return null;
  const { data } = await getAdminClient().from(entity.table).select('*').eq('id', id).single();
  return data;
}

/** Resolve lookup labels (e.g. business_id → business name) for the list. */
export async function resolveLookups(
  entity: Entity,
  rows: Record<string, unknown>[],
): Promise<Record<string, Record<string, string>>> {
  const result: Record<string, Record<string, string>> = {};
  for (const lookup of entity.lookups ?? []) {
    const ids = [
      ...new Set(
        rows
          .map((row) => row[lookup.field])
          .filter((value): value is string => typeof value === 'string'),
      ),
    ];
    if (ids.length === 0) {
      result[lookup.field] = {};
      continue;
    }
    const { data } = await getAdminClient()
      .from(lookup.table)
      .select(`id, ${lookup.label}`)
      .in('id', ids);
    const map: Record<string, string> = {};
    for (const item of (data ?? []) as unknown as Record<string, unknown>[][]) {
      const record = item as unknown as Record<string, unknown>;
      map[String(record.id)] = String(record[lookup.label] ?? '—');
    }
    result[lookup.field] = map;
  }
  return result;
}

/** Options for uuid-select fields (e.g. pick a business for an offer). */
export async function getSelectOptions(field: Field): Promise<{ value: string; label: string }[]> {
  if (field.type === 'category') {
    const { data } = await getAdminClient()
      .from('categories')
      .select('slug, name, default_kind')
      .eq('is_active', true)
      .order('sort_order');
    return ((data ?? []) as unknown as { slug: string; name: string; default_kind?: string }[]).map(
      (c) => ({ value: `${c.slug}|${c.default_kind ?? 'service'}`, label: c.name }),
    );
  }
  if (field.type !== 'uuid' || !field.lookups?.length) return field.options ?? [];
  const lookup = field.lookups[0];
  const { data } = await getAdminClient()
    .from(lookup.table)
    .select(`id, ${lookup.label}`)
    .order(lookup.label)
    .limit(500);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((item) => ({
    value: String(item.id),
    label: String(item[lookup.label] ?? 'Unnamed'),
  }));
}

/**
 * Businesses: merges the kind extension row (doctors/restaurants/hotels +
 * amenities) into the base row so detail/edit views show saved kind
 * details. Mutates and returns the same row object.
 */
export async function mergeKindExtension(
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const kind = typeof row.kind === 'string' ? row.kind : '';
  const id = String(row.id ?? '');
  const client = getAdminClient();

  // Category select value ("slug|defaultKind") from the current link.
  const { data: link } = await client
    .from('business_categories')
    .select('categories(slug, default_kind)')
    .eq('business_id', id)
    .maybeSingle();
  const linked = (link as { categories?: { slug: string; default_kind?: string } } | null)?.categories;
  if (linked) row.category = `${linked.slug}|${linked.default_kind ?? kind ?? 'service'}`;

  // Geography "POINT(lng lat)" (string or GeoJSON) → latitude/longitude.
  const loc = row.location;
  if (typeof loc === 'string') {
    const m = loc.match(/POINT\(([-\d.]+) ([-\d.]+)\)/i);
    if (m) {
      row.longitude = Number(m[1]);
      row.latitude = Number(m[2]);
    }
  } else if (loc && typeof loc === 'object') {
    const c = (loc as { coordinates?: [number, number] }).coordinates;
    if (Array.isArray(c) && c.length === 2) {
      row.longitude = c[0];
      row.latitude = c[1];
    }
  }

  if (kind === 'doctor') {
    const { data } = await client.from('doctors').select('*').eq('business_id', id).maybeSingle();
    if (data) {
      row.doctorName = data.name;
      row.specialization = data.specialization;
      row.qualification = data.qualification;
      row.experienceYears = data.experience_years;
      row.consultationFee = data.consultation_fee;
    }
  } else if (kind === 'restaurant') {
    const { data } = await client.from('restaurants').select('*').eq('business_id', id).maybeSingle();
    if (data) {
      row.cuisine = data.cuisine;
      row.priceRange = data.price_range;
      row.vegType = data.veg_type;
    }
  } else if (kind === 'hotel') {
    const { data } = await client
      .from('hotels')
      .select('*, hotel_amenities(amenity)')
      .eq('business_id', id)
      .maybeSingle();
    if (data) {
      row.hotelType = data.hotel_type;
      row.priceRange = data.price_range;
      row.checkInTime = data.check_in;
      row.checkOutTime = data.check_out;
      row.amenities = Array.isArray(data.hotel_amenities)
        ? (data.hotel_amenities as { amenity: string }[]).map((a) => a.amenity).join(', ')
        : '';
    }
  }
  return row;
}
