/**
 * Sidebar grouping (UrbanPulse-style sections) — navigation structure
 * lives in one place. Labels match the entity registry titles.
 */

export interface SidebarItem {
  key: string;
  href: string;
  label: string;
}

export interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

export function getSidebarGroups(): SidebarGroup[] {
  return [
    {
      title: 'Main',
      items: [
        { key: 'dashboard', href: '/admin', label: 'Overview Dashboard' },
        { key: 'submissions', href: '/admin/submissions', label: 'Submissions' },
        { key: 'businesses', href: '/admin/businesses', label: 'Businesses' },
        { key: 'bulk-import', href: '/admin/bulk-import', label: 'Bulk Import' },
      ],
    },
    {
      title: 'Growth & Engagement',
      items: [
        { key: 'offers', href: '/admin/offers', label: 'Offers & Promotions' },
        { key: 'places', href: '/admin/places', label: 'Places & Sights' },
        { key: 'reviews', href: '/admin/reviews', label: 'Reviews & Ratings' },
      ],
    },
    {
      title: 'System & Taxonomy',
      items: [
        { key: 'cities', href: '/admin/cities', label: 'Cities' },
        { key: 'categories', href: '/admin/categories', label: 'Categories' },
        { key: 'users', href: '/admin/users', label: 'System Users' },
        { key: 'notifications', href: '/admin/notifications', label: 'Notifications' },
        { key: 'business-claims', href: '/admin/business-claims', label: 'Claims & Moderation' },
      ],
    },
  ];
}
