import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEntity } from '@/lib/entities';
import { getRow, getSelectOptions } from '@/lib/data';
import { getAdminClient } from '@/lib/supabase';
import { updateRow } from '../../actions';
import FormWizard from '@/components/form-wizard';

export const dynamic = 'force-dynamic';

export default async function EditEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { entity: entityKey, id } = await params;
  const { error } = await searchParams;
  const entity = getEntity(entityKey);
  if (!entity) notFound();

  const row = await getRow(entityKey, id);
  if (!row) notFound();

  // Businesses: merge the kind extension row so the form shows saved
  // doctor/restaurant/hotel details.
  if (entityKey === 'businesses') {
    const client = getAdminClient();
    const kind = typeof row.kind === 'string' ? row.kind : '';
    if (kind === 'doctor') {
      const { data: d } = await client.from('doctors').select('*').eq('business_id', id).maybeSingle();
      if (d) {
        row.doctorName = d.name;
        row.specialization = d.specialization;
        row.qualification = d.qualification;
        row.experienceYears = d.experience_years;
        row.consultationFee = d.consultation_fee;
      }
    } else if (kind === 'restaurant') {
      const { data: r } = await client.from('restaurants').select('*').eq('business_id', id).maybeSingle();
      if (r) {
        row.cuisine = r.cuisine;
        row.priceRange = r.price_range;
        row.vegType = r.veg_type;
      }
    } else if (kind === 'hotel') {
      const { data: h } = await client
        .from('hotels')
        .select('*, hotel_amenities(amenity)')
        .eq('business_id', id)
        .maybeSingle();
      if (h) {
        row.hotelType = h.hotel_type;
        row.priceRange = h.price_range;
        row.checkInTime = h.check_in;
        row.checkOutTime = h.check_out;
        row.amenities = Array.isArray(h.hotel_amenities)
          ? (h.hotel_amenities as { amenity: string }[]).map((a) => a.amenity).join(', ')
          : '';
      }
    }
  }

  const uuidOptions: Record<string, { value: string; label: string }[]> = {};
  for (const field of entity.fields) {
    if (field.type === 'uuid') {
      uuidOptions[field.name] = await getSelectOptions(field);
    }
  }

  async function submit(formData: FormData) {
    'use server';
    const { entity: key, id: rowId } = await params;
    await updateRow(key, rowId, formData);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/admin/${entity.key}/${id}`}
          className="font-body text-xs font-semibold text-ink-muted transition hover:text-brand"
        >
          ← Back to {entity.singular}
        </Link>
        <h1 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-ink">
          Edit {entity.singular}
        </h1>
        <p className="mt-0.5 font-body text-sm text-ink-soft">
          {String(row[entity.nameField] ?? '')}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose/25 bg-rose/10 px-4 py-2.5 font-body text-sm font-semibold text-rose">
          {error}
        </div>
      )}

      <form
        data-entity-form
        action={submit}
        className="space-y-6 rounded-xl border border-border-subtle bg-white p-6 shadow-sm"
      >
        <FormWizard entity={entity} row={row} uuidOptions={uuidOptions} submitLabel="Save Changes"
          cancelHref={`/admin/${entity.key}/${id}`} />
      </form>
    </div>
  );
}
