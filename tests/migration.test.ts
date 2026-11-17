import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { StateSchema, normaliseState, quoteMetrics, type State } from '../lib/model.ts';

const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-seed-state.json', import.meta.url), 'utf8'));

function profile(state: State, handle: string, platform: string) {
  const creator = state.creators.find(item => item.handle === handle);
  assert.ok(creator, handle);
  const found = creator.profiles.find(item => item.platform === platform);
  assert.ok(found, platform);
  return { creator, profile: found };
}

test('legacy Poland seed payload migrates without dropping creator content', () => {
  const sample = structuredClone(legacy);
  sample.creators[0].included = true;
  sample.creators[0].fit = { audience: 80, content: 70, action: 60 };
  sample.creators[0].adjustment = 15;
  sample.creators[0].extraCost = 25;
  sample.creators[0].viewsOverride = 5000;
  sample.creators[0].rationale = 'Keep this rationale';
  sample.creators[0].gaps = 'Keep this gap';
  sample.creators[0].actual = { spend: 10, visits: 3, signed: 2, recovered: 1, revenue: 9, handling: 4 };
  sample.snapshots = [{
    id: 'snap-1',
    name: 'September pilot',
    date: '2026-09-01T00:00:00.000Z',
    campaign: structuredClone(sample.campaign),
    creators: [structuredClone(sample.creators[1])],
  }];

  const parsed = StateSchema.parse(sample);
  const again = StateSchema.parse(JSON.parse(JSON.stringify(parsed)));
  assert.deepEqual(again, parsed);
  assert.deepEqual(StateSchema.parse(normaliseState(parsed)), parsed);

  assert.equal(parsed.creators.length, 8);
  assert.equal(parsed.campaign.name, 'Poland · Creator pilot');
  assert.equal(parsed.campaign.target, 'Polish-speaking travellers with disrupted flights');
  assert.equal(parsed.campaign.fee, 400);
  assert.equal(parsed.campaign.markets.Poland.name, 'Poland · Creator pilot');
  assert.equal(parsed.campaign.markets.Poland.target, 'Polish-speaking travellers with disrupted flights');
  assert.match(parsed.campaign.markets.Serbia.target, /Serbian-speaking/);
  assert.match(parsed.campaign.markets['North Macedonia'].target, /Macedonian-speaking/);

  const holiday = profile(parsed, '@holiday.stop', 'TikTok');
  assert.equal(holiday.creator.market, 'Poland');
  assert.equal(holiday.creator.platform, 'TikTok');
  assert.equal(holiday.creator.included, true);
  assert.equal(holiday.creator.rationale, 'Keep this rationale');
  assert.equal(holiday.creator.gaps, 'Keep this gap');
  assert.equal(holiday.creator.story, 'Yes');
  assert.equal(holiday.creator.adjustment, 15);
  assert.equal(holiday.creator.extraCost, 25);
  assert.equal(holiday.creator.viewsOverride, 5000);
  assert.equal(holiday.creator.actual.recovered, 1);
  assert.equal(holiday.creator.fit.audience, 80);
  assert.match(holiday.creator.notes, /9h delay/);
  assert.match(holiday.creator.notes, /Audience country \(previous\): not supplied/);
  assert.match(holiday.creator.notes, /Age 25\+ \(previous\): 82\.8%/);
  assert.equal(holiday.profile.handle, '@holiday.stop');
  assert.equal(holiday.profile.followers, 88810);
  assert.equal(holiday.profile.audience.age25, 82.8);
  assert.equal(holiday.profile.detail.ageSource, 'creator');
  assert.equal(holiday.profile.detail.homeSource, 'api');
  assert.ok(holiday.profile.detail.conflicts.some(item => item.includes('Age 25+')));
  assert.equal(holiday.creator.packages[0].basis, 'gross');
  assert.equal(holiday.creator.packages[0].currency, 'PLN');
  assert.equal(holiday.creator.packages[0].originalAmount, 2000);
  assert.equal(holiday.creator.packages[0].fxRate, 1);
  assert.equal(holiday.creator.packages[0].paidPromo, false);
  assert.equal(holiday.creator.packages[0].platform, 'TikTok');
  assert.equal(holiday.creator.packages[1].name, 'TikTok +promo');
  assert.equal(holiday.creator.packages[1].paidPromo, true);
  assert.equal(holiday.creator.packages.find(pkg => pkg.name === 'IG Reels')?.platform, 'Instagram');
  assert.equal(quoteMetrics(holiday.creator, 'TikTok').cpm, null);
  assert.match(quoteMetrics(holiday.creator, 'TikTok').unavailable, /Gross/);

  const podroze = profile(parsed, '@podroze_za_grosze', 'TikTok');
  assert.equal(podroze.creator.packages[0].basis, 'net');
  assert.equal(podroze.creator.packages[0].fee, 3000);
  assert.equal(quoteMetrics(podroze.creator, 'TikTok').cpm, podroze.profile.median ? 3000 / podroze.profile.median * 1000 : null);

  const travel = profile(parsed, '@travelovcy', 'TikTok');
  const travelIg = travel.creator.profiles.find(item => item.platform === 'Instagram');
  assert.equal(travel.profile.detail.homeSource, 'creator');
  assert.equal(travelIg?.detail.homeSource, 'creator');
  assert.match(travel.creator.notes, /ERGO/);
  assert.match(travel.creator.notes, /Audience country \(previous\): IG Poland 91%/);

  const kajetan = profile(parsed, '@kajetaneo', 'TikTok');
  assert.match(kajetan.creator.notes, /Wizzair/);
  assert.equal(kajetan.profile.detail.picture.length > 0, true);
  assert.equal(kajetan.creator.packages[0].basis, 'unknown');
  assert.doesNotMatch(kajetan.creator.notes, /Audience country \(previous\)/);

  assert.equal(parsed.snapshots[0].name, 'September pilot');
  assert.equal(parsed.snapshots[0].creators[0].handle, '@podroze_za_grosze');
  assert.equal(parsed.snapshots[0].creators[0].market, 'Poland');
  assert.equal(typeof parsed.snapshots[0].creators[0].profiles.find(item => item.platform === 'TikTok')?.median, 'number');
  assert.equal(parsed.snapshots[0].campaign.markets.Serbia.name, 'Serbia · Creator pilot');
});

