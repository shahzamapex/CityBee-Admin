import { entities } from '@/lib/entities';
import Link from 'next/link';

/**
 * Layout for the authenticated admin area (route group `(admin)`):
 * sidebar navigation + sign out.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-stone-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6F00] text-sm font-extrabold text-white">
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
          <SidebarLink href="/" label="Dashboard" emoji="📊" />
          {entities.map((entity) => (
            <SidebarLink
              key={entity.key}
              href={`/${entity.key}`}
              label={entity.title}
              emoji={entityIcon(entity.icon)}
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

      {/* ── Content column (mobile top bar + main) ──────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6F00] text-xs font-extrabold text-white">
              CB
            </div>
            <span className="text-sm font-extrabold">
              City<span className="text-[#FF6F00]">Bee</span> Admin
            </span>
          </div>
          <form action="/api/logout" method="post">
            <button className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500">Sign out</button>
          </form>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-stone-200 bg-white px-4 py-2 md:hidden">
          <MobileLink href="/" label="Dashboard" />
          {entities.map((entity) => (
            <MobileLink key={entity.key} href={`/${entity.key}`} label={entity.title} />
          ))}
        </div>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
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
}: {
  href: string;
  label: string;
  emoji: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-orange-50 hover:text-[#FF6F00]"
    >
      <span className="text-base leading-none">{emoji}</span>
      {label}
    </Link>
  );
}

function MobileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap rounded-full bg-stone-100 px-3 py-1.5 text-xs font-bold text-slate-600"
    >
      {label}
    </Link>
  );
}
