import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultCampaign, economics, forecast, importCreators, importOutcomes, StateSchema, parseCSV } from '../lib/model.ts';
const creator = () => importCreators('Creator,Handle,Median views,TikTok,Currency basis\nExample,@example,10000,2000,brutto', 'test fixture')[0];
test('funnel and expected contribution follow editable inputs', () => {
  assert.ok(Math.abs(economics(defaultCampaign) - 232) < 1e-9);
  const f = forecast(creator(), defaultCampaign);
  assert.ok(Math.abs((f.signed ?? 0) - 5.46) < 1e-9);
  assert.equal(f.breakEven, 9);
  assert.ok(Math.abs((f.profit ?? 0) - (5.46 * 232 - 2000)) < 1e-9);
});
test('unknown or zero views do not fabricate acquisition costs', () => {
  const c = creator();
  assert.equal(forecast({ ...c, viewsOverride: 0 }, defaultCampaign).cpa, null);
  assert.equal(forecast({ ...c, packages: [{ ...c.packages[0], views: null }] }, defaultCampaign).profit, null);
  assert.equal(forecast(c, { ...defaultCampaign, winRate: 0 }).breakEven, null);
});
test('CSV quoting and duplicate handles', () => {
  assert.deepEqual(parseCSV('a,b\n"hello, world","two\nlines"'), [['a','b'],['hello, world','two\nlines']]);
  assert.throws(() => importCreators('Creator,Handle\nOne,@same\nTwo,@same', 'test'));
});
test('results validate whole counts and recovered versus signed passengers', () => {
  const c = creator();
  assert.equal(StateSchema.safeParse({ campaign: defaultCampaign, snapshots: [], creators: [{ ...c, actual: { ...c.actual, signed: 1, recovered: 2 } }] }).success, false);
  const csv = 'Handle,Spend PLN,Visits,Signed passengers,Recovered passengers,Fee income PLN,Handling costs PLN\n@example,2000,100,10,7,2800,480';
  assert.equal(importOutcomes(csv, [c]).creators[0].actual.revenue, 2800);
});
