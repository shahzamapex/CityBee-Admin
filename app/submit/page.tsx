import Link from 'next/link';
import SubmitForm from './submit-form';

/**
 * PUBLIC page — no login required (exempted from the admin middleware).
 * Customers submit listing requests that land in the admin panel for review.
 */
export const metadata = {
  title: 'List Your Business — CityBee',
  description: 'Submit your business to appear on CityBee. Free listing, verified by our team.',
};

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Public header ─────────────────────────────────────── */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6F00] text-sm font-extrabold text-white">
              CB
            </div>
            <span className="text-base font-extrabold">
              City<span className="text-[#FF6F00]">Bee</span>
            </span>
          </div>
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-400 transition hover:text-[#FF6F00]"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="px-4 py-10">
        <div className="mx-auto mb-8 max-w-lg text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">List Your Business</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Get discovered by thousands of locals on CityBee — free.
            Fill in the details below and our team will verify and publish
            your listing.
          </p>
        </div>
        <SubmitForm />
      </main>

      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs font-medium text-slate-400">
        CityBee — Discover What&apos;s Around You
      </footer>
    </div>
  );
}
