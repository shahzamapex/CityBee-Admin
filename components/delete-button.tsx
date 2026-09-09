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
        className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="ml-1 inline-flex items-center gap-1">
      <button
        disabled={pending}
        onClick={() => startTransition(() => deleteAction(entityKey, id))}
        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
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
