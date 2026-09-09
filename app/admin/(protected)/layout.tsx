import AdminSidebar from '@/components/admin-sidebar';

/**
 * Layout for the authenticated admin area: sidebar + content column.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />

      {/* ── Content column (mobile top bar + main) ──────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
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
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
