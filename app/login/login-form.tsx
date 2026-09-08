'use client';
import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
export default function LoginForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
      window.location.assign('/');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); setBusy(false); }
  }
  return <main className="login-shell"><section className="login-card"><div className="wordmark"><img className="login-brand-logo" src="/winglex-logo.svg" alt="Winglex" width={200} height={46}/></div><div className="login-title"><LockKeyhole size={21}/><span>Creator Lab</span></div><h1>Your private workspace.</h1><p>Sign in to review creators, plan campaigns and save your decisions.</p>{!configured ? <div className="assumption-banner">Setup is not complete. Add the environment variables listed in DEPLOY_ON_VERCEL.md, then redeploy.</div> : <form onSubmit={submit}><label className="field"><span>Email</span><input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label><label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>{error&&<div role="alert" className="error">{error}</div>}<button className="btn primary full" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form>}<small>Access is limited to the account configured for Winglex.</small></section></main>;
}
