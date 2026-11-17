import assert from 'node:assert/strict';
import test from 'node:test';
import {activeHighFive,HIGH_FIVE_MS,startHighFive,USHER_HIGH_FIVE_ID,withinHighFiveReach} from '../shared/highFive';
import {SPAWN,type Visitor} from '../shared/venue';
import {highFivePose} from '../src/character/highFivePose';

const now=10_000;
const visitor=(id:string,x:number):Visitor=>({
 id,name:id,color:0,zone:'lobby',...SPAWN.lobby,x,yaw:0,pose:'idle',seatId:null,gesture:null,gestureAt:0,
});

test('one accepted greeting coordinates both visitors and expires without replay',()=>{
 const a=visitor('a',0),b=visitor('b',1),c=visitor('c',-1);
 const visitors=[a,b,c];
 assert.ok(startHighFive(a,{id:b.id},visitors,now));
 assert.equal(activeHighFive(a,now)?.id,b.id);
 assert.equal(startHighFive(b,{id:a.id},visitors,now+50),undefined);
 assert.equal(startHighFive(c,{id:a.id},visitors,now+50),undefined);
 assert.equal(activeHighFive(a,now+HIGH_FIVE_MS),undefined);
 assert.ok(startHighFive(c,{id:a.id},visitors,now+HIGH_FIVE_MS));
});

test('visitor greetings reject other rooms, floors and out-of-reach targets',()=>{
 const a=visitor('a',0),b=visitor('b',1);
 assert.equal(startHighFive(a,{id:a.id},[a,b],now),undefined);
 assert.equal(startHighFive(a,{id:b.id},[a,b],now),true);
 for(const target of [{...b,zone:'auditorium' as const},{...b,y:.65},{...b,x:2},{...b,gesture:'eat' as const,gestureAt:now}]){
  delete a.highFive;
  assert.equal(startHighFive(a,{id:b.id},[a,target],now),undefined);
 }
 assert.equal(startHighFive(a,{id:b.id,npc:true},[a,b],now),undefined);
});

test('a valid NPC gesture can be recorded in a solo session',()=>{
 const sender={...visitor('a',0),zone:'auditorium' as const,...SPAWN.auditorium};
 assert.ok(startHighFive(sender,{id:USHER_HIGH_FIVE_ID,npc:true},[sender],now));
 assert.equal(activeHighFive(sender,now)?.npc,true);
 sender.zone='lobby';
 assert.equal(activeHighFive(sender,now),undefined);
});

test('the two poses face each other and reach toward the same contact point',()=>{
 const a={...SPAWN.lobby,sitting:false},b={...a,x:a.x+1.25};
 assert.ok(withinHighFiveReach('lobby',a,b));
 const first=highFivePose(a,b,.5,false),second=highFivePose(b,a,.5,false);
 assert.equal(first.yaw,Math.PI/2);
 assert.equal(second.yaw,-Math.PI/2);
 assert.equal(first.reach,1);
 assert.equal(first.hand.y,second.hand.y);
 assert.ok(Math.abs(second.hand.x-first.hand.x-.12)<1e-8);
 assert.equal(first.dx,-second.dx);
 assert.equal(highFivePose({...a,sitting:true},b,.5,false).dx,0);
 assert.equal(highFivePose(a,b,.5,true).dx,0);
});
