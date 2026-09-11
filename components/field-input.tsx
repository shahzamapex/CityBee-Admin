'use client';

import { useEffect, useState } from 'react';
import type { Field } from '@/lib/entities';

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+966', label: '🇸🇦 +966' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+65', label: '🇸🇬 +65' },
  { code: '+61', label: '🇦🇺 +61' },
  { code: '+49', label: '🇩🇪 +49' },
  { code: '+33', label: '🇫🇷 +33' },
  { code: '+62', label: '🇮🇩 +62' },
];

/**
 * One form field input (client-safe) — shared by list-detail forms and
 * the multi-step wizard. Supports text/textarea/number/boolean/select/
 * uuid/url/email/time/phone. Phone renders a country-code select plus a
 * digits-only input; a "Same as phone" checkbox appears on whatsapp-like
 * fields (sameAs: 'phone') and mirrors the phone value live.
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

      {field.type === 'phone' ? (
        <PhoneInput field={field} strValue={strValue} inputCls={inputCls} />
      ) : field.type === 'boolean' ? (
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
                : field.type === 'time'
                  ? 'time'
                  : field.type === 'url'
                    ? 'url'
                    : field.type === 'email'
                      ? 'email'
                      : 'text'
          }
          step={field.type === 'number' ? 'any' : undefined}
          min={field.min}
          max={field.max}
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

/** Country-code select + digits input. Splits a stored "+91xxxxxxxxxx". */
function PhoneInput({
  field,
  strValue,
  inputCls,
}: {
  field: Field;
  strValue: string;
  inputCls: string;
}) {
  const sameAs = field.sameAs;

  // Split a stored value into country code + local digits.
  let cc = '+91';
  let digits = strValue;
  for (const c of [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)) {
    if (strValue.startsWith(c.code)) {
      cc = c.code;
      digits = strValue.slice(c.code.length).replace(/^0+/, '');
      break;
    }
  }

  const [same, setSame] = useState(false);

  // When "same as phone" is checked, mirror the phone input live.
  useEffect(() => {
    if (!sameAs || !same) return;
    const form = document.querySelector<HTMLFormElement>('form[data-entity-form]');
    const phone = form?.elements.namedItem('phone') as HTMLInputElement | null;
    const target = form?.elements.namedItem(field.name) as HTMLInputElement | null;
    const phoneCc = form?.elements.namedItem('phone_cc') as HTMLSelectElement | null;
    if (!phone || !target) return;
    const ccHidden = form?.querySelector<HTMLInputElement>(`input[name="${field.name}_cc"]`);
    const sync = () => {
      target.value = phone.value;
      if (ccHidden && phoneCc) ccHidden.value = phoneCc.value;
    };
    sync();
    phone.addEventListener('input', sync);
    return () => phone.removeEventListener('input', sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [same, sameAs]);

  if (sameAs && same) {
    return (
      <div>
        <div className="flex opacity-60">
          <input type="hidden" name={`${field.name}_cc`} value={cc} />
          <input
            id={field.name}
            name={field.name}
            type="tel"
            readOnly
            placeholder="Same as phone"
            className={`${inputCls} cursor-not-allowed rounded-r-none`}
          />
          <span className="flex items-center rounded-r-lg border border-l-0 border-border-strong bg-subtle px-3 text-sm text-ink-muted">
            ✓
          </span>
        </div>
        <label className="mt-1.5 flex items-center gap-2 font-body text-xs font-semibold text-ink-soft">
          <input
            type="checkbox"
            checked={same}
            onChange={(e) => setSame(e.target.checked)}
            className="h-3.5 w-3.5 accent-brand"
          />
          Same as phone
        </label>
      </div>
    );
  }

  return (
    <div>
      <div className="flex">
        <select
          name={`${field.name}_cc`}
          defaultValue={cc}
          aria-label="Country code"
          className={`${inputCls} w-[104px] shrink-0 rounded-r-none border-r-0`}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          id={field.name}
          name={field.name}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]{6,14}"
          maxLength={14}
          defaultValue={digits}
          required={field.required}
          placeholder="98765 43210"
          className={`${inputCls} rounded-l-none`}
        />
      </div>
      {sameAs && (
        <label className="mt-1.5 flex items-center gap-2 font-body text-xs font-semibold text-ink-soft">
          <input
            type="checkbox"
            checked={same}
            onChange={(e) => setSame(e.target.checked)}
            className="h-3.5 w-3.5 accent-brand"
          />
          Same as phone
        </label>
      )}
    </div>
  );
}
