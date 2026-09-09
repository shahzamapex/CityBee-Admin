import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import SubmissionDetailActions from '@/components/submission-detail-actions';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Submission — CityBee Admin' };

/**
 * Dedicated submission detail page (static route wins over [entity]):
 * full submitted data + approve/reject/delete actions.
 */
export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { data: submission } = await getAdminClient()
    .from('business_submissions')
    .select('*')
    .eq('id', id)
    .single();
  if (!submission) notFound();

  async function deleteAction() {
    'use server';
    await requireAdmin();
    await getAdminClient().from('business_submissions').delete().eq('id', id);
    revalidatePath('/admin/submissions');
    redirect('/admin/submissions?deleted=1');
  }

  const status = String(submission.status);
  const rows: { label: string; value: string }[] = [
    { label: 'Business', value: String(submission.business_name ?? '—') },
    { label: 'Status', value: status },
    { label: 'Category', value: String(submission.category_slug ?? '—') },
    { label: 'Kind', value: String(submission.kind ?? '—') },
    { label: 'Submitted by', value: `${submission.submitter_name} · ${submission.submitter_phone}` },
    { label: 'Email', value: String(submission.submitter_email ?? '—') },
    { label: 'City', value: String(submission.city_name ?? submission.city_slug ?? '—') },
    { label: 'Address', value: String(submission.address ?? '—') },
    { label: 'Locality', value: String(submission.locality ?? '—') },
    { label: 'Phone', value: String(submission.phone ?? '—') },
    { label: 'WhatsApp', value: String(submission.whatsapp ?? '—') },
    { label: 'Hours', value: String(submission.opening_hours ?? '—') },
    { label: 'Website', value: String(submission.website ?? '—') },
    { label: 'Tagline', value: String(submission.tagline ?? '—') },
    // Doctor extras
    { label: 'Specialization', value: String(submission.specialization ?? '—') },
    { label: 'Qualification', value: String(submission.qualification ?? '—') },
    { label: 'Experience', value: submission.experience_years ? `${submission.experience_years} years` : '—' },
    { label: 'Consult fee', value: String(submission.consultation_fee ?? '—') },
    // Restaurant extras
    { label: 'Cuisines', value: String(submission.cuisine ?? '—') },
    { label: 'Food type', value: String(submission.veg_type ?? '—') },
    // Hotel extras
    { label: 'Hotel type', value: String(submission.hotel_type ?? '—') },
    { label: 'Amenities', value: String(submission.amenities ?? '—') },
    { label: 'Received', value: new Date(String(submission.created_at)).toLocaleString() },
  ];

  // Photos
  let imageUrls: string[] = [];
  if (submission.image_urls) {
    try {
      imageUrls = (JSON.parse(String(submission.image_urls)) as string[]).filter(
        (u) => typeof u === 'string' && u.startsWith('https://'),
      );
    } catch {
      imageUrls = [];
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/submissions"
            className="font-body text-xs font-semibold text-ink-muted transition hover:text-brand"
          >
            ← Back to Submissions
          </Link>
          <h1 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-ink">
            {String(submission.business_name)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/submissions/${id}/edit`}
            className="rounded-lg border border-border-strong bg-white px-4 py-2 font-body text-sm font-semibold text-ink transition hover:bg-subtle"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Action bar for pending; status display for reviewed */}
      <SubmissionDetailActions id={id} businessName={String(submission.business_name)} status={status} deleteAction={deleteAction} />

      {/* Photos */}
      {imageUrls.length > 0 && (
        <div className="mb-4 rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-body text-[11px] font-bold uppercase tracking-wide text-ink-soft">
            Submitted photos ({imageUrls.length})
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {imageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt={`Photo ${i + 1}`} className="h-20 w-full rounded-lg border border-border-subtle object-cover" />
            ))}
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border-subtle/60 last:border-0">
                <th className="w-44 bg-canvas px-4 py-2.5 text-left font-body text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                  {r.label}
                </th>
                <td className="px-4 py-2.5 font-body text-ink">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
