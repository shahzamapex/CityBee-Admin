'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

/**
 * UrbanPulse-style fixed header: glass backdrop, quick search that
 * navigates to the matching entity list, notifications shortcut and
 * the admin profile block.
 */
export default function AdminHeader({ pendingSubmissions }: { pendingSubmissions: number }) {
  const router = useRouter();
  const pathname = usePathname();

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
    <header className="fixed left-64 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border-subtle bg-white/90 px-6 shadow-nav backdrop-blur-xl">
      {/* ── Left: search ────────────────────────────────────────── */}
      <form onSubmit={onSubmitSearch} className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3 text-[18px] text-ink-muted">
          search
        </span>
        <input
          name="q"
          type="text"
          placeholder="Search businesses, offers, submissions…"
          className="h-9 w-80 rounded-lg bg-subtle pl-9 pr-3 font-body text-sm text-ink shadow-[0_1px_2px_0_rgba(15,23,42,0.04)] outline-none transition placeholder:text-ink-muted focus:bg-white focus:ring-2 focus:ring-brand/20"
        />
      </form>

      {/* ── Right: actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/submissions"
          className="relative rounded-lg p-2 text-ink-soft transition hover:bg-subtle hover:text-ink"
          aria-label="Pending submissions"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {pendingSubmissions > 0 && (
            <span className="absolute right-0.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose font-body text-[10px] font-bold leading-4 text-white">
              {pendingSubmissions > 9 ? '9+' : pendingSubmissions}
            </span>
          )}
        </Link>

        <Link
          href="/admin/businesses/new"
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 font-body text-sm font-semibold text-white shadow-[0_1px_3px_0_rgba(15,23,42,0.08)] transition hover:bg-brand-hover"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span className="hidden sm:inline">Add Business</span>
        </Link>

        <div className="flex items-center gap-3 border-l border-border-subtle pl-4">
          <div className="hidden flex-col text-right sm:flex">
            <span className="font-body text-sm font-semibold text-ink">CityBee Admin</span>
            <span className="font-body text-[11px] text-ink-soft">{pathname === '/admin' ? 'Overview' : 'Workspace'}</span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-body text-[11px] font-bold text-brand">
            CB
          </div>
        </div>
      </div>
    </header>
  );
}
