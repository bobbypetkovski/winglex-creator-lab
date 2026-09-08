import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth';
import { configuration, isConfigured, sameOrigin, supabase } from '@/lib/supabase';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!isConfigured()) return Response.json({ error: 'Sign-in is not configured yet. Complete DEPLOY_ON_VERCEL.md and redeploy.' }, { status: 503 });
  try {
    const raw = await request.text();
    if (raw.length > 4096) return Response.json({ error: 'Request is too large.' }, { status: 413 });
    const data = JSON.parse(raw);
    if (typeof data.email !== 'string' || typeof data.password !== 'string' || !data.password || data.password.length > 1000) return Response.json({ error: 'Enter your email and password.' }, { status: 400 });
    const email = data.email.trim().toLowerCase();
    const response = await supabase('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: data.password }) });
    if (response.status === 429) return Response.json({ error: 'Too many sign-in attempts. Please try again later.' }, { status: 429 });
    if (response.status >= 500) return Response.json({ error: 'Sign-in is temporarily unavailable. Please retry.' }, { status: 503 });
    if (!response.ok) return Response.json({ error: 'Sign-in failed. Check your credentials and confirmed account.' }, { status: 401 });
    const result = await response.json();
    if (result.user?.email?.toLowerCase() !== configuration().email || !result.user?.email_confirmed_at || typeof result.access_token !== 'string') return Response.json({ error: 'This account is not authorized for this workspace.' }, { status: 403 });
    const ttl = Math.min(3600, Math.max(1, Number(result.expires_in) || 3600));
    (await cookies()).set(SESSION_COOKIE, result.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: ttl });
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Sign-in could not be completed. Check the setup and try again.' }, { status: 503 });
  }
}
