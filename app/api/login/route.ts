import { NextResponse } from 'next/server';
import { loginWithSupabase } from '@/lib/auth';

/**
 * Login: Supabase Auth (email + password) + role == 'admin' required.
 * Non-admin users are rejected with a clear message.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');

  if (!email || !password) {
    return NextResponse.redirect(
      new URL('/admin/login?error=' + encodeURIComponent('Email and password are required.'), request.url),
      { status: 303 },
    );
  }

  const result = await loginWithSupabase(email, password);
  if (!result.ok) {
    return NextResponse.redirect(
      new URL('/admin/login?error=' + encodeURIComponent(result.error ?? 'Login failed.'), request.url),
      { status: 303 },
    );
  }
  return NextResponse.redirect(new URL('/admin', request.url), { status: 303 });
}
