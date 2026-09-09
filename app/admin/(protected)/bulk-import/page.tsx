import { requireAdmin } from '@/lib/auth';
import { getJobs } from '@/lib/bulk-jobs';
import BulkImportClient from './bulk-import-client';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Bulk Import — CityBee Admin' };

/** Server page: auth gate + initial jobs snapshot (DB-backed). */
export default async function BulkImportPage() {
  const session = await requireAdmin();
  const jobs = await getJobs(50);
  return <BulkImportClient initialJobs={jobs} adminName={session.name} />;
}
