'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Combobox: the best of both worlds —
 *  • Type → live-filtered suggestions from [suggestions]
 *  • Pick a suggestion with click/keyboard
 *  • Or keep the typed text as the value (free entry, always allowed)
 *
 * Used for fields like specialization, qualification, cuisines, locality
 * where existing data should guide but never restrict the user.
 */
export default function Combobox({
  id,
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  required,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtered suggestions: match anywhere in the string, case-insensitive.
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const base = q
      ? suggestions.filter((s) => s.toLowerCase().includes(q))
      : suggestions;
    return base.slice(0, 8);
  }, [value, suggestions]);

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function select(s: string) {
    onChange(s);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && filtered.length > 0) {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % filtered.length);
    } else if (e.key === 'ArrowUp' && filtered.length > 0) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' && open && filtered[highlight]) {
      e.preventDefault();
      select(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showAddOption =
    value.trim().length > 1 &&
    !suggestions.some((s) => s.toLowerCase() === value.trim().toLowerCase());

  const inputCls = `w-full rounded-lg border px-3.5 py-2.5 font-body text-sm text-ink outline-none transition placeholder:text-ink-muted ${
    error
      ? 'border-rose/40 bg-rose/5 focus:border-rose focus:ring-2 focus:ring-rose/15'
      : 'border-border-strong bg-white focus:border-brand focus:ring-2 focus:ring-brand/15'
  }`;

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="mb-1.5 block font-body text-sm font-semibold text-ink">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          value={value}
          required={required}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`${inputCls} pr-9`}
        />
        <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-ink-muted">
          {value && suggestions.includes(value) ? 'check_circle' : 'search'}
        </span>
      </div>

      {/* Suggestion dropdown */}
      {open && (filtered.length > 0 || showAddOption) && (
        <ul className="elev-3 absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-border-subtle bg-white py-1">
          {filtered.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => select(s)}
                className={`flex w-full items-center gap-2 px-3.5 py-2 text-left font-body text-sm transition ${
                  i === highlight ? 'bg-brand-soft/60 text-brand' : 'text-ink-soft hover:bg-canvas'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-ink-muted">history</span>
                <span className="truncate">{s}</span>
                {s.toLowerCase() === value.trim().toLowerCase() && (
                  <span className="material-symbols-outlined ml-auto text-[16px] text-brand">check</span>
                )}
              </button>
            </li>
          ))}
          {showAddOption && (
            <li className="border-t border-border-subtle/60">
              <button
                type="button"
                onMouseEnter={() => setHighlight(filtered.length)}
                onClick={() => select(value.trim())}
                className={`flex w-full items-center gap-2 px-3.5 py-2 text-left font-body text-sm transition ${
                  highlight === filtered.length ? 'bg-brand-soft/60 text-brand' : 'text-brand hover:bg-brand-soft/40'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Use <b className="truncate">&quot;{value.trim()}&quot;</b>
                {hint && <span className="ml-auto text-[10px] text-ink-muted">{hint}</span>}
              </button>
            </li>
          )}
        </ul>
      )}

      {error && <p className="mt-1.5 font-body text-xs font-semibold text-rose">{error}</p>}
      {!error && (
        <p className="mt-1 font-body text-[11px] text-ink-muted">
          {suggestions.length > 0
            ? 'Pick from the list or type your own'
            : placeholder}
        </p>
      )}
    </div>
  );
}
