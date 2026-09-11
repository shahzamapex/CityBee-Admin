'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Entity, Field } from '@/lib/entities';
import FieldInput from '@/components/field-input';

/**
 * Multi-step create/edit form.
 *
 * - Kind-aware: the "Kind Details" step appears only when the selected
 *   kind has kind-specific fields (doctor/restaurant/hotel), so a salon
 *   never sees an empty step.
 * - Enter inside inputs moves to the next step instead of submitting —
 *   the submit button only exists on the last step.
 * - Per-step validation on Next; hidden steps stay mounted so all values
 *   submit. Compact 2-column grid keeps every step viewport-friendly.
 */
export default function FormWizard({
  entity,
  row,
  uuidOptions,
  submitLabel,
  cancelHref,
}: {
  entity: Entity;
  row?: Record<string, unknown> | null;
  uuidOptions: Record<string, { value: string; label: string }[]>;
  submitLabel: string;
  cancelHref?: string;
}) {
  // Category select carries "slug|defaultKind" — kind derives from it.
  const initialCategory = typeof row?.category === 'string' ? row.category : '';
  const [kind, setKind] = useState<string>(
    (typeof row?.kind === 'string' && row.kind) ||
      (initialCategory.includes('|') ? initialCategory.split('|')[1] : ''),
  );
  const [current, setCurrent] = useState(0);

  // Watch the kind/category selects inside this form.
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>('form[data-entity-form]');
    const sel =
      (form?.elements.namedItem('category') as HTMLSelectElement | null) ??
      (form?.elements.namedItem('kind') as HTMLSelectElement | null);
    if (!sel) return;
    const on = () => {
      const v = sel.value;
      setKind(v.includes('|') ? v.split('|')[1] : v);
    };
    sel.addEventListener('change', on);
    return () => sel.removeEventListener('change', on);
  }, []);

  // Kind-specific fields visible for the current kind.
  const kindFields = entity.fields.filter(
    (f) => f.kindOnly?.length && kind && f.kindOnly.includes(kind),
  );

  // Steps: entity config, with the kind step dropped when it has no fields.
  const steps: { title: string; fields: Field[]; kindStep?: boolean }[] = (
    entity.steps
      ? entity.steps.map((step) => ({
          title: step.title,
          kindStep: step.fields.length === 0,
          fields: step.fields.length
            ? step.fields
                .map((name) => entity.fields.find((f) => f.name === name))
                .filter((f): f is Field => !!f)
            : entity.fields.filter((f) => f.kindOnly?.length),
        }))
      : chunkSteps(entity)
  ).filter((step) => (step.kindStep ? kindFields.length > 0 : true));

  const total = steps.length;
  const isLast = current === total - 1;

  useEffect(() => {
    // Clamp when the kind step disappears while standing on it.
    setCurrent((c) => Math.min(c, total - 1));
  }, [total]);

  function next() {
    const form = document.querySelector<HTMLFormElement>('form[data-entity-form]');
    if (!form) return;
    const fields = steps[current]?.fields ?? [];
    const invalid = fields.some((field) => {
      // Virtual location field → validate the picker's required city input.
      if (field.type === 'location') {
        const cityEl = form.elements.namedItem('city_display') as HTMLInputElement | null;
        return !!cityEl && !cityEl.checkValidity();
      }
      const el = form.elements.namedItem(field.name) as
        | (HTMLInputElement & { checkValidity: () => boolean })
        | null;
      if (!el || typeof el.checkValidity !== 'function') return false;
      // Skip kindOnly fields not visible for the current kind.
      if (field.kindOnly?.length && (!kind || !field.kindOnly.includes(kind))) return false;
      return !el.checkValidity();
    });
    if (invalid) {
      form.reportValidity();
      return;
    }
    setCurrent((c) => Math.min(c + 1, total - 1));
  }

  // Enter → next step, and block any submit that isn't from the last
  // step's button (Enter key, autofill, browser quirks — all of it).
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>('form[data-entity-form]');
    if (!form) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.isContentEditable) return;
      e.preventDefault();
      if (current < total - 1) next();
    };
    const onSubmit = (e: SubmitEvent) => {
      if (current < total - 1) {
        e.preventDefault();
        e.stopPropagation();
        next();
      }
    };
    form.addEventListener('keydown', onKey);
    form.addEventListener('submit', onSubmit);
    return () => {
      form.removeEventListener('keydown', onKey);
      form.removeEventListener('submit', onSubmit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, total, kind]);

  return (
    <div>
      {/* ── Progress ──────────────────────────────────────────── */}
      {total > 1 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between font-body text-xs font-semibold">
            <span className="text-ink-muted">
              Step {current + 1} of {total} · {steps[current].title}
            </span>
            <span className="text-brand">{Math.round(((current + 1) / total) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${((current + 1) / total) * 100}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {steps.map((step, i) => (
              <button
                key={step.title}
                type="button"
                onClick={() => i < current && setCurrent(i)}
                disabled={i > current}
                className={`rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold transition ${
                  i === current
                    ? 'border-brand bg-brand-soft text-brand'
                    : i < current
                      ? 'border-border-subtle bg-white text-ink-soft hover:bg-subtle'
                      : 'border-border-subtle bg-subtle/50 text-ink-muted/60'
                }`}
              >
                {i < current ? '✓ ' : ''}
                {step.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Steps — hidden ones stay mounted for submit ─────────── */}
      {steps.map((step, i) => {
        const wideFields = new Set(['description', 'address', 'amenities']);
        const anyWide = step.fields.some((f) => f.type === 'textarea' || wideFields.has(f.name));
        return (
          <div
            key={step.title}
            hidden={i !== current || undefined}
            className={anyWide ? 'space-y-5' : 'grid gap-4 sm:grid-cols-2'}
          >
            {total > 1 && i === current && (
              <h2 className="col-span-full font-headline text-base font-semibold text-ink">
                {step.title}
              </h2>
            )}
            {step.fields
              .filter((field) => field.inForm !== false)
              .map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={row?.[field.name]}
                options={uuidOptions[field.name] ?? field.options}
                lat={row?.latitude}
                lng={row?.longitude}
                city={row?.city_name}
                locality={row?.locality}
                hidden={
                  field.kindOnly && (!kind || !field.kindOnly.includes(kind))
                    ? true
                    : undefined
                }
              />
            ))}
          </div>
        );
      })}

      {/* ── Nav ────────────────────────────────────────────────── */}
      <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
            disabled={current === 0}
            className="rounded-lg border border-border-strong bg-white px-5 py-2.5 font-body text-sm font-semibold text-ink transition hover:bg-subtle disabled:invisible"
          >
            ← Back
          </button>
          {current === 0 && cancelHref && (
            <Link
              href={cancelHref}
              className="font-body text-sm font-semibold text-ink-muted transition hover:text-rose"
            >
              Cancel
            </Link>
          )}
        </div>
        {isLast ? (
          <button
            type="submit"
            className="rounded-lg bg-brand px-6 py-2.5 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
          >
            {submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="rounded-lg bg-brand px-6 py-2.5 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function chunkSteps(entity: Entity): { title: string; fields: Field[]; kindStep?: boolean }[] {
  const kindFields = entity.fields.filter((f) => f.kindOnly?.length);
  const plain = entity.fields.filter((f) => !f.kindOnly?.length);
  const steps: { title: string; fields: Field[]; kindStep?: boolean }[] = [];
  for (let i = 0; i < plain.length; i += 6) {
    steps.push({
      title: steps.length === 0 ? 'Details' : 'More Details',
      fields: plain.slice(i, i + 6),
    });
  }
  if (kindFields.length) steps.push({ title: 'Kind Details', fields: kindFields, kindStep: true });
  return steps;
}
