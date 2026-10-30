import test from 'node:test';
import assert from 'node:assert/strict';
import {SEATS} from '../shared/venue';
import {seatMapPosition,SEAT_MAP_SIZE} from '../src/seatMapLayout';
test('the ticket map includes all 456 seats without overlapping targets',()=>{
 assert.equal(SEATS.length,456);const placed=SEATS.map(s=>({s,...seatMapPosition(s)}));
 for(const p of placed){assert.ok(p.x>=0&&p.x+20<=SEAT_MAP_SIZE.width);assert.ok(p.y>=100&&p.y+22<SEAT_MAP_SIZE.height);}
 for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){const a=placed[i],b=placed[j];assert.ok(Math.abs(a.x-b.x)>=20||Math.abs(a.y-b.y)>=22,`${a.s.id} overlaps ${b.s.id}`);}
 assert.ok(seatMapPosition(SEATS[0]).y<seatMapPosition(SEATS[351]).y);
});
