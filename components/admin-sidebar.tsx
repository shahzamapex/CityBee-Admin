'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  'bulk-import': 'cloud_upload',
};

const STORAGE_KEY = 'cb_admin_sidebar_collapsed';

/**
 * Collapsible UrbanPulse-style sidebar. Toggle (in the brand row and as a
 * floating edge handle when collapsed) switches between the full 16rem rail
 * and an icon-only 4rem rail; the choice persists in localStorage.
 */
export default function AdminSidebar({ pendingSubmissions }: { pendingSubmissions: number }) {
  const pathname = usePathname();
  const groups = getSidebarGroups();
  const [collapsed, setCollapsed] = useState(false);

  // Restore + persist across refreshes / navigations.
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_KEY, c ? '0' : '1');
      return !c;
    });
    // Sync the content wrapper's margin in the same tab.
    window.dispatchEvent(new Event('cb-sidebar-toggle'));
  };

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full flex-col justify-between overflow-y-auto border-r border-border-subtle bg-white shadow-nav transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col">
        {/* ── Brand + collapse toggle ──────────────────────────────── */}
        <div className="flex h-16 items-center gap-3 px-3">
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
            aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition hover:bg-brand-hover"
          >
            <span className="material-symbols-outlined text-[18px]">
              {collapsed ? 'menu' : 'menu_open'}
            </span>
          </button>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-headline text-[15px] font-semibold tracking-tight text-ink">
                  CityBee
                </span>
                <span className="rounded bg-subtle px-1.5 py-0.5 font-body text-[10px] font-semibold tracking-wide text-brand">
                  v2.0
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Grouped nav ───────────────────────────────────────── */}
        <div className="flex flex-col gap-6 px-2 py-4">
          {groups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              {!collapsed && (
                <span className="px-2 pb-1 font-body text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  {group.title}
                </span>
              )}
              <nav className="flex flex-col gap-0.5">
                {groups && group.items.map((item) => {
                  const active = isActive(item.href);
                  const badge =
                    item.key === 'submissions' && pendingSubmissions > 0 ? pendingSubmissions : null;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg px-3 py-2 transition-all ${
                        active
                          ? 'bg-brand font-semibold text-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]'
                          : 'text-ink-soft hover:bg-subtle hover:text-ink'
                      }`}
                    >
                      <div className={`flex items-center ${collapsed ? 'w-full justify-center' : 'justify-between'}`}>
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-[20px]">
                            {ICONS[item.key] ?? 'description'}
                          </span>
                          {!collapsed && <span className="font-body text-sm">{item.label}</span>}
                        </div>
                        {badge !== null && !collapsed && (
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
                      </div>
                      {badge !== null && collapsed && (
                        <span className="pointer-events-none absolute right-2 top-2 h-2 w-2 rounded-full bg-rose" />
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
      <div className="sticky bottom-0 flex flex-col gap-2 bg-white p-2">
        <Link
          href="/submit"
          target="_blank"
          title={collapsed ? 'Public Form' : undefined}
          className={`flex items-center rounded-lg px-3 py-2 text-ink-soft transition hover:bg-subtle hover:text-ink ${
            collapsed ? 'justify-center' : 'gap-3'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">open_in_new</span>
          {!collapsed && <span className="font-body text-sm">Public Form</span>}
        </Link>
        <form action="/api/logout" method="post">
          <button
            title={collapsed ? 'Sign out' : undefined}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-ink-soft transition hover:bg-rose/5 hover:text-rose ${
              collapsed ? 'justify-center' : 'gap-3'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {!collapsed && <span className="font-body text-sm">Sign out</span>}
          </button>
        </form>
        {!collapsed && (
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
        )}
      </div>
    </aside>
  );
}
