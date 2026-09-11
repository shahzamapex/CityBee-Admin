'use client';

import { useEffect } from 'react';

/**
 * Client watcher for the Add/Edit Business form: as the `kind` select
 * changes, shows/hides the kind-specific field groups (data-kind-only).
 * Server-rendered initial state already matches the row's kind.
 */
export default function KindFields() {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>('form[data-entity-form]');
    if (!form) return;
    const kindSelect = form.elements.namedItem('kind') as HTMLSelectElement | null;
    if (!kindSelect) return;

    const sync = () => {
      const kind = kindSelect.value;
      form.querySelectorAll<HTMLElement>('[data-kind-only]').forEach((el) => {
        const kinds = (el.dataset.kindOnly ?? '').split(',').filter(Boolean);
        el.hidden = !kinds.includes(kind);
      });
    };

    kindSelect.addEventListener('change', sync);
    sync();
    return () => kindSelect.removeEventListener('change', sync);
  }, []);

  return null;
}
