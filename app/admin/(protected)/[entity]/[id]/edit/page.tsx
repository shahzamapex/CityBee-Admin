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
          className="text-xs font-bold text-slate-400 transition hover:text-[#FF6F00]"
        >
          ← Back to {entity.singular}
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          Edit {entity.singular}
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {String(row[entity.nameField] ?? '')}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <form
        action={submit}
        className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <EntityForm entity={entity} row={row} uuidOptions={uuidOptions} />
        <div className="flex justify-end gap-3 border-t border-stone-100 pt-5">
          <Link
            href={`/admin/${entity.key}`}
            className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-stone-400"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-[#FF6F00] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E65100] active:scale-[0.98]"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
