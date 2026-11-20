import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {importSearchQueries, readSearchQueries} from './search-queries.mjs';

test('GSC query exports retain their exact window, quoted search text and observed zero', async t => {
  const dir = await mkdtemp(join(tmpdir(),'gsc-queries-'));
  t.after(() => rm(dir,{recursive:true}));
  const options = {startDate:'2026-11-01',endDate:'2026-11-07',dbPath:join(dir,'test.sqlite')};
  assert.equal((await readSearchQueries(options)).importedAt,null);
  await importSearchQueries({...options,csv:'인기 검색어,클릭수,노출수,CTR,평균 게재순위\n"#공연, 음악",0,16,0%,3.2\n공연장,1,10,10%,'});
  assert.deepEqual((await readSearchQueries(options)).rows,[
    {query:'#공연, 음악',clicks:0,impressions:16,ctr:0,position:3.2},
    {query:'공연장',clicks:1,impressions:10,ctr:.1},
  ]);
  assert.equal((await readSearchQueries({...options,endDate:'2026-11-08'})).importedAt,null);
  await assert.rejects(importSearchQueries({...options,csv:'Top queries,Clicks\na,1\na,0'}),/중복/);
  assert.equal((await readSearchQueries(options)).rows.length,2);
  await importSearchQueries({...options,csv:'Top queries,Clicks\nnew,0'});
  assert.deepEqual((await readSearchQueries(options)).rows,[{query:'new',clicks:0}]);
  await importSearchQueries({...options,csv:'Top queries,Clicks'});
  const empty = await readSearchQueries(options);
  assert.ok(empty.importedAt);
  assert.deepEqual(empty.rows,[]);
});
