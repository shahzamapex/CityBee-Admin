-- Bulk import jobs — persisted queue with results, so:
--  • pasted payloads survive page reloads / server restarts
--  • queued jobs run sequentially from the table
--  • completed/failed results stay visible in the admin panel forever

create table public.bulk_import_jobs (
  id uuid primary key default gen_random_uuid(),
  -- Who queued it.
  created_by uuid references public.users(id) on delete set null,
  created_by_email text,
  -- The pasted payload (array of BulkBusinessItemDto).
  payload jsonb not null default '[]',
  -- queued → running → done | failed
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed')),
  -- Per-record results from the backend bulk API.
  results jsonb not null default '[]',
  summary jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index bulk_import_jobs_status_idx
  on public.bulk_import_jobs(status) where status in ('queued', 'running');
create index bulk_import_jobs_created_idx
  on public.bulk_import_jobs(created_at desc);

-- Service-role/admin only: no anon access (RLS, no policies = deny all).
alter table public.bulk_import_jobs enable row level security;
