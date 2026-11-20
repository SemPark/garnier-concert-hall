import test from 'node:test';
import assert from 'node:assert/strict';
import {PlaybackTracker,type PlaybackAnalyticsEvent,type PlaybackSample} from '../src/analytics/PlaybackTracker';
import {AnalyticsConsent,ga4MeasurementId,queueAnalyticsDefaults} from '../src/analytics/ga4';

function observer(){
 const events:PlaybackAnalyticsEvent[]=[];
 const tracker=new PlaybackTracker(e=>events.push(e));
 const point=(now:number,position:number,revision=1,overrides:Partial<PlaybackSample>={})=>{
  tracker.sample({nowMs:now*1000,positionSeconds:position,revision,playbackRate:1,audible:true,...overrides});
 };
 return {events,tracker,point};
}

test('late entry offset does not count, starts on real progress, reports 180 only once',()=>{
 const {point,events}=observer();
 point(0,900);
 assert.deepEqual(events,[]);
 point(.1,900.1);
 assert.deepEqual(events,['playback_start']);
 point(179.9,1079.9);
 assert.deepEqual(events,['playback_start']);
 point(180,1080);
 point(360,1260);
 assert.deepEqual(events,['playback_start','playback_180_seconds']);
});

test('normal track changes and pauses carry earned listening, not numbering jumps',()=>{
 const {point,tracker,events}=observer();
 point(0,15);point(75,90);
 tracker.resetSample();
 point(90,20,2);point(155,85,2);
 tracker.resetSample();
 point(260,85,2);point(299.9,124.9,2);
 assert.deepEqual(events,['playback_start']);
 point(300,125,2);
 assert.deepEqual(events,['playback_start','playback_180_seconds']);
});

test('seeks, silent priming, mute, wait and frozen media are not credited',()=>{
 const {point,tracker,events}=observer();
 point(0,0,1,{audible:false});point(240,240,1,{audible:false});
 point(241,240);
 point(420,240); // unchanged playback position during a stalled interval
 assert.deepEqual(events,[]);
 tracker.resetSample(); // explicit seek boundary
 point(421,1000);point(422,1001);
 point(423,1300); // suspicious forward jump also rejected without an event
 point(424,1301,1,{audible:false});
 point(600,1477,1,{audible:false});
 point(601,1478);point(779.9,1656.9);
 assert.deepEqual(events,['playback_start']);
 point(780,1657);
 assert.deepEqual(events,['playback_start','playback_180_seconds']);
});

test('variable rate counts wall-clock listening only; callback failures do not break audio',()=>{
 const {point,events}=observer(),rate={playbackRate:2};
 point(0,100,1,rate);point(179,458,1,rate);
 assert.deepEqual(events,['playback_start']);
 point(180,460,1,rate);
 assert.deepEqual(events,['playback_start','playback_180_seconds']);
 const broken=new PlaybackTracker(()=>{throw new Error('blocked');});
 assert.doesNotThrow(()=>{
  for(let t=0;t<=180;t+=90)broken.sample({nowMs:t*1000,positionSeconds:t,revision:0,playbackRate:1,audible:true});
 });
});

test('only explicitly enabled and configured production origin can initialize Google',()=>{
 const enabled={production:true,origin:'https://pleee.hall-live.workers.dev',enabled:'true',measurementId:'G-TEST000000'};
 assert.equal(ga4MeasurementId(enabled),'G-TEST000000');
 for(const override of [{enabled:undefined},{enabled:'false'},{measurementId:undefined},{measurementId:'secret'},{production:false},{origin:'http://localhost:5174'},{origin:'https://pleee-optimization.hall-live.workers.dev'}]){
  assert.equal(ga4MeasurementId({...enabled,...override}),null);
 }
});

function consentHarness(){
 const events:string[]=[],actions:string[]=[];
 const loaded:(()=>void)[]=[];
 const consent=new AnalyticsConsent({
  load(ready){loaded.push(ready);actions.push('load');return ()=>{actions.push('cancel');};},
  disable(value){actions.push(value?'disable':'enable');},
  send(event){events.push(event);},
 });
 return {consent,events,actions,loaded};
}
function sample(tracker:PlaybackTracker|null,now:number,position=now){
 tracker?.sample({nowMs:now*1000,positionSeconds:position,revision:1,playbackRate:1,audible:true});
}

test('when eligible, GA4 permits analytics only and never ads or URL passthrough',()=>{
 const calls:unknown[][]=[];
 queueAnalyticsDefaults((...args)=>calls.push(args));
 assert.deepEqual(calls,[
  ['consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'}],
  ['set','ads_data_redaction',true],
  ['set','url_passthrough',false],
 ]);
});

test('eligible measurement loads once, records one page view after the tag is ready, and does not include the prior audio',()=>{
 const {consent,events,actions,loaded}=consentHarness();
 consent.setAccepted(true);consent.setAccepted(true);
 assert.deepEqual(actions,['enable','load']);
 assert.equal(consent.tracker,null);
 assert.deepEqual(events,[]);
 loaded[0]();
 assert.deepEqual(events,['page_view']);
 sample(consent.tracker,300);sample(consent.tracker,301);
 assert.deepEqual(events,['page_view','playback_start']);
});

test('privacy disable cancels in-flight activation and rejects a late SDK callback',()=>{
 const {consent,events,actions,loaded}=consentHarness();
 consent.setAccepted(true);consent.setAccepted(false);
 loaded[0]();
 assert.deepEqual(actions,['enable','load','disable','cancel']);
 assert.equal(consent.tracker,null);
 assert.deepEqual(events,[]);
 consent.setAccepted(true);
 loaded[0]();
 assert.equal(consent.tracker,null);
 loaded[1]();
 assert.deepEqual(events,['page_view']);
});

test('privacy disable acts immediately and discards elapsed time without duplicating page view',()=>{
 const {consent,events,actions,loaded}=consentHarness();
 consent.setAccepted(true);loaded[0]();
 const before=consent.tracker;
 sample(before,0);sample(before,179);
 consent.setAccepted(false);
 assert.equal(actions.at(-1),'disable');
 assert.equal(consent.tracker,null);
 sample(before,180);
 assert.deepEqual(events,['page_view','playback_start']);
 consent.setAccepted(true);
 assert.notEqual(consent.tracker,before);
 assert.equal(loaded.length,1);
 sample(consent.tracker,400);sample(consent.tracker,401);
 assert.deepEqual(events,['page_view','playback_start','playback_start']);
 sample(consent.tracker,580);
 assert.deepEqual(events,['page_view','playback_start','playback_start','playback_180_seconds']);
});

test('offline listening meter keeps credit after 3 minutes, skips reset intervals',()=>{
 const events:PlaybackAnalyticsEvent[]=[];
 const meter=new PlaybackTracker(e=>events.push(e),true);
 sample(meter,0);sample(meter,180);sample(meter,300);
 meter.resetSample();sample(meter,500);sample(meter,600);
 assert.equal(meter.measuredMs,400_000);
 assert.deepEqual(events,['playback_start','playback_180_seconds']);
});
