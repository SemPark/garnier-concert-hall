import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {analyticsModeResponse} from '../server/analyticsMode';
import {classifyAnalyticsCountry} from '../shared/analyticsPolicy';
import {AnalyticsConsent,expiryCookiesForHost} from '../src/analytics/ga4';
import {AnalyticsChoices} from '../src/analytics/AnalyticsChoices';
import {browserAnalyticsExcluded} from '../src/analytics/browserExclusion';
import {
 ANALYTICS_CHOICE_KEY,PRIOR_ANALYTICS_CHOICE_KEY,analyticsMayStart,analyticsPrivacySignal,
 analyticsDetailAllowed,fetchAnalyticsPolicy,readAnalyticsPreference,type AnalyticsChoice,
} from '../src/analytics/regionConsent';

test('Cloudflare returns only no-store policy, not country, state or personal identifiers',async()=>{
 for(const [cf,mode] of [[{country:'KR'},'auto'],[{country:'DE'},'ask'],[{country:'GB'},'ask'],[{country:'IS'},'ask'],[{country:'CH'},'ask'],[{country:'US',regionCode:'CA'},'ask'],[{country:'US',regionCode:'CT'},'auto'],[{country:'US'},'off'],[{country:'JP'},'off'],[{country:'XX'},'off'],[undefined,'off']] as const){
  const res=analyticsModeResponse({method:'GET',headers:new Headers({'CF-IPCountry':'KR'}),cf});
  assert.equal(res.headers.get('Cache-Control'),'private, no-store');
  assert.equal(res.headers.get('CDN-Cache-Control'),'no-store');
  assert.deepEqual(await res.json(),cf?.country==='KR'?{mode,detailAutomatic:true}:{mode});
 }
 for(const key of ['DNT','Sec-GPC'])assert.deepEqual(await analyticsModeResponse({
  method:'GET',headers:new Headers({[key]:'1'}),cf:{country:'KR'},
 }).json(),{mode:'off'});
 assert.equal(analyticsModeResponse({method:'POST',headers:new Headers()}).status,405);
 assert.equal(classifyAnalyticsCountry('CA',new Set(['CA']),new Set(['CA'])),'ask');
});

test('optional automatic US policy only matches known states and never overrides California',async()=>{
 for(const [regionCode,mode] of [['CA','ask'],['WA','auto'],['DC','auto'],['PR','off'],['ZZ','off'],['WA-7','off'],[undefined,'off']] as const){
  const res=analyticsModeResponse({method:'GET',headers:new Headers(),cf:{country:'US',regionCode}},true);
  assert.deepEqual(await res.json(),{mode});
 }
});

