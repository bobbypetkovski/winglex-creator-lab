import { enrichedCreators } from './data/enriched-creators.ts';

export type AudienceSource = '' | 'creator' | 'api';

export type CatalogProfile = {
  handle: string;
  url: string;
  usable: boolean | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  median: number | null;
  average: number | null;
  engagement: number | null;
  viewEngagement: number | null;
  picture: string;
  verified: boolean;
  audience: { homeShare: number | null; age25: number | null; female: number | null; male: number | null; other: number | null };
  homeSource: AudienceSource;
  ageSource: AudienceSource;
  genderSource: AudienceSource;
  countrySource: AudienceSource;
  ageBandSource: AudienceSource;
  apiHome: number | null;
  apiAge25: number | null;
  apiFemale: number | null;
  apiMale: number | null;
  countries: { label: string; pct: number }[];
  ageBands: { label: string; pct: number }[];
  conflicts: string[];
  credibility: number | null;
  suspicious: number | null;
  interests: { label: string; pct: number | null }[];
  brandAffinity: { label: string; pct: number | null }[];
  growth3m: number | null;
  growth12m: number | null;
  postsPerMonth: number | null;
  lastPost: string;
  niche: string;
  category: string;
  bio: string;
  location: string;
  language: string;
  contactEmail: string;
  hashtags: string[];
  brandsFound: string[];
  pastSponsors: string[];
  incomeMin: number | null;
  incomeMax: number | null;
  recentPosts: { date: string; url: string; views: number | null; likes: number | null; comments: number | null; shares: number | null }[];
  medianNote: string;
  quotedCpm: number | null;
  quotedCpe: number | null;
};

type Raw = Record<string, unknown>;
function obj(value: unknown): Raw {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Raw : {};
}
function arr(value: unknown): Raw[] {
  return Array.isArray(value) ? value.filter((item): item is Raw => !!item && typeof item === 'object' && !Array.isArray(item)) : [];
}
function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function norm(handle: string | null | undefined) {
  return String(handle ?? '').trim().toLowerCase().replace(/^@+/, '');
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'missing') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pct(value: unknown): number | null {
  const n = num(value);
  return n != null && n >= 0 && n <= 100 ? n : null;
}

const index = new Map<string, Raw>();
for (const record of enrichedCreators as Raw[]) {
  const add = (handle: unknown) => {
    const key = norm(typeof handle === 'string' ? handle : '');
    if (key && !index.has(key)) index.set(key, record);
  };
  add(record.handle);
  add(record.listed_handle);
  const platforms = obj(record.platforms);
  for (const platform of [obj(platforms.tiktok), obj(platforms.instagram)]) {
    add(platform.handle);
    for (const alt of arr(platform.alt_profiles)) add(alt.handle);
  }
}

export function findEnriched(handle: string): Raw | null {
  return index.get(norm(handle)) ?? null;
}

export function marketForHandle(handle: string): 'Poland' | 'Serbia' | 'North Macedonia' | null {
  const market = findEnriched(handle)?.market;
  return market === 'Poland' || market === 'Serbia' || market === 'North Macedonia' ? market : null;
}

function choose(creatorValue: number | null, apiValue: number | null, label: string, creatorWins: boolean) {
  if (creatorWins) {
    const conflict = creatorValue != null && apiValue != null && Math.abs(creatorValue - apiValue) > 10;
    return {
      value: creatorValue,
      source: 'creator' as AudienceSource,
      api: apiValue,
      conflict: conflict ? `${label}: creator ${creatorValue}% vs API ${apiValue}%` : '',
    };
  }
  if (apiValue != null) return { value: apiValue, source: 'api' as AudienceSource, api: null, conflict: '' };
  return { value: null, source: '' as AudienceSource, api: null, conflict: '' };
}