test('an old Instagram-only creator maps onto the Instagram profile', () => {
  const sample = {
    campaign: legacy.campaign,
    snapshots: [],
    creators: [{
      ...legacy.creators[0],
      id: '@igonly',
      handle: '@igonly',
      name: 'IG only',
      platform: 'Instagram',
      followers: 10,
      median: 20,
      engagement: 1.5,
      country: 'Poland 50%',
      age: '40%',
      notes: 'Keep the note',
      packages: [{ name: 'IG Reels', fee: 100, basis: 'netto', views: 20 }],
    }],
  };
  const parsed = StateSchema.parse(sample);
  const creator = parsed.creators[0];
  assert.equal(creator.market, 'Poland');
  assert.equal(creator.notes.startsWith('Keep the note'), true);
  const instagram = creator.profiles.find(item => item.platform === 'Instagram');
  const tiktok = creator.profiles.find(item => item.platform === 'TikTok');
  assert.equal(instagram?.followers, 10);
  assert.equal(instagram?.median, 20);
  assert.equal(instagram?.engagement, 1.5);
  assert.equal(instagram?.audience.homeShare, 50);
  assert.equal(instagram?.audience.age25, 40);
  assert.equal(tiktok?.followers, null);
  assert.equal(tiktok?.median, null);
  assert.equal(creator.packages[0].basis, 'net');
  assert.equal(creator.packages[0].platform, 'Instagram');
});
