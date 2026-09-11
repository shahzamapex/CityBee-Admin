'use client';

import { useState, useTransition } from 'react';

/**
 * Delete button with a confirmation step — calls the server action only
 * after the user confirms by typing/holding. Keeps destructive operations
 * deliberate.
 */
export default function DeleteButton({
  entityKey,
  id,
  name,
  deleteAction,
}: {
  entityKey: string;
  id: string;
  name: string;
  deleteAction: (entityKey: string, id: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        title="Delete"
        aria-label={`Delete ${name}`}
        className="rounded-md p-1.5 text-ink-muted transition hover:bg-rose/10 hover:text-rose"
      >
        <span className="material-symbols-outlined text-[17px]">delete</span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        disabled={pending}
        onClick={() => startTransition(() => deleteAction(entityKey, id))}
        className="rounded-lg bg-rose px-2.5 py-1.5 font-body text-xs font-semibold text-white transition hover:bg-rose/80 disabled:opacity-50"
        title={`Permanently delete "${name}"`}
      >
        {pending ? 'Deleting…' : 'Confirm'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600"
      >
        ✕
      </button>
    </span>
  );
}
