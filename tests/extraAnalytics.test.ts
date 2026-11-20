import test from 'node:test';
import assert from 'node:assert/strict';
import {ExtraAnalytics,type ExtraEvent} from '../src/analytics/ExtraAnalytics';
import {DetailedAnalytics} from '../src/analytics/DetailedAnalytics';
import {dispatchDetailedEvent} from '../src/analytics/ga4';
import {SEATS} from '../shared/venue';

test('existing seat consent does not authorize the additional analytics',()=>{
 const sent:unknown[]=[];
 const seat=new DetailedAnalytics(()=>true,event=>sent.push(event.name));
 const extra=new ExtraAnalytics('jazz',()=>true,event=>sent.push(event.name));
 seat.setAllowed(true);
 seat.selected(SEATS[0].id);
 extra.feature('tarot');
 extra.samplePlayback({nowMs:1000,positionSeconds:1,revision:0,playbackRate:1,audible:true});
 seat.flush();
 extra.flush();
 assert.deepEqual(sent,['pleee_seat']);
});

test('dispatches approved hall, feature and audible listening aggregates once',()=>{
 const sent:ExtraEvent[]=[];
 const extra=new ExtraAnalytics('classical',()=>true,event=>sent.push(event));
 extra.setAllowed(true);
 extra.feature('tarot');
 extra.feature('tarot','completed');
 extra.feature('hall_playlist_open');
 extra.feature('hall_playlist_open');
 extra.feature('hall_playlist_open','completed');
 for(let n=0;n<=185;n++){
  extra.samplePlayback({nowMs:n*1000,positionSeconds:n,revision:0,playbackRate:1,audible:true});
 }
 extra.samplePlayback({nowMs:186000,positionSeconds:185,revision:0,playbackRate:1,audible:false});
 extra.flush();
 extra.flush();
 assert.deepEqual(sent,[
  {name:'pleee_hall',params:{hall:'classical'}},
  {name:'pleee_feature',params:{hall:'classical',feature:'tarot',feature_action:'completed',action_count:1}},
  {name:'pleee_feature',params:{hall:'classical',feature:'hall_playlist_open',feature_action:'used',action_count:2}},
  {name:'pleee_feature',params:{hall:'classical',feature:'tarot',feature_action:'used',action_count:1}},
  {name:'pleee_listening',params:{hall:'classical',playback_state:'not_playing',listening_seconds:185}},
 ]);
});

test('withdrawal clears pending events and failed dispatch does not retry',()=>{
 const sent:unknown[][]=[];
 const extra=new ExtraAnalytics('jazz',()=>true,event=>{
  dispatchDetailedEvent((...args)=>sent.push(args),'G-TESTMOCK',event);
  throw new Error('simulated dispatch failure');
 });
 extra.setAllowed(true);
 extra.feature('tarot');
 extra.setAllowed(false);
 extra.flush();
 assert.deepEqual(sent,[]);
 extra.setAllowed(true);
 extra.flush();
 extra.flush();
 assert.deepEqual(sent,[['event','pleee_hall',{
  hall:'jazz',page_location:'https://pleee.hall-live.workers.dev/',page_referrer:'',page_title:'PLEEE',send_to:'G-TESTMOCK',
 }]]);
});
