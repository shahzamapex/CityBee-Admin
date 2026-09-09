import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getEntity } from '@/lib/entities';
import { getSelectOptions } from '@/lib/data';
import { createRow } from '../actions';
import EntityForm from '@/components/entity-form';

export const dynamic = 'force-dynamic';

export default async function NewEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { entity: entityKey } = await params;
  const { error } = await searchParams;
  const entity = getEntity(entityKey);
  if (!entity) notFound();

  const uuidOptions: Record<string, { value: string; label: string }[]> = {};
  for (const field of entity.fields) {
    if (field.type === 'uuid') {
      uuidOptions[field.name] = await getSelectOptions(field);
    }
  }

  async function submit(formData: FormData) {
    'use server';
    const { entity: key } = await params;
    await createRow(key, formData);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/${entity.key}`}
          className="text-xs font-bold text-slate-400 transition hover:text-[#FF6F00]"
        >
          ← Back to {entity.title}
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          New {entity.singular}
        </h1>
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
        <EntityForm entity={entity} uuidOptions={uuidOptions} />
        <div className="flex justify-end gap-3 border-t border-stone-100 pt-5">
          <Link
            href={`/${entity.key}`}
            className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-stone-400"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-[#FF6F00] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E65100] active:scale-[0.98]"
          >
            Create {entity.singular}
          </button>
        </div>
      </form>
    </div>
  );
}
