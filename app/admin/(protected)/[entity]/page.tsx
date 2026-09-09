import { notFound } from 'next/navigation';
import Link from 'next/link';
import { listEntity, resolveLookups } from '@/lib/data';
import { getEntity, type Field } from '@/lib/entities';
import { deleteRow } from './actions';
import DeleteButton from '@/components/delete-button';
import SubmissionActions from '@/components/submission-actions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ entity: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    created?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
}

export default async function EntityListPage({ params, searchParams }: PageProps) {
  const { entity: entityKey } = await params;
  const query = await searchParams;
  const entity = getEntity(entityKey);
  if (!entity) notFound();

  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const { rows, count, error } = await listEntity(entityKey, {
    page,
    search: query.q,
  });
  const lookups = await resolveLookups(entity, rows);
  const perPage = 25;
  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const listFields = entity.fields.filter((f) => f.inList);

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{entity.title}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{entity.description}</p>
        </div>
        <Link
          href={`/admin/${entity.key}/new`}
          className="rounded-xl bg-[#FF6F00] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E65100] active:scale-[0.98]"
        >
          + New {entity.singular}
        </Link>
      </div>

      {/* ── Banners ─────────────────────────────────────────── */}
      {query.created && <Banner tone="success">{entity.singular} created.</Banner>}
      {query.updated && <Banner tone="success">{entity.singular} updated.</Banner>}
      {query.deleted && <Banner tone="success">{entity.singular} deleted.</Banner>}
      {query.error && <Banner tone="error">{query.error}</Banner>}
      {error && !query.error && <Banner tone="error">{error}</Banner>}

      {/* ── Search + count ──────────────────────────────────── */}
      <form className="mb-4 flex items-center gap-3" action={`/admin/${entity.key}`}>
        <input
          type="search"
          name="q"
          defaultValue={query.q ?? ''}
          placeholder={`Search ${entity.title.toLowerCase()}…`}
          className="w-64 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-[#FF6F00] focus:ring-2 focus:ring-[#FF6F00]/20"
        />
        <button className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-[#FF6F00] hover:text-[#FF6F00]">
          Search
        </button>
        <span className="ml-auto text-xs font-semibold text-slate-400">
          {count} total
        </span>
      </form>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                {listFields.map((field) => (
                  <th key={field.name} className="px-4 py-3">
                    {field.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={listFields.length + 1}
                    className="px-4 py-12 text-center text-sm font-medium text-slate-400"
                  >
                    {query.q
                      ? `No ${entity.title.toLowerCase()} match "${query.q}".`
                      : `No ${entity.title.toLowerCase()} yet — create the first one.`}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={String(row.id)}
                  className="border-b border-stone-100 last:border-0 hover:bg-orange-50/40"
                >
                  {listFields.map((field) => (
                    <td key={field.name} className="px-4 py-3 align-middle">
                      <CellValue field={field} row={row} lookups={lookups} />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {entity.key === 'submissions' && row.status === 'pending' && (
                      <span className="mr-2">
                        <SubmissionActions
                          id={String(row.id)}
                          businessName={String(row.business_name ?? '')}
                        />
                      </span>
                    )}
                    <Link
                      href={`/admin/${entity.key}/${row.id}`}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-stone-100 hover:text-[#FF6F00]"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/${entity.key}/${row.id}/edit`}
                      className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#FF6F00] transition hover:bg-orange-100"
                    >
                      Edit
                    </Link>
                    <DeleteButton
                      entityKey={entity.key}
                      id={String(row.id)}
                      name={String(row[entity.nameField] ?? 'this row')}
                      deleteAction={deleteRow}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ──────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/${entity.key}?page=${page - 1}${query.q ? `&q=${encodeURIComponent(query.q)}` : ''}`}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#FF6F00] hover:text-[#FF6F00]"
            >
              ← Prev
            </Link>
          )}
          <span className="text-xs font-semibold text-slate-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/${entity.key}?page=${page + 1}${query.q ? `&q=${encodeURIComponent(query.q)}` : ''}`}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#FF6F00] hover:text-[#FF6F00]"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function CellValue({
  field,
  row,
  lookups,
}: {
  field: Field;
  row: Record<string, unknown>;
  lookups: Record<string, Record<string, string>>;
}) {
  const value = row[field.name];

  if (field.listPill) {
    return value ? (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-600">
        Yes
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-slate-400">
        No
      </span>
    );
  }

  if (field.type === 'uuid') {
    const label = lookups[field.name]?.[String(value)];
    return <span className="font-medium">{label ?? (value ? '…' : '—')}</span>;
  }

  if (field.type === 'select' && typeof value === 'string') {
    const tone: Record<string, string> = {
      approved: 'bg-green-50 text-green-700',
      active: 'bg-green-50 text-green-700',
      pending: 'bg-amber-50 text-amber-700',
      draft: 'bg-stone-100 text-slate-500',
      rejected: 'bg-red-50 text-red-600',
      expired: 'bg-stone-100 text-slate-400',
      inactive: 'bg-stone-100 text-slate-400',
      admin: 'bg-orange-50 text-[#FF6F00]',
    };
    const cls = tone[value] ?? 'bg-stone-100 text-slate-600';
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>
        {field.options?.find((o) => o.value === value)?.label ?? value}
      </span>
    );
  }

  const text =
    value === null || value === undefined || value === ''
      ? '—'
      : String(value);
  return (
    <span
      className={`line-clamp-1 ${field.name === 'name' || field.name === 'title' ? 'font-semibold' : 'text-slate-600'}`}
      title={text}
    >
      {text}
    </span>
  );
}

function Banner({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  const cls =
    tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-red-200 bg-red-50 text-red-700';
  return (
    <div className={`mb-4 rounded-xl border px-4 py-2.5 text-sm font-semibold ${cls}`}>
      {children}
    </div>
  );
}
