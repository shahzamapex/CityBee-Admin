import AdminSidebar from '@/components/admin-sidebar';
import AdminHeader from '@/components/admin-header';

/**
 * Authenticated admin area shell — a static frame (sidebar + top bar) so
 * page navigation never waits on layout data. The pending-submissions
 * badge is fetched client-side (see AdminHeader).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <main className="w-full flex-1 px-4 pb-12 pt-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
