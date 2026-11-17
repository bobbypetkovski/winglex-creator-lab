import { z } from 'zod';
import { findEnriched, marketForHandle, profileFromRaw, type AudienceSource, type CatalogProfile } from './catalog.ts';

const num = z.number().finite().min(0).max(1e10);
const pct = num.max(100);
const txt = z.string().max(12000);

export const PLATFORMS = ['TikTok', 'Instagram'] as const;
export type PlatformName = (typeof PLATFORMS)[number];
export const MARKETS = ['Poland', 'Serbia', 'North Macedonia'] as const;
export type Market = (typeof MARKETS)[number];
export const FEE_BASES = ['net', 'gross', 'tax-on-top', 'unknown'] as const;
export type FeeBasis = (typeof FEE_BASES)[number];

export const BASIS_LABEL: Record<FeeBasis, string> = {
  net: 'Net',
  gross: 'Gross',
  'tax-on-top': 'Tax on top',
  unknown: 'Unknown',
};

const PLATFORM_RE = 'TikTok|Instagram|IG|TT';

export const AudienceSchema = z.object({
  homeShare: pct.nullable(),
  age25: pct.nullable(),
  female: pct.nullable(),
  male: pct.nullable(),
  other: pct.nullable(),
});

const labelled = z.object({ label: z.string().max(80), pct: pct });
const optionalLabelled = z.object({ label: z.string().max(120), pct: pct.nullable() });
const source = z.enum(['', 'creator', 'api']).default('');
export const DetailSchema = z.object({
  picture: z.string().max(2000).default(''),
  verified: z.boolean().default(false),
  following: num.nullable().default(null),
  posts: num.nullable().default(null),
  medianEngagements: num.nullable().default(null),
  medianLikes: num.nullable().default(null),
  medianComments: num.nullable().default(null),
  medianShares: num.nullable().default(null),
  medianSaves: num.nullable().default(null),
  avgLikes: num.nullable().default(null),
  avgComments: num.nullable().default(null),
  viewEngagement: pct.nullable().default(null),
  quotedCpm: num.nullable().default(null),
  quotedCpe: num.nullable().default(null),
  homeSource: source,
  ageSource: source,
  genderSource: source,
  countrySource: source,
  ageBandSource: source,
  apiHome: pct.nullable().default(null),
  apiAge25: pct.nullable().default(null),
  apiFemale: pct.nullable().default(null),
  apiMale: pct.nullable().default(null),
  countries: z.array(labelled).max(6).default([]),
  ageBands: z.array(labelled).max(8).default([]),
  credibility: pct.nullable().default(null),
  suspicious: pct.nullable().default(null),
  interests: z.array(optionalLabelled).max(8).default([]),
  brandAffinity: z.array(optionalLabelled).max(8).default([]),
  growth3m: z.number().finite().nullable().default(null),
  growth12m: z.number().finite().nullable().default(null),
  postsPerMonth: z.number().finite().nullable().default(null),
  lastPost: z.string().max(40).default(''),
  niche: z.string().max(160).default(''),
  category: z.string().max(80).default(''),
  bio: z.string().max(2000).default(''),
  location: z.string().max(120).default(''),
  language: z.string().max(80).default(''),
  contactEmail: z.string().max(200).default(''),
  hashtags: z.array(z.string().max(80)).max(12).default([]),
  brandsFound: z.array(z.string().max(80)).max(12).default([]),
  pastSponsors: z.array(z.string().max(80)).max(12).default([]),
  incomeMin: num.nullable().default(null),
  incomeMax: num.nullable().default(null),
  recentPosts: z.array(z.object({
    date: z.string().max(40).default(''),
    url: z.string().max(800).default(''),
    views: num.nullable().default(null),
    likes: num.nullable().default(null),
    comments: num.nullable().default(null),
    shares: num.nullable().default(null),
  })).max(12).default([]),
  conflicts: z.array(z.string().max(240)).max(8).default([]),
  usable: z.boolean().nullable().default(null),
  medianNote: z.string().max(400).default(''),
});

export const ProfileSchema = z.object({
  platform: z.string().max(40),
  handle: txt,
  url: txt,
  followers: num.nullable(),
  median: num.nullable(),
  average: num.nullable(),
  engagement: pct.nullable(),
  audience: AudienceSchema,
  detail: DetailSchema,
});

export const PackageSchema = z.object({
  name: txt,
  fee: num.nullable(),
  basis: z.enum(FEE_BASES),
  views: num.nullable(),
  platform: z.string().max(40),
  currency: z.string().max(12),
  originalAmount: num.nullable(),
  fxRate: num.nullable(),
  fxDate: z.string().max(40),
  paidPromo: z.boolean(),
  originalText: z.string().max(4000),
});

export const CreatorSchema = z.object({
  id: z.string().max(150),
  name: txt,
  handle: txt,
  market: z.enum(MARKETS),
  platform: txt,
  profiles: z.array(ProfileSchema).max(8),
  notes: txt,
  source: txt,
  status: txt,
  story: txt,
  contactEmail: z.string().max(200).default(''),
  packages: z.array(PackageSchema).max(20),
  selected: z.number().int().min(0).max(19),
  included: z.boolean(),
  fit: z.object({ audience: pct.nullable(), content: pct.nullable(), action: pct.nullable() }),
  rationale: txt,
  gaps: txt,
  adjustment: num,
  extraCost: num,
  viewsOverride: num.nullable(),
  actual: z.object({
    spend: num.nullable(),
    visits: num.nullable(),
    signed: num.nullable(),
    recovered: num.nullable(),
    revenue: num.nullable(),
    handling: num.nullable(),
  }),
});

export const MarketContextSchema = z.object({ name: txt, target: txt, brief: txt });

export const CampaignSchema = z.object({
  brandId: z.literal('winglex'),
  brand: txt,
  website: txt,
  name: txt,
  target: txt,
  brief: txt,
  objective: z.enum(['claims', 'awareness', 'content']),
  budget: num,
  fee: num,
  winRate: pct,
  winCost: num,
  lossCost: num,
  ctr: pct,
  completion: pct,
  eligibility: pct,
  signing: pct,
  low: num.max(1),
  high: num.min(1).max(10),
  weights: z.object({ audience: pct, content: pct, action: pct }),
  markets: z.object({
    Poland: MarketContextSchema,
    Serbia: MarketContextSchema,
    'North Macedonia': MarketContextSchema,
  }),
});

export const SnapshotSchema = z.object({
  id: txt,
  name: txt,
  date: txt,
  campaign: CampaignSchema,
  creators: z.array(CreatorSchema).max(200),
});

