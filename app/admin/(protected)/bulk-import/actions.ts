'use server';

import { queueBulkJob, type BulkJobItem } from '@/lib/bulk-jobs';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface QueueResult {
  ok: boolean;
  error?: string;
  jobId?: string;
  count?: number;
}

/** Queue a pasted JSON array (or {businesses: [...]}) as an import job. */
export async function queueBulkImport(rawJson: string): Promise<QueueResult> {
  await requireAdmin();

  const trimmed = rawJson.trim();
  if (!trimmed) return { ok: false, error: 'Paste some JSON first.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Invalid JSON — check commas/quotes (trailing commas not allowed).' };
  }

  let items: unknown[] | null = null;
  if (Array.isArray(parsed)) items = parsed;
  else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { businesses?: unknown[] }).businesses)) {
    items = (parsed as { businesses: unknown[] }).businesses;
  }
  if (!items) {
    return { ok: false, error: 'Expected a JSON array of businesses, or {"businesses": [...]}' };
  }
  if (items.length === 0) return { ok: false, error: 'The array is empty.' };
  if (items.length > 200) return { ok: false, error: 'Maximum 200 businesses per job (backend processes in chunks of 25).' };

  // Validate each item minimally (backend re-validates fully).
  const KINDS = new Set(['restaurant', 'doctor', 'hotel', 'salon', 'shop', 'mall', 'service']);
  const clean: BulkJobItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;
    if (typeof item?.name !== 'string' || item.name.trim().length < 2) {
      return { ok: false, error: `Item ${i + 1}: "name" is required.` };
    }
    if (item.kind != null && (typeof item.kind !== 'string' || !KINDS.has(item.kind))) {
      return { ok: false, error: `Item ${i + 1} ("${item.name}"): kind must be one of ${[...KINDS].join(', ')}` };
    }
    clean.push({
      name: String(item.name).trim(),
      kind: typeof item.kind === 'string' ? item.kind : 'service',
      tagline: typeof item.tagline === 'string' ? item.tagline : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
      phone: typeof item.phone === 'string' ? item.phone : undefined,
      whatsapp: typeof item.whatsapp === 'string' ? item.whatsapp : undefined,
      address: typeof item.address === 'string' ? item.address : undefined,
      locality: typeof item.locality === 'string' ? item.locality : undefined,
      latitude: typeof item.latitude === 'number' ? item.latitude : undefined,
      longitude: typeof item.longitude === 'number' ? item.longitude : undefined,
      googlePlaceId: typeof item.googlePlaceId === 'string' ? item.googlePlaceId : undefined,
      imageUrls: Array.isArray(item.imageUrls)
        ? item.imageUrls.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 5)
        : undefined,
      specialization: typeof item.specialization === 'string' ? item.specialization : undefined,
      qualification: typeof item.qualification === 'string' ? item.qualification : undefined,
      experienceYears: typeof item.experienceYears === 'number' ? item.experienceYears : undefined,
      consultationFee: typeof item.consultationFee === 'string' ? item.consultationFee : undefined,
    });
  }

  const job = await queueBulkJob(clean);
  revalidatePath('/admin/bulk-import');
  return { ok: true, jobId: String(job.id), count: clean.length };
}
