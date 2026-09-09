'use server';

/**
 * Google Places address autocomplete for the PUBLIC form — resolves the
 * business's exact address + coordinates. The API key stays server-side.
 */

interface AddressPrediction {
  placeId: string;
  description: string;
  mainText: string;
}

interface ResolvedAddress {
  ok: boolean;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  error?: string;
}

const API_KEY = () => process.env.GOOGLE_MAPS_API_KEY ?? '';

/**
 * Address predictions biased to the selected city's vicinity (optional
 * lat/lng bias), searching establishments + addresses.
 */
export async function searchAddresses(
  input: string,
  biasLat?: number | null,
  biasLng?: number | null,
): Promise<AddressPrediction[]> {
  const query = input.trim();
  if (query.length < 3) return [];
  const key = API_KEY();
  if (!key) return [];

  const params = new URLSearchParams({
    input: query,
    key,
  });
  // Bias (not restrict) toward the selected city so nearby results rank first.
  if (typeof biasLat === 'number' && typeof biasLng === 'number') {
    params.set('location', `${biasLat},${biasLng}`);
    params.set('radius', '50000');
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
    );
    const json = await res.json();
    if (json.status !== 'OK') return [];
    return (json.predictions ?? [])
      .slice(0, 6)
      .map(
        (p: {
          place_id: string;
          description: string;
          structured_formatting?: { main_text?: string };
        }) => ({
          placeId: p.place_id,
          description: p.description,
          mainText: p.structured_formatting?.main_text ?? p.description.split(',')[0],
        }),
      );
  } catch {
    return [];
  }
}

/** Resolve a selected address to coordinates + formatted address. */
export async function resolveAddressPlace(placeId: string): Promise<ResolvedAddress> {
  const key = API_KEY();
  if (!key) return { ok: false, error: 'Not configured' };

  try {
    const res = await fetch(
      'https://maps.googleapis.com/maps/api/place/details/json' +
        `?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,geometry&key=${key}`,
    );
    const json = await res.json();
    if (json.status !== 'OK' || !json.result) {
      return { ok: false, error: 'Could not resolve that address.' };
    }

    const result = json.result;
    const lat = result.geometry?.location?.lat;
    const lng = result.geometry?.location?.lng;

    return {
      ok: true,
      address: result.formatted_address ?? undefined,
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      placeId,
    };
  } catch {
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}