export function profileFromRaw(input: unknown, market: string): CatalogProfile | null {
  const raw = obj(input);
  if (input == null || raw.found === false) {
    return {
      handle: '', url: '', usable: false, followers: null, following: null, posts: null, median: null, average: null,
      engagement: null, viewEngagement: null, picture: '', verified: false,
      audience: { homeShare: null, age25: null, female: null, male: null, other: null },
      homeSource: '', ageSource: '', genderSource: '', countrySource: '', ageBandSource: '',
      apiHome: null, apiAge25: null, apiFemale: null, apiMale: null, countries: [], ageBands: [], conflicts: [],
      credibility: null, suspicious: null, interests: [], brandAffinity: [], growth3m: null, growth12m: null,
      postsPerMonth: null, lastPost: '', niche: '', category: '', bio: '', location: '', language: '', contactEmail: '',
      hashtags: [], brandsFound: [], pastSponsors: [], incomeMin: null, incomeMax: null, recentPosts: [], medianNote: '',
      quotedCpm: null, quotedCpe: null,
    };
  }
  const creator = obj(raw.audience_creator_provided);
  const api = obj(raw.audience_api);
  const home = choose(pct(creator.home), pct(api.home_share), 'Home share', pct(creator.home) != null);
  const age = choose(pct(creator.age25), pct(api.age25), 'Age 25+', pct(creator.age25) != null);
  const creatorGender = pct(creator.female) != null || pct(creator.male) != null || pct(creator.other) != null;
  const female = choose(pct(creator.female), pct(api.female), 'Female share', creatorGender);
  const countries = home.source === 'creator' && home.value != null
    ? [{ label: market, pct: home.value }]
    : arr(api.country_split).slice(0, 5).map(row => ({ label: String(row.country ?? ''), pct: pct(row.pct) ?? 0 })).filter(row => row.label);
  const ageSplit = obj(api.age_split);
  const ageBands = age.source === 'creator'
    ? []
    : Object.entries(ageSplit).map(([label, value]) => ({ label, pct: pct(value) ?? 0 }));
  const conflicts = [home.conflict, age.conflict, female.conflict].filter(Boolean);
  const growth = obj(raw.follower_growth_pct);
  return {
    handle: String(raw.handle ?? ''),
    url: String(raw.url ?? ''),
    usable: raw.usable === false ? false : true,
    followers: num(raw.followers),
    following: num(raw.following),
    posts: num(raw.posts),
    median: num(raw.median_views),
    average: num(raw.avg_views),
    engagement: pct(raw.engagement_rate_pct),
    viewEngagement: pct(raw.view_engagement_rate_pct),
    picture: String(raw.profile_picture ?? ''),
    verified: raw.verified === true,
    audience: {
      homeShare: home.value,
      age25: age.value,
      female: female.value,
      male: creatorGender ? pct(creator.male) : pct(api.male),
      other: creatorGender ? pct(creator.other) : null,
    },
    homeSource: home.source,
    ageSource: age.source,
    genderSource: female.source,
    countrySource: home.source === 'creator' ? 'creator' : countries.length ? 'api' : '',
    ageBandSource: ageBands.length ? 'api' : '',
    apiHome: home.source === 'creator' ? pct(api.home_share) : null,
    apiAge25: age.source === 'creator' ? pct(api.age25) : null,
    apiFemale: female.source === 'creator' ? pct(api.female) : null,
    apiMale: female.source === 'creator' ? pct(api.male) : null,
    countries,
    ageBands,
    conflicts,
    credibility: pct(api.credibility_pct),
    suspicious: pct(api.suspicious_followers_pct),
    interests: arr(api.audience_interests).slice(0, 6).map(row => ({ label: String(row.name ?? ''), pct: pct(row.pct) })),
    brandAffinity: arr(api.audience_brand_affinity).slice(0, 6).map(row => ({ label: String(row.name ?? ''), pct: pct(row.pct) })),
    growth3m: num(growth['3_months_ago']),
    growth12m: num(growth['12_months_ago']),
    postsPerMonth: num(raw.posts_per_month_recent),
    lastPost: String(raw.most_recent_post_date ?? ''),
    niche: Array.isArray(raw.niche) ? raw.niche.map(String).join(', ') : String(raw.niche ?? ''),
    category: String(raw.category ?? ''),
    bio: String(raw.bio ?? ''),
    location: String(raw.location ?? ''),
    language: Array.isArray(raw.language) ? raw.language.map(String).join(', ') : String(raw.language ?? ''),
    contactEmail: String(raw.contact_email ?? ''),
    hashtags: list(raw.hashtags).slice(0, 12).map(String),
    brandsFound: list(raw.brands_found).slice(0, 12).map(String),
    pastSponsors: list(raw.past_sponsors).slice(0, 12).map(String),
    incomeMin: num(obj(raw.income_estimate_usd).min),
    incomeMax: num(obj(raw.income_estimate_usd).max),
    recentPosts: arr(raw.recent_posts).slice(0, 12).map(post => ({
      date: String(post.date ?? ''), url: String(post.url ?? ''), views: num(post.views), likes: num(post.likes), comments: num(post.comments), shares: num(post.shares),
    })),
    medianNote: String(raw.median_views_note ?? ''),
    quotedCpm: num(raw.cpm_pln),
    quotedCpe: num(raw.cpe_pln),
  };
}

