import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEntity } from '@/lib/entities';
import { getRow, getSelectOptions } from '@/lib/data';
import { updateRow } from '../../actions';
import EntityForm from '@/components/entity-form';

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
        action={submit}
        className="space-y-6 rounded-xl border border-border-subtle bg-white p-6 shadow-sm"
      >
        <EntityForm entity={entity} row={row} uuidOptions={uuidOptions} />
        <div className="flex justify-end gap-3 border-t border-stone-100 pt-5">
          <Link
            href={`/admin/${entity.key}`}
            className="rounded-lg border border-border-strong bg-white px-5 py-2.5 font-body text-sm font-semibold text-ink transition hover:bg-subtle"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-brand px-6 py-2.5 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
