import { getAdminClient } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Bulk import jobs — persisted in public.bulk_import_jobs, so:
 *  • every pasted payload survives reloads/restarts
 *  • the queue runs strictly sequentially, reading the next queued row
 *    from the table
 *  • per-record results + summary stay visible forever in the panel
 *
 * Processing state is module-scoped (single Vercel instance); the DB is
 * the source of truth for job data.
 */

export interface BulkJobItem {
  name: string;
  kind?: string;
  tagline?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  locality?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  imageUrls?: string[];
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  consultationFee?: string;
}

export interface BulkJobResultItem {
  name: string;
  ok: boolean;
  status: 'created' | 'reused' | 'failed';
  slug?: string;
  error?: string;
}

export interface BulkJobView {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  payloadCount: number;
  results: BulkJobResultItem[];
  summary: { total: number; created: number; reused: number; failed: number } | null;
  error: string | null;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JobRow {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  payload: BulkJobItem[];
  results: BulkJobResultItem[] | null;
  summary: { total: number; created: number; reused: number; failed: number } | null;
  error: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

// In-process pump lock (one processor per instance).
const globalStore = globalThis as unknown as { __citybeePumping?: boolean };
if (globalStore.__citybeePumping === undefined) globalStore.__citybeePumping = false;

function toView(row: JobRow): BulkJobView {
  return {
    id: row.id,
    status: row.status,
    payloadCount: Array.isArray(row.payload) ? row.payload.length : 0,
    results: Array.isArray(row.results) ? row.results : [],
    summary: row.summary ?? null,
    error: row.error ?? null,
    createdByEmail: row.created_by_email ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Recent jobs from the DB (newest first). */
export async function getJobs(limit = 50): Promise<BulkJobView[]> {
  const client = getAdminClient();
  const { data } = await client
    .from('bulk_import_jobs')
    .select('id, status, payload, results, summary, error, created_by_email, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => toView(r as unknown as JobRow));
}

/** Queue a new job (persisted) and kick the serial processor. */
export async function queueBulkJob(items: BulkJobItem[]): Promise<BulkJobView> {
  const session = await getAdminSession();
  const client = getAdminClient();

  const { data, error } = await client
    .from('bulk_import_jobs')
    .insert({
      payload: items,
      status: 'queued',
      created_by: session?.userId ?? null,
      created_by_email: session?.email ?? null,
    })
    .select('id, status, payload, results, summary, error, created_by_email, created_at, updated_at')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not queue the job');

  revalidatePath('/admin/bulk-import');
  // Fire-and-forget: the pump reads from the DB and processes in order.
  void pumpQueue();
  return toView(data as unknown as JobRow);
}

/** Serial processor: claim → run → next, one at a time. */
async function pumpQueue(): Promise<void> {
  if (globalStore.__citybeePumping) return;
  globalStore.__citybeePumping = true;
  const client = getAdminClient();
  try {
    while (true) {
      // Next queued job, oldest first.
      const { data: nextRows } = await client
        .from('bulk_import_jobs')
        .select('*')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1);
      const job = (nextRows ?? [])[0] as JobRow | undefined;
      if (!job) break;

      // Claim it (queued → running) — guards against double-processing.
      const { data: claimed } = await client
        .from('bulk_import_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'queued') // only if still queued
        .select('id')
        .single();
      if (!claimed) continue; // someone else claimed it

      // Fresh session JWT (12h sessions; jobs are short).
      const session = await getAdminSession();
      if (!session) {
        await client
          .from('bulk_import_jobs')
          .update({
            status: 'failed',
            error: 'Admin session expired — re-login and re-queue the remaining JSON.',
            finished_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        continue;
      }

      try {
        await runJob(job.id, job.payload, session.jwt, client);
      } catch (err) {
        await client
          .from('bulk_import_jobs')
          .update({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Job failed',
            finished_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }
      revalidatePath('/admin/bulk-import');
    }
  } finally {
    globalStore.__citybeePumping = false;
    // Jobs queued while we were finishing? Pump again.
    const { count } = await client
      .from('bulk_import_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'queued');
    if ((count ?? 0) > 0) void pumpQueue();
  }
}

/** Execute one job against the backend's /businesses/bulk (25-item chunks). */
async function runJob(
  jobId: string,
  payload: BulkJobItem[],
  jwt: string,
  client: ReturnType<typeof getAdminClient>,
): Promise<void> {
  const results: BulkJobResultItem[] = [];
  let created = 0;
  let reused = 0;
  let failed = 0;

  for (let i = 0; i < payload.length; i += 25) {
    const chunk = payload.slice(i, i + 25);
    const url = `${process.env.BACKEND_URL}/api/businesses/bulk`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ businesses: chunk }),
    });
    const body = (await res.json()) as {
      success?: boolean;
      message?: string;
      data?: { created: number; reused: number; failed: number; results: Record<string, unknown>[] };
    };

    if (!res.ok || !body.data) {
      throw new Error(body.message ?? `Backend rejected chunk ${i / 25 + 1} (HTTP ${res.status})`);
    }

    created += body.data.created;
    reused += body.data.reused;
    failed += body.data.failed;
    for (const r of body.data.results ?? []) {
      results.push({
        name: String(r.name ?? ''),
        ok: !r.error,
        status: r.created === true ? 'created' : r.error ? 'failed' : 'reused',
        slug: r.slug ? String(r.slug) : undefined,
        error: r.error ? String(r.error) : undefined,
      });
    }
    // Live progress (visible while polling).
    await client
      .from('bulk_import_jobs')
      .update({ results: JSON.parse(JSON.stringify(results)), updated_at: new Date().toISOString() })
      .eq('id', jobId);
  }

  await client
    .from('bulk_import_jobs')
    .update({
      status: 'done',
      results: JSON.parse(JSON.stringify(results)),
      summary: { total: payload.length, created, reused, failed },
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}
