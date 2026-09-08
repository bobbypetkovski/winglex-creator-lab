import { redirect } from 'next/navigation';
import { currentSession } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';
import LoginForm from './login-form';
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  let signedIn = false;
  if (isConfigured()) { try { signedIn = !!(await currentSession()); } catch { /* Login stays available during an auth outage. */ } }
  if (signedIn) redirect('/');
  return <LoginForm configured={isConfigured()} />;
}
