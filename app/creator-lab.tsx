'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Users, SlidersHorizontal, ChartNoAxesCombined, ArrowUpRight, Upload, Download, Save, Check, Search, Plus, Info, CircleAlert, ChevronRight, ChevronDown, Target, History, ClipboardCheck, BadgeCheck } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ConflictMark, CreatorInsight, SourceTag } from '@/components/creator-insight';
import { ALL_MARKETS_HEADER, BASIS_LABEL, FEE_BASES, MARKETS, PLATFORMS, StateSchema, decision, economics, feeDetail, fitScore, forecast, importCreators, importOutcomes, mergeCreators, csvCell, profileUrl, quoteMetrics, safeHttpUrl, strongerPlatform, type Audience, type Campaign, type Creator, type FeeBasis, type Market, type Package, type PlatformName, type Profile, type State } from '@/lib/model';

const n = (v: number | null | undefined, d = 0) => v == null ? '—' : new Intl.NumberFormat('en-GB', { maximumFractionDigits: d }).format(v);
const money = (v: number | null | undefined) => v == null ? '—' : `${n(v)} zł`;
const percent = (v: number | null | undefined) => v == null ? '—' : `${n(v, 1)}%`;
const CPM_TIP = 'Net CPM = (net fee for that platform’s primary 1× deliverable, without paid promotion, in PLN) ÷ median views × 1,000. Gross, tax-on-top and unknown fees are marked and left out.';
const CPE_TIP = 'CPE = net fee ÷ median engagements. When a separate engagement count is not supplied, median engagements = engagement rate × median views.';
const HOME_TIP = 'Home-market audience share on this platform only, measured against the creator’s market. Creator-provided figures are shown. API figures appear only when the creator gave none.';
const METRICS = [
  { key: 'followers', label: 'Followers', title: 'Followers on this platform', numeric: true },
  { key: 'median', label: 'Median', title: 'Median views', numeric: true },
  { key: 'engagement', label: 'ER', title: 'Engagement rate', numeric: true },
  { key: 'cpm', label: 'Net CPM', title: CPM_TIP, numeric: true },
  { key: 'cpe', label: 'CPE', title: CPE_TIP, numeric: true },
  { key: 'home', label: 'Home', title: HOME_TIP, numeric: true },
  { key: 'age', label: 'Age 25+', title: 'Share of the audience aged 25 or over on this platform', numeric: true },
  { key: 'female', label: 'Gender', title: 'Gender split on this platform', numeric: false },
] as const;
const BOTH_METRICS = [
  { key: 'median', label: 'Median', title: 'Median views on this platform', numeric: true },
  { key: 'cpm', label: 'CPM', title: CPM_TIP, numeric: true },
  { key: 'cpe', label: 'CPE', title: CPE_TIP, numeric: true },
  { key: 'home', label: 'Audience', title: HOME_TIP, numeric: true },
] as const;

type PlatformView = PlatformName | 'Both';
type MarketFilter = 'all' | Market;
type ContextMarket = 'all' | Market;

