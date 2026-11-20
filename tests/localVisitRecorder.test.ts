import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalVisitRecorder,mapSeatAction,otherVisitorGroup,confirmedVisitorSeat} from '../src/diagnostics/LocalVisitRecorder';

const lobby={hall:'classical',zone:'lobby',x:1,y:0,z:25,walking:false,seat:null,track:'mozart',playlist:'classical',measuredMs:0} as const;
test('records measured visible intervals, never bridges hidden or delayed samples or track changes',()=>{
 const r=new LocalVisitRecorder('visit');
 r.record(lobby,10000,0);
 r.record({...lobby,measuredMs:6700},20000,10000);
 assert.equal(r.rows[1].dwellMs,10000);assert.equal(r.rows[1].playbackMs,6700);
 r.interrupt();r.record(lobby,90000,80000);
 assert.equal(r.rows[2].dwellMs,null);assert.equal(r.rows[2].seq,4);
 r.record({...lobby,track:'other'},100000,90000);
 assert.equal(r.rows[3].playbackMs,null);
 r.record(lobby,125000,115000);assert.equal(r.rows[4].dwellMs,null);
 r.record({...lobby,zone:'auditorium',z:8},135000,125000);
 assert.equal(r.rows[5].move,'transition');assert.equal(r.rows[5].dwellMs,null);
 assert.equal(r.rows[5].area,'middle');
});
test('map clicks are allowlisted, independent of current seating',()=>{
 assert.equal(mapSeatAction('parterre-1'),'hall_selected_parterre_1');assert.equal(mapSeatAction('untrusted'),null);
 const r=new LocalVisitRecorder('visit');r.record(lobby,0,0,mapSeatAction('parterre-1'));
 assert.equal(r.rows[0].action,'hall_selected_parterre_1');assert.equal(r.rows[0].seat,null);
});

test('seat claims must match the actual local visitor and seated state',async()=>{
 const {LocalConcert}=await import('../src/network/LocalConcert');
 const hall=new LocalConcert(),id=hall.visitor.id;
 hall.send({type:'zone',zone:'auditorium'});
 hall.send({type:'reserve',seatId:'parterre-1',requestId:'r'});
 assert.equal(confirmedVisitorSeat(hall.snapshot(),hall.visitor,id),null);
 hall.send({type:'seated',seatId:'parterre-1'});
 assert.equal(confirmedVisitorSeat(hall.snapshot(),hall.visitor,'other'),null);
 assert.equal(confirmedVisitorSeat(hall.snapshot(),hall.visitor,id),'parterre-1');
 hall.send({type:'release'});
 assert.equal(confirmedVisitorSeat(hall.snapshot(),hall.visitor,id),null);
 assert.deepEqual([0,1,2,4,5,130].map(otherVisitorGroup),['0','1','2-4','2-4','5+','5+']);
});
