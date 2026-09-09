'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { searchAddresses, resolveAddressPlace } from './address-actions';

export interface SelectedAddress {
  address: string;
  lat: number | null;
  lng: number | null;
  placeId: string;
}

/**
 * Google Places address autocomplete: type the business address, pick from
 * suggestions → exact coordinates + formatted address are captured. Free
 * typing is still allowed (address without pin). The API key never reaches
 * the browser (server-action proxy).
 */
export default function AddressAutocomplete({
  value,
  onChange,
  biasLat,
  biasLng,
  error,
  required,
}: {
  value: SelectedAddress | null;
  onChange: (address: SelectedAddress | null) => void;
  biasLat?: number | null;
  biasLng?: number | null;
  error?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<{ placeId: string; description: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounced prediction fetch (bias toward selected city).
  useEffect(() => {
    if (value && query === value.address) return;
    if (query.trim().length < 3) {
      setPredictions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchAddresses(query, biasLat, biasLng);
        setPredictions(results);
        setOpen(results.length > 0);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, value, biasLat, biasLng]);

  // Close dropdown on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function select(prediction: { placeId: string; description: string }) {
    setOpen(false);
    setResolving(true);
    const resolved = await resolveAddressPlace(prediction.placeId);
    setResolving(false);

    if (!resolved.ok || !resolved.address) {
      // Fall back to the raw description if details fail — still usable.
      onChange({
        address: prediction.description,
        lat: resolved.lat ?? null,
        lng: resolved.lng ?? null,
        placeId: prediction.placeId,
      });
      setQuery(prediction.description);
      return;
    }
    onChange({
      address: resolved.address,
      lat: resolved.lat ?? null,
      lng: resolved.lng ?? null,
      placeId: resolved.placeId!,
    });
    setQuery(resolved.address);
  }

  function clear() {
    setQuery('');
    setPredictions([]);
    onChange(null);
  }

  const inputCls = `w-full rounded-lg border px-3.5 py-2.5 font-body text-sm text-ink outline-none transition placeholder:text-ink-muted ${
    error
      ? 'border-rose/40 bg-rose/5 focus:border-rose focus:ring-2 focus:ring-rose/15'
      : 'border-border-strong bg-white focus:border-brand focus:ring-2 focus:ring-brand/15'
  }`;

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor="address_input" className="mb-1.5 block font-body text-sm font-semibold text-ink">
        Business address{' '}
        {required && <span className="text-brand">*</span>}
      </label>
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ink-muted">
          place
        </span>
        <input
          id="address_input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null); // edited after selecting → reset pin
          }}
          onFocus={() => predictions.length > 0 && setOpen(true)}
          placeholder="Start typing — e.g. 16B Delhi Road, Moradabad"
          autoComplete="off"
          className={`${inputCls} pl-10 pr-9`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {resolving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-soft border-t-brand" />
          )}
          {value && !resolving && (
            <button
              type="button"
              onClick={clear}
              className="text-xs font-bold text-ink-muted hover:text-rose"
              aria-label="Clear address"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {value && (
        <p className="mt-1.5 flex items-center gap-1.5 font-body text-xs font-semibold text-emerald">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          {value.lat != null && value.lng != null ? (
            <>Pinned: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}</>
          ) : (
            <>Address set (no pin)</>
          )}
        </p>
      )}
      {!value && !error && (
        <p className="mt-1 font-body text-[11px] text-ink-muted">
          Search and tap for exact location pin — or type manually
        </p>
      )}
      {error && <p className="mt-1.5 font-body text-xs font-semibold text-rose">{error}</p>}

      {open && predictions.length > 0 && (
        <ul className="elev-3 absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-border-subtle bg-white py-1">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                onClick={() => select(p)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left font-body text-sm font-semibold text-ink-soft transition hover:bg-brand-soft/40"
              >
                <span className="material-symbols-outlined text-[16px] text-ink-muted">place</span>
                <span className="truncate">{p.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
