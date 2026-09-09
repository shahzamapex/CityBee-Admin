'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { searchCities, resolveCityPlace } from './city-actions';

export interface SelectedCity {
  name: string;
  lat: number | null;
  lng: number | null;
  placeId: string;
}

/**
 * Google Places-powered city selector: debounced autocomplete dropdown;
 * on selection resolves coordinates and reports back to the parent form.
 * The API key never reaches the browser (server-action proxy).
 */
export default function CityAutocomplete({
  value,
  onChange,
  error,
}: {
  value: SelectedCity | null;
  onChange: (city: SelectedCity | null) => void;
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<{ placeId: string; description: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounced prediction fetch.
  useEffect(() => {
    if (value && query === value.name) return; // stable after selection
    if (query.trim().length < 2) {
      setPredictions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchCities(query);
        setPredictions(results);
        setOpen(results.length > 0);
      });
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, value]);

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
    setLoadError(null);
    const resolved = await resolveCityPlace(prediction.placeId);
    setResolving(false);

    if (!resolved.ok || !resolved.name) {
      setLoadError(resolved.error ?? 'Could not select that city.');
      return;
    }
    const city: SelectedCity = {
      name: resolved.name,
      lat: resolved.lat ?? null,
      lng: resolved.lng ?? null,
      placeId: resolved.placeId!,
    };
    setQuery(city.name);
    onChange(city);
  }

  function clear() {
    setQuery('');
    setPredictions([]);
    onChange(null);
  }

  const inputCls = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${
    error
      ? 'border-rose/40 bg-rose/5 focus:border-rose focus:ring-2 focus:ring-rose/15'
      : 'border-border-strong bg-white focus:border-brand focus:ring-2 focus:ring-brand/15'
  }`;

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor="city_input" className="mb-1.5 block text-sm font-bold">
        City <span className="text-brand">*</span>
      </label>
      <div className="relative">
        <input
          id="city_input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null); // edited after selecting → reset
          }}
          onFocus={() => predictions.length > 0 && setOpen(true)}
          placeholder="Start typing your city…"
          autoComplete="off"
          className={inputCls}
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
              aria-label="Clear city"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {value && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald">
          📍 {value.name} selected
        </p>
      )}
      {(error || loadError) && !value && (
        <p className="mt-1.5 text-xs font-semibold text-rose">{error ?? loadError}</p>
      )}
      {!value && !error && !loadError && (
        <p className="mt-1.5 text-xs font-medium text-ink-muted">
          Powered by Google — search and tap your city
        </p>
      )}

      {open && predictions.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border-subtle bg-white py-1 shadow-lg">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                onClick={() => select(p)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-soft transition hover:bg-brand-soft/40"
              >
                <span>📍</span>
                <span className="truncate">{p.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
