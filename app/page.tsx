import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { listBusinesses, type BackendBusiness } from '@/lib/backend';
import { CityBeeMark } from '@/components/citybee-logo';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'CityBee — Discover What\'s Around You',
  description: 'Find the best local businesses, offers and places in your city. List your business free on CityBee.',
};

// Read-only public data: anon key + RLS (approved businesses only).
function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  dining: { emoji: '🍕', label: 'Food & Dining' },
  doctors: { emoji: '🩺', label: 'Doctors' },
  hotels: { emoji: '🏨', label: 'Hotels' },
  salons: { emoji: '💄', label: 'Salons' },
  fashion: { emoji: '👗', label: 'Fashion' },
  grocery: { emoji: '🛒', label: 'Grocery' },
  malls: { emoji: '🏬', label: 'Malls' },
  barbers: { emoji: '💈', label: 'Barbers' },
  heritage: { emoji: '🏛️', label: 'Heritage' },
  cinemas: { emoji: '🎬', label: 'Cinemas' },
};

export default async function HomePage() {
  const client = publicClient();

  // Businesses come from the CityBee backend API (Cloud Run) — enriched
  // with images/verification; taxonomy reads stay direct on Supabase (RLS).
  let businesses: BackendBusiness[] = [];
  try {
    const res = await listBusinesses({ limit: 8, city: 'moradabad' });
    businesses = res.items;
  } catch {
    // Backend unreachable → fall back to direct RLS read so the page
    // never breaks.
    const { data } = await client
      .from('businesses')
      .select('name, tagline, kind, locality, rating, review_count, is_verified')
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })
      .limit(8);
    businesses = (data ?? []) as unknown as BackendBusiness[];
  }
  const [categoriesRes, cityRes] = await Promise.all([
    client.from('categories').select('slug, name').eq('is_active', true).order('sort_order').limit(10),
    client.from('cities').select('name, state_region').eq('is_active', true).limit(1),
  ]);

  const categories = categoriesRes.data ?? [];
  const city = cityRes.data?.[0];

  return (
    <div className="min-h-screen bg-canvas">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <CityBeeMark size={30} />
            <span className="text-lg font-extrabold tracking-tight">
              City<span className="text-brand">Bee</span>
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="#businesses"
              className="hidden rounded-lg px-3 py-2 text-sm font-bold text-ink-soft transition hover:text-brand sm:block"
            >
              Businesses
            </a>
            <a
              href="#categories"
              className="hidden rounded-lg px-3 py-2 text-sm font-bold text-ink-soft transition hover:text-brand sm:block"
            >
              Categories
            </a>
            <Link
              href="/submit"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover"
            >
              List Your Business
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="border-b border-brand-soft bg-gradient-to-b from-brand-soft/60 to-canvas">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-24">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-soft shadow-lg">
            <CityBeeMark size={44} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Discover What&apos;s Around You
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base font-medium text-ink-soft sm:text-lg">
            The best local businesses, offers and places
            {city ? ` in ${city.name}` : ' in your city'} — verified and
            trusted by your community.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/submit"
              className="rounded-2xl bg-brand px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand-hover active:scale-[0.98]"
            >
              + List Your Business — Free
            </Link>
            <a
              href="#businesses"
              className="rounded-2xl border border-border-strong bg-white px-7 py-3.5 text-sm font-bold text-slate-600 transition hover:border-brand hover:text-brand"
            >
              Browse Businesses
            </a>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-12 flex max-w-2xl items-center justify-center gap-8 sm:gap-14">
            <Stat value={businesses.length > 0 ? `${businesses.length}+` : '—'} label="Local Businesses" />
            <Stat value={categories.length > 0 ? `${categories.length}` : '—'} label="Categories" />
            <Stat value="Free" label="Listing" />
          </div>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section id="categories" className="mx-auto max-w-5xl px-4 py-14">
          <SectionTitle eyebrow="Explore" title="Browse by category" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {categories.map((cat) => {
              const meta = CATEGORY_META[cat.slug] ?? { emoji: '🗂️', label: cat.name };
              return (
                <div
                  key={cat.slug}
                  className="rounded-2xl border border-border-subtle bg-white p-5 text-center shadow-sm transition hover:border-brand/30 hover:shadow-md"
                >
                  <div className="text-2xl">{meta.emoji}</div>
                  <div className="mt-2 text-sm font-bold text-slate-700">{meta.label}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Featured businesses ────────────────────────────────── */}
      <section id="businesses" className="border-t border-border-subtle bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <SectionTitle
            eyebrow="Featured"
            title="Popular local businesses"
            subtitle={
              city
                ? `Top-rated places in ${city.name}${city.state_region ? `, ${city.state_region}` : ''}`
                : 'Top-rated places near you'
            }
          />
          {businesses.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border-strong bg-subtle p-10 text-center">
              <p className="text-sm font-medium text-ink-muted">
                No businesses listed yet — be the first!
              </p>
              <Link
                href="/submit"
                className="mt-4 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-hover"
              >
                List Your Business
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {businesses.map((biz) => (
                <div
                  key={biz.name}
                  className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm transition hover:border-brand/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-brand-soft px-2.5 py-1 font-body text-[11px] font-bold uppercase tracking-wide text-brand">
                      {String(biz.kind ?? '')}
                    </span>
                    {Boolean(biz.is_verified) && (
                      <span className="text-[11px] font-bold text-green-600">✓ Verified</span>
                    )}
                  </div>
                  <h3 className="mt-3 line-clamp-1 font-extrabold">{biz.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs font-medium text-ink-soft">
                    {String(biz.tagline ?? '—')}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                    <span className="font-semibold text-slate-600">
                      {String(biz.locality ?? '—')}
                    </span>
                    {Number(biz.rating) > 0 && (
                      <span className="font-bold text-amber-600">
                        ★ {Number(biz.rating ?? 0).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand to-brand-hover">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center text-white">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Own a local business?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-white/85">
            Get discovered by thousands of locals — list your business on
            CityBee for free. Takes less than two minutes.
          </p>
          <Link
            href="/submit"
            className="mt-6 inline-block rounded-2xl bg-white px-8 py-3.5 text-sm font-extrabold text-brand shadow-lg transition hover:bg-brand-soft/50 active:scale-[0.98]"
          >
            List Your Business →
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border-subtle bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <CityBeeMark size={24} />
            <span className="text-sm font-extrabold">
              City<span className="text-brand">Bee</span>
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs font-bold text-ink-muted">
            <Link href="/submit" className="transition hover:text-brand">List Business</Link>
            <Link href="/admin" className="transition hover:text-brand">Admin</Link>
          </div>
          <p className="text-xs text-ink-muted">
            Discover What&apos;s Around You
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-extrabold text-slate-800 sm:text-3xl">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center">
      <div className="font-body text-xs font-bold uppercase tracking-widest text-brand">
        {eyebrow}
      </div>
      <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm font-medium text-ink-soft">{subtitle}</p>}
    </div>
  );
}