const StateObjectSchema = z.object({
  campaign: CampaignSchema,
  creators: z.array(CreatorSchema).max(200),
  snapshots: z.array(SnapshotSchema).max(12),
}).superRefine((state, ctx) => {
  for (const creators of [state.creators, ...state.snapshots.map(s => s.creators)]) {
    const handles = new Set<string>();
    const ids = new Set<string>();
    for (const cr of creators) {
      if (cr.selected >= cr.packages.length || handles.has(cr.handle.toLowerCase()) || ids.has(cr.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid package selection or duplicate creator.' });
      }
      handles.add(cr.handle.toLowerCase());
      ids.add(cr.id);
      const platforms = new Set<string>();
      for (const profile of cr.profiles) {
        if (platforms.has(profile.platform)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate platform profile.' });
        platforms.add(profile.platform);
      }
      const a = cr.actual;
      if (a.signed != null && a.recovered != null && a.recovered > a.signed) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Recovered passengers exceed signed passengers.' });
      }
      for (const count of [a.visits, a.signed, a.recovered]) {
        if (count != null && !Number.isInteger(count)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Actual counts must be whole numbers.' });
      }
    }
  }
});

export const StateSchema = z.preprocess(value => normaliseState(value), StateObjectSchema);

export type Audience = z.infer<typeof AudienceSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Package = z.infer<typeof PackageSchema>;
export type Creator = z.infer<typeof CreatorSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type MarketContext = z.infer<typeof MarketContextSchema>;
export type State = z.infer<typeof StateSchema>;

const GENERIC_BRIEF = 'Reach travellers with a relevant flight disruption. Help them complete a flight check and submit an eligible passenger claim.';

export function marketContext(market: Market): MarketContext {
  if (market === 'Serbia') {
    return {
      name: 'Serbia · Creator pilot',
      target: 'Serbian-speaking travellers with disrupted flights',
      brief: 'Reach Serbian-speaking travellers with a relevant flight disruption. Help them complete a flight check and submit an eligible passenger claim.',
    };
  }
  if (market === 'North Macedonia') {
    return {
      name: 'North Macedonia · Creator pilot',
      target: 'Macedonian-speaking travellers with disrupted flights',
      brief: 'Reach Macedonian-speaking travellers with a relevant flight disruption. Help them complete a flight check and submit an eligible passenger claim.',
    };
  }
  return {
    name: 'Poland · Creator pilot',
    target: 'Polish-speaking travellers with disrupted flights',
    brief: GENERIC_BRIEF,
  };
}

function defaultMarkets(): Campaign['markets'] {
  return {
    Poland: marketContext('Poland'),
    Serbia: marketContext('Serbia'),
    'North Macedonia': marketContext('North Macedonia'),
  };
}

export const defaultCampaign: Campaign = {
  brandId: 'winglex',
  brand: 'Winglex',
  website: 'https://winglex.com',
  name: 'Poland · Creator pilot',
  target: 'Polish-speaking travellers with disrupted flights',
  brief: GENERIC_BRIEF,
  objective: 'claims',
  budget: 10000,
  fee: 400,
  winRate: 70,
  winCost: 60,
  lossCost: 20,
  ctr: 0.7,
  completion: 40,
  eligibility: 30,
  signing: 65,
  low: 0.5,
  high: 1.5,
  weights: { audience: 40, content: 40, action: 20 },
  markets: defaultMarkets(),
};

export function economics(c: Campaign) {
  return c.winRate / 100 * (c.fee - c.winCost) - (1 - c.winRate / 100) * c.lossCost;
}

export function forecast(cr: Creator, c: Campaign, multiplier = 1) {
  const p = cr.packages[cr.selected];
  const views = cr.viewsOverride ?? p?.views ?? null;
  const spend = p?.fee == null ? null : p.fee + cr.adjustment + cr.extraCost;
  const visits = views == null ? null : views * multiplier * c.ctr / 100;
  const checks = visits == null ? null : visits * c.completion / 100;
  const eligible = checks == null ? null : checks * c.eligibility / 100;
  const signed = eligible == null ? null : eligible * c.signing / 100;
  const contribution = signed == null ? null : signed * economics(c);
  const profit = spend == null || contribution == null ? null : contribution - spend;
  return {
    views: views == null ? null : views * multiplier,
    spend,
    visits,
    checks,
    eligible,
    signed,
    contribution,
    profit,
    roi: profit == null || !spend ? null : profit / spend * 100,
    cpa: spend == null || !signed ? null : spend / signed,
    cpm: spend == null || !views ? null : spend / views * 1000,
    breakEven: spend == null || economics(c) <= 0 ? null : Math.ceil(spend / economics(c) - 1e-10),
    feeCeiling: contribution == null ? null : Math.max(0, contribution - cr.adjustment - cr.extraCost),
  };
}

export function fitScore(cr: Creator, c: Campaign) {
  const keys = ['audience', 'content', 'action'] as const;
  const active = keys.filter(k => c.weights[k] > 0);
  if (!active.length || active.some(k => cr.fit[k] == null)) return null;
  const total = active.reduce((s, k) => s + c.weights[k], 0);
  return Math.round(active.reduce((s, k) => s + (cr.fit[k] ?? 0) * c.weights[k], 0) / total);
}

export function decision(cr: Creator, c: Campaign) {
  const f = forecast(cr, c);
  if (cr.packages[cr.selected]?.fee == null) return 'Get quote';
  if (c.objective !== 'claims') return fitScore(cr, c) == null ? 'Assess fit' : 'Review fit';
  if (f.profit == null) return 'Add reach';
  if (f.profit < 0) return 'Negotiate';
  return cr.gaps.trim() ? 'Conditional test' : 'Review for test';
}

export function canonicalPlatform(value: string): PlatformName | null {
  const w = value.trim().toLowerCase();
  if (w === 'tiktok' || w === 'tt') return 'TikTok';
  if (w === 'instagram' || w === 'ig') return 'Instagram';
  return null;
}

export function isMarket(value: string): value is Market {
  return (MARKETS as readonly string[]).includes(value);
}

const MARKET_PREFIXES = ['North Macedonia', 'Serbia', 'Poland'] as const;

/** A legacy country cell: an exact market, a string that starts with one, or one named in the first entry. */
export function marketFromCountryText(value: string): Market | null {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || /^missing$/i.test(text)) return null;
  if (isMarket(text)) return text;
  const lower = text.toLowerCase();
  for (const market of MARKET_PREFIXES) {
    if (lower.startsWith(market.toLowerCase())) return market;
  }
  const top = (text.split(/[;\n]/)[0] ?? '').toLowerCase();
  for (const market of MARKET_PREFIXES) {
    if (top.includes(market.toLowerCase())) return market;
  }
  return null;
}

export const ALL_MARKETS_HEADER = {
  name: 'Poland · Serbia · North Macedonia',
  target: 'Polish-, Serbian- and Macedonian-speaking travellers with disrupted flights',
};

export function profileUrl(platform: string, handle: string, explicit = ''): string {
  const given = explicit.trim();
  if (given) return given;
  const h = handle.trim().replace(/^@+/, '');
  if (!h) return '';
  if (platform === 'TikTok') return `https://www.tiktok.com/@${encodeURIComponent(h)}`;
  if (platform === 'Instagram') return `https://www.instagram.com/${encodeURIComponent(h)}/`;
  return '';
}

export function safeHttpUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString();
  } catch { /* not a URL */ }
  return '';
}

export function isPrimaryDeliverable(pkg: Package, platform: string): boolean {
  if (pkg.paidPromo || pkg.platform !== platform) return false;
  const n = pkg.name.toLowerCase();
  if (platform === 'TikTok') return n.includes('tiktok') && !n.includes('story') && !n.includes('bundle');
  if (platform === 'Instagram') return (/ig reels|^instagram\b|1×\s*instagram|1x\s*instagram/.test(n)) && !/story|igs|bundle/.test(n);
  return false;
}

export function primaryPackage(cr: Creator, platform: string): Package | undefined {
  const matches = cr.packages.filter(p => isPrimaryDeliverable(p, platform));
  return matches.find(p => p.fee != null) ?? matches[0];
}

export type QuoteMetrics = {
  pkg: Package | undefined;
  netFee: number | null;
  cpm: number | null;
  cpe: number | null;
  engagements: number | null;
  unavailable: string;
  cpeUnavailable: string;
};