test('mode fetch sends no cookies, is same-origin, and fails closed on errors or unexpected responses',async()=>{
 const signal=new AbortController().signal;
 assert.deepEqual(await fetchAnalyticsPolicy(signal,async(input,init)=>{
  assert.equal(input,'/api/analytics-mode');
  assert.deepEqual(init,{signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',mode:'same-origin',redirect:'error'});
  return Response.json({mode:'ask'});
 }), {mode:'ask'});
 for(const [payload,expected] of [
  [{mode:'auto',detailAutomatic:true},{mode:'auto',detailAutomatic:true}],
  [{mode:'auto'},{mode:'auto'}],
  [{mode:'ask',detailAutomatic:true},{mode:'ask'}],
 ])assert.deepEqual(await fetchAnalyticsPolicy(signal,async()=>Response.json(payload)),expected);
 for(const response of [()=>new Response('not-json'),()=>Response.json({country:'KR'}),()=>Response.json({mode:'new'}),()=>Response.json({mode:'auto'},{status:500}),()=>{throw new Error('offline');}])
  assert.deepEqual(await fetchAnalyticsPolicy(signal,async()=>response()),{mode:'off'});
});

test('automatic detail respects prior refusal',()=>{
 assert.equal(analyticsDetailAllowed(null,true),true);
 assert.equal(analyticsDetailAllowed('no',true),false);
 assert.equal(analyticsDetailAllowed(null),false);
 assert.equal(analyticsDetailAllowed('yes'),true);
});

test('prior refusal persists; old permission never implies new opt-in',()=>{
 const read=(values:Record<string,string>)=>readAnalyticsPreference({getItem:key=>values[key]??null});
 assert.equal(read({[PRIOR_ANALYTICS_CHOICE_KEY]:'yes'}),null);
 assert.equal(read({[PRIOR_ANALYTICS_CHOICE_KEY]:'no'}),'no');
 assert.equal(read({[ANALYTICS_CHOICE_KEY]:'no'}),'no');
 assert.equal(read({[PRIOR_ANALYTICS_CHOICE_KEY]:'no',[ANALYTICS_CHOICE_KEY]:'yes'}),'yes');
 assert.equal(readAnalyticsPreference({getItem(){throw new Error('unavailable');}}),'no');
 assert.equal(analyticsPrivacySignal({doNotTrack:'1'}),true);
 assert.equal(analyticsPrivacySignal({globalPrivacyControl:true}),true);
});

test('no tag request before consent or while off; refusal and revocation stop collection',()=>{
 const actions:string[]=[];
 let activate:()=>void=()=>{};
 const controller=new AnalyticsConsent({
  disable:off=>actions.push(off?'disable':'enable'),
  load(loaded){actions.push('load');activate=loaded;return ()=>actions.push('cancel');},
  send:event=>actions.push(event),
 });
 const apply=(mode:'off'|'ask'|'auto',choice:AnalyticsChoice,blocked=false)=>controller.setAccepted(analyticsMayStart(mode,choice,blocked));
 apply('off','yes');apply('ask',null);apply('ask','no');apply('auto','no');apply('auto',null,true);
 assert.deepEqual(actions,[]);
 apply('ask','yes');activate();
 assert.deepEqual(actions,['enable','load','page_view']);
 apply('ask','no');
 assert.equal(controller.tracker,null);
 assert.deepEqual(actions,['enable','load','page_view','disable']);
 apply('auto',null);
 assert.ok(controller.tracker);
 assert.deepEqual(actions,['enable','load','page_view','disable','enable']);
});

test('explicit refusal disables first, and scopes cookie removal to this host and stream',()=>{
 const order:string[]=[];
 const controller=new AnalyticsConsent({
  disable:off=>order.push(off?'disable':'enable'),load(ready){return ()=>{};},
  send(){},forgetCookies(){order.push('forget');},
 });
 controller.setAccepted(true);controller.refuse();
 assert.deepEqual(order,['enable','disable','forget']);
 assert.deepEqual(expiryCookiesForHost('G-TEST123'),[
  '_ga=; Max-Age=0; Path=/; Secure; SameSite=Lax','_ga_TEST123=; Max-Age=0; Path=/; Secure; SameSite=Lax',
 ]);
});

test('prompt renders two equal real buttons and settings provide an access point',()=>{
 const prompt=renderToStaticMarkup(createElement(AnalyticsChoices,{choice:null,choose(){}}));
 assert.equal([...prompt.matchAll(/<button type="button" aria-pressed="false">/g)].length,2);
 assert.match(prompt,/>Allow<\/button>/);
 assert.match(prompt,/>Reject<\/button>/);
 assert.match(prompt,/href="\/privacy.html"/);
 const settings=renderToStaticMarkup(createElement(AnalyticsChoices,{choice:'no',choose(){},inSettings:true}));
 assert.match(settings,/>Manage analytics cookies<\/button>/);
});


test('operator exclusion persists across visits, preserves attribution, and can be undone',()=>{
 const storage=new Map<string,string>();
 const browser={
  location:{href:'https://example.com/?visit-stats=off&utm_source=threads#stage'},
  localStorage:{
   getItem:(key:string)=>storage.get(key)??null,
   setItem:(key:string,value:string)=>{storage.set(key,value);},
   removeItem:(key:string)=>{storage.delete(key);},
  },
  history:{
   state:null,
   replaceState(_state:unknown,_unused:string,url:URL){browser.location.href=url.href;},
  },
 };
 const excluded=()=>browserAnalyticsExcluded(browser as unknown as Pick<Window,'location'|'history'|'localStorage'>);
 assert.equal(excluded(),true);
 assert.equal(browser.location.href,'https://example.com/?utm_source=threads#stage');
 assert.equal(excluded(),true);
 browser.location.href='https://example.com/?visit-stats=on';
 assert.equal(excluded(),false);
 assert.equal(browser.location.href,'https://example.com/');
 assert.equal(excluded(),false);
 browser.location.href='https://example.com/?visit-stats=off';
 browser.localStorage.setItem=()=>{throw new Error('Storage unavailable');};
 assert.equal(excluded(),true);
 assert.match(browser.location.href,/visit-stats=off/);
});
