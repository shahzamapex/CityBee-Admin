import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const API_KEY = () => process.env.GOOGLE_MAPS_API_KEY ?? '';

/**
 * Google Places address autocomplete for the admin business form — the
 * API key stays server-side. `?q=` returns predictions; `?place_id=`
 * resolves exact address + coordinates.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const key = API_KEY();
  if (!key) return NextResponse.json({ predictions: [], error: 'maps key not configured' });

  const placeId = req.nextUrl.searchParams.get('place_id');
  if (placeId) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,geometry&key=${key}`,
      );
      const json = await res.json();
      if (json.status !== 'OK' || !json.result) {
        return NextResponse.json({ error: 'Could not resolve that address.' }, { status: 400 });
      }
      const lat = json.result.geometry?.location?.lat;
      const lng = json.result.geometry?.location?.lng;
      return NextResponse.json({
        address: json.result.formatted_address,
        lat: typeof lat === 'number' ? lat : null,
        lng: typeof lng === 'number' ? lng : null,
        placeId,
      });
    } catch {
      return NextResponse.json({ error: 'resolve failed' }, { status: 500 });
    }
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 3) return NextResponse.json({ predictions: [] });

  try {
    const params = new URLSearchParams({ input: q, key });
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
