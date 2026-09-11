'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Google Places address autocomplete: type ≥3 chars, pick a prediction,
 * the resolved address + coordinates land in the visible input and the
 * hidden latitude/longitude/placeId fields the server action reads.
 */
export default function AddressInput({
  field,
  strValue,
  lat,
  lng,
  inputCls,
}: {
  field: { name: string; required?: boolean; placeholder?: string };
  strValue: string;
  lat?: number | null;
  lng?: number | null;
  inputCls: string;
}) {
  const [query, setQuery] = useState(strValue);
  const [predictions, setPredictions] = useState<{ placeId: string; description: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null; placeId: string | null }>({
    lat: lat ?? null,
    lng: lng ?? null,
    placeId: null,
  });
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced prediction search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || resolving) {
      setPredictions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address?q=${encodeURIComponent(q)}`);
        const body = (await res.json()) as { predictions?: { placeId: string; description: string }[] };
        setPredictions(body.predictions ?? []);
        setOpen(true);
      } catch {
        setPredictions([]);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Close the dropdown on outside clicks.
  useEffect(() => {
    const on = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, []);

  async function pick(placeId: string) {
    setResolving(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/address?place_id=${encodeURIComponent(placeId)}`);
      const body = (await res.json()) as { address?: string; lat?: number | null; lng?: number | null };
      if (body.address) setQuery(body.address);
      setCoords({ lat: body.lat ?? null, lng: body.lng ?? null, placeId });
    } catch {
      // keep typed text; coords stay empty
    } finally {
      setResolving(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex">
        <input
          id={field.name}
          name={field.name}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          required={field.required}
          placeholder={field.placeholder ?? 'Search the business address…'}
          className={`${inputCls} pr-9`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {resolving ? (
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          ) : (
            <span className="material-symbols-outlined text-[18px] text-ink-muted">location_on</span>
          )}
        </span>
      </div>

      {/* Coordinates picked from Google — sent along with the form. */}
      <input type="hidden" name="latitude" value={coords.lat ?? ''} />
      <input type="hidden" name="longitude" value={coords.lng ?? ''} />
      <input type="hidden" name="googlePlaceId" value={coords.placeId ?? ''} />

      {open && predictions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border-subtle bg-white shadow-lg">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                onClick={() => pick(p.placeId)}
                className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left font-body text-sm text-ink transition hover:bg-subtle"
              >
                <span className="material-symbols-outlined mt-0.5 text-[16px] text-brand">location_on</span>
                <span className="min-w-0 flex-1">{p.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