export function quoteMetrics(cr: Creator, platform: string): QuoteMetrics {
  const profile = cr.profiles.find(p => p.platform === platform);
  const pkg = primaryPackage(cr, platform);
  const engagements = profile?.median != null && profile.engagement != null ? profile.engagement / 100 * profile.median : null;
  const netFee = pkg?.fee != null && pkg.basis === 'net' ? pkg.fee : null;
  let unavailable = '';
  if (profile?.median == null || profile.median <= 0) unavailable = 'Median views missing';
  else if (pkg?.fee == null) unavailable = 'No 1× fee';
  else if (pkg.basis === 'gross') unavailable = 'Gross fee — not a net CPM';
  else if (pkg.basis === 'tax-on-top') unavailable = 'Tax on top — net cost is higher than the quoted fee';
  else if (pkg.basis !== 'net') unavailable = 'Fee basis unknown';
  const cpm = unavailable || netFee == null || profile?.median == null ? null : netFee / profile.median * 1000;
  let cpeUnavailable = unavailable;
  if (!cpeUnavailable && (engagements == null || engagements <= 0)) {
    cpeUnavailable = 'Engagement rate missing. Median engagements = engagement rate × median views.';
  }
  const cpe = cpeUnavailable || netFee == null || engagements == null ? null : netFee / engagements;
  return { pkg, netFee, cpm, cpe, engagements, unavailable, cpeUnavailable };
}

export function strongerPlatform(cr: Creator): PlatformName | null {
  const tt = quoteMetrics(cr, 'TikTok').cpm;
  const ig = quoteMetrics(cr, 'Instagram').cpm;
  if (tt != null && ig != null && tt !== ig) return tt < ig ? 'TikTok' : 'Instagram';
  const ttm = cr.profiles.find(p => p.platform === 'TikTok')?.median ?? null;
  const igm = cr.profiles.find(p => p.platform === 'Instagram')?.median ?? null;
  if (ttm != null && igm != null && ttm !== igm) return ttm > igm ? 'TikTok' : 'Instagram';
  return null;
}

export function feeDetail(pkg?: Package): string {
  if (!pkg || (pkg.fee == null && !pkg.originalText)) return 'No fee quoted for this 1× deliverable.';
  const pln = pkg.fee == null
    ? 'PLN amount missing'
    : `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(pkg.fee)} zł ${BASIS_LABEL[pkg.basis]}`;
  const fx = pkg.currency && pkg.currency !== 'PLN' && pkg.fxRate != null
    ? `FX ${pkg.fxRate} to PLN${pkg.fxDate ? ` on ${pkg.fxDate}` : ''}`
    : '';
  return [pkg.name, pkg.originalText.trim(), fx, pln].filter(Boolean).join(' · ');
}

export function mergeCreators(existing: Creator[], incoming: Creator[]): Creator[] {
  const fresh = new Map(incoming.map(item => [item.handle.toLowerCase(), item]));
  const merged = existing.map(old => {
    const item = fresh.get(old.handle.toLowerCase());
    if (!item) return old;
    fresh.delete(old.handle.toLowerCase());
    return {
      ...item,
      id: old.id,
      profiles: item.profiles.map(profile => {
        const prev = old.profiles.find(candidate => candidate.platform === profile.platform);
        return prev && !profile.url.trim() ? { ...profile, url: prev.url } : profile;
      }),
      fit: old.fit,
      rationale: old.rationale,
      gaps: old.gaps,
      included: old.included,
      actual: old.actual,
      adjustment: old.adjustment,
      extraCost: old.extraCost,
      story: item.story.trim() ? item.story : old.story,
    };
  });
  return [...merged, ...fresh.values()];
}

function text(value: unknown, max = 12000): string {
  return String(value ?? '').slice(0, max);
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /^missing$/i.test(trimmed)) return null;
  const n = Number(trimmed.replace(/[, ]/g, '').replace(/%$/, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function percentOrNull(value: unknown): number | null {
  const n = numberOrNull(value);
  return n != null && n <= 100 ? n : null;
}

function blankAudience(): Audience {
  return { homeShare: null, age25: null, female: null, male: null, other: null };
}

function emptyDetail(): Profile['detail'] {
  return {
    picture: '', verified: false, following: null, posts: null, medianEngagements: null, medianLikes: null, medianComments: null, medianShares: null, medianSaves: null,
    avgLikes: null, avgComments: null, viewEngagement: null, quotedCpm: null, quotedCpe: null, homeSource: '', ageSource: '', genderSource: '', countrySource: '', ageBandSource: '',
    apiHome: null, apiAge25: null, apiFemale: null, apiMale: null, countries: [], ageBands: [], credibility: null, suspicious: null, interests: [], brandAffinity: [],
    growth3m: null, growth12m: null, postsPerMonth: null, lastPost: '', niche: '', category: '', bio: '', location: '', language: '', contactEmail: '',
    hashtags: [], brandsFound: [], pastSponsors: [], incomeMin: null, incomeMax: null, recentPosts: [], conflicts: [], usable: null, medianNote: '',
  };
}

function asSource(value: unknown): AudienceSource {
  return value === 'creator' || value === 'api' ? value : '';
}

function normaliseDetail(raw: unknown): Profile['detail'] {
  const base = emptyDetail();
  const d = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const list = (value: unknown, max = 12) => Array.isArray(value) ? value.map(item => text(item, 80)).filter(Boolean).slice(0, max) : base.hashtags;
  const bars = (value: unknown, max = 6) => Array.isArray(value) ? value.slice(0, max).map(item => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return { label: text(row.label, 80), pct: percentOrNull(row.pct) ?? 0 };
  }) : [];
  const optionalBars = (value: unknown) => Array.isArray(value) ? value.slice(0, 8).map(item => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return { label: text(row.label, 120), pct: percentOrNull(row.pct) };
  }) : [];
  return {
    ...base,
    picture: text(d.picture, 2000), verified: d.verified === true, following: numberOrNull(d.following), posts: numberOrNull(d.posts),
    medianEngagements: numberOrNull(d.medianEngagements), medianLikes: numberOrNull(d.medianLikes), medianComments: numberOrNull(d.medianComments),
    medianShares: numberOrNull(d.medianShares), medianSaves: numberOrNull(d.medianSaves), avgLikes: numberOrNull(d.avgLikes), avgComments: numberOrNull(d.avgComments),
    viewEngagement: percentOrNull(d.viewEngagement), quotedCpm: numberOrNull(d.quotedCpm), quotedCpe: numberOrNull(d.quotedCpe),
    homeSource: asSource(d.homeSource), ageSource: asSource(d.ageSource), genderSource: asSource(d.genderSource), countrySource: asSource(d.countrySource), ageBandSource: asSource(d.ageBandSource),
    apiHome: percentOrNull(d.apiHome), apiAge25: percentOrNull(d.apiAge25), apiFemale: percentOrNull(d.apiFemale), apiMale: percentOrNull(d.apiMale),
    countries: bars(d.countries), ageBands: bars(d.ageBands, 8), credibility: percentOrNull(d.credibility), suspicious: percentOrNull(d.suspicious),
    interests: optionalBars(d.interests), brandAffinity: optionalBars(d.brandAffinity),
    growth3m: typeof d.growth3m === 'number' && Number.isFinite(d.growth3m) ? d.growth3m : null,
    growth12m: typeof d.growth12m === 'number' && Number.isFinite(d.growth12m) ? d.growth12m : null,
    postsPerMonth: typeof d.postsPerMonth === 'number' && Number.isFinite(d.postsPerMonth) ? d.postsPerMonth : null,
    lastPost: text(d.lastPost, 40), niche: text(d.niche, 160), category: text(d.category, 80), bio: text(d.bio, 2000), location: text(d.location, 120), language: text(d.language, 80), contactEmail: text(d.contactEmail, 200),
    hashtags: list(d.hashtags), brandsFound: list(d.brandsFound), pastSponsors: list(d.pastSponsors),
    incomeMin: numberOrNull(d.incomeMin), incomeMax: numberOrNull(d.incomeMax),
    recentPosts: Array.isArray(d.recentPosts) ? d.recentPosts.slice(0, 12).map(item => {
      const post = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return { date: text(post.date, 40), url: text(post.url, 800), views: numberOrNull(post.views), likes: numberOrNull(post.likes), comments: numberOrNull(post.comments), shares: numberOrNull(post.shares) };
    }) : [],
    conflicts: list(d.conflicts, 8).map(item => item.slice(0, 240)), usable: typeof d.usable === 'boolean' ? d.usable : null, medianNote: text(d.medianNote, 400),
  };
}

