import test from 'node:test';
import assert from 'node:assert/strict';
import type {SeatClaim} from '../shared/protocol';
import {TEA_TABLE} from '../shared/storyGuestSeats';
import {NPC_SEATS,SEATS} from '../shared/venue';
import {availableGhostTableSeat} from '../src/ghostTableSeats';

test('ghost table discovery offers only an available visitor seat at the selected table',()=>{
 const claims:Record<string,SeatClaim>={};
 const seats=SEATS.filter(seat=>seat.row===TEA_TABLE);
 assert.ok(seats.length>0);
 for(const seat of seats){
  const offered=availableGhostTableSeat(TEA_TABLE,claims,'mine');
  assert.equal(offered?.id,seat.id);
  assert.ok(!NPC_SEATS.some(npc=>npc.id===offered?.id));
  claims[seat.id]={visitorId:'other',status:'reserved',expiresAt:5000};
 }
 assert.equal(availableGhostTableSeat(TEA_TABLE,claims,'mine'),undefined);
 assert.equal(availableGhostTableSeat(1,claims,'mine'),undefined);
 claims[seats[0].id]={visitorId:'mine',status:'seated',expiresAt:null};
 assert.equal(availableGhostTableSeat(TEA_TABLE,claims,'mine')?.id,seats[0].id);
});
