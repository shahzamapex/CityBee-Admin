import { getAdminClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { entities, statCards } from '@/lib/entities';

export const dynamic = 'force-dynamic';

interface Counts {
  [table: string]: number | 'error';
}

async function fetchCounts(): Promise<Counts> {
  const client = getAdminClient();
  const results = await Promise.all(
    statCards.map(async (card) => {
      let query = client.from(card.table).select('id', { count: 'exact', head: true });
      if (card.where) {
        const [col, , value] = card.where.split('.');
        query = query.eq(col, value);
      }
      const { count, error } = await query;
      return [card.label, error ? 'error' : (count ?? 0)] as const;
    }),
  );
  return Object.fromEntries(results);
}

export default async function DashboardPage() {
  if (!(await isAdmin())) redirect('/login');
  const counts = await fetchCounts();

  const emojiFor: Record<string, string> = {
    Store: '🏪',
    Pending: '⏳',
    Offer: '🏷️',
    Map: '🗺️',
    People: '👥',
    Star: '⭐',
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Overview of the CityBee backend — quick links to every management area.
        </p>
      </header>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xl">{emojiFor[card.icon] ?? '📄'}</div>
            <div className="mt-2 text-2xl font-extrabold tabular-nums">
              {counts[card.label] === 'error' ? '—' : counts[card.label]}
            </div>
            <div className="text-xs font-semibold text-slate-500">{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick actions ──────────────────────────────────────── */}
      <h2 className="mt-10 text-sm font-extrabold uppercase tracking-wide text-slate-400">
        Manage
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entities.map((entity) => (
          <Link
            key={entity.key}
            href={`/${entity.key}`}
            className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-[#FF6F00]/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold group-hover:text-[#FF6F00]">{entity.title}</h3>
              <span className="text-slate-300 transition group-hover:text-[#FF6F00]">→</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">
              {entity.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