function blankProfile(platform: string): Profile {
  return { platform, handle: '', url: '', followers: null, median: null, average: null, engagement: null, audience: blankAudience(), detail: emptyDetail() };
}

function detailFromCatalog(mapped: CatalogProfile): Profile['detail'] {
  return {
    ...emptyDetail(),
    picture: mapped.picture, verified: mapped.verified, following: mapped.following, posts: mapped.posts,
    viewEngagement: mapped.viewEngagement, quotedCpm: mapped.quotedCpm, quotedCpe: mapped.quotedCpe,
    homeSource: mapped.homeSource, ageSource: mapped.ageSource, genderSource: mapped.genderSource, countrySource: mapped.countrySource, ageBandSource: mapped.ageBandSource,
    apiHome: mapped.apiHome, apiAge25: mapped.apiAge25, apiFemale: mapped.apiFemale, apiMale: mapped.apiMale,
    countries: mapped.countries, ageBands: mapped.ageBands, credibility: mapped.credibility, suspicious: mapped.suspicious,
    interests: mapped.interests, brandAffinity: mapped.brandAffinity, growth3m: mapped.growth3m, growth12m: mapped.growth12m, postsPerMonth: mapped.postsPerMonth,
    lastPost: mapped.lastPost, niche: mapped.niche, category: mapped.category, bio: mapped.bio, location: mapped.location, language: mapped.language, contactEmail: mapped.contactEmail,
    hashtags: mapped.hashtags, brandsFound: mapped.brandsFound, pastSponsors: mapped.pastSponsors, incomeMin: mapped.incomeMin, incomeMax: mapped.incomeMax,
    recentPosts: mapped.recentPosts, conflicts: mapped.conflicts, usable: mapped.usable, medianNote: mapped.medianNote,
  };
}

export function profileFromCatalog(platform: string, mapped: CatalogProfile | null): Profile {
  if (!mapped || mapped.usable === false) {
    const detail = mapped ? detailFromCatalog(mapped) : emptyDetail();
    if (mapped) detail.usable = false;
    return { platform, handle: mapped?.handle ?? '', url: mapped?.url ?? '', followers: null, median: null, average: null, engagement: null, audience: blankAudience(), detail };
  }
  return {
    platform, handle: mapped.handle, url: mapped.url, followers: mapped.followers, median: mapped.median, average: mapped.average, engagement: mapped.engagement,
    audience: { ...mapped.audience }, detail: detailFromCatalog(mapped),
  };
}

function orderProfiles(list: Profile[]): Profile[] {
  const known = PLATFORMS.map(platform => list.find(profile => profile.platform === platform) ?? blankProfile(platform));
  const extra = list.filter(profile => !(PLATFORMS as readonly string[]).includes(profile.platform));
  return [...known, ...extra];
}

function normaliseBasis(value: unknown): FeeBasis {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'net' || v === 'netto') return 'net';
  if (v === 'gross' || v === 'brutto') return 'gross';
  if (v === 'tax-on-top' || v === 'tax on top') return 'tax-on-top';
  return 'unknown';
}

function inferPackagePlatform(name: string): string {
  if (/tiktok/i.test(name)) return 'TikTok';
  if (/instagram|\bIG\b|IGS|Reels/i.test(name)) return 'Instagram';
  return '';
}

function inferPaidPromo(name: string, explicit: unknown): boolean {
  if (typeof explicit === 'boolean') return explicit;
  if (/no paid[ -]?promo/i.test(name)) return false;
  return /\+promo|(?:with|includes)\s+paid[ -]?promo/i.test(name);
}

function normalisePackage(raw: unknown): Package {
  const p = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const name = text(p.name || 'Package');
  const fee = numberOrNull(p.fee);
  const currency = text(p.currency, 12) || (fee != null ? 'PLN' : '');
  return {
    name,
    fee,
    basis: normaliseBasis(p.basis),
    views: numberOrNull(p.views),
    platform: typeof p.platform === 'string' && p.platform ? text(p.platform, 40) : inferPackagePlatform(name),
    currency,
    originalAmount: p.originalAmount != null ? numberOrNull(p.originalAmount) : (currency === 'PLN' ? fee : null),
    fxRate: p.fxRate != null ? numberOrNull(p.fxRate) : (currency === 'PLN' && fee != null ? 1 : null),
    fxDate: text(p.fxDate, 40),
    paidPromo: inferPaidPromo(name, p.paidPromo),
    originalText: text(p.originalText, 4000),
  };
}

function normaliseProfile(raw: unknown): Profile {
  const p = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const audience = p.audience && typeof p.audience === 'object' ? p.audience as Record<string, unknown> : {};
  return {
    platform: text(p.platform, 40),
    handle: text(p.handle),
    url: text(p.url),
    followers: numberOrNull(p.followers),
    median: numberOrNull(p.median),
    average: numberOrNull(p.average),
    engagement: percentOrNull(p.engagement),
    audience: {
      homeShare: percentOrNull(audience.homeShare),
      age25: percentOrNull(audience.age25),
      female: percentOrNull(audience.female),
      male: percentOrNull(audience.male),
      other: percentOrNull(audience.other),
    },
    detail: normaliseDetail(p.detail),
  };
}

function normaliseFit(raw: unknown): Creator['fit'] {
  const f = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return { audience: percentOrNull(f.audience), content: percentOrNull(f.content), action: percentOrNull(f.action) };
}

function normaliseActual(raw: unknown): Creator['actual'] {
  const a = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    spend: numberOrNull(a.spend),
    visits: numberOrNull(a.visits),
    signed: numberOrNull(a.signed),
    recovered: numberOrNull(a.recovered),
    revenue: numberOrNull(a.revenue),
    handling: numberOrNull(a.handling),
  };
}

function usableText(value: string): string {
  return value.split(/do not use/i)[0];
}

function parseAges(value: string): Partial<Record<PlatformName, number>> {
  const out: Partial<Record<PlatformName, number>> = {};
  const usable = usableText(value);
  for (const match of usable.matchAll(new RegExp(`(${PLATFORM_RE})\\s+([\\d.]+)\\s*%`, 'gi'))) {
    const platform = canonicalPlatform(match[1]);
    const n = Number(match[2]);
    if (platform && n <= 100) out[platform] = n;
  }
  for (const match of usable.matchAll(/([\d.]+)\s*%\s*\(([^)]*)\)/gi)) {
    const word = match[2].match(new RegExp(PLATFORM_RE, 'i'));
    const platform = word ? canonicalPlatform(word[0]) : null;
    const n = Number(match[1]);
    if (platform && n <= 100 && out[platform] == null) out[platform] = n;
  }
  return out;
}

function parseGenders(value: string): Partial<Record<PlatformName, Pick<Audience, 'female' | 'male' | 'other'>>> {
  const out: Partial<Record<PlatformName, Pick<Audience, 'female' | 'male' | 'other'>>> = {};
  const usable = usableText(value);
  for (const match of usable.matchAll(new RegExp(`(${PLATFORM_RE})(?:\\s+followers)?\\s+([\\d.]+)\\s*%\\s*F\\s*/\\s*([\\d.]+)\\s*%\\s*M(?:\\s*/\\s*([\\d.]+)\\s*%\\s*other)?`, 'gi'))) {
    const platform = canonicalPlatform(match[1]);
    if (!platform) continue;
    const female = Number(match[2]);
    const male = Number(match[3]);
    const other = match[4] == null ? null : Number(match[4]);
    if (female <= 100 && male <= 100 && (other == null || other <= 100)) out[platform] = { female, male, other };
  }
  return out;
}

