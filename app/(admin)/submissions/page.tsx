import { getAdminClient } from '@/lib/supabase';
import Link from 'next/link';
import BulkReviewTable from '@/components/submissions-bulk-table';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Submissions — CityBee Admin' };

/**
 * Dedicated submissions page (static route takes precedence over the
 * generic [entity] page): pending requests with multi-select bulk
 * approve/reject, plus recent history.
 */
export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string; rejected?: string; error?: string }>;
}) {
  const query = await searchParams;
  const client = getAdminClient();

  const [{ data: pending, count: pendingCount }, { data: reviewed }] = await Promise.all([
    client
      .from('business_submissions')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    client
      .from('business_submissions')
      .select('*')
      .neq('status', 'pending')
      .order('reviewed_at', { ascending: false })
      .limit(15),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Submissions</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Customer requests from the public form — select multiple and approve in bulk.
          </p>
        </div>
        <Link
          href="/submit"
          target="_blank"
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-[#FF6F00] hover:text-[#FF6F00]"
        >
          🔗 View public form ↗
        </Link>
      </div>

      {/* ── Banners ─────────────────────────────────────────── */}
      {query.approved && <Banner tone="success">✓ {query.approved}</Banner>}
      {query.rejected && <Banner tone="success">✓ {query.rejected} rejected</Banner>}
      {query.error && <Banner tone="error">{query.error}</Banner>}

      {/* ── Pending (bulk review) ───────────────────────────── */}
      <BulkReviewTable
        pending={(pending ?? []).map((row) => ({
          id: String(row.id),
          business_name: String(row.business_name ?? ''),
          kind: String(row.kind ?? ''),
          submitter_name: String(row.submitter_name ?? ''),
          submitter_phone: String(row.submitter_phone ?? ''),
          category_slug: String(row.category_slug ?? ''),
          address: String(row.address ?? ''),
          opening_hours: String(row.opening_hours ?? ''),
          created_at: String(row.created_at ?? ''),
        }))}
        pendingCount={pendingCount ?? 0}
      />

      {/* ── Recently reviewed ───────────────────────────────── */}
      {(reviewed ?? []).length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">
            Recently reviewed
          </h2>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Submitted by</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reviewed</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(reviewed ?? []).map((row) => (
                  <tr key={String(row.id)} className="border-b border-stone-100 last:border-0 hover:bg-orange-50/40">
                    <td className="px-4 py-3 font-semibold">{String(row.business_name)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {String(row.submitter_name)} · {String(row.submitter_phone)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          row.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {String(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {row.reviewed_at ? new Date(String(row.reviewed_at)).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/submissions/${String(row.id)}`}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-[#FF6F00]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Banner({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  const cls =
    tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-red-200 bg-red-50 text-red-700';
  return (
    <div className={`mb-4 rounded-xl border px-4 py-2.5 text-sm font-semibold ${cls}`}>{children}</div>
  );
}
