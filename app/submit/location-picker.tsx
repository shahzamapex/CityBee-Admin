'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface PinnedLocation {
  lat: number;
  lng: number;
}

/**
 * Inline Google Map with a draggable pin. The user can:
 *  • Drag the marker anywhere → parent gets the coordinates
 *  • Click the map → pin jumps there
 *  • Pass [pin] to move the marker programmatically (e.g. from the
 *    address autocomplete)
 *
 * Uses the Google Maps JS API loaded on demand; the key is embedded in
 * the script URL (browser-visible by design — it's a Maps JS key; for
 * production lock it down with an HTTP-referrer restriction).
 */
export default function LocationPicker({
  pin,
  onPin,
  center,
  zoom = 13,
}: {
  pin: PinnedLocation | null;
  onPin: (location: PinnedLocation) => void;
  center: PinnedLocation | null;
  zoom?: number;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the Maps JS API once per page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as typeof window & { __citybeeMapsLoaded?: boolean; google?: unknown };

    function init() {
      setReady(true);
    }

    if (w.__citybeeMapsLoaded || (w.google as { maps?: unknown } | undefined)?.maps) {
      w.__citybeeMapsLoaded = true;
      init();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-citybee-maps]');
    if (existing) {
      existing.addEventListener('load', init);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''}`;
    script.async = true;
    script.dataset.citybeeMaps = 'true';
    script.onload = () => {
      w.__citybeeMapsLoaded = true;
      init();
    };
    script.onerror = () => setError('Map could not be loaded. Check your connection.');
    document.head.appendChild(script);
  }, []);

  // Init map + marker once the API is ready.
  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;

    const fallback = center ?? pin ?? { lat: 28.8386, lng: 78.7733 };
    const map = new google.maps.Map(mapDivRef.current, {
      center: { lat: fallback.lat, lng: fallback.lng },
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
    mapRef.current = map;

    const initial = pin ?? fallback;
    const marker = new google.maps.Marker({
      position: { lat: initial.lat, lng: initial.lng },
      map,
      draggable: true,
      title: 'Drag to your business location',
    });
    markerRef.current = marker;

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (pos) onPin({ lat: pos.lat(), lng: pos.lng() });
    });
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        onPin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // External pin updates (e.g. address autocomplete picked a location).
  const syncPin = useCallback(
    (location: PinnedLocation | null) => {
      if (!location || !mapRef.current || !markerRef.current) return;
      markerRef.current.setPosition({ lat: location.lat, lng: location.lng });
      mapRef.current.panTo({ lat: location.lat, lng: location.lng });
    },
    [],
  );

  useEffect(() => {
    syncPin(pin);
  }, [pin, syncPin]);

  return (
    <div className="relative">
      <div
        ref={mapDivRef}
        className="h-56 w-full overflow-hidden rounded-lg border border-border-strong bg-subtle"
        aria-label="Map — drag the pin to your business location"
      />
      {(!ready || error) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white/80 text-center backdrop-blur-sm">
          {error ? (
            <>
              <span className="material-symbols-outlined text-[22px] text-rose">map_off</span>
              <span className="font-body text-xs font-semibold text-rose">{error}</span>
            </>
          ) : (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-soft border-t-brand" />
              <span className="font-body text-xs font-semibold text-ink-muted">Loading map…</span>
            </>
          )}
        </div>
      )}
      {ready && !error && pin && (
        <div className="mt-1.5 flex items-center gap-1.5 font-body text-xs font-semibold text-emerald">
          <span className="material-symbols-outlined text-[14px]">my_location</span>
          {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)} — drag the pin to adjust
        </div>
      )}
      {ready && !error && !pin && (
        <p className="mt-1.5 font-body text-xs font-medium text-ink-muted">
          📍 Tap the map or drag the pin to set the exact location
        </p>
      )}
    </div>
  );
}
