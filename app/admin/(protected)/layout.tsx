import AdminSidebar from '@/components/admin-sidebar';
import AdminHeader from '@/components/admin-header';
import { getAdminClient } from '@/lib/supabase';

/**
 * Layout for the authenticated admin area: fixed UrbanPulse-style rail
 * + fixed glass header + fluid content viewport.
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
    <div className="min-h-screen">
      <AdminSidebar pendingSubmissions={pending} />
      <div className="pl-64">
        <AdminHeader pendingSubmissions={pending} />
        <main className="min-h-screen w-full bg-canvas px-4 pb-12 pt-20 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
