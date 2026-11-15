import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_SEATS,SEATS,NPC_SEATS,CAPACITY} from '../shared/venue';
import {LocalConcert} from '../src/network/LocalConcert';

test('all five NPC chairs remain physical but cannot be selected by visitors',()=>{
 assert.deepEqual(NPC_SEATS.map(s=>[s.row,s.column]),[[8,3],[8,4],[21,2],[23,1],[23,2]]);
 for(const seat of NPC_SEATS){
  assert.ok(ALL_SEATS.includes(seat));
  assert.ok(!SEATS.some(s=>s.id===seat.id));
 }
 assert.equal(CAPACITY,ALL_SEATS.length-NPC_SEATS.length);
});

test('solo mode rejects both reserve and seated messages targeting NPC chairs',()=>{
 const room=new LocalConcert();
 room.send({type:'zone',zone:'auditorium'});
 const visitorSeat=SEATS.find(s=>s.row===8&&s.column===1)!;
 assert.ok(room.send({type:'reserve',seatId:visitorSeat.id,requestId:'guest'}));
 assert.ok(room.send({type:'seated',seatId:visitorSeat.id}));
 for(const seat of NPC_SEATS){
  assert.equal(room.send({type:'reserve',seatId:seat.id,requestId:seat.id}),false);
  assert.equal(room.send({type:'seated',seatId:seat.id}),false);
  assert.equal(room.snapshot().seats[seat.id],undefined);
  assert.equal(room.visitor.seatId,visitorSeat.id,'rejected request preserves the current seat');
 }
});
