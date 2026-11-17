import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StateSchema, normaliseState, marketFromCountryText, type State } from '../lib/model.ts';
import { marketForHandle } from '../lib/catalog.ts';

mkdirSync(new URL('./.cache/', import.meta.url), { recursive: true });
const bundled = spawnSync(new URL('../node_modules/esbuild/bin/esbuild', import.meta.url).pathname, [
  'app/creator-lab.tsx',
  '--bundle', '--platform=node', '--format=esm', '--jsx=automatic',
  '--outfile=tests/.cache/creator-lab-render.mjs',
  '--alias:@/lib=./lib', '--alias:@/components=./components', '--alias:@/app=./app',
  '--alias:next/link=./tests/stubs/link.js',
  '--packages=external',
], { encoding: 'utf8' });
if (bundled.status !== 0) throw new Error(bundled.stderr || 'Could not bundle the shortlist for the render assertion.');
const { default: CreatorLab } = await import('./.cache/creator-lab-render.mjs');

const payload = JSON.parse(readFileSync(new URL('./fixtures/live-creators-rev4.json', import.meta.url), 'utf8'));

function counts(state: State) {
  return {
    Poland: state.creators.filter(item => item.market === 'Poland').length,
    Serbia: state.creators.filter(item => item.market === 'Serbia').length,
    'North Macedonia': state.creators.filter(item => item.market === 'North Macedonia').length,
  };
}

test('live revision 4 load path assigns 8 Poland, 7 Serbia and 7 North Macedonia', () => {
  const response = { state: StateSchema.parse(payload), revision: 4, savedAt: '2026-11-17T00:00:00.000Z' };
  const hydrated = StateSchema.parse(response.state);
  const again = StateSchema.parse(JSON.parse(JSON.stringify(hydrated)));
  assert.deepEqual(again, hydrated);
  assert.deepEqual(StateSchema.parse(normaliseState(hydrated)), hydrated);
  assert.deepEqual(counts(hydrated), { Poland: 8, Serbia: 7, 'North Macedonia': 7 });
  assert.equal(hydrated.campaign.name, 'Poland · Serbia · North Macedonia');
  assert.equal(hydrated.campaign.target, 'Polish-, Serbian- and Macedonian-speaking travellers with disrupted flights');
  assert.equal(hydrated.campaign.markets.Poland.name, 'Poland · Creator pilot');
  assert.match(hydrated.campaign.markets.Serbia.target, /Serbian-speaking/);
  assert.equal(hydrated.creators.find(item => item.handle === '@kajetaneo')?.market, 'Poland');
  assert.equal(hydrated.creators.find(item => item.handle === '@_evce_')?.market, 'North Macedonia');
  assert.equal(hydrated.creators.find(item => item.handle === '@podroze_za_grosze')?.market, 'Poland');
  assert.equal(hydrated.creators.find(item => item.handle === '@letsfly_pl')?.market, 'Poland');
  assert.equal(hydrated.creators.find(item => item.handle === '@tragom_horizonta')?.market, 'Serbia');
  const html = renderToStaticMarkup(createElement(CreatorLab, { initialData: hydrated }));
  assert.equal(html.match(/data-market="Poland"/g)?.length, 8);
  assert.equal(html.match(/data-market="Serbia"/g)?.length, 7);
  assert.equal(html.match(/data-market="North Macedonia"/g)?.length, 7);
  assert.match(html, /Poland · Serbia · North Macedonia/);
  assert.match(html, /Polish-, Serbian- and Macedonian-speaking travellers/);
  assert.doesNotMatch(html, /Poland · Creator pilot/);
  assert.match(html, /data-market-filter="all"/);
  assert.match(html, /aria-pressed="true"[^>]*>All</);
  const covek = hydrated.creators.find(item => item.handle === '@1covek');
  assert.equal(covek?.market, 'North Macedonia');
  assert.equal(covek?.profiles.find(item => item.platform === 'TikTok')?.detail.location, 'Serbia');
});

test('market resolution prefers an explicit market, then the handle, then the country text', () => {
  assert.equal(marketForHandle('kajetano'), 'Poland');
  assert.equal(marketForHandle('evajovanovska'), 'North Macedonia');
  assert.equal(marketForHandle('karosienkiewicz'), 'Poland');
  assert.equal(marketForHandle('paunovicemaa'), 'Serbia');
  assert.equal(marketForHandle('warawara2_'), 'North Macedonia');
  assert.equal(marketFromCountryText('North Macedonia 74.8% (IC)'), 'North Macedonia');
  assert.equal(marketFromCountryText('Serbia 70.6%; Other 18.6%; North Macedonia 5.5%; ...'), 'Serbia');
  assert.equal(marketFromCountryText('Poland 92.0% (IC)'), 'Poland');
  assert.equal(marketFromCountryText(''), null);
  const explicit = StateSchema.parse({
    campaign: payload.campaign,
    snapshots: [],
    creators: [{ ...payload.creators.find((item: { handle: string }) => item.handle === '@holiday.stop'), market: 'Serbia' }],
  });
  assert.equal(explicit.creators[0].market, 'Serbia');
  const countryOnly = StateSchema.parse({
    campaign: payload.campaign,
    snapshots: [],
    creators: [{ ...payload.creators[0], id: '@nobody_xyz', handle: '@nobody_xyz', country: 'Serbia 70.6%; Other 18.6%; North Macedonia 5.5%' }],
  });
  assert.equal(countryOnly.creators[0].market, 'Serbia');
});