function parseHomeShares(value: string, market: string): Partial<Record<PlatformName, number>> {
  const out: Partial<Record<PlatformName, number>> = {};
  if (!value.trim() || /^missing$/i.test(value.trim())) return out;
  const country = market.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const clause of usableText(value).split(/;|\.\s+/)) {
    if (/^\s*note\b/i.test(clause)) continue;
    if (/\bfacebook\b/i.test(clause) && !new RegExp(PLATFORM_RE, 'i').test(clause.replace(/facebook/ig, ''))) continue;
    const leads = [...clause.matchAll(new RegExp(`(${PLATFORM_RE})\\s+${country}\\s+([\\d.]+)\\s*%`, 'gi'))];
    if (leads.length) {
      for (const lead of leads) {
        const platform = canonicalPlatform(lead[1]);
        const n = Number(lead[2]);
        if (platform && n <= 100) out[platform] = n;
      }
      continue;
    }
    if (/missing|not pulled|no percentage|unavailable/i.test(clause)) continue;
    const pct = clause.match(new RegExp(`${country}\\s+([\\d.]+)\\s*%`, 'i'));
    if (!pct) continue;
    const paren = clause.match(/\(([^)]*)\)/);
    const word = paren?.[1].match(new RegExp(PLATFORM_RE, 'i'))?.[0] ?? clause.match(new RegExp(`^\\s*(${PLATFORM_RE})\\b`, 'i'))?.[1];
    const platform = word ? canonicalPlatform(word) : null;
    const n = Number(pct[1]);
    if (platform && n <= 100) out[platform] = n;
  }
  return out;
}

function bareHome(value: string, market: string): number | null {
  if (/not supplied|^missing$/i.test(value.trim())) return null;
  if (new RegExp(PLATFORM_RE, 'i').test(value)) return null;
  const match = value.trim().match(new RegExp(`^${market}\\s+([\\d.]+)\\s*%$`, 'i'));
  if (!match) return null;
  const n = Number(match[1]);
  return n <= 100 ? n : null;
}

function bareAge(value: string): number | null {
  if (new RegExp(PLATFORM_RE, 'i').test(value)) return null;
  const match = value.trim().match(/^([\d.]+)\s*%$/);
  if (!match) return null;
  const n = Number(match[1]);
  return n <= 100 ? n : null;
}

type NoteStats = { handle?: string; followers?: number; engagement?: number; median?: number; average?: number };

function parsePlatformNote(note: string): Partial<Record<PlatformName, NoteStats>> {
  const out: Partial<Record<PlatformName, NoteStats>> = {};
  const add = (platform: PlatformName, patch: NoteStats) => {
    const current = out[platform] ?? {};
    const next: NoteStats = { ...current };
    for (const [key, value] of Object.entries(patch) as [keyof NoteStats, NoteStats[keyof NoteStats]][]) {
      if (value != null && value !== '') next[key] = value as never;
    }
    out[platform] = next;
  };
  for (const match of note.matchAll(new RegExp(`(${PLATFORM_RE})\\s+is\\s+@([\\w.]+)`, 'gi'))) {
    const platform = canonicalPlatform(match[1]);
    if (platform) add(platform, { handle: '@' + match[2] });
  }
  for (const match of note.matchAll(/([\d][\d,]*)\s+followers?,?\s*([\d.]+)\s*%\s*ER/gi)) {
    const start = match.index ?? 0;
    const window = note.slice(Math.max(0, start - 90), start);
    const platforms = [...window.matchAll(new RegExp(`\\b(${PLATFORM_RE})\\b`, 'gi'))];
    const platform = canonicalPlatform(platforms.at(-1)?.[1] ?? '');
    if (!platform) continue;
    const handle = [...window.matchAll(/@([\w.]+)/g)].at(-1)?.[1];
    add(platform, {
      followers: Number(match[1].replace(/,/g, '')),
      engagement: Number(match[2]),
      handle: handle ? '@' + handle : undefined,
    });
  }
  for (const match of note.matchAll(/IG Reels median\s+([\d][\d,]*)(?:\s*\/\s*avg\s+([\d][\d,]*))?/gi)) {
    add('Instagram', {
      median: Number(match[1].replace(/,/g, '')),
      average: match[2] ? Number(match[2].replace(/,/g, '')) : undefined,
    });
  }
  for (const match of note.matchAll(/TikTok\s+@([\w.]+)\s+is an empty\s+([\d,]+)-follower/gi)) {
    add('TikTok', { handle: '@' + match[1], followers: Number(match[2].replace(/,/g, '')) });
  }
  return out;
}

function applyGender(profiles: Profile[], value: string, unlabelled: PlatformName | null) {
  const parsed = parseGenders(value);
  let labelled = false;
  for (const platform of PLATFORMS) {
    const gender = parsed[platform];
    const profile = profiles.find(item => item.platform === platform);
    if (!gender || !profile) continue;
    labelled = true;
    profile.audience = { ...profile.audience, ...gender };
  }
  if (labelled || !unlabelled || new RegExp(PLATFORM_RE, 'i').test(value)) return;
  const loose = value.match(/([\d.]+)\s*%\s*F\s*\/\s*([\d.]+)\s*%\s*M(?:\s*\/\s*([\d.]+)\s*%\s*other)?/i);
  const profile = profiles.find(item => item.platform === unlabelled);
  if (!loose || !profile) return;
  profile.audience = {
    ...profile.audience,
    female: Number(loose[1]),
    male: Number(loose[2]),
    other: loose[3] == null ? null : Number(loose[3]),
  };
}

function creatorShell(c: Record<string, unknown>, packages: Package[], notes: string): Omit<Creator, 'market' | 'platform' | 'profiles'> {
  const selected = Number.isInteger(c.selected) ? Number(c.selected) : 0;
  return {
    id: text(c.id || c.handle, 150) || 'creator',
    name: text(c.name),
    handle: text(c.handle),
    notes: notes.slice(0, 12000),
    source: text(c.source),
    status: text(c.status),
    story: text(c.story),
    contactEmail: text(c.contactEmail, 200),
    packages,
    selected,
    included: c.included === true,
    fit: normaliseFit(c.fit),
    rationale: text(c.rationale),
    gaps: text(c.gaps),
    adjustment: numberOrNull(c.adjustment) ?? 0,
    extraCost: numberOrNull(c.extraCost) ?? 0,
    viewsOverride: numberOrNull(c.viewsOverride),
    actual: normaliseActual(c.actual),
  };
}

function resolveMarket(record: Record<string, unknown>, handles: string[]) {
  const explicit = String(record.market ?? '').trim();
  if (isMarket(explicit)) return { market: explicit, explicit: true };
  for (const handle of handles) {
    const found = marketForHandle(handle);
    if (found) return { market: found, explicit: false };
  }
  const fromCountry = marketFromCountryText(String(record.country ?? ''));
  if (fromCountry) return { market: fromCountry, explicit: false };
  return { market: 'Poland' as Market, explicit: false };
}

function overlayCatalog(creator: Creator): Creator {
  const record = findEnriched(creator.handle) ?? creator.profiles.map(profile => findEnriched(profile.handle)).find(Boolean) ?? null;
  if (!record) return creator;
  const catalogEmail = typeof record.contact_email === 'string' ? record.contact_email : '';
  if (!creator.contactEmail && catalogEmail) creator.contactEmail = text(catalogEmail, 200);
  const platforms = record.platforms && typeof record.platforms === 'object' ? record.platforms as Record<string, unknown> : {};
  for (const name of PLATFORMS) {
    const profile = creator.profiles.find(item => item.platform === name);
    const mapped = profileFromRaw(platforms[name.toLowerCase()], creator.market);
    if (!profile || !mapped) continue;
    const saved = profile.detail.homeSource || profile.detail.ageSource || profile.detail.genderSource;
    if (saved) {
      if (!profile.detail.picture) profile.detail.picture = mapped.picture;
      if (!profile.detail.bio) profile.detail.bio = mapped.bio;
      if (profile.detail.usable == null) profile.detail.usable = mapped.usable;
      continue;
    }
    const next = profileFromCatalog(name, mapped);
    profile.handle = next.handle || profile.handle;
    profile.url = next.url || profile.url;
    profile.followers = next.followers;
    profile.median = next.median;
    profile.average = next.average;
    profile.engagement = next.engagement;
    profile.audience = next.audience;
    profile.detail = next.detail;
  }
  return creator;
}

