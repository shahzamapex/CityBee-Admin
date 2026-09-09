'use client';

import { useTransition } from 'react';
import {
  approveSubmission,
  rejectSubmission,
} from '@/app/admin/(protected)/[entity]/submission-actions';

/**
 * Submission detail action bar:
 *  • pending → Approve / Reject (with note) / Delete
 *  • approved/rejected → status pill + Delete only
 */
export default function SubmissionDetailActions({
  id,
  businessName,
  status,
  deleteAction,
}: {
  id: string;
  businessName: string;
  status: string;
  deleteAction: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  if (pending) {
    return (
      <div className="mb-4 rounded-lg border border-border-subtle bg-subtle px-4 py-2.5 font-body text-sm font-semibold text-ink-muted">
        Working…
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-white p-3 shadow-sm">
      {status === 'pending' ? (
        <>
          <button
            onClick={() => {
              if (confirm(`Approve "${businessName}" and publish it as a live business?`)) {
                startTransition(() => approveSubmission(id));
              }
            }}
            className="rounded-lg bg-emerald px-4 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-emerald/80"
          >
            ✓ Approve & Publish
          </button>
          <button
            onClick={() => {
              if (confirm(`Reject "${businessName}"?`)) {
                startTransition(() => rejectSubmission(id));
              }
            }}
            className="rounded-lg border border-rose/25 bg-white px-4 py-2 font-body text-sm font-semibold text-rose transition hover:bg-rose/10"
          >
            Reject
          </button>
        </>
      ) : (
        <span
          className={`rounded-full px-3 py-1 font-body text-xs font-bold ${
            status === 'approved' ? 'bg-emerald/10 text-emerald' : 'bg-rose/10 text-rose'
          }`}
        >
          {status === 'approved' ? '✓ Approved & published' : 'Rejected'}
        </span>
      )}

      <form action={deleteAction} className="ml-auto">
        <button
          type="submit"
          onClick={(e) => {
            if (!confirm(`Permanently delete this submission record? This cannot be undone.`)) {
              e.preventDefault();
            }
          }}
          className="rounded-lg border border-rose/25 bg-white px-4 py-2 font-body text-sm font-semibold text-rose transition hover:bg-rose/10"
        >
          Delete Submission
        </button>
      </form>
    </div>
  );
}
