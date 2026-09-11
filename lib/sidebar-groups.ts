/**
 * Multi-tier sidebar navigation (21st.dev "Dashboard Sidebar" structure).
 *
 * Flat groups hold leaf items; parents carry `children` (tier 2) rendered
 * indented with a vertical guide line, expandable with a rotating chevron.
 * Active state applies to leaf items only — parents just expand.
 */

export interface SidebarItem {
  key: string;
  href: string;
  label: string;
  /** Tier-2 items nested under this parent. */
  children?: SidebarItem[];
}

export interface SidebarGroup {
  /** Empty title renders the group without a heading. */
  title?: string;
  items: SidebarItem[];
}

export function getSidebarGroups(): SidebarGroup[] {
  return [
    {
      title: '',
      items: [
        { key: 'dashboard', href: '/admin', label: 'Overview' },
        { key: 'submissions', href: '/admin/submissions', label: 'Submissions' },
      ],
    },
    {
      title: 'Listings',
      items: [
        {
          key: 'businesses',
          href: '/admin/businesses',
          label: 'Businesses',
        },
        {
          key: 'discovery',
          href: '/admin/offers',
          label: 'Discovery Content',
          children: [
            { key: 'offers', href: '/admin/offers', label: 'Offers & Promotions' },
            { key: 'places', href: '/admin/places', label: 'Places & Sights' },
            { key: 'categories', href: '/admin/categories', label: 'Categories' },
            { key: 'cities', href: '/admin/cities', label: 'Cities' },
          ],
        },
        { key: 'bulk-import', href: '/admin/bulk-import', label: 'Bulk Import' },
      ],
    },
    {
      title: 'Engagement',
      items: [
        {
          key: 'community',
          href: '/admin/reviews',
          label: 'Community',
          children: [
            { key: 'reviews', href: '/admin/reviews', label: 'Reviews & Ratings' },
            { key: 'notifications', href: '/admin/notifications', label: 'Notifications' },
            { key: 'business-claims', href: '/admin/business-claims', label: 'Claims & Moderation' },
          ],
        },
        { key: 'users', href: '/admin/users', label: 'System Users' },
      ],
    },
  ];
}

/** Depth-first leaf list — used for parent auto-expand on active child. */
export function leafOf(item: SidebarItem): boolean {
  return !item.children?.length;
}