function upgradeCreator(raw: unknown): Creator {
  const c = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const packages = Array.isArray(c.packages) && c.packages.length ? c.packages.map(normalisePackage) : [normalisePackage({ name: 'TikTok', fee: null, basis: 'unknown', views: null })];
  if (Array.isArray(c.profiles) && c.profiles.length) {
    const profiles = orderProfiles(c.profiles.map(normaliseProfile));
    const resolved = resolveMarket(c, [text(c.handle), ...profiles.map(profile => profile.handle)]);
    const platform = canonicalPlatform(String(c.platform ?? '')) ?? text(c.platform || 'TikTok', 40);
    return overlayCatalog({ ...creatorShell(c, packages, text(c.notes)), market: resolved.market, platform, profiles });
  }
  const platform = canonicalPlatform(String(c.platform ?? 'TikTok')) ?? 'TikTok';
  const profiles = orderProfiles([]);
  const primary = profiles.find(profile => profile.platform === platform) ?? profiles[0];
  primary.handle = text(c.handle);
  primary.followers = numberOrNull(c.followers);
  primary.median = numberOrNull(c.median);
  primary.engagement = percentOrNull(c.engagement);
  if (primary.median == null) {
    const fromPackage = packages.find(pkg => pkg.platform === platform && !pkg.paidPromo && pkg.views != null);
    if (fromPackage?.views != null) primary.median = fromPackage.views;
  }
  const resolved = resolveMarket(c, [primary.handle]);
  const countryText = text(c.country);
  const ageText = text(c.age);
  const homes = parseHomeShares(countryText, resolved.market);
  const ages = parseAges(ageText);
  for (const name of PLATFORMS) {
    const profile = profiles.find(item => item.platform === name);
    if (!profile) continue;
    if (homes[name] != null) profile.audience.homeShare = homes[name] ?? null;
    if (ages[name] != null) profile.audience.age25 = ages[name] ?? null;
  }
  if (primary.audience.homeShare == null) primary.audience.homeShare = bareHome(countryText, resolved.market);
  if (primary.audience.age25 == null) primary.audience.age25 = bareAge(ageText);
  const notes = text(c.notes);
  const extra = [
    countryText.trim() ? `Audience country (previous): ${countryText.trim()}` : '',
    ageText.trim() ? `Age 25+ (previous): ${ageText.trim()}` : '',
  ].filter(line => line && !notes.includes(line));
  return overlayCatalog({
    ...creatorShell(c, packages, [notes, ...extra].filter(Boolean).join('\n')),
    market: resolved.market,
    platform,
    profiles,
  });
}

function upgradeCampaign(raw: unknown): Campaign {
  const c = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const markets = defaultMarkets();
  const saved = c.markets;
  if (saved && typeof saved === 'object') {
    for (const market of MARKETS) {
      const row = (saved as Record<string, unknown>)[market];
      if (!row || typeof row !== 'object') continue;
      const record = row as Record<string, unknown>;
      markets[market] = {
        name: text(record.name || markets[market].name),
        target: text(record.target || markets[market].target),
        brief: text(record.brief || markets[market].brief),
      };
    }
  } else {
    markets.Poland = {
      name: text(c.name || markets.Poland.name),
      target: text(c.target || markets.Poland.target),
      brief: text(c.brief || markets.Poland.brief),
    };
  }
  const base = { ...defaultCampaign, ...c, markets } as Campaign;
  const hadMarkets = !!(saved && typeof saved === 'object');
  if (!hadMarkets) {
    const savedName = text(c.name).trim();
    const savedTarget = text(c.target).trim();
    if (!savedName || savedName === 'Poland · Creator pilot' || savedName === 'Three markets · Creator pilot') base.name = ALL_MARKETS_HEADER.name;
    if (!savedTarget || savedTarget === 'Polish-speaking travellers with disrupted flights') base.target = ALL_MARKETS_HEADER.target;
  }
  return base;
}

function upgradeSnapshot(raw: unknown) {
  const s = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    id: text(s.id),
    name: text(s.name),
    date: text(s.date),
    campaign: upgradeCampaign(s.campaign),
    creators: Array.isArray(s.creators) ? s.creators.map(upgradeCreator) : [],
  };
}

/** Upgrade a saved workspace (including pre-multi-platform Poland payloads) before schema validation. */
export function normaliseState(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const state = input as Record<string, unknown>;
  return {
    campaign: upgradeCampaign(state.campaign),
    creators: Array.isArray(state.creators) ? state.creators.map(upgradeCreator) : state.creators,
    snapshots: Array.isArray(state.snapshots) ? state.snapshots.map(upgradeSnapshot) : state.snapshots,
  };
}

export function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || cell === '') quoted = !quoted;
      else throw new Error('Invalid quote in CSV.');
    } else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(item => item.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (quoted) throw new Error('Unclosed quote in CSV.');
  row.push(cell);
  if (row.some(item => item.trim())) rows.push(row);
  return rows;
}

function numeric(s: string | undefined) {
  if (!s?.trim()) return null;
  const n = Number(s.replace(/[, %]/g, ''));
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid non-negative number: ' + s);
  return n;
}

