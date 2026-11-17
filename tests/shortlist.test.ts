import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importCreators, mergeCreators, profileUrl, safeHttpUrl, quoteMetrics, strongerPlatform, StateSchema, defaultCampaign } from '../lib/model.ts';
import { shortlistCsv } from '../lib/shortlist-csv.ts';

const creators = importCreators(shortlistCsv, 'shortlist_summary.csv · 2026-11-17');
const byHandle = (handle: string) => {
  const creator = creators.find(item => item.handle === handle);
  assert.ok(creator, handle);
  return creator;
};
const platform = (handle: string, name: 'TikTok' | 'Instagram') => {
  const creator = byHandle(handle);
  const profile = creator.profiles.find(item => item.platform === name);
  assert.ok(profile, `${handle} ${name}`);
  return { creator, profile };
};

test('seed and imported markets survive a second validation', () => {
  const state = StateSchema.parse({ campaign: defaultCampaign, creators, snapshots: [] });
  assert.deepEqual(state.creators.map(item => item.market), creators.map(item => item.market));
  const again = StateSchema.parse(JSON.parse(JSON.stringify(state)));
  assert.equal(again.creators.filter(item => item.market === 'Serbia').length, 7);
  assert.equal(again.creators.filter(item => item.market === 'North Macedonia').length, 7);
  const matched = StateSchema.parse({
    campaign: defaultCampaign,
    snapshots: [],
    creators: [{ id: '@tragom_horizonta', name: 'Tragom', handle: '@tragom_horizonta', platform: 'TikTok', followers: 10, median: 20, engagement: 1, country: '', age: '', notes: 'keep', source: '', status: 'Sent', story: '', packages: [{ name: 'TikTok', fee: null, basis: 'unknown', views: 20 }], selected: 0, included: false, fit: { audience: null, content: null, action: null }, rationale: 'keep', gaps: '', adjustment: 0, extraCost: 0, viewsOverride: null, actual: { spend: null, visits: null, signed: null, recovered: null, revenue: null, handling: null } }],
  });
  assert.equal(matched.creators[0].market, 'Serbia');
  assert.equal(matched.creators[0].profiles.find(item => item.platform === 'Instagram')?.audience.homeShare, 70.6);
  assert.equal(matched.creators[0].profiles.find(item => item.platform === 'Instagram')?.detail.homeSource, 'creator');
  assert.ok(matched.creators[0].profiles.find(item => item.platform === 'Instagram')?.detail.conflicts.some(item => item.includes('API 21')));
  const unknown = StateSchema.parse({
    campaign: defaultCampaign,
    snapshots: [],
    creators: [{ id: '@nobody_xyz', name: 'Nobody', handle: '@nobody_xyz', platform: 'TikTok', followers: 10, median: 20, engagement: 1, country: '', age: '', notes: '', source: '', status: '', story: '', packages: [{ name: 'TikTok', fee: null, basis: 'unknown', views: 20 }], selected: 0, included: false, fit: { audience: null, content: null, action: null }, rationale: '', gaps: '', adjustment: 0, extraCost: 0, viewsOverride: null, actual: { spend: null, visits: null, signed: null, recovered: null, revenue: null, handling: null } }],
  });
  assert.equal(unknown.creators[0].market, 'Poland');
});

function legacyCreator(handle: string, name: string) {
  return { id: handle, name, handle, platform: 'TikTok', followers: 10, median: 20, engagement: 1, country: '', age: '', notes: '', source: '', status: '', story: '', packages: [{ name: 'TikTok', fee: null, basis: 'unknown', views: 20 }], selected: 0, included: false, fit: { audience: null, content: null, action: null }, rationale: '', gaps: '', adjustment: 0, extraCost: 0, viewsOverride: null, actual: { spend: null, visits: null, signed: null, recovered: null, revenue: null, handling: null } };
}

