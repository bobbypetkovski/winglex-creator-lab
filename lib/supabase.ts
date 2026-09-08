import 'server-only';

export function configuration() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const email = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!url || !key || !email) throw new Error('SETUP_REQUIRED');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && parsed.hostname === 'localhost')) throw new Error('SETUP_REQUIRED');
  return { url, key, email };
}

export function isConfigured() { try { configuration(); return true; } catch { return false; } }

export async function supabase(path: string, options: RequestInit = {}, token?: string) {
  const { url, key } = configuration();
  const headers = new Headers(options.headers);
  headers.set('apikey', key);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  return fetch(`${url}${path}`, { ...options, headers, cache: 'no-store', signal: AbortSignal.timeout(15000) });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
