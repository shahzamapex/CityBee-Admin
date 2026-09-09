'use server';

/**
 * Google Places proxies — the API key stays server-side; the browser only
 * ever sees sanitized prediction labels and resolved coordinates.
 */

interface CityPrediction {
  placeId: string;
  description: string;
  mainText: string;
}

interface ResolvedCity {
  ok: boolean;
  name?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  error?: string;
}

const API_KEY = () => process.env.GOOGLE_MAPS_API_KEY ?? '';

/** Autocomplete city predictions for the given partial input. */
export async function searchCities(input: string): Promise<CityPrediction[]> {
  const query = input.trim();
  if (query.length < 2) return [];
  const key = API_KEY();
  if (!key) return [];

  const url =
    'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
    `?input=${encodeURIComponent(query)}&types=(cities)&key=${key}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== 'OK') return [];
    return (json.predictions ?? [])
      .slice(0, 6)
      .map((p: { place_id: string; description: string; structured_formatting?: { main_text?: string } }) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text ?? p.description.split(',')[0],
      }));
  } catch {
    return [];
  }
}

/** Resolve a selected prediction to the actual city + coordinates. */
export async function resolveCityPlace(placeId: string): Promise<ResolvedCity> {
  const key = API_KEY();
  if (!key) return { ok: false, error: 'Not configured' };

  const url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    `?place_id=${encodeURIComponent(placeId)}&fields=name,geometry,address_component&key=${key}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== 'OK' || !json.result) {
      return { ok: false, error: 'Could not resolve that place.' };
    }

    const result = json.result;
    const lat = result.geometry?.location?.lat;
    const lng = result.geometry?.location?.lng;

    // Prefer the locality component, fall back to the place name.
    const components: { long_name: string; types: string[] }[] =
      result.address_components ?? [];
    const cityComponent =
      components.find((c) => c.types.includes('locality')) ??
      components.find((c) => c.types.includes('administrative_area_level_3')) ??
      components.find((c) => c.types.includes('administrative_area_level_2'));

    return {
      ok: true,
      name: cityComponent?.long_name ?? result.name,
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      placeId,
    };
  } catch {
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}
