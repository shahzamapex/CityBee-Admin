import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const API_KEY = () => process.env.GOOGLE_MAPS_API_KEY ?? '';

interface GeoComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

/**
 * Google Places/Geocoding proxy for the admin business form — the API key
 * stays server-side.
 *  - `?q=`          → place autocomplete predictions (add &types=(cities) for cities)
 *  - `?place_id=`   → place details: address, geometry, components
 *  - `?lat=&lng=`   → reverse geocode a map pin into address + city
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const key = API_KEY();
  if (!key) return NextResponse.json({ predictions: [], error: 'maps key not configured' });

  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    // Reverse geocode a pin.
    try {
      const params = new URLSearchParams({ latlng: `${lat},${lng}`, key });
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      );
      const json = await res.json();
      if (json.status !== 'OK' || !json.results?.length) {
        return NextResponse.json({ error: 'no result' }, { status: 400 });
      }
      const best = json.results[0] as {
        formatted_address?: string;
        address_components?: GeoComponent[];
      };
      const comp = (type: string) =>
        best.address_components?.find((c) => c.types?.includes(type))?.long_name ?? '';
      return NextResponse.json({
        address: best.formatted_address,
        locality: comp('sublocality') || comp('neighborhood') || comp('locality'),
        city: comp('locality') || comp('administrative_area_level_3') || comp('administrative_area_level_2'),
        state: comp('administrative_area_level_1'),
        country: comp('country'),
        countryCode: best.address_components?.find((c) => c.types?.includes('country'))?.short_name ?? '',
        lat,
        lng,
      });
    } catch {
      return NextResponse.json({ error: 'geocode failed' }, { status: 500 });
    }
  }

  const placeId = req.nextUrl.searchParams.get('place_id');
  if (placeId) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,geometry,address_components&key=${key}`,
      );
      const json = await res.json();
      if (json.status !== 'OK' || !json.result) {
        return NextResponse.json({ error: 'Could not resolve that place.' }, { status: 400 });
      }
      const result = json.result as {
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
        address_components?: GeoComponent[];
      };
      const comp = (type: string) =>
        result.address_components?.find((c) => c.types?.includes(type))?.long_name ?? '';
      const rlat = result.geometry?.location?.lat;
      const rlng = result.geometry?.location?.lng;
      return NextResponse.json({
        address: result.formatted_address,
        lat: typeof rlat === 'number' ? rlat : null,
        lng: typeof rlng === 'number' ? rlng : null,
        locality: comp('sublocality') || comp('neighborhood') || comp('locality'),
        city: comp('locality') || comp('administrative_area_level_3') || comp('administrative_area_level_2'),
        state: comp('administrative_area_level_1'),
        country: comp('country'),
        countryCode: result.address_components?.find((c) => c.types?.includes('country'))?.short_name ?? '',
        placeId,
      });
    } catch {
      return NextResponse.json({ error: 'resolve failed' }, { status: 500 });
    }
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  const types = req.nextUrl.searchParams.get('types') ?? '';
  if (q.length < 3) return NextResponse.json({ predictions: [] });

  try {
    const params = new URLSearchParams({ input: q, key });
    if (types) params.set('types', types); // e.g. '(cities)'
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
    );
    const json = await res.json();
    if (json.status !== 'OK') return NextResponse.json({ predictions: [] });
    const predictions = (json.predictions ?? []).slice(0, 6).map(
      (p: { place_id: string; description: string }) => ({
        placeId: p.place_id,
        description: p.description,
      }),
    );
    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
