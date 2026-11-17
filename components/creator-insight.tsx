'use client';
import { ArrowUpRight, CircleAlert } from 'lucide-react';
import { PLATFORMS, profileUrl, safeHttpUrl, type Creator, type PlatformName, type Profile } from '@/lib/model';

const n = (v: number | null | undefined, d = 0) => v == null ? '—' : new Intl.NumberFormat('en-GB', { maximumFractionDigits: d }).format(v);
const percent = (v: number | null | undefined) => v == null ? '—' : `${n(v, 1)}%`;

function sourceTitle(source: string) {
  if (source === 'creator') return 'Creator-provided. This is the figure used for sorting and comparison.';
  if (source === 'api') return 'influencers.club API. Shown because the creator did not supply this figure.';
  return '';
}

export function SourceTag({ source }: { source: string }) {
  if (source !== 'creator' && source !== 'api') return null;
  return <em className={`source-tag source-${source}`} title={sourceTitle(source)}>{source === 'creator' ? 'creator' : 'API'}</em>;
}

export function ConflictMark({ value, api, label }: { value: number | null; api: number | null; label: string }) {
  if (value == null || api == null || Math.abs(value - api) <= 10) return null;
  return <span className="conflict-icon" title={`${label}: creator ${n(value, 1)}%. API ${n(api, 1)}%. The creator figure is shown.`}><CircleAlert size={13} aria-label={`${label} differs from the API`} /></span>;
}

function Bars({ rows, source }: { rows: { label: string; pct: number }[]; source: string }) {
  if (!rows.length) return null;
  return <div className="share-bars">{rows.map(row => <div className="share-row" key={row.label}><span title={row.label}>{row.label}</span><div className="bar-track"><div className="bar income" style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} /></div><strong>{percent(row.pct)}</strong>{source && <SourceTag source={source} />}</div>)}</div>;
}

function PlatformPanel({ creator, platform }: { creator: Creator; platform: PlatformName }) {
  const profile: Profile | undefined = creator.profiles.find(item => item.platform === platform);
  const href = profile ? safeHttpUrl(profileUrl(platform, profile.handle, profile.url)) : '';
  if (!profile || profile.detail.usable === false) {
    return <section className="platform-insight"><h3>{platform}</h3><p className="muted" title="No usable account">No usable account</p></section>;
  }
  const detail = profile.detail;
  const audience = profile.audience;
  const gender = [
    audience.female != null ? `${n(audience.female, 1)}% female` : '',
    audience.male != null ? `${n(audience.male, 1)}% male` : '',
    audience.other != null ? `${n(audience.other, 1)}% other` : '',
  ].filter(Boolean).join(' · ');
  const genderApi = [
    detail.apiFemale != null ? `female ${n(detail.apiFemale, 1)}%` : '',
    detail.apiMale != null ? `male ${n(detail.apiMale, 1)}%` : '',
  ].filter(Boolean).join(', ');
  return <section className="platform-insight">
    <h3>{platform} {profile.handle && href ? <a href={href} target="_blank" rel="noreferrer">{profile.handle} <ArrowUpRight size={13} /></a> : profile.handle}</h3>
    {detail.medianNote && <p className="muted">{detail.medianNote}</p>}
    <div className="mini-heading">Audience <SourceTag source={detail.homeSource || detail.ageSource || detail.genderSource} /></div>
    <div className="audience-figure"><span>{creator.market} share</span><strong>{percent(audience.homeShare)}</strong><SourceTag source={detail.homeSource} /><ConflictMark value={audience.homeShare} api={detail.apiHome} label="Home share" /></div>
    <Bars rows={detail.countries} source={detail.countrySource} />
    {detail.countrySource === 'creator' && <p className="muted">Country split uses the creator’s home-market share. The API country list is not shown while that figure exists.</p>}
    {detail.countrySource === 'api' && <p className="muted">API country split, because the creator did not supply a home-market share.</p>}
    <div className="audience-figure"><span>Age 25+</span><strong>{percent(audience.age25)}</strong><SourceTag source={detail.ageSource} /><ConflictMark value={audience.age25} api={detail.apiAge25} label="Age 25+" /></div>
    {detail.ageBandSource === 'api' && detail.ageBands.length > 0 && <><p className="muted">API age split, because the creator did not supply an age 25+ share.</p><Bars rows={detail.ageBands} source="api" /></>}
    <div className="audience-figure"><span>Gender</span><strong>{gender || '—'}</strong><SourceTag source={detail.genderSource} />{detail.genderSource === 'creator' && genderApi && (detail.apiFemale != null && audience.female != null && Math.abs(audience.female - detail.apiFemale) > 10 || detail.apiMale != null && audience.male != null && Math.abs(audience.male - detail.apiMale) > 10) && <span className="conflict-icon" title={`Gender API values: ${genderApi}. The creator split is shown.`}><CircleAlert size={13} aria-label="Gender differs from the API" /></span>}</div>
    {platform === 'Instagram' && detail.credibility != null && <p className="muted">Audience credibility {n(detail.credibility, 1)}%{detail.suspicious != null ? ` · suspicious followers ${n(detail.suspicious, 1)}%` : ''} (API, not a demographic).</p>}
    {(detail.growth3m != null || detail.growth12m != null) && <p className="muted">Follower growth (API): 3 months {percent(detail.growth3m)} · 12 months {percent(detail.growth12m)}{detail.postsPerMonth != null ? ` · ${n(detail.postsPerMonth, 1)} posts/month` : ''}</p>}
    {detail.interests.length > 0 && <p className="chip-line"><span>Interests</span>{detail.interests.map(item => <em key={item.label}>{item.label}{item.pct != null ? ` ${n(item.pct, 0)}%` : ''}</em>)}</p>}
    {detail.brandAffinity.length > 0 && <p className="chip-line"><span>Affinity</span>{detail.brandAffinity.map(item => <em key={item.label}>{item.label}{item.pct != null ? ` ${n(item.pct, 0)}%` : ''}</em>)}</p>}
    {detail.hashtags.length > 0 && <p className="chip-line"><span>Hashtags</span>{detail.hashtags.slice(0, 8).map(item => <em key={item}>{item}</em>)}</p>}
    {detail.pastSponsors.length > 0 && <p className="chip-line"><span>Sponsors</span>{detail.pastSponsors.slice(0, 8).map(item => <em key={item}>{item}</em>)}</p>}
    {detail.contactEmail && <p><a className="btn ghost" href={`mailto:${detail.contactEmail}`}>{detail.contactEmail}</a></p>}
    {detail.recentPosts.length > 0 && <div className="post-strip">{detail.recentPosts.slice(0, 8).map(post => {
      const url = safeHttpUrl(post.url);
      const label = post.date || 'Post';
      return url ? <a key={url} href={url} target="_blank" rel="noreferrer" title={post.views != null ? `${n(post.views)} views` : label}>{label}{post.views != null ? ` · ${n(post.views)}` : ''}</a> : <span key={label}>{label}</span>;
    })}</div>}
  </section>;
}

export function CreatorInsight({ creator, onEdit }: { creator: Creator; onEdit: () => void }) {
  return <div className="insight-panel">
    <div className="insight-platforms">{PLATFORMS.map(platform => <PlatformPanel key={platform} creator={creator} platform={platform} />)}</div>
    <button type="button" className="btn ghost" onClick={onEdit}>Edit creator</button>
  </div>;
}
