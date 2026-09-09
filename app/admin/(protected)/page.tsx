import Link from 'next/link';
import { getDashboardData } from '@/lib/dashboard-data';
import { StatusDonut, CategoryBars, SubmissionsArea } from '@/components/charts';
import { isAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Operations Overview — CityBee Admin' };

export default async function DashboardPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  const data = await getDashboardData();
  const { kpis } = data;

  const totalForTrend = kpis.totalBusinesses + kpis.totalPlaces;

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* ── Page header ───────────────────────────────────────── */}
      <section className="flex flex-col justify-between gap-4 py-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="font-headline text-2xl font-semibold tracking-tight text-ink">
              Operations Overview
            </h1>
            <span className="rounded bg-teal-soft px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wider text-teal">
              Live Data
            </span>
          </div>
          <p className="font-body text-sm text-ink-soft">
            Real-time performance across {kpis.totalCities} active cities and{' '}
            {totalForTrend.toLocaleString()} listings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/submissions"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
          >
            <span className="material-symbols-outlined text-[18px]">inbox</span>
            Review Submissions
            {kpis.pendingSubmissions > 0 && (
              <span className="rounded-full bg-white/25 px-1.5 py-0.5 font-body text-xs font-bold tabular-nums">
                {kpis.pendingSubmissions}
              </span>
            )}
          </Link>
          <Link
            href="/admin/businesses/new"
            className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-white px-4 py-2 font-body text-sm font-semibold text-ink transition hover:bg-subtle"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            Add Business
          </Link>
        </div>
      </section>

      {/* ── KPI metric cards (5) ───────────────────────────────── */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon="storefront"
          label="Active Businesses"
          value={kpis.totalBusinesses}
          tone="brand"
          href="/admin/businesses"
          footer={
            <span className="font-body text-xs text-ink-soft">
              {kpis.totalCities} cities covered
            </span>
          }
        />
        <KpiCard
          icon="inbox"
          label="Pending Submissions"
          value={kpis.pendingSubmissions}
          tone={kpis.pendingSubmissions > 0 ? 'rose' : 'muted'}
          href="/admin/submissions"
          footer={
            kpis.pendingSubmissions > 0 ? (
              <span className="inline-flex items-center gap-1 rounded bg-rose/10 px-1.5 py-0.5 font-body text-[11px] font-semibold text-rose">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose" />
                Awaiting review
              </span>
            ) : (
              <span className="font-body text-xs text-ink-soft">All caught up</span>
            )
          }
        />
        <KpiCard
          icon="local_offer"
          label="Active Offers"
          value={kpis.activeOffers}
          tone="teal"
          href="/admin/offers"
          footer={<span className="font-body text-xs text-ink-soft">live deals</span>}
        />
        <KpiCard
          icon="verified"
          label="Pending Approvals"
          value={kpis.pendingBusinesses}
          tone="amber"
          href="/admin/businesses"
          footer={<span className="font-body text-xs text-ink-soft">businesses</span>}
        />
        <KpiCard
          icon="star"
          label="Total Reviews"
          value={kpis.totalReviews}
          tone="muted"
          href="/admin/reviews"
          footer={<span className="font-body text-xs text-ink-soft">{kpis.totalUsers} users</span>}
        />
      </section>

      {/* ── Charts row ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Business Overview" subtitle="By approval status">
          {data.businessesByStatus.length > 0 ? (
            <StatusDonut data={data.businessesByStatus} />
          ) : (
            <Empty>No businesses yet</Empty>
          )}
        </Card>

        <Card title="Submission Activity" subtitle="Last 14 days">
          <SubmissionsArea data={data.submissionsTrend} />
        </Card>

        <Card title="Top Categories" subtitle="Businesses per category">
          {data.businessesByCategory.length > 0 ? (
            <CategoryBars data={data.businessesByCategory} />
          ) : (
            <Empty>No categorized businesses yet</Empty>
          )}
        </Card>
      </div>

      {/* ── Catalog + recent activity ──────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Catalog" subtitle="Content inventory">
          <div className="space-y-2.5">
            <MiniStat icon="explore" label="Places" value={kpis.totalPlaces} href="/admin/places" />
            <MiniStat icon="group" label="Users" value={kpis.totalUsers} href="/admin/users" />
            <MiniStat icon="star" label="Reviews" value={kpis.totalReviews} href="/admin/reviews" />
            <MiniStat icon="cloud_upload" label="Cities" value={kpis.totalCities} href="/admin/cities" />
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card title="Latest Submissions" subtitle="Newest requests from the public form">
            {data.recentSubmissions.length === 0 ? (
              <Empty>No submissions yet — share the public form!</Empty>
            ) : (
              <div className="-mx-2">
                {data.recentSubmissions.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/admin/submissions/${sub.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-canvas"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <span className="material-symbols-outlined text-[18px]">{kindIcon(sub.kind)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-body text-sm font-semibold text-ink">{sub.business_name}</div>
                      <div className="font-body text-xs text-ink-soft">
                        {sub.submitter_name} · {timeAgo(sub.created_at)}
                      </div>
                    </div>
                    <StatusPill status={sub.status} />
                    <span className="material-symbols-outlined text-[18px] text-ink-muted">chevron_right</span>
                  </Link>
                ))}
                <Link
                  href="/admin/submissions"
                  className="mt-2 block rounded-lg px-2 py-2 text-center font-body text-xs font-semibold text-brand transition hover:bg-brand-soft/40"
                >
                  View all submissions →
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Building blocks ──────────────────────────────────────────────

const TONES: Record<string, { box: string; text: string; value: string }> = {
  brand: { box: 'bg-subtle text-brand', text: 'text-ink-soft', value: 'text-ink' },
  teal: { box: 'bg-teal-soft text-teal', text: 'text-ink-soft', value: 'text-ink' },
  amber: { box: 'bg-amber/10 text-amber', text: 'text-ink-soft', value: 'text-amber' },
  rose: { box: 'bg-rose/10 text-rose', text: 'text-ink-soft', value: 'text-rose' },
  muted: { box: 'bg-subtle text-ink-soft', text: 'text-ink-soft', value: 'text-ink' },
};

function KpiCard({
  icon,
  label,
  value,
  tone,
  href,
  footer,
}: {
  icon: string;
  label: string;
  value: number;
  tone: keyof typeof TONES;
  href: string;
  footer: React.ReactNode;
}) {
  const t = TONES[tone] ?? TONES.muted;
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border-subtle bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {label}
          </span>
          <span className={`mt-1 font-headline text-[32px] font-bold leading-10 tabular-nums tracking-tight ${t.value}`}>
            {value}
          </span>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors group-hover:bg-brand group-hover:text-white ${t.box}`}
        >
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5">{footer}</div>
    </Link>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white shadow-sm">
      <div className="border-b border-border-subtle/60 px-5 pb-3 pt-4">
        <h3 className="font-headline text-base font-semibold tracking-tight text-ink">{title}</h3>
        <p className="font-body text-xs text-ink-soft">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MiniStat({
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
      className="flex items-center gap-3 rounded-lg border border-border-subtle bg-canvas px-3.5 py-2.5 transition hover:border-brand/30 hover:bg-brand-soft/30"
    >
      <span className="material-symbols-outlined text-[18px] text-brand">{icon}</span>
      <span className="font-body text-sm font-semibold text-ink-soft">{label}</span>
      <span className="ml-auto font-headline text-lg font-bold tabular-nums text-ink">{value}</span>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    pending: 'bg-amber/10 text-amber',
    approved: 'bg-emerald/10 text-emerald',
    rejected: 'bg-rose/10 text-rose',
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-body text-[11px] font-semibold ${tone[status] ?? 'bg-subtle text-ink-soft'}`}>
      {status}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border-subtle font-body text-sm text-ink-muted">
      {children}
    </div>
  );
}

function kindIcon(kind: string): string {
  return (
    { restaurant: 'restaurant', doctor: 'medical_services', hotel: 'hotel', salon: 'spa', shop: 'storefront', mall: 'local_mall' } as Record<string, string>
  )[kind] ?? 'description';
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
