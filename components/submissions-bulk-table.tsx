'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  approveSubmissionsBulk,
  rejectSubmissionsBulk,
} from '@/app/admin/(protected)/[entity]/submission-actions';

export interface PendingSubmission {
  id: string;
  business_name: string;
  kind: string;
  submitter_name: string;
  submitter_phone: string;
  category_slug: string;
  address: string;
  opening_hours: string;
  created_at: string;
}

/**
 * Pending-submissions table with multi-select: check any rows, then
 * Approve Selected (each converts into a live business) or Reject Selected.
 */
export default function BulkReviewTable({
  pending,
  pendingCount,
}: {
  pending: PendingSubmission[];
  pendingCount: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingApi, startTransition] = useTransition();
  const allSelected = pending.length > 0 && selected.size === pending.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(pending.map((p) => p.id)));
  }

  function bulkApprove() {
    const ids = [...selected];
    if (
      ids.length === 0 ||
      !confirm(`Approve ${ids.length} business${ids.length > 1 ? 'es' : ''}? Each will be published live.`)
    ) {
      return;
    }
    startTransition(() => approveSubmissionsBulk(ids));
  }

  function bulkReject() {
    const ids = [...selected];
    if (
      ids.length === 0 ||
      !confirm(`Reject ${ids.length} submission${ids.length > 1 ? 's' : ''}?`)
    ) {
      return;
    }
    startTransition(() => rejectSubmissionsBulk(ids));
  }

  return (
    <div>
      {/* ── Bulk action bar ─────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="font-body text-sm font-bold">
          Pending requests
          <span className="ml-2 rounded-full bg-amber/10 px-2 py-0.5 font-body text-xs font-semibold text-amber">
            {pendingCount}
          </span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={bulkApprove}
            disabled={selected.size === 0 || pendingApi}
            className="rounded-xl bg-emerald px-4 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-emerald/80 disabled:opacity-40"
          >
            ✓ Approve Selected{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
          <button
            onClick={bulkReject}
            disabled={selected.size === 0 || pendingApi}
            className="rounded-xl border border-rose/25 bg-white px-4 py-2 font-body text-sm font-semibold text-rose transition hover:bg-rose/10 disabled:opacity-40"
          >
            Reject Selected{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-stone-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-brand"
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Type / Category</th>
                <th className="px-4 py-3">Submitted by</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm font-medium text-ink-muted">
                    {pendingApi ? 'Working…' : 'No pending requests — all caught up! 🎉'}
                  </td>
                </tr>
              )}
              {pending.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-border-subtle/60 last:border-0 ${
                    selected.has(row.id) ? 'bg-brand-soft/40' : 'hover:bg-canvas'
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="h-4 w-4 accent-brand"
                      aria-label={`Select ${row.business_name}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold">{row.business_name}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {row.kind}
                    {row.category_slug ? ` · ${row.category_slug}` : ''}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {row.submitter_name}
                    <div className="text-xs text-ink-muted">{row.submitter_phone}</div>
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-ink-soft" title={row.address}>
                    {row.address || '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{row.opening_hours || '—'}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link
                      href={`/admin/submissions/${row.id}`}
                      className="rounded-lg px-2.5 py-1.5 font-body text-xs font-semibold text-ink-soft transition hover:text-brand"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/submissions/${row.id}/edit`}
                      className="ml-1 rounded-lg px-2.5 py-1.5 font-body text-xs font-semibold text-brand transition hover:bg-brand-soft/50"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/submissions/${row.id}`}
                      className="ml-1 rounded-lg px-2.5 py-1.5 font-body text-xs font-semibold text-rose transition hover:bg-rose/10"
                      title="Open detail to delete"
                    >
                      Delete
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
