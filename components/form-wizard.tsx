'use client';

import { useState } from 'react';
import type { Entity, Field } from '@/lib/entities';
import FieldInput from '@/components/field-input';

/**
 * Multi-step create/edit form: each step shows a handful of fields so
 * everything fits the viewport without scrolling. Progress bar + step
 * chips at the top, Back/Next at the bottom. Non-active steps stay in
 * the DOM (hidden) so every value submits — required-field validation
 * runs per step on Next, and once more on submit for hidden steps.
 */
export default function FormWizard({
  entity,
  row,
  uuidOptions,
  submitLabel,
}: {
  entity: Entity;
  row?: Record<string, unknown> | null;
  uuidOptions: Record<string, { value: string; label: string }[]>;
  submitLabel: string;
}) {
  const steps = entity.steps
    ? entity.steps.map((step) => ({
        title: step.title,
        fields: step.fields.length
          ? step.fields
              .map((name) => entity.fields.find((f) => f.name === name))
              .filter((f): f is Field => !!f)
          : entity.fields.filter((f) => f.kindOnly?.length),
      }))
    : chunkSteps(entity);

  const total = steps.length;
  const [current, setCurrent] = useState(0);
  const rowKind = typeof row?.kind === 'string' ? row.kind : null;
  const isLast = current === total - 1;

  function next() {
    const form = document.querySelector<HTMLFormElement>('form[data-entity-form]');
    if (!form) return;
    // Validate only the visible step's fields (hidden ones skip via noValidate).
    const fields = steps[current].fields;
    const invalid = fields.some((field) => {
      const el = form.elements.namedItem(field.name) as
        | (HTMLInputElement & { checkValidity: () => boolean })
        | null;
      if (!el || typeof el.checkValidity !== 'function') return false;
      // Skip kindOnly fields hidden for the current kind.
      const wrapper = form.querySelector(`[data-kind-only] input#${field.name}, [data-kind-only] select#${field.name}`)?.closest('[data-kind-only]');
      if (wrapper instanceof HTMLElement && wrapper.hidden) return false;
      return !el.checkValidity();
    });
    if (invalid) {
      form.reportValidity();
      return;
    }
    setCurrent((c) => Math.min(c + 1, total - 1));
  }

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
      {steps.map((step, i) => (
        <div key={step.title} hidden={i !== current || undefined} className="space-y-5">
          {total > 1 && (
            <h2 className="font-headline text-base font-semibold text-ink">{step.title}</h2>
          )}
          {step.fields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              value={row?.[field.name]}
              options={uuidOptions[field.name] ?? field.options}
              hidden={
                field.kindOnly && (!rowKind || !field.kindOnly.includes(rowKind))
                  ? true
                  : undefined
              }
            />
          ))}
          {step.fields.length === 0 && (
            <p className="rounded-lg bg-subtle px-4 py-3 font-body text-sm text-ink-muted">
              Pick a kind first — its details appear here.
            </p>
          )}
        </div>
      ))}

      {/* ── Nav ────────────────────────────────────────────────── */}
      <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-5">
        <button
          type="button"
          onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
          disabled={current === 0}
          className="rounded-lg border border-border-strong bg-white px-5 py-2.5 font-body text-sm font-semibold text-ink transition hover:bg-subtle disabled:invisible"
        >
          ← Back
        </button>
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

function chunkSteps(entity: Entity): { title: string; fields: Field[] }[] {
  const kindFields = entity.fields.filter((f) => f.kindOnly?.length);
  const plain = entity.fields.filter((f) => !f.kindOnly?.length);
  const steps: { title: string; fields: Field[] }[] = [];
  for (let i = 0; i < plain.length; i += 7) {
    steps.push({
      title: steps.length === 0 ? 'Details' : 'More Details',
      fields: plain.slice(i, i + 7),
    });
  }
  if (kindFields.length) steps.push({ title: 'Kind Details', fields: kindFields });
  return steps;
}
