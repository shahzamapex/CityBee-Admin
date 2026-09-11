import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEntity, getFormSteps, type Field } from '@/lib/entities';
import { getRow, resolveLookups, mergeKindExtension } from '@/lib/data';
import { deleteRow } from '../actions';
import DeleteButton from '@/components/delete-button';

export const dynamic = 'force-dynamic';

/**
 * Compact entity detail view: a header card (name, badges, timestamps,
 * controls) plus sectioned field groups from the same step config the
 * wizard uses — two columns per section, long text full-width. Kind
 * extension details (doctor/restaurant/hotel) merge into the row.
 */
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

  if (entityKey === 'businesses') await mergeKindExtension(row);
  const lookups = await resolveLookups(entity, [row]);

  const sections = getFormSteps(entity).filter(
    (s) => s.fields.length > 0,
  );
  const wideFields = new Set(['description', 'address', 'amenities', 'message', 'review_text']);
  const created = row.created_at ? new Date(String(row.created_at)).toLocaleString() : '—';
  const updated = row.updated_at ? new Date(String(row.updated_at)).toLocaleString() : '—';
  const kind = typeof row.kind === 'string' ? row.kind : null;
  const status = typeof row.status === 'string' ? row.status : null;

  return (
    <div className="mx-auto max-w-4xl">
      {/* ── Header card ────────────────────────────────────────── */}
      <div className="mb-5">
        <Link
          href={`/admin/${entity.key}`}
          className="font-body text-xs font-semibold text-ink-muted transition hover:text-brand"
        >
          ← Back to {entity.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-headline text-2xl font-semibold tracking-tight text-ink">
                {String(row[entity.nameField] ?? entity.singular)}
              </h1>
              {kind && <KindBadge kind={kind} />}
              {status && <StatusBadge status={status} />}
            </div>
            <p className="mt-1 font-mono text-[11px] text-ink-muted">
              {String(row.id)} · created {created} · updated {updated}
            </p>
          </div>
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

      {/* ── Sectioned field groups (wizard's step config) ───────── */}
      <div className="space-y-4">
        {sections.map((section) => {
          const visible = section.fields.filter(
            (f) =>
              f.type !== 'location' &&
              (!f.kindOnly?.length || (kind && f.kindOnly.includes(kind))),
          );
          if (visible.length === 0) return null;
          return (
            <section
              key={section.title}
              className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm"
            >
              <div className="flex items-center gap-2 border-b border-border-subtle/60 px-5 pb-2.5 pt-3.5">
                <span className="font-headline text-sm font-semibold tracking-tight text-ink">
                  {section.title}
                </span>
                <span className="rounded-full bg-subtle px-2 py-0.5 font-body text-[10px] font-semibold text-ink-muted">
                  {visible.length}
                </span>
              </div>
              <dl className="grid gap-x-6 gap-y-3.5 px-5 py-4 sm:grid-cols-2">
                {visible.map((field) => {
                  const wide =
                    field.type === 'textarea' || wideFields.has(field.name);
                  return (
                    <div
                      key={field.name}
                      className={wide ? 'sm:col-span-2' : undefined}
                    >
                      <dt className="font-body text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">
                        {field.label}
                      </dt>
                      <dd className="mt-0.5">
                        <ViewValue field={field} value={row[field.name]} lookups={lookups} />
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const meta: Record<string, { icon: string; cls: string }> = {
    doctor: { icon: 'medical_services', cls: 'bg-teal-soft text-teal' },
    restaurant: { icon: 'restaurant', cls: 'bg-amber/10 text-amber' },
    hotel: { icon: 'hotel', cls: 'bg-indigo-100 text-indigo-600' },
    salon: { icon: 'spa', cls: 'bg-rose/10 text-rose' },
    shop: { icon: 'storefront', cls: 'bg-brand-soft text-brand' },
    mall: { icon: 'local_mall', cls: 'bg-purple-100 text-purple-600' },
    service: { icon: 'miscellaneous_services', cls: 'bg-subtle text-ink-soft' },
  };
  const m = meta[kind] ?? { icon: 'description', cls: 'bg-subtle text-ink-soft' };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-[11px] font-bold capitalize ${m.cls}`}
    >
      <span className="material-symbols-outlined text-[14px]">{m.icon}</span>
      {kind}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    approved: 'bg-emerald/10 text-emerald',
    active: 'bg-emerald/10 text-emerald',
    pending: 'bg-amber/10 text-amber',
    draft: 'bg-subtle text-ink-soft',
    rejected: 'bg-rose/10 text-rose',
    expired: 'bg-subtle text-ink-muted',
    inactive: 'bg-subtle text-ink-muted',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-body text-[11px] font-bold capitalize ${tone[status] ?? 'bg-subtle text-ink-soft'}`}
    >
      {status}
    </span>
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
  if (field.type === 'category' && typeof value === 'string' && value) {
    const slug = value.split('|')[0];
    return (
      <span className="inline-flex items-center gap-1.5 font-medium capitalize text-ink">
        <span className="material-symbols-outlined text-[15px] text-brand">category</span>
        {slug.replace(/-/g, ' ')}
      </span>
    );
  }

  if (field.type === 'boolean') {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-bold ${
          value ? 'bg-emerald/10 text-emerald' : 'bg-subtle text-ink-muted'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (field.type === 'uuid') {
    const label = lookups[field.name]?.[String(value)];
    return <span className="font-medium text-ink">{label ?? '—'}</span>;
  }

  if (field.type === 'select' && typeof value === 'string' && value) {
    const label = field.options?.find((o) => o.value === value)?.label ?? value;
    return <span className="font-medium text-ink">{label}</span>;
  }

  if ((field.type === 'url' || field.type === 'email') && typeof value === 'string' && value) {
    const href = field.type === 'email' ? `mailto:${value}` : value;
    return (
      <a
        href={href}
        target={field.type === 'url' ? '_blank' : undefined}
        rel="noreferrer"
        className="break-all font-medium text-brand underline decoration-brand/30"
      >
        {value}
      </a>
    );
  }

  if (field.type === 'phone' && typeof value === 'string' && value) {
    return (
      <a
        href={`tel:${value}`}
        className="inline-flex items-center gap-1.5 font-medium text-ink"
      >
        <span className="material-symbols-outlined text-[15px] text-ink-muted">call</span>
        {value}
      </a>
    );
  }

  if (value === null || value === undefined || value === '') {
    return <span className="text-ink-muted/60">—</span>;
  }

  return (
    <span className="whitespace-pre-wrap break-words text-ink-soft">{String(value)}</span>
  );
}
