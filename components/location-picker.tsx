'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Prediction {
  placeId: string;
  description: string;
}

interface PlaceDetails {
  address?: string;
  lat?: number | null;
  lng?: number | null;
  locality?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
}

/**
 * Location step widget: Google city autocomplete (required) + a Leaflet
 * map with a draggable pin. Pinning reverse-geocodes and fills address +
 * locality (both optional, still editable). Everything lands in the
 * form's hidden fields for the server action: city_name, city_place_id,
 * city_lat/lng, latitude/longitude, googlePlaceId + the visible
 * address/locality inputs.
 */
export default function LocationPicker({
  initialCity,
  initialAddress,
  initialLocality,
  initialLat,
  initialLng,
  inputCls,
}: {
  initialCity?: string;
  initialAddress?: string;
  initialLocality?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  inputCls: string;
}) {
  // ── City autocomplete ──────────────────────────────────────────────
  const [cityQuery, setCityQuery] = useState(initialCity ?? '');
  const [cityPicks, setCityPicks] = useState<Prediction[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [city, setCity] = useState<PlaceDetails | null>(null);
  const cityBox = useRef<HTMLDivElement>(null);

  // ── Pin + map ──────────────────────────────────────────────────────
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null,
  );
  const [reverse, setReverse] = useState<'idle' | 'loading'>('idle');
  const [address, setAddress] = useState(initialAddress ?? '');
  const [locality, setLocality] = useState(initialLocality ?? '');
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Debounced city search (cities only).
  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 3) {
      setCityPicks([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address?q=${encodeURIComponent(q)}&types=${encodeURIComponent('(cities)')}`);
        const body = (await res.json()) as { predictions?: Prediction[] };
        setCityPicks(body.predictions ?? []);
        setCityOpen(true);
      } catch {
        setCityPicks([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [cityQuery]);

  useEffect(() => {
    const on = (e: MouseEvent) => {
      if (cityBox.current && !cityBox.current.contains(e.target as Node)) setCityOpen(false);
    };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, []);

  async function pickCity(placeId: string, description: string) {
    setCityOpen(false);
    try {
      const res = await fetch(`/api/address?place_id=${encodeURIComponent(placeId)}`);
      const body = (await res.json()) as PlaceDetails;
      setCity({ ...body, city: body.city || description.split(',')[0] });
      setCityQuery(body.city || description.split(',')[0]);
      if (body.lat != null && body.lng != null && !pin) {
        setPin({ lat: body.lat, lng: body.lng });
      }
    } catch {
      setCity({ city: description.split(',')[0] });
      setCityQuery(description.split(',')[0]);
    }
  }

  // ── Leaflet map with draggable pin ─────────────────────────────────
  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return;
    const start: [number, number] = pin
      ? [pin.lat, pin.lng]
      : city?.lat != null && city?.lng != null
        ? [city.lat, city.lng]
        : [28.6139, 77.209]; // default: Delhi
    const map = L.map(mapDiv.current, { center: start, zoom: pin ? 15 : 11 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#FF6F00;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });

    if (pin) markerRef.current = L.marker([pin.lat, pin.lng], { icon, draggable: true }).addTo(map);

    const placePin = (lat: number, lng: number) => {
      setPin({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      }
      map.panTo([lat, lng], { animate: true });
    };

    map.on('click', (e: L.LeafletMouseEvent) => placePin(e.latlng.lat, e.latlng.lng));
    map.on('marker-drag', () => {}); // no-op placeholder for clarity
    // Marker events attach on creation.
    const attachDrag = (m: L.Marker) => {
      m.on('dragend', () => {
        const p = m.getLatLng();
        setPin({ lat: p.lat, lng: p.lng });
      });
    };
    if (markerRef.current) attachDrag(markerRef.current);
    // Patch placePin-created markers with drag handling via map event delegation.
    map.on('layeradd', (e: L.LayerEvent) => {
      const layer = e.layer as L.Marker & { dragging?: { disable: () => void } };
      if (layer instanceof L.Marker) attachDrag(layer);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center when the city resolves (only if no pin yet).
  useEffect(() => {
    if (city?.lat != null && city?.lng != null && mapRef.current && !pin) {
      mapRef.current.setView([city.lat, city.lng], 12);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  // Reverse geocode the pin → auto-fill address + locality (optional).
  async function fillFromPin() {
    if (!pin) return;
    setReverse('loading');
    try {
      const res = await fetch(`/api/address?lat=${pin.lat}&lng=${pin.lng}`);
      const body = (await res.json()) as PlaceDetails & { error?: string };
      if (!body.error) {
        if (body.address) setAddress(body.address);
        if (body.locality) setLocality(body.locality);
      }
    } catch {
      // keep manually typed values
    } finally {
      setReverse('idle');
    }
  }

  return (
    <div className="space-y-4">
      {/* ── City (required, Google cities) ─────────────────────────── */}
      <div ref={cityBox} className="relative">
        <label className="mb-1.5 block font-body text-sm font-semibold text-ink">
          City <span className="text-brand">*</span>
        </label>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ink-muted">
            location_city
          </span>
          <input
            name="city_display"
            type="text"
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            autoComplete="off"
            required
            placeholder="Search a city — e.g. Moradabad, Delhi, Dubai…"
            className={`${inputCls} pl-9`}
          />
        </div>
        {cityOpen && cityPicks.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border-subtle bg-white shadow-lg">
            {cityPicks.map((p) => (
              <li key={p.placeId}>
                <button
                  type="button"
                  onClick={() => pickCity(p.placeId, p.description)}
                  className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left font-body text-sm text-ink transition hover:bg-subtle"
                >
                  <span className="material-symbols-outlined mt-0.5 text-[16px] text-brand">location_city</span>
                  <span className="min-w-0 flex-1">{p.description}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 font-body text-xs text-ink-muted">
          The city links the business to its area on the map below.
        </p>
      </div>

      {/* ── Map with pin ───────────────────────────────────────────── */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="font-body text-sm font-semibold text-ink">
            Pin the exact location <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <button
            type="button"
            onClick={fillFromPin}
            disabled={!pin || reverse === 'loading'}
            className="flex items-center gap-1 rounded-lg border border-border-strong bg-white px-2.5 py-1.5 font-body text-xs font-semibold text-ink transition hover:bg-subtle disabled:opacity-50"
          >
            {reverse === 'loading' ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
            ) : (
              <span className="material-symbols-outlined text-[15px]">my_location</span>
            )}
            Fill address from pin
          </button>
        </div>
        <div
          ref={mapDiv}
          className="h-64 w-full overflow-hidden rounded-xl border border-border-subtle"
        />
        <p className="mt-1 font-body text-xs text-ink-muted">
          Tap the map or drag the pin, then “Fill address from pin” to auto-fill the address below.
        </p>
      </div>

      {/* ── Address + locality (optional, auto-fillable) ───────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="address" className="mb-1.5 block font-body text-sm font-semibold text-ink">
            Address <span className="text-brand">*</span>
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            placeholder="Auto-filled from the pin, or type it"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="locality" className="mb-1.5 block font-body text-sm font-semibold text-ink">
            Locality / Area <span className="text-brand">*</span>
          </label>
          <input
            id="locality"
            name="locality"
            type="text"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            required
            placeholder="e.g. Civil Lines"
            className={inputCls}
          />
        </div>
      </div>

      {/* ── Hidden fields for the server action ────────────────────── */}
      <input type="hidden" name="city_name" value={city?.city ?? (cityQuery.trim() || '')} />
      <input type="hidden" name="city_place_id" value={city ? (city as unknown as { placeId?: string }).placeId ?? '' : ''} />
      <input type="hidden" name="city_state" value={city?.state ?? ''} />
      <input type="hidden" name="city_country" value={city?.country ?? ''} />
      <input type="hidden" name="city_country_code" value={city?.countryCode ?? ''} />
      <input type="hidden" name="city_lat" value={city?.lat ?? ''} />
      <input type="hidden" name="city_lng" value={city?.lng ?? ''} />
      <input type="hidden" name="latitude" value={pin?.lat ?? ''} />
      <input type="hidden" name="longitude" value={pin?.lng ?? ''} />
      <input type="hidden" name="googlePlaceId" value={pin ? '' : ''} />
    </div>
  );
}
