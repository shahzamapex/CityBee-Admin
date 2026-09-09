'use server';

import { requireAdmin } from '@/lib/auth';
import { getJobs, type BulkJobView } from '@/lib/bulk-jobs';

/** Live job snapshot for polling (status/progress/results from the DB). */
export async function pollJobs(): Promise<BulkJobView[]> {
  await requireAdmin();
  return getJobs(50);
}
