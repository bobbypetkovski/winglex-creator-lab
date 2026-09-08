import { currentSession } from '@/lib/auth';
import { sameOrigin, supabase } from '@/lib/supabase';
import { StateSchema } from '@/lib/model';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const unauthorized = () => Response.json({ error: 'Your session expired. Sign in in a new tab, then retry; your unsaved changes remain here.' }, { status: 401 });
export async function GET() {
  try {
    const session = await currentSession();
    if (!session) return unauthorized();
    const query = new URLSearchParams({ select: 'payload,revision,updated_at', owner_id: 'eq.' + session.userId, brand_id: 'eq.winglex', limit: '1' });
    const response = await supabase('/rest/v1/winglex_workspaces?' + query, {}, session.token);
    if (!response.ok) throw new Error('Workspace read failed: ' + response.status);
    const [row] = await response.json();
    return Response.json(row ? { state: StateSchema.parse(row.payload), revision: row.revision, savedAt: row.updated_at } : { state: null, revision: 0 }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Your workspace could not be loaded. Check that the Supabase setup SQL was run and retry.' }, { status: 503 });
  }
}
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const session = await currentSession();
    if (!session) return unauthorized();
    if (Number(request.headers.get('content-length') || 0) > 2000000) return Response.json({ error: 'Workspace exceeds 2 MB.' }, { status: 413 });
    const text = await request.text();
    if (text.length > 2000000) return Response.json({ error: 'Workspace exceeds 2 MB.' }, { status: 413 });
    let data;
    try { data = JSON.parse(text); } catch { return Response.json({ error: 'Invalid JSON.' }, { status: 400 }); }
    const parsed = StateSchema.safeParse(data?.state);
    if (!parsed.success || !Number.isSafeInteger(data.revision) || data.revision < 0 || data.revision >= 2147483647) return Response.json({ error: 'Invalid workspace data. Check your inputs.' }, { status: 400 });
    const date = new Date().toISOString();
    const query = new URLSearchParams({ owner_id: 'eq.' + session.userId, brand_id: 'eq.winglex', revision: 'eq.' + data.revision });
    const first = data.revision === 0;
    const payload = { payload: parsed.data, revision: data.revision + 1, updated_at: date, ...(first ? { owner_id: session.userId, brand_id: 'winglex' } : {}) };
    const response = await supabase('/rest/v1/winglex_workspaces' + (first ? '' : '?' + query), {
      method: first ? 'POST' : 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload)
    }, session.token);
    const result = await response.json();
    if (response.status === 409 || response.ok && Array.isArray(result) && result.length === 0) return Response.json({ error: 'This workspace changed in another tab. Export your work before reloading.' }, { status: 409 });
    if (!response.ok || !Array.isArray(result) || !result[0]) throw new Error('Workspace write failed');
    return Response.json({ revision: result[0].revision, savedAt: result[0].updated_at }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Changes were not saved. Your edits remain here; check your connection and retry.' }, { status: 503 });
  }
}
