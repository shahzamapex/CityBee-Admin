import { getAdminClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

export interface DashboardData {
  kpis: {
    totalBusinesses: number;
    pendingBusinesses: number;
    activeOffers: number;
    pendingSubmissions: number;
    totalPlaces: number;
    totalUsers: number;
    totalReviews: number;
    totalCities: number;
  };
  businessesByStatus: { name: string; value: number; color: string }[];
  businessesByCategory: { name: string; count: number }[];
  businessesByKind: { name: string; count: number }[];
  submissionsTrend: { date: string; count: number }[];
  recentSubmissions: {
    id: string;
    business_name: string;
    submitter_name: string;
    kind: string;
    created_at: string;
    status: string;
  }[];
  recentReviews: {
    id: string;
    rating: number;
    review_text: string | null;
    status: string;
    created_at: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  approved: '#16A34A',
  pending: '#F59E0B',
  rejected: '#EF4444',
  inactive: '#94A3B8',
};

const KIND_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  doctor: 'Doctor',
  hotel: 'Hotel',
  salon: 'Salon',
  shop: 'Shop',
  mall: 'Mall',
  service: 'Service',
};

export async function getDashboardData(): Promise<DashboardData> {
  await requireAdmin();
  const client = getAdminClient();

  // Fire all independent queries in parallel.
  const [
    businessesCount,
    pendingBusinesses,
    activeOffers,
    pendingSubmissions,
    placesCount,
    usersCount,
    reviewsCount,
    citiesCount,
    statusRows,
    categoryJoinRows,
    kindRows,
    submissionsAll,
    recentSubs,
    recentReviews,
  ] = await Promise.all([
    client.from('businesses').select('id', { count: 'exact', head: true }),
    client.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    client.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    client.from('business_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    client.from('places').select('id', { count: 'exact', head: true }),
    client.from('users').select('id', { count: 'exact', head: true }),
    client.from('reviews').select('id', { count: 'exact', head: true }),
    client.from('cities').select('id', { count: 'exact', head: true }),
    // status + kind breakdown (fetch all, aggregate in JS — small tables)
    client.from('businesses').select('status'),
    client.from('business_categories').select('category_id'),
    client.from('businesses').select('kind'),
    client.from('business_submissions').select('created_at'),
    client.from('business_submissions')
      .select('id, business_name, submitter_name, kind, created_at, status')
      .order('created_at', { ascending: false })
      .limit(6),
    client.from('reviews')
      .select('id, rating, review_text, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  // Resolve category names for the join rows.
  const categoryIds = [...new Set((categoryJoinRows.data ?? []).map((r) => r.category_id))];
  const categoryNames = new Map<string, string>();
  if (categoryIds.length > 0) {
    const { data: cats } = await client.from('categories').select('id, name').in('id', categoryIds);
    for (const cat of cats ?? []) categoryNames.set(String(cat.id), cat.name);
  }

  // ── Businesses by status ─────────────────────────────────────
  const statusCounts = new Map<string, number>();
  for (const row of (statusRows.data ?? []) as { status: string }[]) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  }
  const businessesByStatus = [...statusCounts.entries()].map(([status, value]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value,
    color: STATUS_COLORS[status] ?? '#94A3B8',
  }));

  // ── Businesses by category (top 6) ───────────────────────────
  const catCounts = new Map<string, number>();
  for (const row of (categoryJoinRows.data ?? []) as { category_id: string }[]) {
    const name = categoryNames.get(String(row.category_id)) ?? 'Uncategorized';
    catCounts.set(name, (catCounts.get(name) ?? 0) + 1);
  }
  const businessesByCategory = [...catCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── Businesses by kind ───────────────────────────────────────
  const kindCounts = new Map<string, number>();
  for (const row of (kindRows.data ?? []) as { kind: string }[]) {
    const label = KIND_LABELS[row.kind] ?? row.kind;
    kindCounts.set(label, (kindCounts.get(label) ?? 0) + 1);
  }
  const businessesByKind = [...kindCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── Submissions trend (last 14 days) ─────────────────────────
  const days: { date: string; count: number }[] = [];
  const byDay = new Map<string, number>();
  for (const row of (submissionsAll.data ?? []) as { created_at: string }[]) {
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      count: byDay.get(key) ?? 0,
    });
  }

  return {
    kpis: {
      totalBusinesses: businessesCount.count ?? 0,
      pendingBusinesses: pendingBusinesses.count ?? 0,
      activeOffers: activeOffers.count ?? 0,
      pendingSubmissions: pendingSubmissions.count ?? 0,
      totalPlaces: placesCount.count ?? 0,
      totalUsers: usersCount.count ?? 0,
      totalReviews: reviewsCount.count ?? 0,
      totalCities: citiesCount.count ?? 0,
    },
    businessesByStatus,
    businessesByCategory,
    businessesByKind,
    submissionsTrend: days,
    recentSubmissions: (recentSubs.data ?? []).map((r) => ({
      id: String(r.id),
      business_name: String(r.business_name ?? ''),
      submitter_name: String(r.submitter_name ?? ''),
      kind: String(r.kind ?? ''),
      created_at: String(r.created_at ?? ''),
      status: String(r.status ?? ''),
    })),
    recentReviews: (recentReviews.data ?? []).map((r) => ({
      id: String(r.id),
      rating: Number(r.rating ?? 0),
      review_text: r.review_text ? String(r.review_text) : null,
      status: String(r.status ?? ''),
      created_at: String(r.created_at ?? ''),
    })),
  };
}
