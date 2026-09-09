import { requireAdmin } from '@/lib/auth';
import { getJobs, type BulkJob } from '@/lib/bulk-jobs';
import BulkImportClient from './bulk-import-client';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Bulk Import — CityBee Admin' };

/** Server page: auth gate + initial jobs snapshot → client handles live polling. */
export default async function BulkImportPage() {
  const session = await requireAdmin();
  const jobs = getJobs().map(serializeJob);
  return <BulkImportClient initialJobs={jobs} adminName={session.name} />;
}

function serializeJob(job: BulkJob) {
  return {
    id: job.id,
    status: job.status,
    payloadCount: job.payload.length,
    results: job.results,
    summary: job.summary ?? null,
    error: job.error ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
