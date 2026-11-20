import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchDetailedEvent} from '../src/analytics/ga4';
import {ZoneAnalytics,type ZoneEvent} from '../src/analytics/ZoneAnalytics';
import {GOLDEN_HALL} from '../shared/goldenHall';

test('records only opted-in, consecutive coarse observations and sends one summary per pair',()=>{
 const sent:ZoneEvent[]=[];
 const analytics=new ZoneAnalytics('classical',()=>true,event=>sent.push(event));
 analytics.position('auditorium',0,12,0);
 analytics.flush();
 assert.deepEqual(sent,[]);
 analytics.setAllowed(true);
 analytics.position('lobby',0,20,1000);
 analytics.position('auditorium',0,28,2000);
 analytics.position('lobby',0,20,3000);
 analytics.position('auditorium',0,28,4000);
 analytics.position('auditorium',0,35,4500);
 analytics.interrupt();
 analytics.position('auditorium',GOLDEN_HALL.balconyHeight,12,5500);
 analytics.position('auditorium',GOLDEN_HALL.balconyHeight,29,10000);
 analytics.interrupt();
 analytics.flush();
 analytics.flush();
 assert.deepEqual(sent,[
  {name:'pleee_zone_flow',params:{hall:'classical',from_zone:'1_lobby',to_zone:'1_rear',action_count:2}},
  {name:'pleee_zone_flow',params:{hall:'classical',from_zone:'1_rear',to_zone:'1_lobby',action_count:1}},
  {name:'pleee_last_zone',params:{hall:'classical',floor:2,area:'rear'}},
 ]);
});

test('withdrawal erases the saved pair and last zone and a failed tag call is not replayed',()=>{
 const commands:unknown[][]=[];
 const analytics=new ZoneAnalytics('jazz',()=>true,event=>{
  dispatchDetailedEvent((...args)=>commands.push(args),'G-TESTMOCK',event);
  throw Error('simulated unavailable transport');
 });
 analytics.setAllowed(true);
 analytics.position('lobby',0,20,0);
 analytics.position('auditorium',0,35,1000);
 analytics.setAllowed(false);
 analytics.flush();
 assert.deepEqual(commands,[]);
 analytics.setAllowed(true);
 analytics.position('auditorium',0,12,2000);
 analytics.flush();
 analytics.flush();
 assert.deepEqual(commands,[['event','pleee_last_zone',{
  hall:'jazz',floor:1,area:'middle',page_location:'https://pleee.hall-live.workers.dev/',
  page_referrer:'',page_title:'PLEEE',send_to:'G-TESTMOCK',
 }]]);
});
