import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CityBee Admin',
  description: 'Manage the CityBee backend — businesses, offers, places and more.',
};

/**
 * Minimal root layout — page chrome lives in route groups:
 *  • app/admin/(protected)/* → admin sidebar layout (auth required)
 *  • app/admin/login, app/submit → standalone public pages
 *
 * Fonts: Outfit (headlines) + Hanken Grotesk (body) — mirrors the Flutter app;
 * Material Symbols Outlined for icons.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
