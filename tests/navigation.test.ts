import test from 'node:test';import assert from 'node:assert/strict';
import {SEATS,FLOOR_SEATS,SPAWN,walkable,canSit,STAIR_DOORS,stairPoint,stairLink,distance} from '../shared/venue';import {findPath,segmentClear} from '../src/navigation/path';import {GALLERY_BRIDGE} from '../shared/gallery';
test('every selectable seat is reachable from the entrance without passing through a chair',()=>{for(const seat of SEATS){const path=findPath('auditorium',SPAWN.auditorium,seat.approach);assert.ok(path,seat.id);let previous=SPAWN.auditorium;for(const step of path){assert.ok(segmentClear('auditorium',previous,step)||stairLink(previous,step,.01),seat.id);previous=step;}assert.deepEqual(path.at(-1),seat.approach);}});
test('chair centers and the stage are not walking targets',()=>{for(const s of FLOOR_SEATS)assert.equal(walkable('auditorium',s),false);assert.equal(findPath('auditorium',SPAWN.auditorium,{x:0,z:-16}),null);});
test('routes around a foyer column do not cut its corners',()=>{const start={x:-5.4,z:7},end={x:-5.4,z:15},path=findPath('lobby',start,end);assert.ok(path);assert.equal(segmentClear('lobby',start,end),false);let previous=start;for(const p of path){assert.ok(segmentClear('lobby',previous,p));previous=p;}});

test('seat approaches lie in front, and every route reaches the upper floor through a corridor stair door',()=>{for(const seat of SEATS){const forward={x:-Math.sin(seat.yaw),z:-Math.cos(seat.yaw)},offset={x:seat.approach.x-seat.x,z:seat.approach.z-seat.z};assert.ok(offset.x*forward.x+offset.z*forward.z>.9);assert.ok(canSit(seat.approach,seat));assert.equal(canSit({x:seat.x-offset.x,y:seat.y,z:seat.z-offset.z},seat),false);if(seat.level==='balcony'){const path=findPath('auditorium',SPAWN.auditorium,seat.approach)!;assert.ok(path.some((p,i)=>i>0&&stairLink(path[i-1],p,.01)),'climbs through a corridor stair door');}}});
test('stairs support the descent and a cross-gallery route without jumping off edges',()=>{for(const side of [-1,1]){const top=stairPoint(side,true),bottom=stairPoint(side,false),route=findPath('auditorium',top,bottom);assert.ok(route);assert.ok(route.some(p=>(p.y??0)===0));assert.equal(walkable('auditorium',{x:0,y:4,z:0}),false);const across=findPath('auditorium',{x:13.5,y:8.3,z:-20},{x:-13.5,y:8.3,z:-20});assert.ok(across);assert.ok(across.some(p=>p.z>GALLERY_BRIDGE.minZ));}});

test('there is no staircase inside the hall: stair doors pair only on the same side',()=>{
 for(const side of [-1,1]){const lo=stairPoint(side,false),hi=stairPoint(side,true);
  assert.ok(walkable('auditorium',lo)&&walkable('auditorium',hi));assert.ok(lo.z>=STAIR_DOORS.lower.z-1e-9&&hi.y===STAIR_DOORS.height);
  assert.ok(stairLink(lo,hi));assert.equal(stairLink(lo,stairPoint(-side,true)),false);}
 for(const x of [0,4,8,12])for(const y of [2,4,6])assert.equal(walkable('auditorium',{x,y,z:46}),false,'no stair slope in the room');
});

test('the strip right in front of the stage is walkable from the aisles',async()=>{
 const {findPath}=await import('../src/navigation/path');const {walkable,STAGE_APRON_Z}=await import('../shared/venue');
 for(const x of [-12,-6.4,0,6.4,12]){const p={x,y:0,z:STAGE_APRON_Z+.3};assert.ok(walkable('auditorium',p),`x ${x}`);assert.ok(findPath('auditorium',{x:0,y:0,z:47},p),`reach x ${x}`);}
 assert.ok(!walkable('auditorium',{x:0,y:0,z:-10}),'the stage itself stays off limits');
});