test('creator audience is the displayed figure and the API is only a fallback', () => {
  const emm = StateSchema.parse({ campaign: defaultCampaign, snapshots: [], creators: [legacyCreator('@emmvvandera', 'Emm')] }).creators[0];
  const ig = emm.profiles.find(item => item.platform === 'Instagram');
  assert.ok(ig);
  assert.equal(ig.audience.homeShare, 63.1);
  assert.equal(ig.detail.homeSource, 'creator');
  assert.deepEqual(ig.detail.countries.map(item => item.label), ['North Macedonia']);
  assert.equal(ig.detail.ageBands.length, 0);
  assert.equal(ig.audience.age25, 94.9);
  assert.equal(ig.detail.ageSource, 'creator');
  assert.equal(ig.audience.female, 60.2);
  assert.equal(ig.detail.genderSource, 'creator');
  assert.ok(ig.detail.conflicts.some(item => item.includes('API 5.7')));
  assert.equal(ig.detail.apiHome, 5.7);
  const holiday = StateSchema.parse({ campaign: defaultCampaign, snapshots: [], creators: [legacyCreator('@holiday.stop', 'Holiday')] }).creators[0];
  const tt = holiday.profiles.find(item => item.platform === 'TikTok');
  assert.ok(tt);
  assert.equal(tt.detail.homeSource, 'api');
  assert.equal(tt.audience.homeShare, 91.4);
  assert.equal(tt.detail.ageSource, 'creator');
  assert.equal(tt.audience.age25, 82.8);
  assert.equal(tt.detail.ageBands.length, 0);
  const covek = StateSchema.parse({ campaign: defaultCampaign, snapshots: [], creators: [legacyCreator('@1covek', 'Covek')] }).creators[0];
  const covekTt = covek.profiles.find(item => item.platform === 'TikTok');
  assert.equal(covekTt?.detail.usable, false);
  assert.equal(covekTt?.followers, null);
  assert.equal(covek.market, 'North Macedonia');
});

test('enriched CSV keeps creator audience and a secondary TikTok median', () => {
  const text = readFileSync(new URL('../lib/data/creators-enriched.csv', import.meta.url), 'utf8');
  const rows = importCreators(text, 'creators_enriched.csv');
  assert.equal(rows.length, 22);
  assert.equal(rows.filter(item => item.market === 'Serbia').length, 7);
  assert.equal(rows.filter(item => item.market === 'North Macedonia').length, 7);
  const ig = rows.find(item => item.handle === '@emmvvandera')?.profiles.find(item => item.platform === 'Instagram');
  assert.equal(ig?.audience.homeShare, 63.1);
  assert.equal(ig?.detail.homeSource, 'creator');
  assert.deepEqual(ig?.detail.countries.map(item => item.label), ['North Macedonia']);
  assert.equal(ig?.detail.apiHome, 5.7);
  const luta = rows.find(item => item.handle === '@lutajuci_putnik');
  assert.equal(luta?.market, 'Serbia');
  assert.equal(luta?.profiles.find(item => item.platform === 'TikTok')?.median, 21853.5);
  assert.equal(luta?.profiles.find(item => item.platform === 'Instagram')?.median, 175442);
});

test('shortlist CSV imports 22 creators across three markets', () => {
  assert.equal(creators.length, 22);
  assert.equal(creators.filter(item => item.market === 'Poland').length, 8);
  assert.equal(creators.filter(item => item.market === 'Serbia').length, 7);
  assert.equal(creators.filter(item => item.market === 'North Macedonia').length, 7);
  assert.equal(creators.filter(item => item.platform === 'TikTok').length, 18);
  assert.equal(creators.filter(item => item.platform === 'Instagram').length, 4);
  for (const creator of creators) {
    assert.equal(creator.profiles.length >= 2, true);
    assert.ok(creator.notes.length <= 12000);
    assert.equal(creator.profiles.some(item => [item.followers, item.median, item.engagement, item.audience.homeShare].some(value => typeof value === 'string')), false);
  }
});

