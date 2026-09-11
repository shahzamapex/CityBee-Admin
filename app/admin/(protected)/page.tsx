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
      {/* ── Hero band ─────────────────────────────────────────── */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#B44400] via-brand to-[#FF9447] p-6 text-white shadow-lg md:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(255,255,255,0.25)]" />
              <span className="font-body text-[11px] font-bold uppercase tracking-widest text-white/80">
                Live Operations
              </span>
            </div>
            <h1 className="mt-2 font-headline text-3xl font-bold tracking-tight">
              Operations Overview
            </h1>
            <p className="mt-1 font-body text-sm text-white/85">
              {kpis.totalCities} active cities · {totalForTrend.toLocaleString()} listings ·{' '}
              {kpis.totalUsers.toLocaleString()} users
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href="/admin/submissions"
                className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 font-body text-sm font-bold text-brand shadow-md transition hover:bg-white/90 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">inbox</span>
                Review Submissions
                {kpis.pendingSubmissions > 0 && (
                  <span className="rounded-full bg-brand/10 px-1.5 py-0.5 font-body text-xs font-bold tabular-nums text-brand">
                    {kpis.pendingSubmissions}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/businesses/new"
                className="flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 font-body text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <span className="material-symbols-outlined text-[18px]">add_business</span>
                Add Business
              </Link>
              <Link
                href="/admin/bulk-import"
                className="flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 font-body text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                Bulk Import
              </Link>
            </div>
          </div>

          {/* Big numbers strip */}
          <div className="grid shrink-0 grid-cols-3 gap-3 md:gap-4">
            <HeroStat label="Businesses" value={kpis.totalBusinesses} />
            <HeroStat label="Offers" value={kpis.activeOffers} />
            <HeroStat
              label="Pending"
              value={kpis.pendingSubmissions + kpis.pendingBusinesses}
              alert={kpis.pendingSubmissions + kpis.pendingBusinesses > 0}
            />
          </div>
        </div>
      </section>

      {/* ── KPI metric cards ──────────────────────────────────── */}
      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon="storefront"
          label="Active Businesses"
          value={kpis.totalBusinesses}
          accent="bg-brand"
          href="/admin/businesses"
          footer={`${kpis.totalCities} cities covered`}
        />
        <KpiCard
          icon="inbox"
          label="Pending Submissions"
          value={kpis.pendingSubmissions}
          accent={kpis.pendingSubmissions > 0 ? 'bg-rose' : 'bg-emerald'}
          href="/admin/submissions"
          footer={kpis.pendingSubmissions > 0 ? 'Awaiting review' : 'All caught up'}
          pulse={kpis.pendingSubmissions > 0}
        />
        <KpiCard
          icon="local_offer"
          label="Active Offers"
          value={kpis.activeOffers}
          accent="bg-teal"
          href="/admin/offers"
          footer="live deals"
        />
        <KpiCard
          icon="star"
          label="Total Reviews"
          value={kpis.totalReviews}
          accent="bg-amber"
          href="/admin/reviews"
          footer={`${kpis.totalUsers} users`}
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
          <Card title="Latest Submissions" subtitle="Newest requests from the app">
            {data.recentSubmissions.length === 0 ? (
              <Empty>No submissions yet.</Empty>
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

function HeroStat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
      <div className={`font-headline text-[28px] font-bold leading-8 tabular-nums ${alert ? 'text-amber-200' : 'text-white'}`}>
        {value.toLocaleString()}
      </div>
      <div className="font-body text-[10.5px] font-semibold uppercase tracking-wider text-white/70">
        {label}
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
  href,
  footer,
  pulse,
}: {
  icon: string;
  label: string;
  value: number;
  accent: string;
  href: string;
  footer: string;
  pulse?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-border-subtle bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {label}
          </span>
          <span className="mt-1 font-headline text-[32px] font-bold leading-10 tabular-nums tracking-tight text-ink">
            {value.toLocaleString()}
          </span>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${accent} ${pulse ? 'animate-pulse' : ''}`}
        >
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        <span className="font-body text-xs text-ink-soft">{footer}</span>
        <span className="material-symbols-outlined ml-auto text-[16px] text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand">
          arrow_forward
        </span>
      </div>
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
      <div className="flex items-center justify-between border-b border-border-subtle/60 px-5 pb-3 pt-4">
        <div>
          <h3 className="font-headline text-base font-semibold tracking-tight text-ink">{title}</h3>
          <p className="font-body text-xs text-ink-soft">{subtitle}</p>
        </div>
        <span className="material-symbols-outlined text-[18px] text-ink-muted/50">more_vert</span>
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
      className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-canvas px-3.5 py-2.5 transition hover:border-brand/30 hover:bg-brand-soft/30"
    >
      <span className="material-symbols-outlined text-[18px] text-brand">{icon}</span>
      <span className="font-body text-sm font-semibold text-ink-soft">{label}</span>
      <span className="ml-auto font-headline text-lg font-bold tabular-nums text-ink">{value}</span>
      <span className="material-symbols-outlined text-[15px] text-ink-muted opacity-0 transition group-hover:opacity-100">
        chevron_right
      </span>
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
