'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CityBeeMark } from '@/components/citybee-logo';
import { getSidebarGroups } from '@/lib/sidebar-groups';

const STORAGE_KEY = 'cb_admin_sidebar_open';

/**
 * Admin top bar (21st.dev "Dashboard Sidebar" pattern): sidebar collapse
 * toggle, breadcrumb (workspace / active page), quick search, submissions
 * bell and the Add Business action.
 */
export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [pendingSubmissions, setPending] = useState(0);

  // Pending badge arrives after first paint — navigation never waits on it.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/pending-count');
        const body = (await res.json()) as { count?: number };
        if (!alive) return;
        setPending(body.count ?? 0);
        window.dispatchEvent(new CustomEvent('cb-pending-count', { detail: body.count ?? 0 }));
      } catch {
        // badge is decorative
      }
    };
    void load();
    const interval = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setOpen(localStorage.getItem(STORAGE_KEY) !== '0');
    const sync = () => setOpen(localStorage.getItem(STORAGE_KEY) !== '0');
    window.addEventListener('cb-sidebar-toggle', sync);
    return () => window.removeEventListener('cb-sidebar-toggle', sync);
  }, []);

  function toggleSidebar() {
    const next = !open;
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    setOpen(next);
    window.dispatchEvent(new Event('cb-sidebar-toggle'));
  }

  // Breadcrumb label — first active leaf across the (tiered) nav tree.
  const crumb = (() => {
    if (pathname === '/admin') return 'Overview';
    for (const g of getSidebarGroups()) {
      for (const item of g.items) {
        const match = (href: string) =>
          href !== '/admin' && (pathname === href || pathname.startsWith(`${href}/`));
        if (item.children?.some((c) => match(c.href))) {
          const child = item.children!.find((c) => match(c.href))!;
          return `${item.label} / ${child.label}`;
        }
        if (match(item.href)) return item.label;
      }
    }
    return 'Workspace';
  })();

  // Quick search → routes to the entity whose key matches the query.
  function onSubmitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get('q');
    const q = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const routes: Record<string, string> = {
      business: '/admin/businesses',
      restaurant: '/admin/businesses',
      doctor: '/admin/businesses',
      hotel: '/admin/businesses',
      offer: '/admin/offers',
      deal: '/admin/offers',
      place: '/admin/places',
      user: '/admin/users',
      review: '/admin/reviews',
      city: '/admin/cities',
      categor: '/admin/categories',
      submission: '/admin/submissions',
      claim: '/admin/business-claims',
      notification: '/admin/notifications',
    };
    const match = Object.keys(routes).find((key) => q.startsWith(key));
    router.push(match ? routes[match] : '/admin/businesses');
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-white/90 px-4 backdrop-blur-xl">
      {/* ── Left: collapse toggle + breadcrumb ─────────────────── */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          className="rounded-lg p-2 text-ink-soft transition hover:bg-subtle hover:text-ink"
        >
          <span className="material-symbols-outlined text-[20px]">{open ? 'menu_open' : 'menu'}</span>
        </button>
        <nav className="flex min-w-0 items-center gap-1.5 font-body text-[13px]" aria-label="Breadcrumb">
          <span className="text-ink-muted">CityBee</span>
          <span className="material-symbols-outlined text-[14px] text-ink-muted/60">chevron_right</span>
          <span className="truncate font-medium text-ink">{crumb}</span>
        </nav>
      </div>

      {/* ── Right: search + actions ─────────────────────────────── */}
      <div className="flex items-center gap-3">
        <form onSubmit={onSubmitSearch} className="relative hidden items-center md:flex">
          <span className="material-symbols-outlined absolute left-3 text-[17px] text-ink-muted">
            search
          </span>
          <input
            name="q"
            type="text"
            placeholder="Search businesses, offers, submissions…"
            className="h-9 w-72 rounded-lg bg-subtle pl-9 pr-3 font-body text-sm text-ink outline-none transition placeholder:text-ink-muted focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
        </form>

        <Link
          href="/admin/submissions"
          className="relative rounded-lg p-2 text-ink-soft transition hover:bg-subtle hover:text-ink"
          aria-label="Pending submissions"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {pendingSubmissions > 0 && (
            <span className="absolute right-0.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose font-body text-[10px] font-bold leading-4 text-white">
              {pendingSubmissions > 9 ? '9+' : pendingSubmissions}
            </span>
          )}
        </Link>

        <Link
          href="/admin/businesses/new"
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 font-body text-sm font-semibold text-white shadow-[0_1px_3px_0_rgba(15,23,42,0.08)] transition hover:bg-brand-hover"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span className="hidden sm:inline">Add Business</span>
        </Link>

        <div className="hidden items-center gap-2.5 border-l border-border-subtle pl-3 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft">
            <CityBeeMark size={22} />
          </div>
        </div>
      </div>
    </header>
  );
}
