import 'server-only';
import { cookies } from 'next/headers';
import { configuration, supabase } from './supabase';

export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-winglex_session' : 'winglex_session';
export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const response = await supabase('/auth/v1/user', {}, token);
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error('AUTH_UNAVAILABLE');
  const user = await response.json();
  if (typeof user.id !== 'string' || typeof user.email !== 'string' || user.email.toLowerCase() !== configuration().email || !user.email_confirmed_at) return null;
  return { token, userId: user.id, email: user.email as string };
}
