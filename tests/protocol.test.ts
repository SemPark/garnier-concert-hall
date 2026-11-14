import test from 'node:test';import assert from 'node:assert/strict';
import {applyDelta,type Snapshot} from '../shared/protocol';
import {CAPACITY,SEATS,type Visitor} from '../shared/venue';

const visitor=(id:string,x=0):Visitor=>({id,name:id,color:0,zone:'auditorium',x,y:0,z:0,yaw:0,pose:'idle',seatId:null,gesture:null,gestureAt:0});
const base:Snapshot={revision:4,visitors:[visitor('a'),visitor('b'),visitor('c')],seats:{s1:{visitorId:'a',status:'seated',expiresAt:null}},serverNow:0,roomId:'hall-1'};

test('capacity counts only the 123 visitor seats',()=>{assert.equal(CAPACITY,SEATS.length);assert.equal(CAPACITY,123);});

test('a delta moves, adds and removes visitors and seat claims in place',()=>{
 const next=applyDelta(base,{revision:5,base:4,visitors:[visitor('b',3),visitor('d')],left:['c'],seats:{s1:null,s2:{visitorId:'b',status:'reserved',expiresAt:9}},serverNow:7})!;
 assert.deepEqual(next.visitors.map(v=>v.id),['a','b','d'],'order is kept, newcomers go last');
 assert.equal(next.visitors[1].x,3);assert.deepEqual(Object.keys(next.seats),['s2']);assert.equal(next.revision,5);assert.equal(next.serverNow,7);assert.equal(next.roomId,'hall-1');
 assert.equal(base.visitors.length,3,'the previous state is untouched');
});

test('a delta built on another revision is refused so the client asks for the whole hall',()=>{
 assert.equal(applyDelta(base,{revision:7,base:6,visitors:[],left:[],seats:{},serverNow:0}),null);
});

test('with a full house, one visitor walking sends a few hundred bytes, not the whole hall',()=>{
 const full=JSON.stringify({type:'state',state:{...base,visitors:SEATS.map((s,i)=>({...visitor(crypto.randomUUID()),x:s.x+Math.random()/3,z:s.z,pose:'sit',seatId:s.id,name:`관객 ${i}`})),seats:Object.fromEntries(SEATS.map(s=>[s.id,{visitorId:crypto.randomUUID(),status:'seated',expiresAt:null}]))}});
 const step=JSON.stringify({type:'delta',delta:{revision:5,base:4,visitors:[{...visitor(crypto.randomUUID()),x:1.234,z:5.678,yaw:.785,pose:'walk'}],left:[],seats:{},serverNow:Date.now()}});
 assert.ok(full.length>step.length*50,`full state ${full.length} bytes`);assert.ok(step.length<400,`delta ${step.length} bytes`);
});
