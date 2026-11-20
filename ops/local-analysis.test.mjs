import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {createOpsServer} from './server.mjs';

test('local archive and map reuse reports without extra provider calls', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'local-analysis-'));
  const counts = {ga: 0, cf: 0, health: 0};
  const missing = {status: 'unconfigured'};
  const behavior = {source: 'ga4', events: {pleee_seat: 2}, reports: {seats: {status: 'unconfigured', rows: []}}};
  const server = createOpsServer({
    archiveOptions: {dbPath: join(dir, 'archive.sqlite')},
    clock: () => new Date('2026-11-20T00:00:00Z'),
    google: () => { counts.ga++; return {status: 'ok', data: {behavior, daily: [{date: '2026-11-20', sessions: 0, views: 3}]}}; },
    cloudflare: () => { counts.cf++; return {rum: missing, http: missing, worker: missing}; },
    health: () => { counts.health++; return missing; },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(dir, {recursive: true});
  });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const get = path => fetch(origin + path);
  const post = headers => fetch(origin + '/api/import-daily?source=gsc', {
    method: 'POST', headers, body: 'Date,Clicks,Impressions\n2026-11-20,0,13',
  });
  assert.equal((await post({'Content-Type': 'text/csv'})).status, 403);
  assert.equal((await post({'Content-Type': 'text/csv', Origin: origin})).status, 200);
  assert.equal((await get('/api/local-analysis?end=2026-02-31')).status, 400);
  for (const path of ['/analysis', '/analysis.js', '/analysis-areas.js', '/venue-map.js', '/venue-map-layout.js']) {
    assert.equal((await get(path)).status, 200);
  }
  const first = await (await get('/api/local-analysis')).json();
  assert.ok(Array.isArray(first.spatial.samples));
  assert.ok(Array.isArray(first.searchQueries.rows));
  assert.ok(Array.isArray(first.updates.rows));
  assert.equal(first.archive.sources.gsc.rows[0].clicks, 0);
  assert.deepEqual(counts, {ga: 0, cf: 0, health: 0});
  assert.equal((await get('/api/analytics')).status, 200);
  const current = await (await get('/api/local-analysis')).json();
  assert.equal(current.google.status, 'ok');
  assert.deepEqual(current.google.data.behavior, behavior);
  assert.deepEqual(current.archive.sources.ga4.rows, [{date: '2026-11-20', sessions: 0, screenPageViews: 3}]);
  const earlier = await (await get('/api/local-analysis?end=2026-11-19')).json();
  assert.equal(earlier.google, undefined);
  assert.deepEqual(earlier.archive.sources.ga4.rows, []);
  assert.deepEqual(counts, {ga: 1, cf: 1, health: 1});
});
