'use server';

import { getAdminClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { getEntity } from '@/lib/entities';
import { formToPayload } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createRow(entityKey: string, form: FormData): Promise<void> {
  await requireAdmin();
  const entity = getEntity(entityKey);
  if (!entity) throw new Error('Unknown entity');

  const payload = formToPayload(entity, form, true);

  const { error } = await getAdminClient().from(entity.table).insert(payload);
  revalidatePath(`/admin/${entityKey}`);
  if (error) {
    redirect(`/admin/${entityKey}/new?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/admin/${entityKey}?created=1`);
}

export async function updateRow(entityKey: string, id: string, form: FormData): Promise<void> {
  await requireAdmin();
  const entity = getEntity(entityKey);
  if (!entity) throw new Error('Unknown entity');

  const payload = formToPayload(entity, form, true);
  const { error } = await getAdminClient()
    .from(entity.table)
    .update(payload)
    .eq('id', id);

  revalidatePath(`/admin/${entityKey}`);
  revalidatePath(`/${entityKey}/${id}`);
  if (error) {
    redirect(`/admin/${entityKey}/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/admin/${entityKey}?updated=1`);
}

export async function deleteRow(entityKey: string, id: string): Promise<void> {
  await requireAdmin();
  const entity = getEntity(entityKey);
  if (!entity) throw new Error('Unknown entity');

  const { error } = await getAdminClient().from(entity.table).delete().eq('id', id);
  revalidatePath(`/admin/${entityKey}`);
  if (error) {
    redirect(`/admin/${entityKey}?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/admin/${entityKey}?deleted=1`);
}
