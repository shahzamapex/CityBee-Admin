'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSidebarGroups, type SidebarItem } from '@/lib/sidebar-groups';

/** Material Symbols icon per entity key (mirrors the reference portal). */
const ICONS: Record<string, string> = {
  dashboard: 'space_dashboard',
  submissions: 'move_to_inbox',
  businesses: 'storefront',
  'discovery': 'travel_explore',
  offers: 'local_offer',
  places: 'explore',
  categories: 'category',
  cities: 'location_city',
  'bulk-import': 'cloud_upload',
  community: 'forum',
  reviews: 'reviews',
  notifications: 'notifications',
  'business-claims': 'gavel',
  users: 'group',
};

const STORAGE_KEY = 'cb_admin_sidebar_open';

/**
 * Multi-tier sidebar (21st.dev "Dashboard Sidebar" pattern): grouped
 * sections with expandable parents, nested children on a vertical guide
 * line, soft-wash active states, pinned footer — all in CityBee colors.
 * The whole rail collapses to zero width; the header keeps the toggle.
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const groups = getSidebarGroups();
  const [open, setOpen] = useState(true);
  const [pendingSubmissions, setPending] = useState(0);

  // Badge comes from the header's background fetch, not a server query
  // in the layout — keeps navigation instant.
  useEffect(() => {
    const on = (e: Event) => setPending((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener('cb-pending-count', on);
    return () => window.removeEventListener('cb-pending-count', on);
  }, []);

  // Rail collapse (driven by the header toggle, persisted in localStorage).
  useEffect(() => {
    const sync = () => setOpen(localStorage.getItem(STORAGE_KEY) !== '0');
    sync();
    window.addEventListener('cb-sidebar-toggle', sync);
    return () => window.removeEventListener('cb-sidebar-toggle', sync);
  }, []);

  // Which tier-2 parents are expanded (keyed by parent key).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Auto-expand any parent whose child is the active route (once, on mount).
  useEffect(() => {
    setExpanded(() => {
      const next: Record<string, boolean> = {};
      for (const g of groups) {
        for (const item of g.items) {
          if (item.children?.some((c) => isActive(pathname, c.href))) {
            next[item.key] = true;
          }
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function isActivePath(href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const toggle = (key: string) =>
    setExpanded((e) => ({ ...e, [key]: !e[key] }));

  return (
    <aside
      className={`sticky top-0 z-50 flex h-screen shrink-0 flex-col overflow-hidden border-r bg-surface transition-all duration-300 ${
        open ? 'w-[260px] border-border-subtle opacity-100' : 'w-0 border-transparent opacity-0'
      }`}
    >
      {/* ── Brand ─────────────────────────────────────────────────── */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-[13px] font-extrabold text-white">
          CB
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="font-headline text-[15px] font-semibold leading-tight tracking-tight text-ink">
            CityBee
          </span>
          <span className="font-body text-[10.5px] leading-tight text-ink-muted">
            Admin Panel · v2.0
          </span>
        </div>
      </div>

      {/* ── Scrollable nav (scrollbars hidden) ─────────────────────── */}
      <nav className="scrollbar-none flex-1 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-4 pt-2">
          {groups.map((group, gi) => (
            <div key={group.title || gi} className="flex flex-col gap-1">
              {group.title ? (
                <span className="px-2.5 pb-0.5 font-body text-[11px] font-semibold uppercase tracking-wider text-ink-muted/70">
                  {group.title}
                </span>
              ) : null}
              {group.items.map((item) => (
                <NavItem
                  key={item.key}
                  item={item}
                  active={isActivePath(item.href)}
                  expanded={!!expanded[item.key]}
                  onToggle={() => toggle(item.key)}
                  badge={item.key === 'submissions' && pendingSubmissions > 0 ? pendingSubmissions : null}
                  isActivePath={isActivePath}
                />
              ))}
            </div>
          ))}
        </div>
      </nav>

      {/* ── Pinned footer ──────────────────────────────────────────── */}
      <div className="mt-auto shrink-0 border-t border-border-subtle p-3">
        <Link
          href="/admin/settings"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-ink-soft transition hover:bg-subtle hover:text-ink"
        >
          <span className="material-symbols-outlined text-[16px] opacity-70">settings</span>
          <span className="font-body text-[13px]">Settings</span>
        </Link>
        <form action="/api/logout" method="post">
          <button className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-ink-soft transition hover:bg-rose/5 hover:text-rose">
            <span className="material-symbols-outlined text-[16px] opacity-70">logout</span>
            <span className="font-body text-[13px]">Sign out</span>
          </button>
        </form>
        <div className="mx-1 mb-1 mt-2 flex items-center justify-between rounded-lg bg-subtle px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald" />
            <div className="flex flex-col">
              <span className="font-body text-[11px] font-semibold leading-tight text-ink">Database Live</span>
              <span className="font-body text-[9.5px] leading-tight text-ink-soft">Supabase connected</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[15px] text-ink-muted">dns</span>
        </div>
      </div>
    </aside>
  );
}

/** One nav row — leaf links navigate; parents expand their children. */
function NavItem({
  item,
  active,
  expanded,
  onToggle,
  badge,
  isActivePath,
}: {
  item: SidebarItem;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  badge: number | null;
  isActivePath: (href: string) => boolean;
}) {
  const hasChildren = !!item.children?.length;
  const content = (
    <>
      <span className="material-symbols-outlined text-[16px] opacity-70">
        {ICONS[item.key] ?? 'description'}
      </span>
      <span className="truncate font-body text-[13px] tracking-[0.01em]">{item.label}</span>
      {badge !== null && (
        <span className="ml-auto rounded-full bg-brand/10 px-1.5 py-0.5 font-body text-[10px] font-semibold leading-4 text-brand">
          {badge}
        </span>
      )}
      {hasChildren && badge === null && (
        <span
          className={`material-symbols-outlined ml-auto text-[15px] text-ink-muted transition-transform duration-300 ${
            expanded ? 'rotate-90' : ''
          }`}
        >
          chevron_right
        </span>
      )}
    </>
  );

  const rowCls = `flex items-center gap-2.5 rounded-md px-2.5 py-[7px] transition ${
    active && !hasChildren
      ? 'bg-brand-soft font-medium text-brand'
      : 'text-ink-soft hover:bg-subtle hover:text-ink'
  }`;

  return (
    <div>
      {hasChildren ? (
        <button type="button" onClick={onToggle} className={`${rowCls} w-full text-left`}>
          {content}
        </button>
      ) : (
        <Link href={item.href} className={rowCls}>
          {content}
        </Link>
      )}

      {/* Tier-2 children — indented on a vertical guide line */}
      {hasChildren && (
        <div
          className={`grid transition-all duration-300 ${
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="ml-[19px] mt-0.5 flex flex-col gap-0.5 border-l border-border-subtle py-0.5 pl-3">
              {item.children!.map((child) => {
                const childActive = isActivePath(child.href);
                return (
                  <Link
                    key={child.key}
                    href={child.href}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-[6px] transition ${
                      childActive
                        ? 'bg-brand-soft font-medium text-brand'
                        : 'text-ink-soft hover:bg-subtle hover:text-ink'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px] opacity-70">
                      {ICONS[child.key] ?? 'description'}
                    </span>
                    <span className="truncate font-body text-[12.5px]">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}
