import AdminSidebar from '@/components/admin-sidebar';
import AdminHeader from '@/components/admin-header';
import { getAdminClient } from '@/lib/supabase';

/**
 * Authenticated admin area shell (21st.dev pattern): collapsible sidebar
 * rail + sticky top bar + fluid content viewport, laid out as a flex row.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Pending-submission badge (server-rendered, fresh per navigation).
  let pending = 0;
  try {
    const { count } = await getAdminClient()
      .from('business_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    pending = count ?? 0;
  } catch {
    // Header badge is decorative — never block rendering on it.
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminSidebar pendingSubmissions={pending} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader pendingSubmissions={pending} />
        <main className="w-full flex-1 px-4 pb-12 pt-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
