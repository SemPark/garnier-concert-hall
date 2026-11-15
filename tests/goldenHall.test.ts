import {DINNER_TABLES,DINNER_LANES_Z,CHAIR_RING,DINNER_SIT_BACK} from '../shared/dinnerTables';
import {PARTERRE} from '../shared/parterre';
import test from 'node:test';import assert from 'node:assert/strict';
import {GOLDEN_HALL as H} from '../shared/goldenHall';
import {FLOOR_SEATS,FLOOR_ROWS,FLOOR_AISLES,FLOOR_CROSS_AISLE,BALCONY_SEATS,SEATS,SPAWN,walkable} from '../shared/venue';
import {findPath,segmentClear} from '../src/navigation/path';
test('the rectangular hall follows the reference length, width and height proportions',()=>{
 const length=H.rear-H.front;assert.ok(Math.abs(length/H.width-H.referenceDimensions.length/H.referenceDimensions.width)<.01);assert.ok(Math.abs(H.height/H.width-H.referenceDimensions.height/H.referenceDimensions.width)<.01);
 assert.ok(H.balconyHeight>6&&H.balconyHeight<H.height/2);
});
test('the dinner floor keeps four physical chairs per table and reserves five for story NPCs',()=>{
 assert.equal(DINNER_TABLES.length,32);assert.equal(FLOOR_SEATS.length,128);assert.equal(SEATS.length,123);
 assert.equal(new Set(SEATS.map(s=>s.id)).size,123);
 for(const table of DINNER_TABLES){const seats=FLOOR_SEATS.filter(s=>s.row===table.id);assert.equal(seats.length,4);assert.deepEqual(seats.map(s=>s.column),[1,2,3,4]);
  for(const seat of seats){assert.ok(Math.abs(Math.hypot(seat.x-table.x,seat.z-table.z)-(CHAIR_RING+DINNER_SIT_BACK))<1e-8);assert.ok(walkable('auditorium',seat.approach));assert.ok(findPath('auditorium',SPAWN.auditorium,seat.approach));}}
});
test('table rows keep clear cross lanes and side aisles at the actual floor height',()=>{
 for(const z of DINNER_LANES_Z)assert.ok(segmentClear('auditorium',{x:-11.4,y:PARTERRE.floor,z},{x:11.4,y:PARTERRE.floor,z}),`lane ${z}`);
 for(const x of [-11.4,11.4])assert.ok(segmentClear('auditorium',{x,y:PARTERRE.floor,z:-7.4},{x,y:PARTERRE.floor,z:39.3}));
});
test('the galleries remain walking areas without selectable chairs',()=>{
 assert.equal(BALCONY_SEATS.length,0);assert.ok(SEATS.every(s=>s.level==='parterre'));
 for(const side of [-1,1])assert.ok(walkable('auditorium',{x:side*14,y:H.balconyHeight,z:20}));
});
