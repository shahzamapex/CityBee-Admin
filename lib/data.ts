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
