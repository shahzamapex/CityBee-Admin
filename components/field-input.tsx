'use client';

import type { Field } from '@/lib/entities';

/**
 * One form field input (client-safe) — shared by the list-detail forms
 * and the multi-step wizard. kindOnly fields carry a data attribute and
 * start hidden unless the row's kind matches.
 */
export default function FieldInput({
  field,
  value,
  options,
  hidden,
}: {
  field: Field;
  value: unknown;
  options?: { value: string; label: string }[];
  hidden?: boolean;
}) {
  const inputCls =
    'w-full rounded-lg border border-border-strong bg-white px-3.5 py-2.5 font-body text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15';
  const strValue = value === null || value === undefined ? '' : String(value);

  return (
    <div data-kind-only={field.kindOnly?.join(',')} hidden={hidden || undefined}>
      <label htmlFor={field.name} className="mb-1.5 block font-body text-sm font-semibold text-ink">
        {field.label}
        {field.required && <span className="ml-0.5 text-brand">*</span>}
      </label>

      {field.type === 'boolean' ? (
        <label className="flex items-center gap-2.5 rounded-lg border border-border-strong bg-white px-3.5 py-2.5 font-body text-sm font-medium text-ink-soft">
          <input
            id={field.name}
            name={field.name}
            type="checkbox"
            defaultChecked={value === true}
            className="h-4 w-4 accent-brand"
          />
          {value === true ? 'Enabled' : 'Disabled'}
        </label>
      ) : field.type === 'textarea' ? (
        <textarea
          id={field.name}
          name={field.name}
          defaultValue={strValue}
          required={field.required}
          rows={3}
          placeholder={field.placeholder}
          className={inputCls}
        />
      ) : field.type === 'select' || (field.type === 'uuid' && options?.length) ? (
        <select
          id={field.name}
          name={field.name}
          defaultValue={strValue}
          required={field.required}
          className={inputCls}
        >
          <option value="">— none —</option>
          {(options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={field.name}
          name={field.name}
          type={
            field.type === 'number'
              ? 'number'
              : field.type === 'date'
                ? 'date'
                : field.type === 'url'
                  ? 'url'
                  : 'text'
          }
          step={field.type === 'number' ? 'any' : undefined}
          defaultValue={strValue}
          required={field.required}
          placeholder={field.placeholder}
          className={inputCls}
        />
      )}

      {field.help && <p className="mt-1 font-body text-xs text-ink-muted">{field.help}</p>}
    </div>
  );
}
