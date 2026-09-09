import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const ok = await login(password);

  if (!ok) {
    return NextResponse.redirect(new URL('/admin/login?error=1', request.url), { status: 303 });
  }
  return NextResponse.redirect(new URL('/admin', request.url), { status: 303 });
}
