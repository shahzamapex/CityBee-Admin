import { isAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect('/');
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6F00] text-2xl font-extrabold text-white shadow-lg shadow-orange-200">
            CB
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            City<span className="text-[#FF6F00]">Bee</span> Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to manage the CityBee backend
          </p>
        </div>

        <form
          action="/api/login"
          method="post"
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
            Admin password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            className="mt-2 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#FF6F00] focus:ring-2 focus:ring-[#FF6F00]/20"
            placeholder="••••••••••••"
          />
          {error && (
            <p className="mt-2 text-sm font-medium text-red-600">
              Incorrect password. Try again.
            </p>
          )}
          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-[#FF6F00] py-2.5 text-sm font-bold text-white transition hover:bg-[#E65100] active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Set ADMIN_PASSWORD in your environment variables.
        </p>
      </div>
    </div>
  );
}