function cellNumber(s: string) {
  const trimmed = s.trim();
  if (!trimmed || /^missing$/i.test(trimmed)) return null;
  const n = Number(trimmed.replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid non-negative number: ' + s);
  return n;
}
function signedNumber(s: string) {
  const trimmed = s.trim();
  if (!trimmed || /^missing$/i.test(trimmed)) return null;
  const n = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function atHandle(handle: string) {
  const trimmed = handle.trim();
  if (!trimmed || /^missing$/i.test(trimmed)) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

function parseBasis(grossNet: string): FeeBasis {
  const value = grossNet.trim();
  if (!value || /^missing$/i.test(value) || /not stated/i.test(value)) return 'unknown';
  if (/personal income tax|tax on top|\bPIT\b/i.test(value)) return 'tax-on-top';
  if (/^\s*net\b/i.test(value) || /\bnetto\b/i.test(value)) return 'net';
  if (/^\s*gross\b/i.test(value) || /\bbrutto\b/i.test(value)) return 'gross';
  return 'unknown';
}

function parseOriginalFee(raw: string) {
  const value = raw.trim();
  if (!value || /^missing$/i.test(value)) return { currency: '', originalAmount: null as number | null, fxRate: null as number | null, fxDate: '' };
  const money = value.match(/([\d][\d\s]*(?:[.,]\d+)?)\s*(PLN|EUR|USD|GBP)\b/i);
  const currency = money?.[2].toUpperCase() ?? '';
  const originalAmount = money ? Number(money[1].replace(/\s/g, '').replace(',', '.')) : null;
  const fx = value.match(/[×x]\s*([\d.]+)/i);
  const fxRate = fx ? Number(fx[1]) : currency === 'PLN' ? 1 : null;
  const fxDate = value.match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1] ?? '';
  return { currency, originalAmount: originalAmount != null && Number.isFinite(originalAmount) ? originalAmount : null, fxRate, fxDate };
}

function keptNote(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^missing$/i.test(trimmed)) return '';
  return trimmed;
}

function importTracker(rows: string[][], headers: string[], source: string): Creator[] {
  const value = (r: string[], key: string) => r[headers.indexOf(key)] ?? '';
  const seen = new Set<string>();
  return rows.filter(r => value(r, 'Handle').trim()).map(r => {
    const get = (key: string) => value(r, key).trim();
    const handle = get('Handle');
    if (seen.has(handle.toLowerCase())) throw new Error('Duplicate creator: ' + handle);
    seen.add(handle.toLowerCase());
    const median = numeric(get('Median views'));
    const basis = get('Currency basis');
    const packages = ['TikTok', 'TikTok +promo', 'IG Reels', 'IG Reels +promo', 'IGS set', 'Bundle offer'].map(name => ({
      name,
      fee: numeric(get(name)),
      basis: basis === 'netto' || basis === 'brutto' ? basis : 'unknown',
      views: name === 'TikTok' ? median : null,
    })).filter(pkg => pkg.fee !== null || pkg.name === 'TikTok');
    const legacy = {
      id: handle.toLowerCase(),
      name: get('Creator'),
      handle,
      platform: get('Platform') || 'TikTok',
      followers: numeric(get('Followers')),
      median,
      engagement: numeric(get('Eng. %')),
      country: get('Stats: top country'),
      age: get('Stats: age 25+'),
      notes: get('Notes'),
      source,
      status: get('Status') || 'Imported',
      story: get('Has own story'),
      packages,
      selected: 0,
      included: false,
      fit: { audience: null, content: null, action: null },
      rationale: 'Imported creator. Review evidence and add your assessment.',
      gaps: 'Verify audience, comparable organic sponsored reach, package scope and results.',
      adjustment: 0,
      extraCost: 0,
      viewsOverride: null,
      actual: { spend: null, visits: null, signed: null, recovered: null, revenue: null, handling: null },
    };
    const creator = upgradeCreator(legacy);
    applyGender(creator.profiles, get('Stats: audience F/M'), canonicalPlatform(creator.platform));
    return CreatorSchema.parse(creator);
  });
}

function columnSource(value: string): AudienceSource {
  if (/creator/i.test(value)) return 'creator';
  if (/api|influencers/i.test(value)) return 'api';
  return '';
}
function splitList(value: string) {
  return value.split(';').map(item => item.trim()).filter(item => item && !/^missing$/i.test(item));
}
function overlayEnrichedColumns(profiles: Profile[], get: (key: string) => string, market: string) {
  for (const [prefix, name] of [['tt', 'TikTok'], ['ig', 'Instagram']] as const) {
    const profile = profiles.find(item => item.platform === name);
    if (!profile) continue;
    const usable = get(`${prefix}_usable`).trim().toLowerCase();
    if (usable === 'no' || usable === 'false') {
      profile.detail.usable = false;
      profile.followers = null;
      profile.median = null;
      profile.average = null;
      profile.engagement = null;
      profile.audience = blankAudience();
      profile.detail.conflicts = splitList(get(`${prefix}_conflicts`)).slice(0, 8);
      continue;
    }
    if (!get(`${prefix}_median_views`) && !get(`${prefix}_followers`) && !get(`${prefix}_handle`)) continue;
    const handle = atHandle(get(`${prefix}_handle`));
    if (handle) profile.handle = handle;
    if (keptNote(get(`${prefix}_url`))) profile.url = get(`${prefix}_url`).trim();
    const followers = cellNumber(get(`${prefix}_followers`));
    const median = cellNumber(get(`${prefix}_median_views`));
    const average = cellNumber(get(`${prefix}_avg_views`));
    const engagement = cellNumber(get(`${prefix}_engagement_rate_pct`));
    if (followers != null) profile.followers = followers;
    if (median != null) profile.median = median;
    if (average != null) profile.average = average;
    if (engagement != null) profile.engagement = engagement;
    const home = cellNumber(get(`${prefix}_home_share_pct`));
    const age = cellNumber(get(`${prefix}_age25_pct`));
    const female = cellNumber(get(`${prefix}_female_pct`));
    const male = cellNumber(get(`${prefix}_male_pct`));
    const homeSource = columnSource(get(`${prefix}_home_share_source`));
    const ageSource = columnSource(get(`${prefix}_age25_source`));
    const genderSource = columnSource(get(`${prefix}_gender_source`));
    if (home != null) profile.audience.homeShare = home;
    if (age != null) profile.audience.age25 = age;
    if (female != null) profile.audience.female = female;
    if (male != null) profile.audience.male = male;
    const conflicts = splitList(get(`${prefix}_conflicts`)).slice(0, 8);
    const apiFrom = (needle: string) => {
      const row = conflicts.find(item => item.toLowerCase().includes(needle));
      const match = row?.match(/API\s+([\d.]+)/i);
      const value = match ? Number(match[1]) : null;
      return value != null && value >= 0 && value <= 100 ? value : null;
    };
    const countries = homeSource === 'creator' && home != null
      ? [{ label: market, pct: home }]
      : splitList(get(`${prefix}_top_countries`)).map(part => {
        const match = part.match(/^(.*)\s([\d.]+)%$/);
        return match ? { label: match[1].trim(), pct: Number(match[2]) } : null;
      }).filter((row): row is { label: string; pct: number } => !!row && row.pct <= 100).slice(0, 5);
    profile.detail = {
      ...profile.detail,
      usable: true,
      picture: keptNote(get(`${prefix}_profile_picture`)) || profile.detail.picture,
      verified: /^(yes|true)$/i.test(get(`${prefix}_verified`)),
      following: cellNumber(get(`${prefix}_following`)),
      posts: cellNumber(get(`${prefix}_posts`)),
      medianLikes: cellNumber(get(`${prefix}_median_likes`)),
      medianComments: cellNumber(get(`${prefix}_median_comments`)),
      medianShares: cellNumber(get(`${prefix}_median_shares`)),
      medianSaves: cellNumber(get(`${prefix}_median_saves`)),
      medianEngagements: cellNumber(get(`${prefix}_median_engagements`)),
      avgLikes: cellNumber(get(`${prefix}_avg_likes`)),
      avgComments: cellNumber(get(`${prefix}_avg_comments`)),
      viewEngagement: cellNumber(get(`${prefix}_view_engagement_rate_pct`)),
      quotedCpm: cellNumber(get(`${prefix}_cpm_pln`)),
      quotedCpe: cellNumber(get(`${prefix}_cpe_pln`)),
      homeSource, ageSource, genderSource,
      countrySource: homeSource === 'creator' ? 'creator' : countries.length ? 'api' : '',
      apiHome: homeSource === 'creator' ? apiFrom('home') : null,
      apiAge25: ageSource === 'creator' ? apiFrom('age') : null,
      apiFemale: genderSource === 'creator' ? apiFrom('female') : null,
      countries,
      credibility: cellNumber(get(`${prefix}_credibility_pct`)),
      suspicious: cellNumber(get(`${prefix}_suspicious_followers_pct`)),
      interests: splitList(get(`${prefix}_audience_interests`)).slice(0, 6).map(label => ({ label, pct: null })),
      brandAffinity: splitList(get(`${prefix}_audience_brand_affinity`)).slice(0, 6).map(label => ({ label, pct: null })),
      growth3m: signedNumber(get(`${prefix}_growth_3m_pct`)),
      growth12m: signedNumber(get(`${prefix}_growth_12m_pct`)),
      postsPerMonth: cellNumber(get(`${prefix}_posts_per_month`)),
      lastPost: keptNote(get(`${prefix}_last_post_date`)),
      niche: keptNote(get(`${prefix}_niche`)),
      category: keptNote(get(`${prefix}_category`)),
      bio: keptNote(get(`${prefix}_bio`)),
      location: keptNote(get(`${prefix}_location`)),
      contactEmail: keptNote(get(`${prefix}_contact_email`)),
      hashtags: splitList(get(`${prefix}_top_hashtags`)).slice(0, 12),
      brandsFound: splitList(get(`${prefix}_brands_found`)).slice(0, 12),
      pastSponsors: splitList(get(`${prefix}_past_sponsors`)).slice(0, 12),
      conflicts,
    };
  }
}

function importShortlist(rows: string[][], headers: string[], source: string): Creator[] {
  const value = (r: string[], key: string) => {
    const index = headers.findIndex(header => header.trim() === key);
    return index >= 0 ? (r[index] ?? '') : '';
  };
  const seen = new Set<string>();
  return rows.filter(r => value(r, 'handle').trim()).map(r => {
    const get = (key: string) => value(r, key).trim();
    const handle = atHandle(get('handle'));
    if (!handle) return null;
    if (seen.has(handle.toLowerCase())) throw new Error('Duplicate creator: ' + handle);
    seen.add(handle.toLowerCase());
    const market = get('country').replace(/\s+/g, ' ').trim();
    if (!isMarket(market)) throw new Error('Unknown market for ' + handle + ': ' + (market || 'blank'));
    const platform = canonicalPlatform(get('platform'));
    if (!platform) throw new Error('Unknown platform for ' + handle + ': ' + get('platform'));
    const profiles = orderProfiles([]);
    const primary = profiles.find(profile => profile.platform === platform)!;
    primary.handle = handle;
    primary.followers = cellNumber(get('followers'));
    primary.median = cellNumber(get('median_views'));
    primary.average = cellNumber(get('avg_views'));
    primary.engagement = cellNumber(get('engagement_pct'));
    const noted = parsePlatformNote(get('platform_note'));
    for (const name of PLATFORMS) {
      const info = noted[name];
      const profile = profiles.find(item => item.platform === name)!;
      if (name === platform) {
        if (info?.handle) profile.handle = atHandle(info.handle);
        continue;
      }
      if (!info) continue;
      profile.handle = info.handle
        ? atHandle(info.handle)
        : (info.followers != null || info.engagement != null || info.median != null ? handle : '');
      profile.followers = info.followers ?? null;
      profile.engagement = info.engagement ?? null;
      profile.median = info.median ?? null;
      profile.average = info.average ?? null;
    }
    const homes = parseHomeShares(get('audience_top_country_pct'), market);
    const ages = parseAges(get('age_25plus_pct'));
    for (const name of PLATFORMS) {
      const profile = profiles.find(item => item.platform === name)!;
      if (homes[name] != null) profile.audience.homeShare = homes[name] ?? null;
      if (ages[name] != null) profile.audience.age25 = ages[name] ?? null;
    }
    applyGender(profiles, get('gender_split'), null);
    const homeNumber = cellNumber(get('home_country_share_pct'));
    if (homeNumber != null) primary.audience.homeShare = homeNumber;
    const feePln = cellNumber(get('fee_pln'));
    const basis = parseBasis(get('gross_net'));
    const original = parseOriginalFee(get('fee_original'));
    const deliverable = keptNote(get('fee_deliverable')) || `1× ${platform}`;
    const primaryPackageRow: Package = {
      name: deliverable,
      fee: feePln,
      basis,
      views: primary.median,
      platform,
      currency: original.currency || (feePln != null ? 'PLN' : ''),
      originalAmount: original.originalAmount,
      fxRate: original.fxRate,
      fxDate: original.fxDate,
      paidPromo: false,
      originalText: keptNote(get('fee_original')),
    };
    const secondaryName = platform === 'TikTok' ? 'Instagram' : 'TikTok';
    const secondary = profiles.find(profile => profile.platform === secondaryName)!;
    const secondaryPackage: Package = {
      name: `1× ${secondaryName}`,
      fee: null,
      basis: 'unknown',
      views: secondary.median,
      platform: secondaryName,
      currency: '',
      originalAmount: null,
      fxRate: null,
      fxDate: '',
      paidPromo: false,
      originalText: '',
    };
    const noteParts = [
      keptNote(get('platform_note')),
      keptNote(get('audience_top_country_pct')) ? `Audience: ${get('audience_top_country_pct').trim()}` : '',
      keptNote(get('gender_split')) ? `Gender: ${get('gender_split').trim()}` : '',
      keptNote(get('age_25plus_pct')) ? `Age 25+: ${get('age_25plus_pct').trim()}` : '',
      keptNote(get('red_flags')) ? `Red flags: ${get('red_flags').trim()}` : '',
      keptNote(get('data_completeness')) ? `Completeness: ${get('data_completeness').trim()}` : '',
      keptNote(get('replied')) ? `Replied: ${get('replied').trim()}` : '',
      keptNote(get('metrics_source')) ? `Metrics: ${get('metrics_source').trim()}` : '',
    ].filter(Boolean);
    const redFlags = keptNote(get('red_flags'));
    if (headers.includes('tt_median_views')) overlayEnrichedColumns(profiles, get, market);
    return CreatorSchema.parse({
      id: handle.toLowerCase(),
      name: get('name'),
      handle,
      market,
      platform,
      profiles,
      notes: noteParts.join('\n\n').slice(0, 12000),
      source: [source, keptNote(get('row_source'))].filter(Boolean).join(' · '),
      status: keptNote(get('status')) || 'Imported',
      story: '',
      packages: [primaryPackageRow, secondaryPackage],
      selected: 0,
      included: false,
      fit: { audience: null, content: null, action: null },
      rationale: 'Imported from the Winglex shortlist. Review the evidence before using this creator in a forecast.',
      gaps: redFlags || 'Verify audience, comparable organic sponsored reach, package scope and results.',
      adjustment: 0,
      extraCost: 0,
      viewsOverride: null,
      actual: { spend: null, visits: null, signed: null, recovered: null, revenue: null, handling: null },
    });
  }).filter((creator): creator is Creator => creator != null);
}

export function importCreators(text: string, source: string): Creator[] {
  const rows = parseCSV(text.replace(/^\uFEFF/, ''));
  const headers = rows.shift()?.map(header => header.trim()) ?? [];
  if (headers.includes('platform_note') && headers.includes('handle')) return importShortlist(rows, headers, source);
  if (headers.includes('Handle') && headers.includes('Creator')) return importTracker(rows, headers, source);
  throw new Error('Use the shortlist CSV (handle, platform_note) or the tracker CSV (Creator, Handle).');
}

export function importOutcomes(text: string, creators: Creator[]) {
  const rows = parseCSV(text.replace(/^\uFEFF/, ''));
  const h = rows.shift() ?? [];
  const keys = ['Handle', 'Spend PLN', 'Visits', 'Signed passengers', 'Recovered passengers', 'Fee income PLN', 'Handling costs PLN'];
  if (keys.some(k => !h.includes(k))) throw new Error('Use the outcomes template headers.');
  const seen = new Set<string>();
  const updates = new Map<string, Creator['actual']>();
  for (const r of rows) {
    const v = (key: string) => r[h.indexOf(key)] ?? '';
    const handle = v('Handle').trim().toLowerCase();
    if (!handle) continue;
    if (seen.has(handle)) throw new Error('Duplicate outcome row: ' + handle);
    seen.add(handle);
    if (!creators.some(c => c.handle.toLowerCase() === handle)) throw new Error('Unknown creator: ' + handle);
    const actual = {
      spend: numeric(v('Spend PLN')),
      visits: numeric(v('Visits')),
      signed: numeric(v('Signed passengers')),
      recovered: numeric(v('Recovered passengers')),
      revenue: numeric(v('Fee income PLN')),
      handling: numeric(v('Handling costs PLN')),
    };
    if (actual.recovered != null && actual.signed != null && actual.recovered > actual.signed) throw new Error('Recovered passengers exceed signed passengers: ' + handle);
    updates.set(handle, actual);
  }
  if (!updates.size) throw new Error('No outcomes found.');
  return { creators: creators.map(c => ({ ...c, actual: updates.get(c.handle.toLowerCase()) ?? c.actual })), count: updates.size };
}

export function csvCell(value: unknown) {
  let s = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
