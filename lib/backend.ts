/**
 * Typed client for the CityBee NestJS backend on Cloud Run.
 *
 * Read endpoints (list/nearby/search/detail) are @Public — no auth needed.
 * Write endpoints (create/bulk) require a Supabase user JWT; callers pass
 * one when they have it (owner flows).
 *
 * Envelope shape: { success, data, message?, pagination? } — data is the
 * payload (array or object), pagination carries totals for paged lists.
 */

const BASE = () => {
  const url = process.env.BACKEND_URL;
  if (!url) throw new Error('BACKEND_URL is not configured');
  return url.replace(/\/$/, '');
};

interface BackendEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: { total: number; page: number; limit: number; pages?: number };
}

async function call<T>(path: string, init?: RequestInit): Promise<{ data: T; pagination?: BackendEnvelope<T>['pagination'] }> {
  const res = await fetch(`${BASE()}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const json = (await res.json()) as BackendEnvelope<T> | { message: string };
  if (!res.ok || (json as BackendEnvelope<T>).success === false) {
    const message =
      typeof json === 'object' && 'message' in json ? json.message : res.statusText;
    throw new Error(message);
  }
  const env = json as BackendEnvelope<T>;
  return { data: env.data, pagination: env.pagination };
}

// ── Public read endpoints ─────────────────────────────────────────────

export interface BackendBusiness {
  id: string;
  uuid?: string;
  name: string;
  slug?: string | null;
  kind: string;
  tagline?: string;
  description?: string;
  phone?: string | null;
  address?: string | null;
  locality?: string | null;
  city?: string;
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  images?: string[];
  menu?: unknown[];
  doctor?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export function listBusinesses(params: {
  page?: number;
  limit?: number;
  category?: string;
  city?: string;
  kind?: string;
} = {}): Promise<{ items: BackendBusiness[]; total: number }> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.category) q.set('category', params.category);
  if (params.city) q.set('city', params.city);
  if (params.kind) q.set('kind', params.kind);
  return call<BackendBusiness[]>(`/businesses?${q.toString()}`).then(({ data, pagination }) => ({
    items: Array.isArray(data) ? data : [],
    total: pagination?.total ?? (Array.isArray(data) ? data.length : 0),
  }));
}

export function getBusiness(idOrSlug: string): Promise<BackendBusiness> {
  return call<BackendBusiness>(`/businesses/${idOrSlug}`).then(r => r.data);
}

export function searchBusinesses(
  q: string,
  page = 1,
  limit = 20,
): Promise<{ items: BackendBusiness[]; total: number }> {
  return call<BackendBusiness[]>(
    `/businesses/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
  ).then(({ data, pagination }) => ({
    items: Array.isArray(data) ? data : [],
    total: pagination?.total ?? (Array.isArray(data) ? data.length : 0),
  }));
}

export function health(): Promise<{ status: string; database: string }> {
  return call<{ status: string; database: string }>('/health').then(r => r.data);
}

// ── Authenticated write endpoints ─────────────────────────────────────

export function createBusiness(
  dto: Record<string, unknown>,
  userJwt: string,
): Promise<BackendBusiness> {
  return call<BackendBusiness>('/businesses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userJwt}` },
    body: JSON.stringify(dto),
  }).then(r => r.data);
}
