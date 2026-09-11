import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEntity } from '@/lib/entities';
import { getRow, getSelectOptions, mergeKindExtension } from '@/lib/data';
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
  if (entityKey === 'businesses') await mergeKindExtension(row);

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
