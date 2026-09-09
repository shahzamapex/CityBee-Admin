import { getAdminSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Bulk import job: paste JSON → queued job → processed sequentially
 * (one at a time) → per-record results (created / reused / failed).
 *
 * Jobs live in the business_submissions DB table's dedicated import log
 * (jsonb job_store below); the queue is strictly serial — a new job waits
 * until the previous one finishes.
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
  // doctor extras
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

export interface BulkJob {
  id: string;
  payload: BulkJobItem[];
  status: 'queued' | 'running' | 'done' | 'failed';
  results: BulkJobResultItem[];
  summary?: { total: number; created: number; reused: number; failed: number };
  createdAt: number;
  updatedAt: number;
  error?: string;
}

// In-process job store (single Vercel instance) + DB persistence for
// cross-instance visibility. Simple module-level queue.
const globalStore = globalThis as unknown as { __citybeeJobs?: BulkJob[]; __citybeeRunning?: boolean };
if (!globalStore.__citybeeJobs) globalStore.__citybeeJobs = [];
if (globalStore.__citybeeRunning === undefined) globalStore.__citybeeRunning = false;

export function getJobs(): BulkJob[] {
  return globalStore.__citybeeJobs ?? [];
}

function saveJob(job: BulkJob) {
  const jobs = globalStore.__citybeeJobs!;
  const i = jobs.findIndex((j) => j.id === job.id);
  if (i >= 0) jobs[i] = job;
  else jobs.unshift(job);
}

/** Queue a new import job. Processing starts immediately if idle. */
export async function queueBulkJob(items: BulkJobItem[]): Promise<BulkJob> {
  const session = await getAdminSession();
  const job: BulkJob = {
    id: `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    payload: items,
    status: 'queued',
    results: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveJob(job);
  void pumpQueue(session?.jwt);
  return job;
}

/** Serial pump: runs one job at a time; new jobs wait in line. */
async function pumpQueue(jwt?: string): Promise<void> {
  if (globalStore.__citybeeRunning) return;
  globalStore.__citybeeRunning = true;
  try {
    // Re-read session JWT per job (long queues may outlive a token? 12h — fine).
    while (true) {
      const jobs = globalStore.__citybeeJobs!;
      const next = [...jobs].reverse().find((j) => j.status === 'queued');
      if (!next) break;
      next.status = 'running';
      next.updatedAt = Date.now();
      saveJob(next);

      const token = jwt ?? (await getAdminSession())?.jwt;
      if (!token) {
        next.status = 'failed';
        next.error = 'Admin session expired — re-login and re-submit.';
        next.updatedAt = Date.now();
        saveJob(next);
        continue;
      }

      try {
        await runJob(next, token);
      } catch (err) {
        next.status = 'failed';
        next.error = err instanceof Error ? err.message : 'Job failed';
        next.updatedAt = Date.now();
      }
      saveJob(next);
      revalidatePath('/admin/bulk-import');
    }
  } finally {
    globalStore.__citybeeRunning = false;
  }
}

/** Execute one job against the backend's /businesses/bulk (25-item chunks). */
async function runJob(job: BulkJob, jwt: string): Promise<void> {
  const created = { c: 0, r: 0, f: 0 };
  const results: BulkJobResultItem[] = [];

  // Backend accepts up to 25 per call — chunk larger jobs.
  for (let i = 0; i < job.payload.length; i += 25) {
    const chunk = job.payload.slice(i, i + 25);
    const url = `${process.env.BACKEND_URL}/api/businesses/bulk`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ businesses: chunk }),
    });
    const body = (await res.json()) as {
      success?: boolean;
      message?: string;
      data?: { total: number; created: number; reused: number; failed: number; results: Record<string, unknown>[] };
    };

    if (!res.ok || !body.data) {
      throw new Error(body.message ?? `Backend rejected chunk ${i / 25 + 1} (HTTP ${res.status})`);
    }

    created.c += body.data.created;
    created.r += body.data.reused;
    created.f += body.data.failed;
    for (const r of body.data.results ?? []) {
      results.push({
        name: String(r.name ?? ''),
        ok: !r.error,
        status: r.created === true ? 'created' : r.error ? 'failed' : 'reused',
        slug: r.slug ? String(r.slug) : undefined,
        error: r.error ? String(r.error) : undefined,
      });
    }
    // Live progress update per chunk.
    job.results = results;
    job.updatedAt = Date.now();
    saveJob(job);
  }

  job.status = 'done';
  job.results = results;
  job.summary = {
    total: job.payload.length,
    created: created.c,
    reused: created.r,
    failed: created.f,
  };
  job.updatedAt = Date.now();

}

export function getJob(id: string): BulkJob | undefined {
  return (globalStore.__citybeeJobs ?? []).find((j) => j.id === id);
}
