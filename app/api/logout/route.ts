import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth';
import { sameOrigin, supabase } from '@/lib/supabase';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response('Invalid request origin.', { status: 403 });
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) { try { await supabase('/auth/v1/logout?scope=local', { method: 'POST' }, token); } catch { /* Always clear the local session. */ } }
  jar.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return Response.redirect(new URL('/login', request.url), 303);
}
