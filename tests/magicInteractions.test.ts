import test from 'node:test';
import assert from 'node:assert/strict';
import {RESTING_CHAIR,updateMagicChair,updateMagicChairs,chairOffset,MAGIC_CHAIR_SEAT,MAGIC_CHAIR_ID,MAGIC_CHAIR_TRAVEL} from '../shared/magicChair';
import {applyDelta} from '../shared/protocol';
import {FLOOR_SEATS,walkable,obstacles,type Visitor} from '../shared/venue';
import {PROGRAM_BOOK} from '../shared/programBook';

const visitor=(id='a'):Visitor=>({id,name:id,color:0,zone:'auditorium',...MAGIC_CHAIR_SEAT.approach,yaw:0,pose:'idle',seatId:null,gesture:null,gestureAt:0});
test('chair opens once, delays after departure, and reverses continuously on renewed approach',()=>{
 const open=updateMagicChair(RESTING_CHAIR,[visitor()],undefined,1000);
 assert.equal(chairOffset(open,1000),0);assert.equal(chairOffset(open,2250),MAGIC_CHAIR_TRAVEL);
 assert.equal(updateMagicChair(open,[visitor()],undefined,2000),open);
 const close=updateMagicChair(open,[],undefined,3000);
 assert.equal(chairOffset(close,4500),MAGIC_CHAIR_TRAVEL);
 assert.equal(chairOffset(close,6400),0);
 const reverse=updateMagicChair(close,[visitor()],undefined,5100);
 assert.equal(chairOffset(reverse,5100),chairOffset(close,5100));
});
test('occupied or reserved-by-another chair never opens; sitting returns from the current position',()=>{
 const other={visitorId:'b',status:'reserved' as const,expiresAt:null};
 assert.equal(updateMagicChair(RESTING_CHAIR,[visitor()],other,1000),RESTING_CHAIR);
 assert.equal(updateMagicChair(RESTING_CHAIR,[visitor()],{...other,status:'seated'},1000),RESTING_CHAIR);
 const open=updateMagicChair(RESTING_CHAIR,[visitor()],undefined,1000);
 const close=updateMagicChair(open,[visitor()],{visitorId:'a',status:'seated',expiresAt:null},1800);
 assert.equal(chairOffset(close,1800),chairOffset(open,1800));assert.equal(chairOffset(close,2700),0);
});
test('floor separation, seated visitors and train passengers do not trigger chair',()=>{
 for(const v of [{...visitor(),y:8.3},{...visitor(),pose:'sit' as const},{...visitor(),trainSeat:1},{...visitor(),zone:'lobby' as const}]){
  assert.equal(updateMagicChair(RESTING_CHAIR,[v],undefined,1000),RESTING_CHAIR);
 }
});
test('all viewers receive identical chair animation including newly joined snapshot readers',()=>{
 const state={revision:1,visitors:[visitor()],seats:{},serverNow:1000,roomId:'test',magicChair:RESTING_CHAIR};
 const magicChair=updateMagicChair(RESTING_CHAIR,state.visitors,undefined,1000);
 const delta={base:1,revision:2,visitors:[],left:[],seats:{},serverNow:1100,magicChair};
 const a=applyDelta(state,delta)!,b=applyDelta(structuredClone(state),delta)!;
 for(const time of [1000,1200,1500,2400])assert.equal(chairOffset(a.magicChair,time),chairOffset(b.magicChair,time));
 assert.deepEqual(applyDelta(a,{...delta,base:2,revision:3,magicChair:undefined})?.magicChair,magicChair);
});
test('swept chair clearance remains blocked while side approach and book surroundings remain accessible',()=>{
 const seat=MAGIC_CHAIR_SEAT;
 assert.equal(walkable('auditorium',seat.approach),true);
 for(const amount of [0,MAGIC_CHAIR_TRAVEL/2,MAGIC_CHAIR_TRAVEL]){
  assert.equal(walkable('auditorium',{x:seat.x+Math.sin(seat.yaw)*amount,z:seat.z+Math.cos(seat.yaw)*amount,y:seat.approach.y}),false);
 }
 const book=PROGRAM_BOOK;
 assert.ok(obstacles('auditorium').some(o=>o.x===book.x&&o.z===book.z));
 assert.equal(walkable('auditorium',{x:book.x,y:0,z:book.z+1.1}),true);
 assert.equal(MAGIC_CHAIR_ID,seat.id);
});
test('dynamic chair merges mixed shared primitive attributes into exactly two meshes',async()=>{
 const T=await import('three'),{MagicChair}=await import('../src/scene/MagicChair');
 const root=new T.Group(),gold=new T.MeshStandardMaterial(),cloth=new T.MeshStandardMaterial();
 const box=new T.BoxGeometry(1,1,1);box.setAttribute('uv1',box.getAttribute('uv').clone());
 root.add(new T.Mesh(box,gold),new T.Mesh(new T.CylinderGeometry(1,1,1),gold),new T.Mesh(new T.BoxGeometry(1,1,1),cloth));
 root.position.set(2,0,3);
 const hit=new T.Object3D();hit.position.copy(root.position);
 const chair=new MagicChair(root,hit);
 assert.equal(root.children.length,2);
 chair.update({from:MAGIC_CHAIR_TRAVEL,to:MAGIC_CHAIR_TRAVEL,at:0,duration:1},1);
 assert.equal(root.position.x,hit.position.x);assert.equal(root.position.z,hit.position.z);
 assert.ok(root.children.every(o=>o instanceof T.Mesh&&o.geometry.getAttribute('position').count>0));
});


test('table 8 opens a free chair instead of the candle ghost’s chair',()=>{
 const free=FLOOR_SEATS.find(seat=>seat.row===8&&seat.column===2)!;
 const candle=FLOOR_SEATS.find(seat=>seat.row===8&&seat.column===4)!;
 const guest={...visitor(),...free.approach};
 const state=updateMagicChairs(RESTING_CHAIR,[guest],{},1000);
 assert.equal(state.chairs?.[free.id]?.to,MAGIC_CHAIR_TRAVEL);
 assert.equal(state.chairs?.[candle.id],undefined);
});
