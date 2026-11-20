import assert from 'node:assert/strict';
import test from 'node:test';
import {landingAnalyticsParameters} from '../src/analytics/ga4';

const home='https://pleee.hall-live.workers.dev/';
const tagged=home+'?utm_source=threads&utm_medium=social&utm_campaign=private#visitor';

test('external attribution retains only the referring origin',()=>{
 assert.deepEqual(landingAnalyticsParameters(tagged,'https://www.threads.com/@visitor/post/test?token=private#profile'),{
  page:{page_location:home,page_referrer:'https://www.threads.com',page_title:'PLEEE'},
 });
 assert.equal(landingAnalyticsParameters(home,'http://example.com:8080/private').page.page_referrer,'http://example.com:8080');
});

test('a missing referrer can use only the explicitly tagged Threads source and medium',()=>{
 assert.deepEqual(landingAnalyticsParameters(tagged,''),{
  page:{page_location:home,page_referrer:'',page_title:'PLEEE'},
  campaign:{campaign_source:'threads',campaign_medium:'social'},
 });
 assert.deepEqual(landingAnalyticsParameters(home+'?utm_source=threads',''),{
  page:{page_location:home,page_referrer:'',page_title:'PLEEE'},
  campaign:{campaign_source:'threads'},
 });
 for(const query of [
  '',
  '?utm_source=someone&utm_medium=social',
  '?utm_source=threads&utm_medium=unknown',
  '?utm_source=threads&utm_source=other&utm_medium=social',
  '?utm_source=threads&utm_medium=social&utm_medium=other',
 ]){
  assert.deepEqual(landingAnalyticsParameters(home+query,''),{
   page:{page_location:home,page_referrer:'',page_title:'PLEEE'},
  });
 }
});

test('same-site, non-web, and malformed referrers do not become sources',()=>{
 for(const referrer of [home+'privacy.html?private=1','file:///private','blob:https://example.com/id','bad URL']){
  assert.deepEqual(landingAnalyticsParameters(tagged,referrer),{
   page:{page_location:home,page_referrer:'',page_title:'PLEEE'},
  });
 }
});
