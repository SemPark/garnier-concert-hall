import test from 'node:test';import assert from 'node:assert/strict';
import {SEATS,FLOOR_SEATS,SPAWN,walkable,surfaceHeight,canSit,HALL_DESTINATIONS,distance} from '../shared/venue';import {findPath,segmentClear} from '../src/navigation/path';import {GALLERY_BRIDGE} from '../shared/gallery';
test('every selectable seat is reachable on its floor (2F from the gallery jump point) without passing through a chair',()=>{for(const seat of SEATS){const start=seat.level==='balcony'?HALL_DESTINATIONS.upper:SPAWN.auditorium,path=findPath('auditorium',start,seat.approach);assert.ok(path,seat.id);let previous:{x:number;y?:number;z:number}=start;for(const step of path){assert.ok(segmentClear('auditorium',previous,step),seat.id);previous=step;}assert.deepEqual(path.at(-1),seat.approach);}});
test('chair centers and the stage are not walking targets',()=>{for(const s of FLOOR_SEATS)assert.equal(walkable('auditorium',s),false);assert.equal(findPath('auditorium',SPAWN.auditorium,{x:0,z:-16}),null);});
test('routes around a Grand Escalier column do not cut its corners',()=>{const start={x:-12.6,z:34.52},end={x:-12.6,z:36.52},path=findPath('lobby',start,end);assert.ok(path);assert.equal(segmentClear('lobby',start,end),false);let previous=start;for(const p of path){assert.ok(segmentClear('lobby',previous,p));previous=p;}});
test('the central flight climbs from the lobby floor to the amphitheatre door',()=>{const start={x:0,y:0,z:24},end={x:0,y:3.6,z:40.6},path=findPath('lobby',start,end);assert.ok(path);
 for(const z of [31.5,34,36.5])assert.ok(walkable('lobby',{x:0,y:(z-31)/6*3.6,z}),'every step is walkable at its actual elevation');assert.equal(walkable('lobby',{x:6,y:3.6,z:38}),false,'the landing does not extend into the branch stair');
 for(const x of [-4.2,4.2])assert.ok(walkable('lobby',{x,y:0,z:30}),'side aisles stay open after removing the projecting treads');
 assert.ok(Math.abs((surfaceHeight('lobby',{x:0,z:34})??-1)-1.8)<.05,'mid-flight height');});

test('dinner seats are approached from the side without crossing the backrest',()=>{for(const seat of SEATS){const forward={x:-Math.sin(seat.yaw),z:-Math.cos(seat.yaw)},offset={x:seat.approach.x-seat.x,z:seat.approach.z-seat.z};assert.ok(Math.abs(offset.x*forward.x+offset.z*forward.z)<.1);assert.ok(Math.hypot(offset.x,offset.z)>1);assert.ok(canSit(seat.approach,seat));assert.equal(canSit({x:seat.x-offset.x,y:seat.y,z:seat.z-offset.z},seat),false);if(seat.level==='balcony'){assert.equal(findPath('auditorium',SPAWN.auditorium,seat.approach),null,'no stairs: the floors are not joined on foot');assert.ok(findPath('auditorium',HALL_DESTINATIONS.upper,seat.approach));}}});
test('the galleries join up without jumping off edges',()=>{assert.equal(walkable('auditorium',{x:0,y:4,z:0}),false);const across=findPath('auditorium',{x:13.5,y:8.3,z:-20},{x:-13.5,y:8.3,z:-20});assert.ok(across);assert.ok(across.some(p=>p.z>GALLERY_BRIDGE.minZ));});

test('there is no staircase inside the hall',()=>{
 for(const x of [0,4,8,12])for(const y of [2,4,6])assert.equal(walkable('auditorium',{x,y,z:46}),false,'no stair slope in the room');
});

test('the strip right in front of the stage is walkable from the aisles',async()=>{
 const {findPath}=await import('../src/navigation/path');const {walkable,STAGE_APRON_Z}=await import('../shared/venue');
 for(const x of [-12,-6.4,0,6.4,12]){const z=STAGE_APRON_Z+.3,y=surfaceHeight('auditorium',{x,z});assert.notEqual(y,null,`floor at x ${x}`);const p={x,y:y!,z};assert.ok(walkable('auditorium',p),`x ${x}`);assert.ok(findPath('auditorium',{x:0,y:0,z:47},p),`reach x ${x}`);}
 assert.ok(!walkable('auditorium',{x:0,y:0,z:-10}),'the stage itself stays off limits');
});

test('a segment cannot skip a dinner-chair corner between samples',()=>{
 assert.equal(segmentClear('auditorium',{x:-10.62915026712688,y:-1.3,z:18.16148703252796},{x:-10.75,y:-1.3,z:17.95}),false);
});
