import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CityBee Admin',
  description: 'Manage the CityBee backend — businesses, offers, places and more.',
};

/**
 * Minimal root layout — page chrome lives in route groups:
 *  • app/admin/(protected)/* → admin sidebar layout (auth required)
 *  • app/login, app/submit → standalone public pages
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
