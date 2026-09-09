'use server';

import { getPublicClient } from '@/lib/public-client';

export interface FieldSuggestions {
  specializations: string[];
  qualifications: string[];
  localities: string[];
  cuisines: string[];
  taglines: string[];
}

/**
 * Distinct values from live data (RLS: approved businesses + their
 * extension rows are anon-readable) used as combobox suggestions —
 * the more listings that exist, the smarter the suggestions get.
 */
export async function getSuggestions(): Promise<FieldSuggestions> {
  const client = getPublicClient();

  const [doctors, restaurants, businesses] = await Promise.all([
    client.from('doctors').select('specialization, qualification').limit(500),
    client.from('restaurants').select('cuisine').limit(500),
    client.from('businesses').select('locality, tagline').limit(1000),
  ]);

  const clean = (list: (string | null | undefined)[]) =>
    [...new Set(list.filter((x): x is string => typeof x === 'string' && x.trim().length > 1))].sort();

  return {
    specializations: clean((doctors.data ?? []).map((d) => d.specialization)),
    qualifications: clean((doctors.data ?? []).map((d) => d.qualification)),
    localities: clean((businesses.data ?? []).map((b) => b.locality)),
    cuisines: clean((restaurants.data ?? []).map((r) => r.cuisine)),
    taglines: clean((businesses.data ?? []).map((b) => b.tagline)),
  };
}