function Choice({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: [string, string][]; label: string }) {
  const current = options.find(([option]) => option === value)?.[1] ?? '';
  return <Select value={value} onValueChange={next => { if (next) onChange(next); }}><SelectTrigger aria-label={label} className="choice"><SelectValue>{current}</SelectValue></SelectTrigger><SelectContent>{options.map(([option, text]) => <SelectItem key={option} value={option}>{text}</SelectItem>)}</SelectContent></Select>;
}
function Numeric({ label, value, onChange, suffix = '', max = 1e10, step = 1, hint }: { label: string; value: number | null; onChange: (v: number | null) => void; suffix?: string; max?: number; step?: number; hint?: string }) {
  return <label className="field"><span>{label}</span><div className="number-wrap"><input type="number" min={0} max={max} step={step} value={value ?? ''} placeholder="Not supplied" onChange={e => { const v = e.target.value === '' ? null : Number(e.target.value); if (v === null || Number.isFinite(v) && v >= 0 && v <= max) onChange(v); }} /><em>{suffix}</em></div>{hint && <small>{hint}</small>}</label>;
}
function TextField({ label, value, onChange, area = false }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return <label className="field"><span>{label}</span>{area ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} /> : <input value={value} onChange={e => onChange(e.target.value)} />}</label>;
}
function download(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(part => part[0] ?? '').join('');
}
function genderText(audience?: Audience) {
  if (!audience || (audience.female == null && audience.male == null && audience.other == null)) return '—';
  const parts = [];
  if (audience.female != null) parts.push(`${n(audience.female, 1)}% F`);
  if (audience.male != null) parts.push(`${n(audience.male, 1)}% M`);
  if (audience.other != null) parts.push(`${n(audience.other, 1)}% other`);
  return parts.join(' / ');
}
function shortReason(reason: string) {
  if (reason.startsWith('Gross')) return 'Gross';
  if (reason.startsWith('Tax')) return 'Tax on top';
  if (reason.startsWith('Fee basis')) return 'Basis unknown';
  if (reason.startsWith('No 1')) return 'No fee';
  if (reason.startsWith('Median')) return 'No median';
  if (reason.startsWith('Engagement')) return 'No ER';
  return reason;
}
function sortValue(cr: Creator, key: string, campaign: Campaign): string | number | null {
  if (key === 'name') return cr.name;
  if (key === 'market') return cr.market;
  if (key === 'fit') return fitScore(cr, campaign);
  if (key === 'decision') return decision(cr, campaign);
  const [platformName, field] = key.split('.');
  const profile = cr.profiles.find(item => item.platform === platformName);
  const quote = quoteMetrics(cr, platformName);
  if (field === 'followers') return profile?.followers ?? null;
  if (field === 'median') return profile?.median ?? null;
  if (field === 'engagement') return profile?.engagement ?? null;
  if (field === 'cpm') return quote.cpm;
  if (field === 'cpe') return quote.cpe;
  if (field === 'home') return profile?.audience.homeShare ?? null;
  if (field === 'age') return profile?.audience.age25 ?? null;
  if (field === 'female') return profile?.audience.female ?? null;
  return null;
}
function HandleLink({ platform, handle, url }: { platform: string; handle: string; url: string }) {
  const href = safeHttpUrl(profileUrl(platform, handle, url));
  if (!handle || !href) return null;
  return <a className="handle-link" href={href} target="_blank" rel="noreferrer">{handle}</a>;
}
function marketLabel(market: string, compact = false) {
  return compact && market === 'North Macedonia' ? 'N. Macedonia' : market;
}
function audienceHint(profile: Profile | undefined, field: 'home' | 'age' | 'gender') {
  if (!profile) return '';
  const source = field === 'home' ? profile.detail.homeSource : field === 'age' ? profile.detail.ageSource : profile.detail.genderSource;
  const value = field === 'home' ? profile.audience.homeShare : field === 'age' ? profile.audience.age25 : profile.audience.female;
  const api = field === 'home' ? profile.detail.apiHome : field === 'age' ? profile.detail.apiAge25 : profile.detail.apiFemale;
  if (!source) return '';
  const label = source === 'creator' ? 'Creator-provided' : 'API fallback';
  const conflict = source === 'creator' && value != null && api != null && Math.abs(value - api) > 10;
  return conflict ? `${label}. API figure is ${n(api, 1)}% and is not the main value.` : label;
}
function MetricCell({ creator, platform, field, win, compact }: { creator: Creator; platform: PlatformName; field: string; win: boolean; compact: boolean }) {
  const profile = creator.profiles.find(item => item.platform === platform);
  const quote = quoteMetrics(creator, platform);
  const audience = profile?.audience;
  const detail = profile?.detail;
  const unusable = detail?.usable === false;
  const cellClass = `${field === 'female' ? '' : 'num '}${platform === 'TikTok' ? 'cell-tt' : 'cell-ig'}${win ? ' stronger' : ''}${field === 'female' ? ' gender-cell' : ''}${field === 'home' || field === 'age' || field === 'female' ? ' audience-cell' : ''}`;
  if (unusable) return <TableCell className={cellClass} title="No usable account"><strong className="metric-muted">—</strong></TableCell>;
  let main = '—';
  let note = '';
  let title = '';
  let muted = true;
  if (field === 'followers') { main = n(profile?.followers); muted = profile?.followers == null; title = 'Followers'; }
  else if (field === 'median') { main = n(profile?.median); note = profile?.engagement != null ? percent(profile.engagement) : ''; muted = profile?.median == null; title = `Median views${profile?.followers != null ? `. ${n(profile.followers)} followers` : ''}${profile?.average != null ? `. Average ${n(profile.average)}` : ''}`; }
  else if (field === 'engagement') { main = percent(profile?.engagement); muted = profile?.engagement == null; title = 'Engagement rate'; }
  else if (field === 'cpm') { main = quote.cpm == null ? '—' : n(quote.cpm, 1); note = quote.cpm == null ? shortReason(quote.unavailable) : 'zł'; title = `${quote.unavailable || 'Net CPM, zł per 1,000 views'}. ${feeDetail(quote.pkg)}`; muted = quote.cpm == null; }
  else if (field === 'cpe') { main = quote.cpe == null ? '—' : n(quote.cpe, 2); note = quote.cpe == null ? shortReason(quote.cpeUnavailable) : 'zł'; title = `${CPE_TIP} ${feeDetail(quote.pkg)}`; muted = quote.cpe == null; }
  else if (field === 'home') {
    title = `${creator.market} audience on ${platform}. ${genderText(audience)}. ${HOME_TIP}`;
    muted = audience?.homeShare == null;
    return <TableCell className={cellClass} title={title}><span className="metric-stack"><span className="metric-line"><strong className={muted ? 'metric-muted' : ''}>{percent(audience?.homeShare)}</strong><SourceTag source={detail?.homeSource ?? ''} /><ConflictMark value={audience?.homeShare ?? null} api={detail?.apiHome ?? null} label="Home share" /></span>{compact && audience?.age25 != null && <span className="metric-line cell-note"><span>25+ {percent(audience.age25)}</span><SourceTag source={detail?.ageSource ?? ''} /><ConflictMark value={audience.age25} api={detail?.apiAge25 ?? null} label="Age 25+" /></span>}</span></TableCell>;
  }
  else if (field === 'age') {
    muted = audience?.age25 == null;
    return <TableCell className={cellClass} title="Share aged 25 or over on this platform."><span className="metric-line"><strong className={muted ? 'metric-muted' : ''}>{percent(audience?.age25)}</strong><SourceTag source={detail?.ageSource ?? ''} /><ConflictMark value={audience?.age25 ?? null} api={detail?.apiAge25 ?? null} label="Age 25+" /></span></TableCell>;
  }
  else if (field === 'female') {
    const femaleGap = detail?.genderSource === 'creator' && audience?.female != null && detail.apiFemale != null && Math.abs(audience.female - detail.apiFemale) > 10;
    const maleGap = detail?.genderSource === 'creator' && audience?.male != null && detail.apiMale != null && Math.abs(audience.male - detail.apiMale) > 10;
    title = femaleGap || maleGap ? `Creator split shown.${femaleGap ? ` API female ${n(detail?.apiFemale, 1)}%.` : ''}${maleGap ? ` API male ${n(detail?.apiMale, 1)}%.` : ''}` : genderText(audience);
    return <TableCell className={cellClass} title={title}><span className="metric-line"><strong className={audience?.female == null && audience?.male == null ? 'metric-muted' : ''}>{genderText(audience)}</strong><SourceTag source={detail?.genderSource ?? ''} />{femaleGap && <ConflictMark value={audience?.female ?? null} api={detail?.apiFemale ?? null} label="Female share" />}{!femaleGap && maleGap && <ConflictMark value={audience?.male ?? null} api={detail?.apiMale ?? null} label="Male share" />}</span></TableCell>;
  }
  return <TableCell className={cellClass} title={title}><strong className={muted ? 'metric-muted' : ''}>{main}</strong>{note && <small className="cell-note">{note}</small>}</TableCell>;
}
function CreatorFace({ creator, tone }: { creator: Creator; tone: number }) {
  const picture = creator.profiles.find(item => item.platform === creator.platform)?.detail.picture || creator.profiles.find(item => item.detail.picture)?.detail.picture || '';
  const verified = creator.profiles.some(item => item.detail.verified);
  const [failed, setFailed] = useState(false);
  return <span className={`creator-avatar tone-${tone}`}>{picture && !failed ? <img src={picture} alt="" onError={() => setFailed(true)} /> : initials(creator.name)}{verified && <BadgeCheck size={14} className="verified-badge" aria-label="Verified" />}</span>;
}
function SortHead({ label, sortKey, active, dir, onSort, title, className, rowSpan }: { label: string; sortKey: string; active: boolean; dir: 'asc' | 'desc'; onSort: (key: string) => void; title?: string; className?: string; rowSpan?: number }) {
  return <TableHead className={className} rowSpan={rowSpan} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="btn ghost sort-head" title={title} onClick={() => onSort(sortKey)}>{label}{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}</button></TableHead>;
}
function PlatformFields({ creator, platform, onProfile, onAudience, onSelect }: { creator: Creator; platform: PlatformName; onProfile: (patch: Partial<Profile>) => void; onAudience: (patch: Partial<Audience>) => void; onSelect: (index: number) => void }) {
  const profile = creator.profiles.find(item => item.platform === platform);
  const quote = quoteMetrics(creator, platform);
  const href = profile ? safeHttpUrl(profileUrl(platform, profile.handle, profile.url)) : '';
  const packageIndex = quote.pkg ? creator.packages.indexOf(quote.pkg) : -1;
  return <section className="platform-block">
    <div className="mini-heading">{platform}{strongerPlatform(creator) === platform ? ' · stronger reach or net CPM' : ''}</div>
    <div className="two-fields">
      <TextField label="Handle" value={profile?.handle ?? ''} onChange={value => onProfile({ handle: value })} />
      <TextField label="Profile URL" value={profile?.url ?? ''} onChange={value => onProfile({ url: value })} />
    </div>
    {href ? <a className="btn ghost" href={href} target="_blank" rel="noreferrer">Open {platform} profile <ArrowUpRight size={14} /></a> : <small>Add a handle to create the profile link.</small>}
    <small>{profile?.url.trim() ? ' Using the URL above.' : href ? ` Empty URL uses ${profileUrl(platform, profile?.handle ?? '', '')}.` : ''}</small>
    <div className="two-fields">
      <Numeric label="Followers" value={profile?.followers ?? null} onChange={value => onProfile({ followers: value })} />
      <Numeric label="Median views" value={profile?.median ?? null} onChange={value => onProfile({ median: value })} />
      <Numeric label="Average views" value={profile?.average ?? null} onChange={value => onProfile({ average: value })} />
      <Numeric label="Engagement rate" value={profile?.engagement ?? null} suffix="%" max={100} step={0.01} onChange={value => onProfile({ engagement: value })} />
    </div>
    <div className="mini-heading">{creator.market} audience on {platform}</div>
    <p className="muted">These figures are only for {platform}. They are not mixed with the other platform.</p>
    <div className="two-fields">
      <Numeric label={`${creator.market} share`} value={profile?.audience.homeShare ?? null} suffix="%" max={100} step={0.1} hint={audienceHint(profile, 'home')} onChange={value => onAudience({ homeShare: value })} />
      <Numeric label="Age 25+" value={profile?.audience.age25 ?? null} suffix="%" max={100} step={0.1} hint={audienceHint(profile, 'age')} onChange={value => onAudience({ age25: value })} />
      <Numeric label="Female" value={profile?.audience.female ?? null} suffix="%" max={100} step={0.1} hint={audienceHint(profile, 'gender')} onChange={value => onAudience({ female: value })} />
      <Numeric label="Male" value={profile?.audience.male ?? null} suffix="%" max={100} step={0.1} onChange={value => onAudience({ male: value })} />
      <Numeric label="Other" value={profile?.audience.other ?? null} suffix="%" max={100} step={0.1} onChange={value => onAudience({ other: value })} />
    </div>
    <div className="evidence-grid">
      <div><span>Net CPM</span><strong className={quote.cpm == null ? 'metric-muted' : ''}>{quote.cpm == null ? quote.unavailable : `${n(quote.cpm, 1)} zł`}</strong></div>
      <div><span>CPE</span><strong className={quote.cpe == null ? 'metric-muted' : ''} title={CPE_TIP}>{quote.cpe == null ? shortReason(quote.cpeUnavailable) : `${n(quote.cpe, 2)} zł`}</strong></div>
    </div>
    <p className="muted" title={feeDetail(quote.pkg)}>{feeDetail(quote.pkg)}</p>
    <small>{CPE_TIP}</small>
    {packageIndex >= 0 && <button type="button" className="btn ghost" onClick={() => onSelect(packageIndex)}>Edit this 1× package below <ChevronRight size={14} /></button>}
  </section>;
}

