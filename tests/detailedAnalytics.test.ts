import test from 'node:test';
import assert from 'node:assert/strict';
import {DetailedAnalytics,type DetailEvent} from '../src/analytics/DetailedAnalytics';
import {AnalyticsConsent,dispatchDetailedEvent} from '../src/analytics/ga4';
import {SEATS} from '../shared/venue';

const seat=SEATS[0].id;

test('an existing GA tag still requires detailed consent and withdrawal discards data',()=>{
 const events:DetailEvent[]=[];
 const detail=new DetailedAnalytics(()=>true,event=>events.push(event));
 detail.selected(seat);
 detail.flush();
 detail.setAllowed(true);
 detail.selected(seat);
 detail.setAllowed(false);
 detail.flush();
 assert.deepEqual(events,[]);
 detail.setAllowed(true);
 detail.flush();
 assert.deepEqual(events,[]);
});

test('sends floor and area in 30-second units and confirmed seats once per transition',()=>{
 const events:DetailEvent[]=[];
 const detail=new DetailedAnalytics(()=>true,event=>events.push(event));
 detail.setAllowed(true);
 for(let now=0;now<=31000;now+=1000)detail.position('auditorium',0,15,now);
 detail.interrupt();
 detail.position('auditorium',0,15,90000);
 detail.selected('invalid');
 detail.selected(seat);
 detail.seated(null);
 detail.seated(seat);
 detail.seated(seat);
 detail.flush();
 detail.flush();
 assert.deepEqual(events,[
  {name:'pleee_seat',params:{seat_id:seat,seat_action:'seated',action_count:1}},
  {name:'pleee_seat',params:{seat_id:seat,seat_action:'selected',action_count:1}},
  {name:'pleee_area_dwell',params:{floor:1,area:'middle',dwell_seconds:30}},
 ]);
});

test('failed sends are consumed and tag refusal prevents transport',async()=>{
 let attempts=0;
 const ga=new AnalyticsConsent({
  load(ready){queueMicrotask(ready);return ()=>{};},
  disable(){},send(){},sendDetail(){attempts++;throw new Error('mock send failure');},
 });
 ga.setAccepted(true);
 await Promise.resolve();
 const detail=new DetailedAnalytics(()=>ga.detailReady,event=>ga.sendDetail(event));
 detail.setAllowed(true);
 detail.selected(seat);
 assert.doesNotThrow(()=>detail.flush());
 detail.flush();
 detail.setAllowed(true);
 detail.selected(seat);
 ga.refuse();
 detail.flush();
 assert.equal(attempts,1);
});

test('tag dispatch uses only approved details and a fixed GA page context',()=>{
 const commands:unknown[][]=[];
 dispatchDetailedEvent((...args)=>commands.push(args),'G-TESTMOCK',{
  name:'pleee_area_dwell',params:{floor:2,area:'rear',dwell_seconds:30},
 });
 assert.deepEqual(commands,[['event','pleee_area_dwell',{
  floor:2,area:'rear',dwell_seconds:30,send_to:'G-TESTMOCK',
  page_location:'https://pleee.hall-live.workers.dev/',page_referrer:'',page_title:'PLEEE',
 }]]);
});
