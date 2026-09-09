'use client';

import { useState, useTransition } from 'react';
import { approveSubmission, rejectSubmission } from '@/app/admin/(protected)/[entity]/submission-actions';

/**
 * Review actions for pending submissions — Approve converts the request
 * into a live business; Reject dismisses it (with optional note).
 */
export default function SubmissionActions({
  id,
  businessName,
}: {
  id: string;
  businessName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState('');

  if (pending) {
    return (
      <span className="inline-flex items-center font-body text-xs font-semibold text-ink-muted">
        Working…
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={() => {
          if (confirm(`Approve "${businessName}" and publish it as a business?`)) {
            startTransition(() => approveSubmission(id));
          }
        }}
        className="rounded-lg bg-emerald px-3 py-1.5 font-body text-xs font-semibold text-white transition hover:bg-emerald/80"
      >
        ✓ Approve
      </button>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-rose transition hover:bg-rose/10"
        >
          Reject
        </button>
      ) : (
        <span className="flex items-center gap-1.5">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note…"
            className="w-36 rounded-lg border border-border-strong px-2 py-1.5 text-xs outline-none focus:border-red-400"
          />
          <button
            onClick={() => startTransition(() => rejectSubmission(id, note || undefined))}
            className="rounded-lg bg-rose px-2.5 py-1.5 font-body text-xs font-semibold text-white transition hover:bg-rose/80"
          >
            Confirm
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="font-body text-xs font-semibold text-ink-muted"
          >
            ✕
          </button>
        </span>
      )}
    </span>
  );
}
