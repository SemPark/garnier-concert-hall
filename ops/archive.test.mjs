import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseDailyCsv, readArchive, saveDailyRows} from './archive.mjs';

test('stores daily actuals, merges corrections and reads a bounded date range', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'concert-test-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const options = {dbPath: join(dir, 'archive.sqlite'), days: 1, endDate: '2025-03-01'};
  assert.equal((await readArchive(options)).sources.gsc.latestDate, null);
  const rows = parseDailyCsv('gsc', '\uFEFF날짜,클릭수,노출수,CTR,게재순위\r\n2025-02-28,0,1,0%,2\r\n2025-03-01,10,"1,000",1%,2.5\r\n');
  await saveDailyRows('gsc', rows, options);
  await saveDailyRows('gsc', [{date: '2025-03-01', position: 2}], options);
  await saveDailyRows('ga4', [{date: '20250301', views: 0, sessions: null}], options);
  const snapshot = (await readArchive(options)).sources;
  assert.deepEqual(snapshot.gsc, {latestDate: '2025-03-01', rows: [{date: '2025-03-01', clicks: 10, impressions: 1000, ctr: 0.01, position: 2}]});
  assert.deepEqual(snapshot.ga4.rows, [{date: '2025-03-01', screenPageViews: 0}]);
  await assert.rejects(saveDailyRows('ga4', [{date: '20250301', views: 20}, {date: '20250230', views: 1}], options));
  await assert.rejects(saveDailyRows('gsc', [rows[0], rows[0]], options));
  assert.deepEqual((await readArchive(options)).sources, snapshot);
});

test('rejects additional dimensions and accepts a GA4 comment-prefixed export', () => {
  assert.throws(() => parseDailyCsv('ga4', 'Date,Country,Views\n20250301,KR,2'));
  assert.deepEqual(parseDailyCsv('ga4', '# Report\nDate,Active users,Views\n20250301,2,3'), [{date: '20250301', activeUsers: '2', screenPageViews: '3'}]);
});

test('stores the actual report window across reads and ignores older responses', async t=>{
 const {saveReport}=await import('./archive.mjs');
 const dir=await mkdtemp(join(tmpdir(),'concert-window-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const options={dbPath:join(dir,'archive.sqlite'),days:7,endDate:'2026-11-20'};
 const snapshot={range:{days:7,endDate:options.endDate},requestedAt:'2026-11-20T02:00:00Z',google:{status:'ok',data:{events:[]}},cloudflare:{},completedAt:'2026-11-20T02:01:00Z'};
 await saveReport(snapshot,options);
 await saveReport({...snapshot,requestedAt:'2026-11-20T01:00:00Z'},options);
 assert.equal((await readArchive(options)).report.requestedAt,snapshot.requestedAt);
 assert.equal((await readArchive({...options,days:1})).report,null);
});