test('primary metrics, secondary profiles, fees and audience stay on the right platform', () => {
  const swiat = platform('@swiatnaczterystopy', 'TikTok');
  const swiatIg = platform('@swiatnaczterystopy', 'Instagram');
  assert.equal(swiat.profile.followers, 58235);
  assert.equal(swiat.profile.median, 20944);
  assert.equal(swiat.profile.engagement, 4.22);
  assert.equal(swiat.profile.audience.homeShare, 86.1);
  assert.equal(swiat.profile.audience.age25, 87.8);
  assert.deepEqual(
    { female: swiat.profile.audience.female, male: swiat.profile.audience.male, other: swiat.profile.audience.other },
    { female: 47, male: 52, other: 1 },
  );
  assert.equal(swiatIg.profile.handle, '@swiatnaczterystopy');
  assert.equal(swiatIg.profile.followers, 30845);
  assert.equal(swiatIg.profile.engagement, 0.82);
  assert.equal(swiatIg.profile.median, null);
  assert.equal(swiatIg.profile.audience.age25, 94.7);
  assert.equal(swiatIg.profile.audience.female, 59);
  assert.equal(swiatIg.profile.audience.male, 41);
  assert.equal(swiatIg.profile.audience.other, null);
  assert.equal(swiat.creator.packages[0].basis, 'net');
  assert.equal(swiat.creator.packages[0].currency, 'PLN');
  assert.equal(swiat.creator.packages[0].originalAmount, 1500);
  assert.equal(swiat.creator.packages[0].paidPromo, false);
  assert.ok(Math.abs((quoteMetrics(swiat.creator, 'TikTok').cpm ?? 0) - 71.6) < 0.05);
  const swiatCpe = quoteMetrics(swiat.creator, 'TikTok');
  assert.ok(swiatCpe.engagements != null && Math.abs(swiatCpe.engagements - (4.22 / 100 * 20944)) < 1e-6);
  assert.equal(swiatCpe.cpe, swiatCpe.netFee! / swiatCpe.engagements!);

  const holiday = platform('@holiday.stop', 'TikTok');
  const holidayIg = platform('@holiday.stop', 'Instagram');
  assert.equal(holiday.profile.audience.homeShare, null);
  assert.equal(holidayIg.profile.audience.homeShare, 93.5);
  assert.equal(holiday.profile.audience.female, 76);
  assert.equal(holiday.profile.audience.male, 24);
  assert.equal(holidayIg.profile.followers, 51716);
  assert.equal(holidayIg.profile.engagement, 0.02);
  assert.equal(holiday.creator.packages[0].basis, 'gross');
  assert.equal(quoteMetrics(holiday.creator, 'TikTok').cpm, null);
  assert.match(quoteMetrics(holiday.creator, 'TikTok').unavailable, /Gross/);
  assert.match(holiday.creator.packages[0].originalText, /brutto/);

  const tragom = platform('@tragom_horizonta', 'TikTok');
  const tragomIg = platform('@tragom_horizonta', 'Instagram');
  assert.equal(tragom.creator.market, 'Serbia');
  assert.equal(tragom.creator.packages[0].basis, 'net');
  assert.equal(tragom.creator.packages[0].currency, 'EUR');
  assert.equal(tragom.creator.packages[0].originalAmount, 249);
  assert.equal(tragom.creator.packages[0].fxRate, 4.403);
  assert.equal(tragom.creator.packages[0].fxDate, '2026-11-16');
  assert.equal(tragom.profile.audience.homeShare, 52.8);
  assert.equal(tragomIg.profile.audience.homeShare, 70.6);
  assert.equal(tragomIg.profile.followers, 77629);
  assert.equal(tragomIg.profile.engagement, 1.74);
  assert.equal(tragomIg.profile.audience.female, 69.8);
  assert.ok(Math.abs((quoteMetrics(tragom.creator, 'TikTok').cpm ?? 0) - 14.2) < 0.05);

  const krzheska = byHandle('@krzheska');
  assert.equal(krzheska.market, 'North Macedonia');
  assert.equal(krzheska.packages[0].basis, 'tax-on-top');
  assert.equal(krzheska.packages[0].paidPromo, false);
  assert.equal(krzheska.packages[0].originalAmount, 300);
  assert.equal(krzheska.packages[0].currency, 'EUR');
  assert.equal(quoteMetrics(krzheska, 'TikTok').cpm, null);
  assert.match(quoteMetrics(krzheska, 'TikTok').unavailable, /Tax on top/);

  const lutajuci = platform('@lutajuci_putnik', 'Instagram');
  const lutajuciTt = platform('@lutajuci_putnik', 'TikTok');
  assert.equal(lutajuci.creator.platform, 'Instagram');
  assert.equal(lutajuci.profile.followers, 198167);
  assert.equal(lutajuci.profile.median, 175365);
  assert.equal(lutajuci.profile.audience.homeShare, 65.5);
  assert.equal(lutajuciTt.profile.followers, 24606);
  assert.equal(lutajuciTt.profile.engagement, 5.61);
  assert.equal(lutajuci.creator.packages[0].fee, null);

  const letsfly = platform('@letsfly_pl', 'TikTok');
  assert.equal(letsfly.profile.audience.age25, null);
  assert.equal(letsfly.profile.followers, 86200);
  assert.match(letsfly.creator.notes, /60% over 25/);

  const emm = platform('@emmvvandera', 'TikTok');
  const emmIg = platform('@emmvvandera', 'Instagram');
  assert.equal(emm.profile.handle, '@warawara2_');
  assert.equal(emm.profile.audience.homeShare, null);
  assert.equal(emm.creator.packages[0].basis, 'gross');
  assert.equal(emmIg.profile.handle, '@emmvvandera');
  assert.equal(emmIg.profile.followers, 75828);
  assert.equal(emmIg.profile.engagement, 2.74);
  assert.equal(emmIg.profile.median, 156597);
  assert.equal(emmIg.profile.average, 172050);
  assert.equal(emmIg.profile.audience.homeShare, 63.1);
  assert.equal(emmIg.profile.audience.age25, 94.9);
  assert.equal(strongerPlatform(emm.creator), 'Instagram');

  const gospodin = platform('@gospodinsaizuzetnogputa', 'Instagram');
  assert.equal(gospodin.creator.packages[0].basis, 'unknown');
  assert.equal(quoteMetrics(gospodin.creator, 'TikTok').cpm, null);
  assert.match(quoteMetrics(gospodin.creator, 'TikTok').unavailable, /unknown/i);
  assert.equal(gospodin.profile.followers, 63967);
  assert.equal(gospodin.profile.handle, '@gospodinsaizuzetnogputa');
  assert.equal(gospodin.profile.audience.homeShare, 55.9);
  assert.equal(gospodin.profile.audience.age25, 97.7);

  const ema = platform('@paunovicema', 'TikTok');
  const emaIg = platform('@paunovicema', 'Instagram');
  assert.equal(ema.profile.handle, '@paunovicemaa');
  assert.equal(emaIg.profile.handle, '@paunovicema');
  assert.equal(emaIg.profile.followers, 89586);
  assert.equal(emaIg.profile.median, 92709);
  assert.equal(emaIg.profile.average, 104012);
  assert.equal(strongerPlatform(ema.creator), 'Instagram');

  const evce = platform('@_evce_', 'TikTok');
  const evceIg = platform('@_evce_', 'Instagram');
  assert.equal(evce.profile.handle, '@evajovanovska');
  assert.equal(evceIg.profile.handle, '@_evce_');
  assert.equal(evceIg.profile.followers, 37799);
  assert.equal(evceIg.profile.engagement, 3.73);
  assert.equal(evce.creator.packages[0].originalAmount, 900);
  assert.equal(evce.creator.packages[0].basis, 'unknown');
  assert.equal(evce.profile.audience.homeShare, 93.7);
  assert.equal(evce.profile.audience.other, 2);
  assert.equal(evceIg.profile.audience.age25, 82.3);

  const covek = platform('@1covek', 'TikTok');
  assert.equal(covek.creator.platform, 'Instagram');
  assert.equal(covek.profile.handle, '@1covek');
  assert.equal(covek.profile.followers, 5);
  assert.equal(covek.creator.profiles.find(item => item.platform === 'Instagram')?.followers, 33020);

  const whisper = platform('@whisper.ves', 'TikTok');
  assert.equal(whisper.profile.handle, '');
  assert.equal(whisper.profile.followers, null);
  assert.equal(platform('@whisper.ves', 'Instagram').profile.audience.female, 73.9);

  const karolina = platform('@podroze_za_grosze', 'Instagram');
  assert.equal(karolina.profile.handle, '@karosienkiewicz');
  assert.equal(karolina.profile.followers, 862);
  assert.equal(karolina.profile.engagement, 0);

  assert.equal(profileUrl('TikTok', '@warawara2_', ''), 'https://www.tiktok.com/@warawara2_');
  assert.equal(profileUrl('Instagram', '@emmvvandera', ''), 'https://www.instagram.com/emmvvandera/');
  assert.equal(profileUrl('TikTok', '@evajovanovska', 'https://www.tiktok.com/@custom'), 'https://www.tiktok.com/@custom');
  assert.equal(safeHttpUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpUrl('https://www.instagram.com/emmvvandera/'), 'https://www.instagram.com/emmvvandera/');
});

