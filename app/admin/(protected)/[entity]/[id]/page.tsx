import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEntity, type Field } from '@/lib/entities';
import { getRow } from '@/lib/data';
import { resolveLookups } from '@/lib/data';
import { deleteRow } from '../actions';
import DeleteButton from '@/components/delete-button';

export const dynamic = 'force-dynamic';

export default async function ViewEntityPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity: entityKey, id } = await params;
  const entity = getEntity(entityKey);
  if (!entity) notFound();

  const row = await getRow(entityKey, id);
  if (!row) notFound();

  const lookups = await resolveLookups(entity, [row]);
  const created = row.created_at ? new Date(String(row.created_at)).toLocaleString() : '—';
  const updated = row.updated_at ? new Date(String(row.updated_at)).toLocaleString() : '—';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/admin/${entity.key}`}
          className="font-body text-xs font-semibold text-ink-muted transition hover:text-brand"
        >
          ← Back to {entity.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-ink">
            {String(row[entity.nameField] ?? entity.singular)}
          </h1>
          <div className="flex gap-2">
            <Link
              href={`/admin/${entity.key}/${id}/edit`}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
            >
              <span className="material-symbols-outlined text-[17px]">edit</span>
              Edit
            </Link>
            <DeleteButton
              entityKey={entity.key}
              id={id}
              name={String(row[entity.nameField] ?? 'this row')}
              deleteAction={deleteRow}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-stone-100">
              <th className="w-40 bg-canvas px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                ID
              </th>
              <td className="px-4 py-3 font-body text-xs tabular-nums text-ink-soft">{String(row.id)}</td>
            </tr>
            {entity.fields.map((field) => (
              <tr key={field.name} className="border-b border-stone-100 last:border-0">
                <th className="w-40 bg-canvas px-4 py-3 text-left align-top font-body text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                  {field.label}
                </th>
                <td className="px-4 py-3">
                  <ViewValue field={field} value={row[field.name]} lookups={lookups} />
                </td>
              </tr>
            ))}
            <tr className="border-t border-stone-100 bg-stone-50/50">
              <th className="px-4 py-2.5 text-left font-body text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                Created
              </th>
              <td className="px-4 py-2.5 font-body text-xs text-ink-muted">{created}</td>
            </tr>
            {row.updated_at !== undefined && (
              <tr className="bg-stone-50/50">
                <th className="px-4 py-2.5 text-left font-body text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                  Updated
                </th>
                <td className="px-4 py-2.5 font-body text-xs text-ink-muted">{updated}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ViewValue({
  field,
  value,
  lookups,
}: {
  field: Field;
  value: unknown;
  lookups: Record<string, Record<string, string>>;
}) {
  if (field.type === 'boolean') {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
          value ? 'bg-emerald/10 text-emerald' : 'bg-subtle text-ink-muted'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (field.type === 'uuid') {
    const label = lookups[field.name]?.[String(value)];
    return <span className="font-medium">{label ?? '—'}</span>;
  }

  if (field.type === 'url' && typeof value === 'string' && value) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="break-all font-medium text-[#FF6F00] underline decoration-orange-200"
      >
        {value}
      </a>
    );
  }

  if (value === null || value === undefined || value === '') {
    return <span className="text-ink-muted">—</span>;
  }

  return <span className="whitespace-pre-wrap text-ink-soft">{String(value)}</span>;
}
