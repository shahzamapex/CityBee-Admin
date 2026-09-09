import Link from 'next/link';
import { getDashboardData } from '@/lib/dashboard-data';
import { StatusDonut, CategoryBars, SubmissionsArea } from '@/components/charts';
import { isAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Dashboard — CityBee Admin' };

export default async function DashboardPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  const data = await getDashboardData();
  const { kpis } = data;

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Welcome back — here&apos;s what&apos;s happening with CityBee today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/submissions"
            className="rounded-xl bg-[#FF6F00] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-[#E65100]"
          >
            📥 Review Submissions
            {kpis.pendingSubmissions > 0 && (
              <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs font-extrabold tabular-nums">
                {kpis.pendingSubmissions}
              </span>
            )}
          </Link>
          <Link
            href="/admin/businesses/new"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-[#FF6F00] hover:text-[#FF6F00]"
          >
            + Business
          </Link>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          emoji="🏪"
          label="Businesses"
          value={kpis.totalBusinesses}
          sub={`${kpis.totalCities} cities`}
          gradient="from-orange-500 to-amber-500"
        />
        <KpiCard
          emoji="📥"
          label="New Submissions"
          value={kpis.pendingSubmissions}
          sub={kpis.pendingSubmissions > 0 ? 'awaiting review' : 'all caught up'}
          gradient="from-blue-500 to-sky-400"
          href="/admin/submissions"
          alert={kpis.pendingSubmissions > 0}
        />
        <KpiCard
          emoji="⏳"
          label="Pending Approval"
          value={kpis.pendingBusinesses}
          sub="businesses"
          gradient="from-amber-500 to-yellow-400"
          href="/admin/businesses"
          alert={kpis.pendingBusinesses > 0}
        />
        <KpiCard
          emoji="🏷️"
          label="Active Offers"
          value={kpis.activeOffers}
          sub="live deals"
          gradient="from-emerald-500 to-teal-400"
          href="/admin/offers"
        />
      </div>

      {/* ── Charts row ────────────────────────────────────────── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Donut: businesses by status */}
        <Card title="Business Overview" subtitle="By approval status">
          {data.businessesByStatus.length > 0 ? (
            <StatusDonut data={data.businessesByStatus} />
          ) : (
            <Empty>No businesses yet</Empty>
          )}
        </Card>

        {/* Area: submissions trend */}
        <Card title="Submission Activity" subtitle="Last 14 days">
          <SubmissionsArea data={data.submissionsTrend} />
        </Card>

        {/* Bars: businesses by category */}
        <Card title="Top Categories" subtitle="Businesses per category">
          {data.businessesByCategory.length > 0 ? (
            <CategoryBars data={data.businessesByCategory} />
          ) : (
            <Empty>No categorized businesses yet</Empty>
          )}
        </Card>
      </div>

      {/* ── Secondary KPIs + recent activity ──────────────────── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Secondary stats */}
        <Card title="Catalog" subtitle="Everything else">
          <div className="space-y-3">
            <MiniStat emoji="🗺️" label="Places" value={kpis.totalPlaces} href="/admin/places" />
            <MiniStat emoji="👥" label="Users" value={kpis.totalUsers} href="/admin/users" />
            <MiniStat emoji="⭐" label="Reviews" value={kpis.totalReviews} href="/admin/reviews" />
            <MiniStat emoji="🏙️" label="Cities" value={kpis.totalCities} href="/admin/cities" />
          </div>
        </Card>

        {/* Recent submissions */}
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
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-orange-50/60"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm">
                      {kindEmoji(sub.kind)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{sub.business_name}</div>
                      <div className="text-xs font-medium text-slate-400">
                        by {sub.submitter_name} · {timeAgo(sub.created_at)}
                      </div>
                    </div>
                    <StatusPill status={sub.status} />
                    <span className="text-slate-300">›</span>
                  </Link>
                ))}
                <Link
                  href="/admin/submissions"
                  className="mt-2 block rounded-xl px-2 py-2 text-center text-xs font-bold text-[#FF6F00] transition hover:bg-orange-50"
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

function KpiCard({
  emoji,
  label,
  value,
  sub,
  gradient,
  href,
  alert,
}: {
  emoji: string;
  label: string;
  value: number;
  sub: string;
  gradient: string;
  href?: string;
  alert?: boolean;
}) {
  const inner = (
    <div className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div
        className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 transition group-hover:opacity-20`}
      />
      {alert && value > 0 && (
        <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
      )}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-lg text-white shadow-sm`}
      >
        {emoji}
      </div>
      <div className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-medium text-slate-400">{sub}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
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
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-extrabold tracking-tight">{title}</h3>
        <p className="text-xs font-medium text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function MiniStat({
  emoji,
  label,
  value,
  href,
}: {
  emoji: string;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/60 px-3.5 py-2.5 transition hover:border-[#FF6F00]/30 hover:bg-orange-50/50"
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <span className="ml-auto text-lg font-extrabold tabular-nums">{value}</span>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600',
    approved: 'bg-green-50 text-green-600',
    rejected: 'bg-red-50 text-red-500',
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone[status] ?? 'bg-stone-100 text-slate-500'}`}
    >
      {status}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-stone-200 text-sm font-medium text-slate-400">
      {children}
    </div>
  );
}

function kindEmoji(kind: string): string {
  return (
    { restaurant: '🍕', doctor: '🩺', hotel: '🏨', salon: '💄', shop: '🏪', mall: '🏬' } as Record<string, string>
  )[kind] ?? '📄';
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
