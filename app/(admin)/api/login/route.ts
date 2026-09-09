import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  let ok = false;
  let errorMessage: string | null = null;
  try {
    ok = await login(password);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'unknown';
  }

  if (!ok) {
    const url = new URL('/login?error=1', request.url);
    if (errorMessage) url.searchParams.set('debug', errorMessage);
    return NextResponse.redirect(url, { status: 303 });
  }
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
