-- Public business submissions — customers submit via the admin panel's
-- public /submit form; admins review and convert to businesses.

create table public.business_submissions (
  id uuid primary key default gen_random_uuid(),
  -- Who submitted (no account required — plain contact fields).
  submitter_name text not null,
  submitter_phone text not null,
  submitter_email text,
  -- The business being listed.
  business_name text not null,
  kind text not null default 'service'
    check (kind in ('restaurant','doctor','hotel','salon','shop','mall','service')),
  category_slug text,
  tagline text not null default '',
  description text not null default '',
  phone text,
  whatsapp text,
  address text not null default '',
  locality text,
  city_slug text not null default 'moradabad',
  opening_hours text,
  website text,
  -- Review workflow: pending → approved/rejected; reviewed_at + note by admin.
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index business_submissions_status_idx
  on public.business_submissions(status) where status = 'pending';
create index business_submissions_created_idx
  on public.business_submissions(created_at desc);

-- RLS: anonymous visitors can INSERT (submit) but never read/update;
-- admins (via service-role, which bypasses RLS) manage review in the panel.
alter table public.business_submissions enable row level security;

create policy submissions_public_insert on public.business_submissions
  for insert to anon, authenticated with check (true);

-- Optional link: once approved, remember which submission created the
-- business (service-role writes this).
comment on table public.business_submissions is
  'Customer-submitted business listing requests reviewed in the CityBee admin panel.';
