import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession, isAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import PageHeader from '@/components/page-header';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Settings — CityBee Admin' };

/**
 * Admin settings: signed-in account, workspace/system info and quick
 * data counts. Read-only view — credentials live in Supabase Auth.
 */
export default async function SettingsPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  const session = await getAdminSession();
  const client = getAdminClient();

  const count = async (table: string) => {
    try {
      const { count } = await client.from(table).select('id', { count: 'exact', head: true });
      return count ?? 0;
    } catch {
      return 0;
    }
  };
  const [businesses, users, categories, cities] = await Promise.all([
    count('businesses'),
    count('users'),
    count('categories'),
    count('cities'),
  ]);

  const backend = process.env.BACKEND_URL ?? 'not configured';

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Account, workspace and system information." />

      {/* ── Account ─────────────────────────────────────────────── */}
      <Section title="Account" subtitle="Signed-in administrator">
        <Row icon="person" label="Name" value={session?.name ?? '—'} />
        <Row icon="mail" label="Email" value={session?.email ?? '—'} />
        <Row icon="admin_panel_settings" label="Role" value="Administrator" pill />
        <Row
          icon="schedule"
          label="Session"
          value={session ? 'Active (12h signed cookie)' : '—'}
          ok
        />
      </Section>

      {/* ── Workspace ───────────────────────────────────────────── */}
      <Section title="Workspace" subtitle="Data inventory and integrations">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <DataChip icon="storefront" label="Businesses" value={businesses} href="/admin/businesses" />
          <DataChip icon="group" label="Users" value={users} href="/admin/users" />
          <DataChip icon="category" label="Categories" value={categories} href="/admin/categories" />
          <DataChip icon="location_city" label="Cities" value={cities} href="/admin/cities" />
        </div>
        <Row icon="cloud" label="Backend API" value={backend} mono />
        <Row icon="dns" label="Database" value="Supabase PostgreSQL · connected" ok />
        <Row icon="image" label="Image storage" value="Cloudinary" />
      </Section>

      {/* ── Session actions ─────────────────────────────────────── */}
      <Section title="Session" subtitle="Sign out of this device">
        <form action="/api/logout" method="post" className="px-5 py-4">
          <button
            className="flex items-center gap-1.5 rounded-lg bg-rose px-4 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-rose/80"
          >
            <span className="material-symbols-outlined text-[17px]">logout</span>
            Sign out
          </button>
        </form>
      </Section>
    </div>
  );
}

// ── Building blocks ──────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
      <div className="border-b border-border-subtle/60 px-5 pb-3 pt-4">
        <h2 className="font-headline text-base font-semibold tracking-tight text-ink">{title}</h2>
        <p className="font-body text-xs text-ink-soft">{subtitle}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
  pill,
  ok,
}: {
  icon: string;
  label: string;
  value: string;
  mono?: boolean;
  pill?: boolean;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border-subtle/50 px-5 py-3 last:border-0">
      <span className="material-symbols-outlined text-[18px] text-ink-muted">{icon}</span>
      <span className="font-body text-sm font-semibold text-ink-soft">{label}</span>
      <span className="ml-auto flex items-center gap-1.5">
        {ok && <span className="h-2 w-2 rounded-full bg-emerald" />}
        {pill ? (
          <span className="rounded-full border border-brand/25 bg-brand-soft px-2 py-0.5 font-body text-[11px] font-semibold text-brand">
            {value}
          </span>
        ) : (
          <span
            className={`max-w-[280px] truncate font-body text-sm text-ink ${mono ? 'font-mono text-xs' : ''}`}
            title={value}
          >
            {value}
          </span>
        )}
      </span>
    </div>
  );
}

function DataChip({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-lg border border-border-subtle bg-canvas px-3.5 py-3 transition hover:border-brand/30 hover:bg-brand-soft/30"
    >
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[16px] text-brand">{icon}</span>
        <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          {label}
        </span>
      </div>
      <span className="font-headline text-xl font-bold tabular-nums text-ink">
        {value.toLocaleString()}
      </span>
    </Link>
  );
}
