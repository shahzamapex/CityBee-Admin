'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cb_admin_sidebar_collapsed';

/**
 * Client wrapper that keeps the content margin in sync with the sidebar's
 * collapsed state (same localStorage key). Renders nothing visible itself.
 */
export default function AdminContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const sync = () => setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    sync();
    // Sidebar toggle writes to localStorage before this runs on other tabs;
    // within a tab the custom event below fires it immediately.
    window.addEventListener('cb-sidebar-toggle', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('cb-sidebar-toggle', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return <div className={collapsed ? 'pl-16' : 'pl-64'}>{children}</div>;
}
