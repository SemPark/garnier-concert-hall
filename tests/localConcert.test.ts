import test from 'node:test';import assert from 'node:assert/strict';
import {LocalConcert} from '../src/network/LocalConcert';
import {SEATS,BALCONY_SEATS,SPAWN,distance,type Point} from '../shared/venue';
import {findPath} from '../src/navigation/path';
function walk(room:LocalConcert,end:Point){const path=findPath('auditorium',room.visitor,end);assert.ok(path);for(const target of path){while(distance(room.visitor,target)>.01){const p=room.visitor,d=distance(p,target),t=Math.min(1,d)/d;assert.ok(room.send({type:'move',x:p.x+(target.x-p.x)*t,y:(p.y??0)+((target.y??0)-(p.y??0))*t,z:p.z+(target.z-p.z)*t,yaw:0,pose:'walk'}));}}}
test('static visitor enters, walks to the front, sits and stands without crossing the backrest',()=>{
 const room=new LocalConcert(),seat=SEATS[0];assert.equal(room.send({type:'reserve',seatId:seat.id,requestId:'a'}),false);
 room.send({type:'zone',zone:'auditorium'});assert.equal(room.visitor.z,SPAWN.auditorium.z);
 assert.ok(room.send({type:'reserve',seatId:seat.id,requestId:'b'}));assert.equal(room.send({type:'seated',seatId:seat.id}),false);
 walk(room,seat.approach);assert.ok(room.visitor.z<seat.z);assert.ok(room.send({type:'seated',seatId:seat.id}));
 assert.equal(room.snapshot().seats[seat.id].status,'seated');assert.equal(room.send({type:'release',requestId:'stale'}),false);
 room.send({type:'release'});assert.equal(room.visitor.pose,'idle');assert.equal(room.visitor.z,seat.approach.z);assert.deepEqual(room.snapshot().seats,{});
 room.send({type:'gesture',gesture:'clap'});assert.equal(room.visitor.gesture,'clap');room.send({type:'zone',zone:'lobby'});assert.equal(room.visitor.z,SPAWN.lobby.z);
});
test('every balcony seat requires stairs and releases onto its own upper-floor aisle',()=>{for(const seat of BALCONY_SEATS){const room=new LocalConcert();room.send({type:'zone',zone:'auditorium'});assert.ok(room.send({type:'reserve',seatId:seat.id,requestId:'balcony'}));assert.equal(room.send({type:'seated',seatId:seat.id}),false);walk(room,seat.approach);assert.ok(room.send({type:'seated',seatId:seat.id}));assert.equal(room.visitor.y,seat.y);assert.equal(room.visitor.yaw,seat.yaw);room.send({type:'release'});assert.equal(room.visitor.y,seat.y);assert.equal(room.visitor.x,seat.approach.x);assert.equal(room.visitor.z,seat.approach.z);}});
test('upper floor cannot be reached by teleporting above a ground floor coordinate',()=>{const room=new LocalConcert();room.send({type:'zone',zone:'auditorium'});assert.equal(room.send({type:'move',x:13.5,y:8.3,z:46,yaw:0,pose:'walk'}),false);});
