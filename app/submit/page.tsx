import Link from 'next/link';
import SubmitForm from './submit-form';

/**
 * PUBLIC page — no login required (exempted from the admin middleware).
 * Desktop-first split layout: branded info panel + form card.
 */
export const metadata = {
  title: 'List Your Business — CityBee',
  description: 'Submit your business to appear on CityBee. Free listing, verified by our team.',
};

const BENEFITS = [
  {
    emoji: '🎯',
    title: 'Get discovered',
    text: 'Thousands of locals browse CityBee every day looking for businesses like yours.',
  },
  {
    emoji: '✅',
    title: 'Verified badge',
    text: 'Our team verifies every listing so customers trust your business from day one.',
  },
  {
    emoji: '🏷️',
    title: 'Run offers',
    text: 'Publish deals and offers to attract more customers once you are listed.',
  },
  {
    emoji: '💸',
    title: 'Completely free',
    text: 'Listing on CityBee is free — no commissions, no hidden charges.',
  },
];

const STEPS = [
  'Fill in your business details',
  'Our team verifies your info (usually 24–48h)',
  'Your business goes live on CityBee',
];

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Top header ─────────────────────────────────────────── */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6F00] text-sm font-extrabold text-white shadow-sm shadow-orange-200">
              CB
            </div>
            <span className="text-base font-extrabold tracking-tight">
              City<span className="text-[#FF6F00]">Bee</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-bold text-slate-500 transition hover:text-[#FF6F00]"
            >
              Home
            </Link>
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-400 transition hover:text-[#FF6F00]"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Split layout ───────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* ── Left: info panel ────────────────────────────────── */}
          <aside className="lg:col-span-2">
            <div className="lg:sticky lg:top-10">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                List your business on{' '}
                <span className="text-[#FF6F00]">CityBee</span>
              </h1>
              <p className="mt-3 text-base font-medium leading-relaxed text-slate-500">
                It takes less than two minutes. Our team reviews every
                submission before it goes live.
              </p>

              {/* How it works */}
              <ol className="mt-8 space-y-4">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex items-start gap-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-extrabold text-[#FF6F00]">
                      {i + 1}
                    </span>
                    <span className="pt-1 text-sm font-semibold text-slate-600">{step}</span>
                  </li>
                ))}
              </ol>

              {/* Benefits */}
              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {BENEFITS.map((b) => (
                  <div
                    key={b.title}
                    className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{b.emoji}</span>
                      <span className="text-sm font-extrabold">{b.title}</span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">
                      {b.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Right: the form ─────────────────────────────────── */}
          <div className="lg:col-span-3">
            <SubmitForm />
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-xs font-medium text-slate-400 sm:flex-row">
          <span>CityBee — Discover What&apos;s Around You</span>
          <span>Free listing · Verified by our team</span>
        </div>
      </footer>
    </div>
  );
}
