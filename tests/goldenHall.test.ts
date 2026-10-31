import test from 'node:test';import assert from 'node:assert/strict';
import {GOLDEN_HALL as H} from '../shared/goldenHall';
import {FLOOR_SEATS,FLOOR_ROWS,FLOOR_AISLES,FLOOR_CROSS_AISLE,BALCONY_SEATS,SEATS,SPAWN,walkable} from '../shared/venue';
import {findPath,segmentClear} from '../src/navigation/path';
test('the rectangular hall follows the reference length, width and height proportions',()=>{
 const length=H.rear-H.front;assert.ok(Math.abs(length/H.width-H.referenceDimensions.length/H.referenceDimensions.width)<.01);assert.ok(Math.abs(H.height/H.width-H.referenceDimensions.height/H.referenceDimensions.width)<.01);
 assert.ok(H.balconyHeight>6&&H.balconyHeight<H.height/2);
});
test('three seating blocks have two inner aisles, wall-side aisles and a cross aisle',()=>{
 assert.equal(FLOOR_SEATS.length,352);assert.equal(BALCONY_SEATS.length,96);assert.equal(SEATS.length,448);
 const first=FLOOR_SEATS.slice(0,16);assert.deepEqual([first.filter(s=>s.x<-6.4).length,first.filter(s=>Math.abs(s.x)<6.4).length,first.filter(s=>s.x>6.4).length],[4,8,4]);
 for(const x of FLOOR_AISLES){assert.ok(segmentClear('auditorium',{x,z:-7.2},{x,z:44}));const path=findPath('auditorium',SPAWN.auditorium,{x,z:-7.2});assert.ok(path);let previous=SPAWN.auditorium;for(const p of path){assert.ok(segmentClear('auditorium',previous,p));previous=p;}}
 assert.ok(segmentClear('auditorium',{x:-13.4,z:FLOOR_CROSS_AISLE},{x:13.4,z:FLOOR_CROSS_AISLE}));
});

test('every row has a continuous walkable approach lane with room between the seats',()=>{
 for(let row=0;row<FLOOR_ROWS.length;row++){const z=FLOOR_ROWS[row]-1.05;assert.ok(segmentClear('auditorium',{x:-13.4,z},{x:13.4,z}),`row ${row+1}`);if(row>0)assert.ok(FLOOR_ROWS[row]-FLOOR_ROWS[row-1]-.96>=1.2-1e-8);}
});

test('all floor seats share 16 aligned columns, with no isolated front block',()=>{for(let row=1;row<=22;row++){const seats=FLOOR_SEATS.filter(s=>s.row===row);assert.equal(seats.length,16);assert.deepEqual(seats.map(s=>s.x),FLOOR_SEATS.slice(0,16).map(s=>s.x));}assert.equal(new Set(SEATS.map(s=>s.id)).size,448);});

test('the four balcony seats beside each organ wing are absent from picking and collision data',()=>{
 for(const side of [-1,1]){const name=side<0?'left':'right';assert.equal(BALCONY_SEATS.filter(s=>Math.sign(s.x)===side).length,48);assert.ok(SEATS.some(s=>s.id===`balcony-${name}-5`));for(let i=1;i<=4;i++){assert.equal(SEATS.some(s=>s.id===`balcony-${name}-${i}`),false);assert.equal(walkable('auditorium',{x:side*15,y:H.balconyHeight,z:H.bayCenters[0]-side*[-1.8,-.6,.6,1.8][i-1]}),true);}}
});