const cashKeys = ['spend', 'revenue', 'handling'];
const basisOptions = FEE_BASES.map(basis => [basis, BASIS_LABEL[basis]] as [string, string]);

export default function CreatorLab({ initialData }: { initialData: State }) {
  const [state, setState] = useState<State>(initialData);
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [tab, setTab] = useState('creators');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [platformView, setPlatformView] = useState<PlatformView>('Both');
  const [contextMarket, setContextMarket] = useState<ContextMarket>('all');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [audienceOpen, setAudienceOpen] = useState<string | null>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDialog, setSnapshotDialog] = useState(false);
  const [pending, setPending] = useState<Creator[] | null>(null);
  const [viewScenario, setViewScenario] = useState('base');
  const [pendingRestore, setPendingRestore] = useState<State | null>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tablePanelRef = useRef<HTMLElement>(null);
  const outcomeRef = useRef<HTMLInputElement>(null);
  const c = state.campaign;
  const selected = state.creators.filter(x => x.included);
  const cr = state.creators.find(x => x.id === detail);
  const multiplier = viewScenario === 'low' ? c.low : viewScenario === 'high' ? c.high : 1;
  const forecasts = selected.map(x => forecast(x, c, multiplier));
  const missingCost = forecasts.some(f => f.spend == null);
  const missingReach = forecasts.some(f => f.views == null);
  const spend = forecasts.reduce((s, f) => s + (f.spend ?? 0), 0);
  const signed = forecasts.reduce((s, f) => s + (f.signed ?? 0), 0);
  const contribution = forecasts.reduce((s, f) => s + (f.contribution ?? 0), 0);
  const complete = selected.length > 0 && !missingCost && !missingReach;
  const allHeader = {
    name: c.name === 'Poland · Creator pilot' ? ALL_MARKETS_HEADER.name : c.name,
    target: c.target === 'Polish-speaking travellers with disrupted flights' ? ALL_MARKETS_HEADER.target : c.target,
  };
  const header = marketFilter === 'all' ? allHeader : c.markets[marketFilter];
  const editing = contextMarket === 'all' ? { ...allHeader, brief: c.brief } : c.markets[contextMarket];
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const r = await fetch('/api/workspace', { cache: 'no-store', signal: controller.signal });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (data.state) setState(StateSchema.parse(data.state));
        setRevision(data.revision);
        setSavedAt(data.savedAt ?? '');
        setReady(true);
        setError('');
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Workspace could not be loaded.');
      }
    })();
    return () => controller.abort();
  }, [reloadToken]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  function update(fn: (s: State) => State) { setState(fn); setDirty(true); setNotice(''); }
  function campaign<K extends keyof Campaign>(key: K, value: Campaign[K]) { update(s => ({ ...s, campaign: { ...s.campaign, [key]: value } })); }
  function creator(id: string, patch: Partial<Creator>) { update(s => ({ ...s, creators: s.creators.map(x => x.id === id ? { ...x, ...patch } : x) })); }
  function setContext(key: 'name' | 'target' | 'brief', value: string) {
    if (contextMarket === 'all') campaign(key, value);
    else campaign('markets', { ...c.markets, [contextMarket]: { ...c.markets[contextMarket], [key]: value } });
  }
  function patchProfile(id: string, platform: string, patch: Partial<Profile>) {
    update(s => ({ ...s, creators: s.creators.map(x => x.id === id ? { ...x, profiles: x.profiles.map(profile => profile.platform === platform ? { ...profile, ...patch } : profile) } : x) }));
  }
  function patchAudience(id: string, platform: string, patch: Partial<Audience>) {
    update(s => ({ ...s, creators: s.creators.map(x => x.id === id ? { ...x, profiles: x.profiles.map(profile => {
      if (profile.platform !== platform) return profile;
      const audience = { ...profile.audience, ...patch };
      const detail = { ...profile.detail };
      if ('homeShare' in patch) {
        detail.homeSource = audience.homeShare == null ? '' : 'creator';
        detail.countrySource = detail.homeSource;
        detail.countries = audience.homeShare == null ? [] : [{ label: x.market, pct: audience.homeShare }];
      }
      if ('age25' in patch) {
        detail.ageSource = audience.age25 == null ? '' : 'creator';
        if (detail.ageSource === 'creator') detail.ageBands = [];
      }
      if ('female' in patch || 'male' in patch || 'other' in patch) detail.genderSource = audience.female == null && audience.male == null && audience.other == null ? '' : 'creator';
      return { ...profile, audience, detail };
    }) } : x) }));
  }
  function selectPackage(id: string, index: number) { creator(id, { selected: index, viewsOverride: null }); }
  async function save(next = state) {
    setSaving(true);
    setError('');
    try {
      const checked = StateSchema.safeParse(next);
      if (!checked.success) throw new Error('Some inputs are invalid. Use whole counts, recovered passengers no higher than signed, and percentages from 0 to 100.');
      const r = await fetch('/api/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: checked.data, revision }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setRevision(data.revision);
      setSavedAt(data.savedAt);
      setDirty(false);
      setNotice('Workspace saved.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); }
    finally { setSaving(false); }
  }
  async function readFile(file: File | undefined, kind: 'creators' | 'outcomes') {
    if (!file) return;
    setError('');
    try {
      if (file.size > 1000000) throw new Error('Choose a CSV smaller than 1 MB.');
      const text = await file.text();
      if (kind === 'creators') {
        const rows = importCreators(text, file.name + ' · ' + new Date().toISOString().slice(0, 10));
        if (!rows.length) throw new Error('No creators found.');
        if (rows.length > 200) throw new Error('Import up to 200 creators.');
        setPending(rows);
      } else {
        const result = importOutcomes(text, state.creators);
        update(s => ({ ...s, creators: result.creators }));
        setNotice(`${result.count} outcome rows imported. Save changes to keep them.`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to read this CSV.'); }
    finally { if (fileRef.current) fileRef.current.value = ''; if (outcomeRef.current) outcomeRef.current.value = ''; }
  }
  function mergeImport() {
    if (!pending) return;
    const merged = mergeCreators(state.creators, pending);
    if (merged.length > 200) { setError('The workspace supports up to 200 creators.'); return; }
    update(s => ({ ...s, creators: merged }));
    setNotice(`${pending.length} creator rows imported. Review updated profiles and save your changes.`);
    setPending(null);
  }
  function exportComparison() {
    const header = ['Creator', 'Handle', 'Market', 'Primary platform', 'Package', 'Quoted fee PLN', 'Basis', 'Currency', 'Original amount', 'FX to PLN', 'FX date', 'Total campaign cost PLN', 'Expected views (assumption)', 'TikTok net CPM', 'Instagram net CPM', 'Fit assessment', 'Decision', 'Expected signed passengers (illustrative)', 'Expected profit PLN (illustrative)', 'Evidence gaps'];
    const rows = state.creators.map(x => {
      const f = forecast(x, c);
      const p = x.packages[x.selected];
      return [x.name, x.handle, x.market, x.platform, p?.name, p?.fee, p?.basis, p?.currency, p?.originalAmount, p?.fxRate, p?.fxDate, f.spend, f.views, quoteMetrics(x, 'TikTok').cpm, quoteMetrics(x, 'Instagram').cpm, fitScore(x, c), decision(x, c), f.signed, f.profit, x.gaps];
    });
    download('winglex-creator-comparison.csv', [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n'));
  }
  function snapshot() {
    if (!snapshotName.trim()) return;
    const next = { ...state, snapshots: [{ id: crypto.randomUUID(), name: snapshotName.trim(), date: new Date().toISOString(), campaign: structuredClone(c), creators: structuredClone(state.creators) }, ...state.snapshots].slice(0, 12) };
    setState(next);
    setDirty(true);
    setSnapshotDialog(false);
    setSnapshotName('');
    void save(next);
  }
  function onSort(key: string) {
    setSort(current => current?.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'market' || key === 'decision' ? 'asc' : 'desc' });
  }
  const filtered = state.creators.filter(x => {
    const marketOk = marketFilter === 'all' || x.market === marketFilter;
    const listOk = filter === 'all' || (filter === 'quoted' && x.packages.some(p => p.fee != null)) || (filter === 'shortlist' && x.included);
    const haystack = `${x.name} ${x.handle} ${x.market} ${x.status} ${x.profiles.map(profile => profile.handle).join(' ')}`.toLowerCase();
    return marketOk && listOk && haystack.includes(query.toLowerCase());
  });
  const rows = sort ? [...filtered].sort((a, b) => {
    const av = sortValue(a, sort.key, c);
    const bv = sortValue(b, sort.key, c);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const direction = sort.dir === 'asc' ? 1 : -1;
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv, 'en-GB') * direction;
    return (Number(av) - Number(bv)) * direction;
  }) : filtered;
  const hiddenShortlist = selected.filter(x => marketFilter !== 'all' && x.market !== marketFilter).length;
  useEffect(() => {
    const scroller = tablePanelRef.current?.querySelector<HTMLElement>('[data-slot=table-container]');
    if (!scroller) return;
    const update = () => {
      scroller.classList.toggle('shade-left', scroller.scrollLeft > 2);
      scroller.classList.toggle('shade-right', scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2);
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    window.addEventListener('resize', update);
    return () => {
      scroller.removeEventListener('scroll', update);
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [platformView, marketFilter, rows.length, tab]);
  const viewPlatforms: PlatformName[] = platformView === 'Both' ? [...PLATFORMS] : [platformView];
  const metrics = platformView === 'Both' ? BOTH_METRICS : METRICS;
  const pendingUpdates = pending?.filter(x => state.creators.some(y => y.handle.toLowerCase() === x.handle.toLowerCase())).length ?? 0;
  function patchSelected(patch: Partial<Package>) {
    if (!cr) return;
    creator(cr.id, { packages: cr.packages.map((pkg, index) => index === cr.selected ? { ...pkg, ...patch } : pkg) });
  }
  return <div className="app-shell">
    <header className="topbar"><Link className="wordmark" href="/" aria-label="Winglex Creator Lab home"><img className="brand-logo" src="/winglex-logo.svg" alt="Winglex" width={174} height={40} /><span className="wordmark-divider" /><span className="product-name">Creator Lab</span></Link><div className="top-right"><span className="private-tag">Internal workspace</span><span className="avatar">W</span><form action="/api/logout" method="post" onSubmit={e => { if (dirty && !window.confirm('Sign out and discard unsaved changes?')) e.preventDefault(); }}><button className="btn small">Sign out</button></form></div></header>
    <main className="workspace" data-market-filter={marketFilter} data-platform-view={platformView}><div className="breadcrumbs">Winglex <ChevronRight size={14} /> Campaign planning <ChevronRight size={14} /> {marketFilter === 'all' ? 'All markets' : marketFilter}</div>
      <div className="page-heading"><div><div className="eyebrow">CREATOR INVESTMENT WORKSPACE</div><h1>Your next great partnership.</h1><p>Evaluate the fit. Model the return. Make a better call.</p></div><div className="heading-actions"><button type="button" className="btn" onClick={exportComparison}><Download size={16} /> Export</button><button type="button" className="btn primary" disabled={!ready || saving} onClick={() => void save()}><Save size={16} />{saving ? 'Saving…' : 'Save changes'}</button></div></div>
      <div className="save-line" role="status">{!ready ? 'Loading saved workspace…' : dirty ? 'Unsaved changes' : savedAt ? `Saved ${new Date(savedAt).toLocaleString('en-GB')}` : 'Source tracker loaded · Save to create your workspace'}{notice && <span className="success">{notice}</span>}</div>
      {error && <div className="error" role="alert"><CircleAlert size={18} /><span>{error}</span>{error.includes('session expired') && <a className="btn" href="/login" target="_blank" rel="noreferrer">Sign in</a>}{!ready && <button type="button" className="btn" onClick={() => setReloadToken(value => value + 1)}>Retry loading</button>}</div>}
      <fieldset disabled={!ready || saving} className="app-fields">
        <div className="campaign-strip"><div className="campaign-title"><span className="campaign-icon"><Target size={21} /></span><div><strong>{header.name}</strong><span>{header.target}</span></div></div><div className="strip-fields"><div><span className="tiny-label">OBJECTIVE</span><Choice label="Campaign objective" value={c.objective} options={[['claims', 'Signed claims'], ['awareness', 'Awareness'], ['content', 'Content assets']]} onChange={v => { campaign('objective', v as Campaign['objective']); campaign('weights', v === 'claims' ? { audience: 40, content: 40, action: 20 } : v === 'awareness' ? { audience: 65, content: 25, action: 10 } : { audience: 20, content: 70, action: 10 }); }} /></div><Numeric label="Campaign budget" value={c.budget} suffix="PLN" onChange={v => campaign('budget', v ?? 0)} /></div></div>
        <div className="stats-grid"><div className="stat"><span>Creators in review</span><strong>{state.creators.length.toString().padStart(2, '0')}</strong><small>{state.creators.filter(x => x.packages.some(p => p.fee != null)).length} with a quoted package</small></div><div className="stat"><span>Shortlisted spend</span><strong>{money(spend)}</strong><small className={spend > c.budget ? 'negative' : ''}>{missingCost ? 'Incomplete · missing quotes' : `${money(Math.max(0, c.budget - spend))} remaining`}</small></div><div className="stat"><span>{c.objective === 'claims' ? 'Expected signed passengers' : 'Estimated placement views'}</span><strong>{!selected.length ? '—' : c.objective === 'claims' ? (complete ? n(signed, 1) : 'Incomplete') : missingReach ? 'Incomplete' : n(forecasts.reduce((s, f) => s + (f.views ?? 0), 0))}</strong><small>Illustrative · {viewScenario === 'base' ? 'base' : viewScenario} assumptions</small></div><div className="stat accent-stat"><span>{c.objective === 'claims' ? 'Expected campaign profit' : 'Shortlisted creators'}</span><strong className={complete && contribution - spend < 0 ? 'negative' : ''}>{c.objective === 'claims' ? (complete ? money(contribution - spend) : '—') : selected.length}</strong><small>{c.objective === 'claims' ? 'After campaign and handling costs' : 'Compare evidence before committing'}</small></div></div>
        <Tabs value={tab} onValueChange={setTab} className="main-tabs"><TabsList variant="line" className="main-tab-list"><TabsTrigger value="creators"><Users />Creators <span className="tab-count">{state.creators.length}</span></TabsTrigger><TabsTrigger value="campaign"><SlidersHorizontal />Campaign & assumptions</TabsTrigger><TabsTrigger value="roi"><ChartNoAxesCombined />ROI simulator</TabsTrigger><TabsTrigger value="outcomes"><ClipboardCheck />Actual results</TabsTrigger></TabsList>
          <TabsContent value="creators"><div className="content-grid"><section className="panel creator-panel" ref={tablePanelRef}><div className="panel-header"><div><h2>Creator shortlist</h2><p>Compare TikTok and Instagram, then choose who to model.</p></div><button type="button" className="btn" onClick={() => fileRef.current?.click()}><Upload size={16} />Import CSV</button></div><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e => void readFile(e.target.files?.[0], 'creators')} /><div className="table-controls"><div className="search-box"><Search size={17} /><input aria-label="Search creators" placeholder="Find a creator…" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="control-row"><div className="segmented" role="group" aria-label="Market">{([['all', 'All'], ...MARKETS.map(market => [market, marketLabel(market, true)] as [string, string])]).map(([value, label]) => <button type="button" key={value} className={marketFilter === value ? 'on' : ''} aria-pressed={marketFilter === value} title={value === 'all' ? 'All markets' : value} onClick={() => setMarketFilter(value as MarketFilter)}>{label}</button>)}</div><Choice label="Filter creators" value={filter} onChange={setFilter} options={[['all', 'All creators'], ['quoted', 'With quotes'], ['shortlist', 'Shortlisted']]} /><div className="segmented" role="group" aria-label="Platform">{(['TikTok', 'Instagram', 'Both'] as const).map(item => <button type="button" key={item} className={platformView === item ? 'on' : ''} aria-pressed={platformView === item} onClick={() => setPlatformView(item)}>{item}</button>)}</div></div></div>
            <Table className={`creator-table${platformView === 'Both' ? ' both' : ''}`}><TableHeader><TableRow>
              <TableHead className="sticky-creator"><span className="sr-only">Shortlist and creator</span></TableHead>
              <SortHead label="Market" sortKey="market" active={sort?.key === 'market'} dir={sort?.dir ?? 'asc'} onSort={onSort} />
              {viewPlatforms.flatMap(platform => metrics.map(metric => <SortHead key={`${platform}.${metric.key}`} className={`${metric.numeric ? 'num ' : ''}${platform === 'TikTok' ? 'group-tt' : 'group-ig'}`} label={platformView === 'Both' ? `${platform === 'TikTok' ? 'TT' : 'IG'} ${metric.label}` : metric.label} title={metric.title} sortKey={`${platform}.${metric.key}`} active={sort?.key === `${platform}.${metric.key}`} dir={sort?.dir ?? 'desc'} onSort={onSort} />))}
              <SortHead className="num" label="Fit" sortKey="fit" active={sort?.key === 'fit'} dir={sort?.dir ?? 'desc'} onSort={onSort} title="Fit score out of 100" />
              <SortHead label="Next" sortKey="decision" active={sort?.key === 'decision'} dir={sort?.dir ?? 'asc'} onSort={onSort} />
              <TableHead className="detail-col"><span className="sr-only">Details</span></TableHead>
            </TableRow></TableHeader><TableBody>{rows.map((x, i) => {
              const d = decision(x, c);
              const stronger = strongerPlatform(x);
              const instagram = x.profiles.find(item => item.platform === 'Instagram');
              const credibility = instagram?.detail.credibility;
              return <Fragment key={x.id}><TableRow className={x.included ? 'selected-row' : ''} data-market={x.market} data-stronger={stronger ?? 'none'}>
                <TableCell className="sticky-creator"><div className="creator-identity"><Checkbox aria-label={`Shortlist ${x.name}`} checked={x.included} onCheckedChange={v => creator(x.id, { included: v === true })} /><div className="creator-copy"><button type="button" className="creator-name" title={x.name} onClick={() => setDetail(x.id)}><CreatorFace creator={x} tone={i % 4} /><strong>{x.name}</strong>{credibility != null && <span className={`cred-pill ${credibility < 70 ? 'bad' : credibility < 85 ? 'warn' : 'ok'}`} title={`Instagram audience credibility ${n(credibility, 1)}% from the API. This is not a demographic.`}>{n(credibility, 0)}</span>}</button><span className="handle-row">{viewPlatforms.map(platform => { const profile = x.profiles.find(item => item.platform === platform); const handle = profile?.handle || (x.platform === platform ? x.handle : ''); return handle ? <HandleLink key={platform} platform={platform} handle={handle} url={profile?.url ?? ''} /> : null; })}</span><small className="cell-note" title={x.status}>{x.status || '\u00a0'}</small></div></div></TableCell>
                <TableCell className="market-cell" title={`Market: ${x.market}`}><span className={`market-pill market-${x.market === 'North Macedonia' ? 'mk' : x.market.toLowerCase()}`}>{x.market}</span></TableCell>
                {viewPlatforms.flatMap(platform => metrics.map(metric => <MetricCell key={`${x.id}-${platform}-${metric.key}`} creator={x} platform={platform} field={metric.key} compact={platformView === 'Both'} win={platformView === 'Both' && stronger === platform} />))}
                <TableCell className="num"><span className="fit-number">{n(fitScore(x, c))}</span></TableCell>
                <TableCell><span className={`pill ${d === 'Conditional test' ? 'green' : d === 'Negotiate' ? 'amber' : 'neutral'}`} title={d}>{d}</span></TableCell>
                <TableCell className="detail-col"><button type="button" className="btn icon" aria-expanded={audienceOpen === x.id} aria-label={audienceOpen === x.id ? `Hide ${x.name} audience` : `Show ${x.name} audience`} onClick={() => setAudienceOpen(audienceOpen === x.id ? null : x.id)}>{audienceOpen === x.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button></TableCell>
              </TableRow>{audienceOpen === x.id && <TableRow className="insight-row"><TableCell colSpan={2 + metrics.length * viewPlatforms.length + 3}><CreatorInsight creator={x} onEdit={() => setDetail(x.id)} /></TableCell></TableRow>}</Fragment>;
            })}</TableBody></Table>
{!rows.length && <div className="empty">No creators match this view. Try another filter.</div>}<div className="table-foot"><span>Showing {rows.length} of {state.creators.length}. {platformView === 'Both' ? 'Highlighted platform has the lower net CPM, or the higher median when net CPM cannot be compared.' : `${platformView} only.`}</span><span>{hiddenShortlist ? `${hiddenShortlist} shortlisted creator${hiddenShortlist === 1 ? ' is' : 's are'} outside this market. Campaign totals still include them.` : 'Quoted net, gross and tax-on-top fees are not directly comparable.'}</span></div></section>
            <aside className="insights"><div className="insight-heading"><span className="small-icon"><Info size={18} /></span><h2>Before you commit</h2></div><p className="muted">Evidence-led notes from the shortlist.</p><article className="insight"><span className="index">01</span><div><h3>Start with the story</h3><p>Holiday.stop’s flight delay is a relevant creative starting point in Poland. Confirm home-market audience share and package scope before treating it as a claim story.</p><button type="button" className="btn ghost" onClick={() => setDetail(state.creators.find(x => x.handle === '@holiday.stop')?.id ?? state.creators[0]?.id ?? null)}>Review evidence <ChevronRight size={15} /></button></div></article><article className="insight"><span className="index">02</span><div><h3>Keep the platforms apart</h3><p>A creator can be stronger on Instagram than on TikTok. Median, fee, engagement and audience stay on the platform they were measured for.</p></div></article><article className="insight"><span className="index">03</span><div><h3>Let the economics decide</h3><p>Net CPM is withheld unless the 1× fee is net. Gross and tax-on-top quotes stay visible in the detail, and they are not treated as the same price.</p><button type="button" className="btn ghost" onClick={() => setTab('campaign')}>Edit assumptions <ChevronRight size={15} /></button></div></article><div className="evidence-note">Creator-supplied and enriched stats · not independently verified. Recommendations use transparent rules, not a trained prediction model.</div></aside></div></TabsContent>
          <TabsContent value="campaign"><div className="assumption-banner"><Info size={18} /><span><strong>Editable planning inputs.</strong> Financial and funnel assumptions are shared across markets. Name, audience and brief are stored per market. Starting values are illustrative, not Winglex performance data. All money is in PLN.</span></div><div className="two-col"><section className="panel form-panel"><h2>Campaign brief</h2><p>Set the context for your creator decisions.</p><Choice label="Market context to edit" value={contextMarket} onChange={v => setContextMarket(v as ContextMarket)} options={[['all', 'All markets'], ...MARKETS.map(market => [market, market] as [string, string])]} /><TextField label="Brand" value={c.brand} onChange={v => campaign('brand', v)} /><TextField label="Website" value={c.website} onChange={v => campaign('website', v)} /><TextField label="Campaign name" value={editing.name} onChange={v => setContext('name', v)} /><TextField label="Target audience" value={editing.target} onChange={v => setContext('target', v)} /><TextField label="Content and campaign brief" value={editing.brief} onChange={v => setContext('brief', v)} area /><small>The shortlist market filter changes the header. This selector chooses which saved context you are editing. Serbia uses Serbian-speaking travellers; North Macedonia uses Macedonian-speaking travellers.</small><div className="mini-heading">Fit assessment weights</div><p>Objective selection suggests weights. Your brief guides manual review; it is not automatically scored by AI.</p><div className="three-fields">{(['audience', 'content', 'action'] as const).map(k => <Numeric key={k} label={k[0].toUpperCase() + k.slice(1)} value={c.weights[k]} suffix="weight" max={100} onChange={v => campaign('weights', { ...c.weights, [k]: v ?? 0 })} />)}</div><small>Weights are normalized to their total. A score is withheld until every weighted dimension is assessed.</small></section><section className="panel form-panel"><h2>Claim economics</h2><p>One claim means one signed passenger throughout this model. The same contribution applies in every market until you change it.</p><div className="two-fields"><Numeric label="Fee income per successful passenger" value={c.fee} suffix="PLN" onChange={v => campaign('fee', v ?? 0)} hint="Winglex income, not passenger compensation." /><Numeric label="Recovery rate of signed passengers" value={c.winRate} suffix="%" max={100} onChange={v => campaign('winRate', v ?? 0)} /><Numeric label="Handling cost · successful" value={c.winCost} suffix="PLN" onChange={v => campaign('winCost', v ?? 0)} /><Numeric label="Handling cost · unsuccessful" value={c.lossCost} suffix="PLN" onChange={v => campaign('lossCost', v ?? 0)} /></div><div className="formula-card"><span>Expected contribution per signed passenger</span><strong className={economics(c) <= 0 ? 'negative' : ''}>{money(economics(c))}</strong><small>Recovery rate × (fee − success cost) − failure rate × failure cost</small></div><div className="mini-heading">Acquisition funnel</div><div className="two-fields"><Numeric label="Views → site visits" value={c.ctr} suffix="%" max={100} step={0.1} onChange={v => campaign('ctr', v ?? 0)} /><Numeric label="Visits → completed checks" value={c.completion} suffix="%" max={100} onChange={v => campaign('completion', v ?? 0)} /><Numeric label="Checks → eligible passengers" value={c.eligibility} suffix="%" max={100} onChange={v => campaign('eligibility', v ?? 0)} /><Numeric label="Eligible → signed passengers" value={c.signing} suffix="%" max={100} onChange={v => campaign('signing', v ?? 0)} /></div><small>Shared assumptions apply to each placement. Fractional forecast counts represent expectations, not actual people.</small></section></div></TabsContent>
          <TabsContent value="roi"><div className="roi-heading"><div><h2>What would make this campaign worthwhile?</h2><p>Scenario analysis using your shortlist and editable assumptions.</p></div><button type="button" className="btn" onClick={() => setSnapshotDialog(true)}><Plus size={16} />Save scenario</button></div><div className="assumption-banner"><Info size={18} /><span>{c.objective === 'claims' ? 'These are illustrative forecasts, not measured ROI. Scenarios vary views only; conversion assumptions stay constant. Placement views are summed, not deduplicated audience reach. The forecast uses the selected package fee as entered, including gross fees.' : 'Your objective is not claims. This optional model shows claim economics only; it does not forecast brand lift or content asset value.'}</span></div><div className="two-col roi-layout"><section className="panel form-panel"><div className="panel-header compact"><h2>Campaign return</h2><Choice label="Forecast scenario" value={viewScenario} onChange={setViewScenario} options={[['low', 'Conservative'], ['base', 'Base case'], ['high', 'Optimistic']]} /></div>{selected.length === 0 ? <div className="empty tall"><Target size={32} /><h3>Build your shortlist first</h3><p>Select creators to compare expected costs and returns.</p><button type="button" className="btn primary" onClick={() => setTab('creators')}>Choose creators</button></div> : <><div className="return-number"><span>Expected contribution after campaign cost</span><strong className={complete && contribution - spend < 0 ? 'negative' : ''}>{complete ? money(contribution - spend) : 'Incomplete'}</strong><p>{complete ? `${percent(spend > 0 ? (contribution - spend) / spend * 100 : null)} return on campaign spend` : 'Add missing quotes and expected views in each creator’s details.'}</p></div><div className="return-bars">{[['Campaign cost', spend, 'cost'], ['Contribution before campaign cost', contribution, 'income']].map(([label, value, cls]) => <div key={label as string}><div><span>{label}</span><strong>{missingCost || missingReach ? 'Partial · ' : ''}{money(value as number)}</strong></div><div className="bar-track"><div className={`bar ${cls}`} style={{ width: `${Math.max(0, Math.min(100, 100 * (value as number) / Math.max(1, spend, contribution)))}%` }} /></div></div>)}</div><div className="funnel-mini">{[['Visits', forecasts.reduce((s, f) => s + (f.visits ?? 0), 0)], ['Eligible', forecasts.reduce((s, f) => s + (f.eligible ?? 0), 0)], ['Signed', signed]].map(([label, value]) => <div key={label as string}><span>{label}</span><strong>{missingReach ? '—' : n(value as number, 1)}</strong></div>)}</div>{spend > c.budget && <p className="negative">Shortlisted cost exceeds your budget by {money(spend - c.budget)}.</p>}{economics(c) <= 0 && <p className="negative">Your expected contribution per signed passenger is non-positive. There is no positive break-even acquisition budget under these inputs.</p>}</>}</section><section className="panel form-panel"><h2>Scenario controls</h2><p>Adjust reach relative to each placement’s expected views.</p><div className="two-fields"><Numeric label="Conservative reach multiplier" value={c.low} suffix="×" max={1} step={0.1} onChange={v => campaign('low', v ?? 0)} /><Numeric label="Optimistic reach multiplier" value={c.high} suffix="×" max={10} step={0.1} onChange={v => campaign('high', Math.max(1, v ?? 1))} /></div><div className="scenario-list">{[['Conservative', c.low], ['Base case', 1], ['Optimistic', c.high]].map(([label, m]) => { const ff = selected.map(x => forecast(x, c, m as number)); const result = ff.reduce((s, f) => s + (f.profit ?? 0), 0); return <div key={label as string}><span>{label}<small>{m}× expected views</small></span><strong className={complete && result < 0 ? 'negative' : ''}>{complete ? money(result) : '—'}</strong></div>; })}</div><button type="button" className="btn ghost" onClick={() => setTab('campaign')}>Edit conversion and financial assumptions <ChevronRight size={16} /></button><div className="mini-heading">Saved scenarios <span className="tab-count">{state.snapshots.length}/12</span></div>{state.snapshots.length === 0 ? <p>No saved scenarios yet. Save a named version to revisit its assumptions and shortlist.</p> : state.snapshots.map(s => <div className="snapshot" key={s.id}><History size={17} /><span><strong>{s.name}</strong><small>{new Date(s.date).toLocaleDateString('en-GB')} · {money(s.campaign.budget)}</small></span><button type="button" className="btn small" onClick={() => { update(old => ({ ...old, campaign: structuredClone(s.campaign), creators: structuredClone(s.creators) })); setNotice(`Loaded ${s.name}. Save changes to make it your current workspace.`); }}>Load</button></div>)}<small>Loading restores the campaign, creator assumptions and recorded results in that snapshot. The latest 12 snapshots are kept.</small></section></div><section className="panel breakdown"><div className="panel-header"><div><h2>Placement economics</h2><p>Zero-profit fee ceiling, before a profit buffer. Includes your cost adjustments.</p></div></div><Table><TableHeader><TableRow>{['Creator / package', 'All-in cost', 'Signed passengers', 'Cost per signed', 'Break-even signed', 'Fee ceiling', 'Expected profit'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{selected.map(x => { const f = forecast(x, c, multiplier); return <TableRow key={x.id}><TableCell><button type="button" className="btn ghost" onClick={() => setDetail(x.id)}>{x.handle}</button><small className="cell-note">{x.packages[x.selected]?.name}</small></TableCell><TableCell>{money(f.spend)}</TableCell><TableCell>{n(f.signed, 1)}</TableCell><TableCell>{money(f.cpa)}</TableCell><TableCell>{n(f.breakEven)}</TableCell><TableCell>{economics(c) > 0 ? money(f.feeCeiling) : 'No viable fee'}</TableCell><TableCell className={f.profit != null && f.profit < 0 ? 'negative' : ''}>{money(f.profit)}</TableCell></TableRow>; })}</TableBody></Table></section></TabsContent>
          <TabsContent value="outcomes"><div className="roi-heading"><div><h2>Bring the results back.</h2><p>Record aggregate results per creator for the current campaign.</p></div><div className="heading-actions"><button type="button" className="btn" onClick={() => download('winglex-outcomes-template.csv', 'Handle,Spend PLN,Visits,Signed passengers,Recovered passengers,Fee income PLN,Handling costs PLN\r\n' + state.creators.map(x => `${x.handle},,,,,,`).join('\r\n'))}><Download size={16} />CSV template</button><button type="button" className="btn primary" onClick={() => outcomeRef.current?.click()}><Upload size={16} />Import results</button></div></div><input type="file" hidden ref={outcomeRef} accept=".csv,text/csv" onChange={e => void readFile(e.target.files?.[0], 'outcomes')} /><div className="assumption-banner"><Info size={18} /><span>Use campaign-to-date totals, not incremental batches. Imports replace matching creators’ totals. Leave unknowns blank. No passenger names or documents are needed.</span></div><section className="panel"><Table className="outcome-table"><TableHeader><TableRow>{['Creator', 'Actual spend', 'Visits', 'Signed passengers', 'Recovered passengers', 'Fee income', 'Handling costs', 'Realized profit'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{state.creators.map(x => { const a = x.actual; const profit = a.spend == null || a.revenue == null || a.handling == null ? null : a.revenue - a.handling - a.spend; return <TableRow key={x.id}><TableCell><strong>{x.handle}</strong><small className="cell-note">{x.market}</small></TableCell>{(['spend', 'visits', 'signed', 'recovered', 'revenue', 'handling'] as const).map(k => <TableCell key={k}><input aria-label={`${x.handle} ${k}`} className="result-input" type="number" min={0} step={cashKeys.includes(k) ? 0.01 : 1} placeholder="—" value={a[k] ?? ''} onChange={e => { const v = e.target.value === '' ? null : Number(e.target.value); if (v === null || Number.isFinite(v) && v >= 0) creator(x.id, { actual: { ...a, [k]: v } }); }} /></TableCell>)}<TableCell className={profit != null && profit < 0 ? 'negative' : ''}>{money(profit)}</TableCell></TableRow>; })}</TableBody></Table><div className="table-foot">Realized profit = received fee income − recorded handling costs − actual campaign spend. Open claims are not valued here.</div></section><div className="two-col result-notes"><section className="panel form-panel"><h2>Consistent attribution</h2><p>Use the same campaign period and attribution method for every creator. Deduplicate passengers across placements before entering totals. Linked claims are attributed results; they do not prove incremental lift.</p></section><section className="panel form-panel"><h2>A complete spreadsheet handoff</h2><p>The tool imports your tracker and aggregate results. Live spreadsheet synchronization, automatic screenshot extraction, and platform analytics connections are not enabled in this version.</p><div className="heading-actions"><button type="button" className="btn" onClick={() => download('winglex-workspace.json', JSON.stringify(state, null, 2), 'application/json')}><Download size={16} />Export workspace backup</button><button type="button" className="btn" onClick={() => backupRef.current?.click()}><Upload size={16} />Import backup</button></div></section></div></TabsContent>
        </Tabs>
      </fieldset><footer className="footer"><span><img className="footer-brand-logo" src="/winglex-logo.svg" alt="Winglex" width={105} height={24} /><span>Creator Lab</span></span><span>Source-backed decisions. Editable assumptions.</span></footer>
    </main>
    <input type="file" accept=".json,application/json" ref={backupRef} hidden onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { if (file.size > 2000000) throw new Error('Backup must be smaller than 2 MB.'); setPendingRestore(StateSchema.parse(JSON.parse(await file.text()))); } catch { setError('This file is not a valid Winglex workspace backup (maximum 2 MB).'); } finally { e.target.value = ''; } }} />
    <Dialog open={!!pendingRestore} onOpenChange={v => !v && setPendingRestore(null)}><DialogContent><DialogHeader><DialogTitle>Restore workspace backup?</DialogTitle><DialogDescription>This replaces the current campaign, creators, assumptions, results and saved scenarios. Older backups are upgraded to per-platform profiles. A creator who already has a market keeps it. A saved creator with no market is matched to the shortlist by handle, and otherwise becomes Poland. Export the current workspace first if you want to retain it.</DialogDescription></DialogHeader><button type="button" className="btn primary" onClick={() => { if (pendingRestore) { setState(pendingRestore); setDirty(true); setNotice('Backup restored. Review it and save changes to store it in Supabase.'); setPendingRestore(null); } }}>Restore backup</button></DialogContent></Dialog>
    <Sheet open={!!cr} onOpenChange={v => !v && setDetail(null)}><SheetContent className="creator-sheet">{cr && <><SheetHeader><span className="eyebrow">CREATOR REVIEW</span><SheetTitle className="sheet-name">{cr.name}</SheetTitle><SheetDescription>{cr.market} · {cr.platform} primary · {cr.status || 'No status'}</SheetDescription><div className="creator-locations">{PLATFORMS.map(platform => { const location = cr.profiles.find(item => item.platform === platform)?.detail.location; return location ? <p key={platform}>Creator location ({platform}): {location}</p> : null; })}</div><span className="handle-row">{PLATFORMS.map(platform => { const profile = cr.profiles.find(item => item.platform === platform); return profile?.handle ? <HandleLink key={platform} platform={platform} handle={profile.handle} url={profile.url} /> : null; })}</span></SheetHeader><fieldset disabled={saving} className="sheet-body"><div className="review-callout"><h3>Initial assessment</h3><p>{cr.rationale}</p><small>Editorial assessment from the supplied tracker; review before use.</small></div><h3>Evidence to resolve</h3><TextField label="Open questions" value={cr.gaps} onChange={v => creator(cr.id, { gaps: v })} area /><div className="two-fields"><label className="field"><span>Market</span><Choice label="Creator market" value={cr.market} onChange={v => creator(cr.id, { market: v as Market })} options={MARKETS.map(market => [market, market])} /></label><label className="field"><span>Primary platform</span><Choice label="Primary platform" value={PLATFORMS.includes(cr.platform as PlatformName) ? cr.platform : 'TikTok'} onChange={v => creator(cr.id, { platform: v })} options={PLATFORMS.map(platform => [platform, platform])} /></label></div><TextField label="Status" value={cr.status} onChange={v => creator(cr.id, { status: v })} /><TextField label="Personal story" value={cr.story} onChange={v => creator(cr.id, { story: v })} />
      {PLATFORMS.map(platform => <PlatformFields key={platform} creator={cr} platform={platform} onProfile={patch => patchProfile(cr.id, platform, patch)} onAudience={patch => patchAudience(cr.id, platform, patch)} onSelect={index => selectPackage(cr.id, index)} />)}
      {cr.profiles.filter(profile => !(PLATFORMS as readonly string[]).includes(profile.platform)).map(profile => <section key={profile.platform} className="platform-block"><div className="mini-heading">{profile.platform}</div><TextField label="Handle" value={profile.handle} onChange={v => patchProfile(cr.id, profile.platform, { handle: v })} /><TextField label="Profile URL" value={profile.url} onChange={v => patchProfile(cr.id, profile.platform, { url: v })} /></section>)}
      <div className="section-divider" /><h3>Package used in the forecast</h3><p className="muted">The ROI model uses this package’s PLN fee as entered. Net CPM above uses only the net 1× fee without paid promotion.</p><Choice label="Selected creator package" value={String(cr.selected)} onChange={v => selectPackage(cr.id, Number(v))} options={cr.packages.map((p, i) => [String(i), `${p.name} · ${money(p.fee)} · ${BASIS_LABEL[p.basis]}`])} /><div className="two-fields"><TextField label="Deliverable" value={cr.packages[cr.selected]?.name ?? ''} onChange={v => patchSelected({ name: v })} /><Numeric label="Quoted fee in PLN" value={cr.packages[cr.selected]?.fee ?? null} suffix="PLN" step={0.01} onChange={v => patchSelected({ fee: v })} /><label className="field"><span>Fee basis</span><Choice label="Quote basis" value={cr.packages[cr.selected]?.basis ?? 'unknown'} onChange={v => patchSelected({ basis: v as FeeBasis })} options={basisOptions} /></label><TextField label="Original currency" value={cr.packages[cr.selected]?.currency ?? ''} onChange={v => patchSelected({ currency: v.toUpperCase().slice(0, 12) })} /><Numeric label="Original amount" value={cr.packages[cr.selected]?.originalAmount ?? null} step={0.01} onChange={v => patchSelected({ originalAmount: v })} /><Numeric label="FX rate to PLN" value={cr.packages[cr.selected]?.fxRate ?? null} step={0.0001} onChange={v => patchSelected({ fxRate: v })} /><TextField label="FX date" value={cr.packages[cr.selected]?.fxDate ?? ''} onChange={v => patchSelected({ fxDate: v })} /><Numeric label="Tax / cost adjustment" value={cr.adjustment} suffix="PLN" onChange={v => creator(cr.id, { adjustment: v ?? 0 })} hint="Add costs not recoverable by Winglex. No tax rate is assumed." /><Numeric label="Other campaign costs" value={cr.extraCost} suffix="PLN" onChange={v => creator(cr.id, { extraCost: v ?? 0 })} hint="E.g. production or paid promotion." /></div>{cr.packages[cr.selected]?.originalText && <small>Imported fee text: {cr.packages[cr.selected]?.originalText}</small>}<Numeric label="Expected placement views · override" value={cr.viewsOverride} suffix="views" onChange={v => creator(cr.id, { viewsOverride: v })} hint={cr.packages[cr.selected]?.views != null ? `Blank uses ${n(cr.packages[cr.selected]?.views)} views stored on the selected package. This is not sponsored reach.` : 'Required for this package. Monthly account totals are not used.'} /><div className="formula-card compact"><span>All-in cost</span><strong>{money(forecast(cr, c).spend)}</strong><small>Quoted fee + adjustment + other campaign costs</small></div><div className="section-divider" /><h3>Your fit assessment</h3><p className="muted">Score each dimension from 0 to 100. These are your judgments, not verified audience metrics.</p><div className="three-fields">{(['audience', 'content', 'action'] as const).map(k => <Numeric key={k} label={k[0].toUpperCase() + k.slice(1)} value={cr.fit[k]} max={100} onChange={v => creator(cr.id, { fit: { ...cr.fit, [k]: v } })} />)}</div><small>0 = poor or contradicted fit; 50 = mixed support; 100 = strong documented fit. Leave unknowns blank. Action measures evidence of clicks or qualified acquisition.</small><TextField label="Assessment rationale" value={cr.rationale} onChange={v => creator(cr.id, { rationale: v })} area /><details className="source-notes"><summary>Original source notes</summary><p>{cr.notes || 'No source notes.'}</p><small>{cr.source}</small><p>Source statements, including audience superlatives, tax comments and suspected boosting, have not been independently verified.</p></details><label className="shortlist-toggle"><Checkbox checked={cr.included} onCheckedChange={v => creator(cr.id, { included: v === true })} />Include in campaign shortlist</label><button type="button" className="btn primary full" onClick={() => setDetail(null)}><Check size={17} />Done reviewing</button><small>Edits stay in the workspace. Use Save changes to keep them.</small></fieldset></>}</SheetContent></Sheet>
    <Dialog open={snapshotDialog} onOpenChange={setSnapshotDialog}><DialogContent><DialogHeader><DialogTitle>Save a scenario</DialogTitle><DialogDescription>Keep a named copy of your current campaign, shortlist, assumptions and results.</DialogDescription></DialogHeader><TextField label="Scenario name" value={snapshotName} onChange={setSnapshotName} /><button type="button" className="btn primary" disabled={!snapshotName.trim() || saving} onClick={snapshot}>Save scenario</button></DialogContent></Dialog>
    <Dialog open={!!pending} onOpenChange={v => !v && setPending(null)}><DialogContent className="import-dialog"><DialogHeader><DialogTitle>Import {pending?.length ?? 0} creators</DialogTitle><DialogDescription>Matching handles update profiles, market and packages. Your assessments, shortlist, profile URLs and results are preserved.</DialogDescription></DialogHeader><p>{pendingUpdates} existing creators will be updated. {(pending?.length ?? 0) - pendingUpdates} will be added.</p><ul className="import-preview">{pending?.map(item => { const quote = quoteMetrics(item, item.platform); return <li key={item.id}><strong>{item.name}</strong><span>{item.handle} · {item.market} · {item.platform} · {quote.cpm == null ? shortReason(quote.unavailable) : `${n(quote.cpm, 1)} zł net CPM`}</span></li>; })}</ul><button type="button" className="btn primary" onClick={mergeImport}>Import into workspace</button></DialogContent></Dialog>
  </div>;
}
