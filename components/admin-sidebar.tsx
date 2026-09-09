'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { entities } from '@/lib/entities';

/**
 * Admin sidebar with active-state highlighting and modern polish.
 */
export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-stone-200 bg-white md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6F00] text-sm font-extrabold text-white shadow-sm shadow-orange-200">
          CB
        </div>
        <div>
          <div className="text-sm font-extrabold leading-tight">
            City<span className="text-[#FF6F00]">Bee</span>
          </div>
          <div className="text-[11px] font-medium text-slate-400">Admin Panel</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        <SidebarLink href="/admin" label="Dashboard" emoji="📊" active={isActive('/admin')} />
        {entities.map((entity) => (
          <SidebarLink
            key={entity.key}
            href={`/admin/${entity.key}`}
            label={entity.title}
            emoji={entityIcon(entity.icon)}
            active={isActive(`/admin/${entity.key}`)}
          />
        ))}
      </nav>

      <div className="border-t border-stone-200 p-3">
        <Link
          href="/submit"
          target="_blank"
          className="mb-1 block rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-orange-50 hover:text-[#FF6F00]"
        >
          🔗 Public Form ↗
        </Link>
        <form action="/api/logout" method="post">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600">
            ⏻ Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function entityIcon(icon: string): string {
  return (
    {
      City: '🏙️',
      Category: '🗂️',
      Store: '🏪',
      Offer: '🏷️',
      Map: '🗺️',
      People: '👥',
      Star: '⭐',
      Notifications: '🔔',
      Verified: '✅',
      Pending: '⏳',
      Submission: '📥',
    } as Record<string, string>
  )[icon] ?? '📄';
}

function SidebarLink({
  href,
  label,
  emoji,
  active,
}: {
  href: string;
  label: string;
  emoji: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-gradient-to-r from-orange-50 to-orange-50/40 text-[#FF6F00]'
          : 'text-slate-600 hover:bg-stone-50 hover:text-slate-900'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#FF6F00]" />
      )}
      <span className="text-base leading-none">{emoji}</span>
      {label}
    </Link>
  );
}
