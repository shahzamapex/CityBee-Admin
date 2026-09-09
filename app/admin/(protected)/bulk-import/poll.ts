'use server';

import { requireAdmin } from '@/lib/auth';
import { getJobs } from '@/lib/bulk-jobs';

/** Live job snapshot for polling (status/progress/results). */
export async function pollJobs(): Promise<
  {
    id: string;
    status: string;
    payloadCount: number;
    results: { name: string; ok: boolean; status: string; slug?: string; error?: string }[];
    summary: { total: number; created: number; reused: number; failed: number } | null;
    error: string | null;
    createdAt: number;
    updatedAt: number;
  }[]
> {
  await requireAdmin();
  return getJobs().map((job) => ({
    id: job.id,
    status: job.status,
    payloadCount: job.payload.length,
    results: job.results,
    summary: job.summary ?? null,
    error: job.error ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }));
}