function basisOf(value: string) {
  const text = value.trim().toLowerCase();
  if (!text || text === 'missing' || /not stated/.test(text)) return 'unknown';
  if (/personal income tax|tax on top|\bpit\b/.test(text)) return 'tax-on-top';
  if (/^\s*net\b/.test(text) || text.includes('netto')) return 'net';
  if (/^\s*gross\b/.test(text) || text.includes('brutto')) return 'gross';
  return 'unknown';
}

export function seedCreatorRecords() {
  return (enrichedCreators as Raw[]).map(record => {
    const market = record.market === 'Serbia' || record.market === 'North Macedonia' ? record.market : 'Poland';
    const primary = record.primary_platform === 'Instagram' ? 'Instagram' : 'TikTok';
    const platforms = obj(record.platforms);
    const tiktok = profileFromRaw(platforms.tiktok, market);
    const instagram = profileFromRaw(platforms.instagram, market);
    const commercial = obj(record.commercial);
    const fee = num(commercial.fee_pln);
    const original = text(commercial.fee_original);
    const money = original.match(/([\d][\d\s]*(?:[.,]\d+)?)\s*(PLN|EUR|USD|GBP)/i);
    const currency = money?.[2]?.toUpperCase() ?? (fee != null ? 'PLN' : '');
    const primaryProfile = primary === 'Instagram' ? instagram : tiktok;
    const deliverable = text(commercial.fee_deliverable);
    const packageName = deliverable && deliverable !== 'missing' ? deliverable : `1× ${primary}`;
    const notes = [text(commercial.red_flags), text(commercial.data_completeness)].filter(part => part && part !== 'missing').join('\n\n');
    const status = text(commercial.status);
    const flags = text(commercial.red_flags);
    return {
      id: String(record.handle).toLowerCase(),
      name: String(record.name ?? ''),
      handle: String(record.handle ?? ''),
      market,
      platform: primary,
      contactEmail: String(record.contact_email ?? ''),
      profiles: [
        { platform: 'TikTok', mapped: tiktok },
        { platform: 'Instagram', mapped: instagram },
      ],
      notes,
      source: 'influencers.club full enrichment · 17 November 2026',
      status: status && status !== 'missing' ? status : 'Imported',
      story: '',
      packages: [
        {
          name: packageName, fee, basis: basisOf(text(commercial.gross_net)), views: primaryProfile?.usable === false ? null : primaryProfile?.median ?? null,
          platform: primary, currency, originalAmount: money ? Number(money[1].replace(/\s/g, '').replace(',', '.')) : null,
          fxRate: currency === 'EUR' ? 4.403 : currency === 'PLN' && fee != null ? 1 : null,
          fxDate: currency === 'EUR' ? '2026-11-16' : '', paidPromo: false,
          originalText: original && original !== 'missing' ? original : '',
        },
        {
          name: `1× ${primary === 'TikTok' ? 'Instagram' : 'TikTok'}`, fee: null, basis: 'unknown',
          views: (primary === 'TikTok' ? instagram : tiktok)?.median ?? null,
          platform: primary === 'TikTok' ? 'Instagram' : 'TikTok', currency: '', originalAmount: null, fxRate: null, fxDate: '', paidPromo: false, originalText: '',
        },
      ],
      selected: 0, included: false, fit: { audience: null, content: null, action: null },
      rationale: 'Imported from the enriched shortlist. Creator-supplied audience figures are shown when they exist; API figures fill the gaps.',
      gaps: flags && flags !== 'missing' ? flags : 'Review audience source, reach and package scope.',
      adjustment: 0, extraCost: 0, viewsOverride: null,
      actual: { spend: null, visits: null, signed: null, recovered: null, revenue: null, handling: null },
    };
  });
}