test('shortlist import merges by handle and keeps assessments', () => {
  const current = structuredClone(byHandle('@swiatnaczterystopy'));
  current.included = true;
  current.rationale = 'Keep the assessment';
  current.gaps = 'Keep the question';
  current.story = 'Yes';
  current.profiles = current.profiles.map(item => item.platform === 'TikTok' ? { ...item, url: 'https://www.tiktok.com/@edited' } : item);
  const incoming = importCreators(shortlistCsv, 'again.csv');
  const merged = mergeCreators([current], incoming);
  assert.equal(merged.length, 22);
  const updated = merged.find(item => item.handle === '@swiatnaczterystopy');
  assert.ok(updated);
  assert.equal(updated.id, current.id);
  assert.equal(updated.included, true);
  assert.equal(updated.rationale, 'Keep the assessment');
  assert.equal(updated.gaps, 'Keep the question');
  assert.equal(updated.story, 'Yes');
  assert.equal(updated.profiles.find(item => item.platform === 'TikTok')?.url, 'https://www.tiktok.com/@edited');
  assert.equal(updated.profiles.find(item => item.platform === 'TikTok')?.median, 20944);
  assert.throws(() => importCreators('handle,name,country,platform,platform_note\n@a,A,Poland,TikTok,\n@a,B,Poland,TikTok,', 'dup'));
});
