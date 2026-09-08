import { redirect } from 'next/navigation';
import CreatorLab from './creator-lab';
import { currentSession } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';
import { initialState } from '@/lib/seed';
export const dynamic = 'force-dynamic';
export default async function Home() {
  if (!isConfigured()) redirect('/login');
  let session;
  try { session = await currentSession(); } catch { redirect('/login'); }
  if (!session) redirect('/login');
  return <CreatorLab initialData={initialState()} />;
}
