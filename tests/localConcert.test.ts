import test from 'node:test';import assert from 'node:assert/strict';
import {LocalConcert} from '../src/network/LocalConcert';
import {SEATS,BALCONY_SEATS,SPAWN} from '../shared/venue';
test('static visitor can enter, reserve, approach, sit and stand without a server',()=>{
 const room=new LocalConcert(),seat=SEATS[0];
 assert.equal(room.send({type:'reserve',seatId:seat.id,requestId:'a'}),false);
 room.send({type:'zone',zone:'auditorium'});assert.equal(room.visitor.z,SPAWN.auditorium.z);
 assert.equal(room.send({type:'reserve',seatId:seat.id,requestId:'b'}),true);
 assert.equal(room.send({type:'seated',seatId:seat.id}),false);
 room.send({type:'move',...seat.approach,yaw:0,pose:'walk'});
 assert.equal(room.send({type:'seated',seatId:seat.id}),true);assert.equal(room.visitor.pose,'sit');
 assert.equal(room.snapshot().seats[seat.id].status,'seated');
 assert.equal(room.send({type:'release',requestId:'stale'}),false);
 room.send({type:'release'});assert.equal(room.visitor.pose,'idle');assert.equal(room.visitor.z,seat.approach.z);assert.deepEqual(room.snapshot().seats,{});
 room.send({type:'gesture',gesture:'clap'});assert.equal(room.visitor.gesture,'clap');
 room.send({type:'zone',zone:'lobby'});assert.equal(room.visitor.z,SPAWN.lobby.z);
});

test('balcony seats can be selected and released through the gallery entrance',()=>{for(const seat of BALCONY_SEATS){const room=new LocalConcert();room.send({type:'zone',zone:'auditorium'});assert.ok(room.send({type:'reserve',seatId:seat.id,requestId:'balcony'}));assert.ok(room.send({type:'seated',seatId:seat.id}));assert.equal(room.visitor.yaw,seat.yaw);assert.equal(room.visitor.x,seat.x);room.send({type:'release'});assert.equal(room.visitor.x,seat.approach.x);assert.equal(room.visitor.z,seat.approach.z);}});
