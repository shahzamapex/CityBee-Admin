'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSidebarGroups } from '@/lib/sidebar-groups';

/** Material Symbols icon per entity key (mirrors the reference portal). */
const ICONS: Record<string, string> = {
  dashboard: 'space_dashboard',
  businesses: 'storefront',
  submissions: 'verified_user',
  offers: 'local_offer',
  places: 'explore',
  cities: 'cloud_upload',
  categories: 'category',
  users: 'group',
  reviews: 'reviews',
  notifications: 'notifications',
  'business-claims': 'gavel',
};

/**
 * UrbanPulse-style sidebar: fixed 16rem rail, grouped sections with
 * uppercase micro-labels, active = primary-container pill, live status
 * footer chip, Material Symbols icons.
 */
export default function AdminSidebar({ pendingSubmissions }: { pendingSubmissions: number }) {
  const pathname = usePathname();
  const groups = getSidebarGroups();

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col justify-between overflow-y-auto border-r border-border-subtle bg-white shadow-nav">
      <div className="flex flex-col">
        {/* ── Brand ────────────────────────────────────────────── */}
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-[13px] font-extrabold text-white">
            CB
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-[15px] font-semibold tracking-tight text-ink">
                CityBee
              </span>
              <span className="rounded bg-subtle px-1.5 py-0.5 font-body text-[10px] font-semibold tracking-wide text-brand">
                v2.0
              </span>
            </div>
            <span className="-mt-0.5 font-body text-[11px] text-ink-soft">Hyperlocal Ops</span>
          </div>
        </div>

        {/* ── Grouped nav ───────────────────────────────────────── */}
        <div className="flex flex-col gap-6 px-3 py-4">
          {groups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <span className="px-2 pb-1 font-body text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {group.title}
              </span>
              <nav className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const badge =
                    item.key === 'submissions' && pendingSubmissions > 0 ? pendingSubmissions : null;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all ${
                        active
                          ? 'bg-brand font-semibold text-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]'
                          : 'text-ink-soft hover:bg-subtle hover:text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px]">
                          {ICONS[item.key] ?? 'description'}
                        </span>
                        <span className="font-body text-sm">{item.label}</span>
                      </div>
                      {badge !== null && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 font-body text-[10px] font-semibold leading-4 ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-rose/10 text-rose'
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer: live status + actions ──────────────────────── */}
      <div className="sticky bottom-0 flex flex-col gap-2 bg-white p-3">
        <Link
          href="/submit"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-ink-soft transition hover:bg-subtle hover:text-ink"
        >
          <span className="material-symbols-outlined text-[20px]">open_in_new</span>
          <span className="font-body text-sm">Public Form</span>
        </Link>
        <form action="/api/logout" method="post">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-ink-soft transition hover:bg-rose/5 hover:text-rose">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="font-body text-sm">Sign out</span>
          </button>
        </form>
        <div className="mx-1 mb-1 flex items-center justify-between rounded-xl bg-subtle px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald" />
            <div className="flex flex-col">
              <span className="font-body text-[12px] font-semibold text-ink">Database Live</span>
              <span className="font-body text-[10px] tabular-nums text-ink-soft">Supabase connected</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[18px] text-ink-muted">dns</span>
        </div>
      </div>
    </aside>
  );
}
