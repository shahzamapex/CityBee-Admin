import { notFound } from 'next/navigation';
import Link from 'next/link';
import { listEntity, resolveLookups } from '@/lib/data';
import { getEntity, type Field } from '@/lib/entities';
import { deleteRow } from './actions';
import DeleteButton from '@/components/delete-button';
import SubmissionActions from '@/components/submission-actions';
import PageHeader from '@/components/page-header';

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
    <div className="mx-auto max-w-[1600px]">
      {/* ── Header ──────────────────────────────────────────── */}
      <PageHeader
        title={entity.title}
        description={entity.description}
        actions={
          <Link
            href={`/admin/${entity.key}/new`}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New {entity.singular}
          </Link>
        }
      />

      {/* ── Banners ─────────────────────────────────────────── */}
      {query.created && <Banner tone="success">{entity.singular} created.</Banner>}
      {query.updated && <Banner tone="success">{entity.singular} updated.</Banner>}
      {query.deleted && <Banner tone="success">{entity.singular} deleted.</Banner>}
      {query.error && <Banner tone="error">{query.error}</Banner>}
      {error && !query.error && <Banner tone="error">{error}</Banner>}

      {/* ── Search + count ──────────────────────────────────── */}
      <form className="mb-4 flex items-center gap-3" action={`/admin/${entity.key}`}>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-[18px] text-ink-muted">search</span>
          <input
            type="search"
            name="q"
            defaultValue={query.q ?? ''}
            placeholder={`Search ${entity.title.toLowerCase()}…`}
            className="h-9.5 w-72 rounded-lg border border-border-strong bg-white py-2 pl-9 pr-3.5 font-body text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </div>
        <button className="rounded-lg border border-border-strong bg-white px-4 py-2 font-body text-sm font-semibold text-ink transition hover:bg-subtle">
          Search
        </button>
        <span className="ml-auto font-body text-xs font-semibold text-ink-muted">
          {count} total
        </span>
      </form>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-canvas text-left font-body text-[11px] font-bold uppercase tracking-wide text-ink-soft">
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
                    className="px-4 py-12 text-center font-body text-sm text-ink-muted"
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
                  className="border-b border-border-subtle/60 last:border-0 hover:bg-canvas"
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
                    <span className="inline-flex items-center gap-0.5">
                      <Link
                        href={`/admin/${entity.key}/${row.id}`}
                        title="View details"
                        aria-label="View details"
                        className="rounded-md p-1.5 text-ink-muted transition hover:bg-subtle hover:text-ink"
                      >
                        <span className="material-symbols-outlined text-[17px]">visibility</span>
                      </Link>
                      <Link
                        href={`/admin/${entity.key}/${row.id}/edit`}
                        title="Edit"
                        aria-label="Edit"
                        className="rounded-md p-1.5 text-ink-muted transition hover:bg-brand-soft/60 hover:text-brand"
                      >
                        <span className="material-symbols-outlined text-[17px]">edit</span>
                      </Link>
                      <DeleteButton
                        entityKey={entity.key}
                        id={String(row.id)}
                        name={String(row[entity.nameField] ?? 'this row')}
                        deleteAction={deleteRow}
                      />
                    </span>
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
              className="rounded-lg border border-border-strong bg-white px-3 py-1.5 font-body text-xs font-semibold text-ink transition hover:bg-subtle"
            >
              ← Prev
            </Link>
          )}
          <span className="font-body text-xs font-semibold text-ink-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/${entity.key}?page=${page + 1}${query.q ? `&q=${encodeURIComponent(query.q)}` : ''}`}
              className="rounded-lg border border-border-strong bg-white px-3 py-1.5 font-body text-xs font-semibold text-ink transition hover:bg-subtle"
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
      <span className="inline-flex items-center rounded-full border border-emerald/20 bg-emerald/10 px-2 py-0.5 font-body text-[11px] font-semibold text-emerald">
        Yes
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full border border-border-subtle bg-subtle px-2 py-0.5 font-body text-[11px] font-semibold text-ink-muted">
        No
      </span>
    );
  }

  if (field.type === 'uuid') {
    const label = lookups[field.name]?.[String(value)];
    return <span className="font-body font-medium text-ink">{label ?? (value ? '…' : '—')}</span>;
  }

  if (field.type === 'select' && typeof value === 'string') {
    // UrbanPulse badge system: soft fills + saturated text + hairline border.
    const tone: Record<string, string> = {
      approved: 'border-emerald/20 bg-emerald/10 text-emerald',
      active: 'border-emerald/20 bg-emerald/10 text-emerald',
      pending: 'border-amber/25 bg-amber/10 text-amber',
      draft: 'border-border-subtle bg-subtle text-ink-soft',
      rejected: 'border-rose/20 bg-rose/10 text-rose',
      expired: 'border-border-subtle bg-subtle text-ink-muted',
      inactive: 'border-border-subtle bg-subtle text-ink-muted',
      admin: 'border-brand/25 bg-brand-soft text-brand',
      veg: 'border-emerald/20 bg-emerald/10 text-emerald',
    };
    const cls = tone[value] ?? 'border-border-subtle bg-subtle text-ink-soft';
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-body text-[11px] font-semibold ${cls}`}>
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
      className={`line-clamp-1 font-body ${field.name === 'name' || field.name === 'title' || field.name === 'business_name' ? 'font-semibold text-ink' : 'text-ink-soft'}`}
      title={text}
    >
      {text}
    </span>
  );
}

function Banner({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  const cls =
    tone === 'success'
      ? 'border-emerald/25 bg-emerald/10 text-emerald'
      : 'border-rose/25 bg-rose/10 text-rose';
  return (
    <div className={`mb-4 rounded-lg border px-4 py-2.5 font-body text-sm font-semibold ${cls}`}>
      {children}
    </div>
  );
}
