import test from 'node:test';
import assert from 'node:assert/strict';
import {NpcBehavior} from '../src/scene/NpcBehavior';
import {whiteRabbitSpot} from '../src/scene/WhiteRabbit';
import {FLOOR_SEATS,type Visitor} from '../shared/venue';
import type {GhostSpot} from '../src/scene/Ghosts';

const visitor=(spot:GhostSpot,gesture:Visitor['gesture'],time:number):Visitor=>({
 id:'test',name:'guest',color:0,zone:'auditorium',x:spot.x+1,y:spot.y,z:spot.z,
 yaw:0,pose:'idle',seatId:null,gesture,gestureAt:time*1000,
});
const role=(spots:GhostSpot[],costume:string)=>spots.find(s=>s.costume===costume)!;

test('rabbit stops for its watch, sprints, and stays continuous across every phase boundary',()=>{
 assert.equal(whiteRabbitSpot(15).walking,false);
 assert.equal(whiteRabbitSpot(15).behavior?.action,'check-watch');
 assert.equal(whiteRabbitSpot(16.5).behavior?.action,'startled');
 assert.equal(whiteRabbitSpot(18).behavior?.action,'late-sprint');
 for(const time of [-24,0,14,17,21,24,48]){
  const a=whiteRabbitSpot(time-.0001),b=whiteRabbitSpot(time+.0001);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.003);
 }
});
test('nearby rabbit pauses once then passes continuously even if the audience stays',()=>{
 const brain=new NpcBehavior();
 let rabbit=role(brain.update(1,[],{},null),'white-rabbit');
 const audience=visitor(rabbit,null,1);
 rabbit=role(brain.update(1,[audience],{},null),'white-rabbit');
 const held=role(brain.update(1.5,[audience],{},null),'white-rabbit');
 assert.equal(held.walking,false);
 assert.ok(Math.hypot(rabbit.x-held.x,rabbit.z-held.z)<.001);
 const passing=role(brain.update(2,[audience],{},null),'white-rabbit');
 assert.equal(passing.behavior?.action,'hurry-past');
 assert.equal(passing.walking,true);
});
test('queen greeting takes priority and expires without retriggering a stale wave',()=>{
 const brain=new NpcBehavior();
 const queen=role(brain.update(1,[],{},null),'queen');
 const wave=visitor(queen,'wave',1);
 assert.equal(role(brain.update(1,[wave],{},null),'queen').behavior?.state,'reaction');
 assert.equal(role(brain.update(1.1,[wave],{},null),'queen').behavior?.action,'greet');
 assert.notEqual(role(brain.update(5,[wave],{},null),'queen').behavior?.state,'reaction');
});
test('queen disapproves of multiple clappers and candle reacts to applause',()=>{
 const brain=new NpcBehavior(),spots=brain.update(10,[],{},null);
 const queen=role(spots,'queen'),candle=role(spots,'candra');
 const a=visitor(queen,'clap',10),b={...a,id:'second'};
 assert.equal(role(brain.update(10,[a,b],{},null),'queen').behavior?.action,'disapprove');
 const clap=visitor(candle,'clap',11);
 assert.equal(role(brain.update(11,[clap],{},null),'candra').behavior?.action,'applause-flicker');
});
test('lantern helps the weak candle and yields to its greeting reaction',()=>{
 const brain=new NpcBehavior();
 const spots=brain.update(31,[],{},null);
 assert.equal(role(spots,'candra').behavior?.action,'protect-flame');
 assert.equal(role(spots,'vesper').behavior?.action,'light-neighbour');
 const wave=visitor(role(spots,'vesper'),'wave',31);
 assert.equal(role(brain.update(31,[wave],{},null),'vesper').behavior?.action,'greet');
 const seat=FLOOR_SEATS.find(s=>s.row===8&&s.column===4)!;
 const occupied=new NpcBehavior().update(31,[],{[seat.id]:{visitorId:'guest',status:'seated',expiresAt:null}},null);
 assert.ok(!occupied.some(s=>s.costume==='candra'));
 assert.notEqual(role(occupied,'vesper').behavior?.action,'light-neighbour');
});
test('phantom reacts only on its floor and bows on approach, with reduced motion respected',()=>{
 const brain=new NpcBehavior(),phantom=role(brain.update(100,[],{},null),'phantom');
 const guest=visitor(phantom,null,100);
 assert.equal(role(brain.update(100,[{...guest,y:-1.3}],{},null),'phantom').behavior?.state,'idle');
 assert.equal(role(brain.update(100.1,[guest],{},null),'phantom').behavior?.action,'approach');
 const reduced=brain.update(100.2,[guest],{},null,true);
 for(const spot of reduced){
  assert.equal(spot.behavior?.flameTilt,0);
  assert.equal(spot.behavior?.headPitch,0);
 }
});
test('phantom walks into cover and returns without teleporting when someone approaches',()=>{
 const brain=new NpcBehavior();
 let previous=role(brain.update(200,[],{},null),'phantom');
 let hidden=false;
 for(let i=1;i<1500;i++){
  const time=200+i/30;
  const current=brain.update(time,[],{},null).find(s=>s.costume==='phantom');
  if(!current){hidden=true;continue;}
  assert.ok(Math.hypot(current.x-previous.x,current.z-previous.z)<.12);
  previous=current;
 }
 assert.ok(hidden);
 const visitorNear=visitor(previous,null,250);
 for(let i=0;i<120;i++){
  const current=role(brain.update(250+i/30,[visitorNear],{},null),'phantom');
  assert.ok(Math.hypot(current.x-previous.x,current.z-previous.z)<.12);
  previous=current;
 }
});
test('same audience wave does not restart the nod; a new wave can trigger a new response',()=>{
 const brain=new NpcBehavior(),queen=role(brain.update(10,[],{},null),'queen');
 const guest=visitor(queen,'wave',10);
 brain.update(10,[guest],{},null);
 assert.ok(role(brain.update(11,[guest],{},null),'queen').behavior!.age>.9);
 assert.equal(role(brain.update(14,[{...guest,gestureAt:14000}],{},null),'queen').behavior?.action,'greet');
});

test('tea guests answer a nearby bow and ignore visitors on another floor',()=>{
 const brain=new NpcBehavior();
 const guests=brain.update(10,[],{},null).filter(spot=>spot.teaGuest);
 assert.equal(guests.length,2);
 const bow=visitor(guests[0],'bow',10);
 assert.ok(brain.update(10,[{...bow,y:8.3}],{},null).filter(spot=>spot.teaGuest)
  .every(spot=>spot.behavior?.action!=='greet'));
 assert.ok(brain.update(10.1,[bow],{},null).filter(spot=>spot.teaGuest)
  .every(spot=>spot.behavior?.action==='greet'));
});

test('white rabbit answers briefly and an explicit wave overrides phantom approach',()=>{
 const brain=new NpcBehavior(),spots=brain.update(100,[],{},null);
 const rabbit=visitor(role(spots,'white-rabbit'),'wave',100);
 assert.equal(role(brain.update(100,[rabbit],{},null),'white-rabbit').behavior?.action,'greet');
 assert.notEqual(role(brain.update(102,[rabbit],{},null),'white-rabbit').behavior?.action,'greet');
 const phantom=role(brain.update(103,[],{},null),'phantom');
 const guest=visitor(phantom,null,103);
 assert.equal(role(brain.update(103,[guest],{},null),'phantom').behavior?.action,'approach');
 assert.equal(role(brain.update(104,[{...guest,gesture:'wave',gestureAt:104000}],{},null),'phantom').behavior?.action,'greet');
});
