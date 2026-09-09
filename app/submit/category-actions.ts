'use server';

import { getPublicClient } from '@/lib/public-client';

export interface DbCategory {
  slug: string;
  name: string;
  icon: string | null;
}

/**
 * Live categories from the database (RLS: anon may read active rows) —
 * the public form's category tiles are driven by this, never hard-coded.
 */
export async function getCategories(): Promise<DbCategory[]> {
  const { data } = await getPublicClient()
    .from('categories')
    .select('slug, name, icon')
    .eq('is_active', true)
    .order('sort_order')
    .limit(20);
  return (data ?? []).map((c) => ({
    slug: String(c.slug),
    name: String(c.name),
    icon: c.icon ? String(c.icon) : null,
  }));
}
