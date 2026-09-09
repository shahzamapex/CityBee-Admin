import { isAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect('/admin');
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-lg font-headline font-extrabold text-white shadow-[0_4px_6px_-1px_rgba(15,23,42,0.1)]">
            CB
          </div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-ink">
            City<span className="text-brand">Bee</span> Admin
          </h1>
          <p className="mt-1 font-body text-sm text-ink-soft">
            Hyperlocal operations portal — sign in to continue
          </p>
        </div>

        <form
          action="/api/login"
          method="post"
          className="rounded-xl border border-border-subtle bg-white p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.05),0_1px_2px_-1px_rgba(15,23,42,0.05)]"
        >
          <label htmlFor="password" className="mb-1.5 block font-body text-sm font-semibold text-ink">
            Admin password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            className="h-9.5 w-full rounded-lg border border-border-strong bg-white px-3.5 py-2.5 font-body text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
            placeholder="••••••••••••"
          />
          {error && (
            <p className="mt-2 font-body text-sm font-semibold text-rose">
              Incorrect password. Try again.
            </p>
          )}
          <button
            type="submit"
            className="mt-5 w-full rounded-lg bg-brand py-2.5 font-body text-sm font-semibold text-white shadow-[0_1px_3px_0_rgba(15,23,42,0.08)] transition hover:bg-brand-hover"
          >
            Sign In
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-subtle px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-emerald" />
          <span className="font-body text-xs font-semibold text-ink-soft">
            Secured portal · 12-hour sessions
          </span>
        </div>
      </div>
    </div>
  );
}
