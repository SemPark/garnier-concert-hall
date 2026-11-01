import test from 'node:test';import assert from 'node:assert/strict';
import {GALLERY_FLOORS,GALLERY_BRIDGE,galleryRailSpans,hasGalleryFloor} from '../shared/gallery';
import {GOLDEN_HALL as H} from '../shared/goldenHall';
import {localCameraFrame} from '../src/controls/localCamera';
import {ORGAN_RAIL_JOIN_Z,ORGAN_RAIL_POST_HALF} from '../shared/organLoft';
test('upper slabs never overlap and form one unbroken gallery ring',()=>{
 for(let i=0;i<GALLERY_FLOORS.length;i++)for(let j=i+1;j<GALLERY_FLOORS.length;j++){const a=GALLERY_FLOORS[i],b=GALLERY_FLOORS[j],overlapX=Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX),overlapZ=Math.min(a.maxZ,b.maxZ)-Math.max(a.minZ,b.minZ);assert.ok(overlapX<=0||overlapZ<=0);}
 for(const side of [-1,1])for(const x of [0,5,9.6,11,12.9,13.8])for(const z of [44.5,46,49])assert.equal(hasGalleryFloor(side*x,z),true,'no stairwell hole');
 assert.equal(hasGalleryFloor(0,49),true);
});
test('side gallery guardrails run unbroken to the rear gallery',()=>{
 for(const z of H.bayCenters)for(const span of galleryRailSpans(z)){assert.ok(span.start>=ORGAN_RAIL_JOIN_Z+ORGAN_RAIL_POST_HALF);assert.ok(span.end>span.start);assert.ok(span.end<=GALLERY_BRIDGE.minZ||span.start>=GALLERY_BRIDGE.maxZ+.35);}
 assert.equal(H.bayCenters.flatMap(galleryRailSpans).at(-1)!.end,GALLERY_BRIDGE.minZ,'the side rail must reach the rear rail without a corner gap');
});
test('floor and balcony seats use the same visitor-relative camera, including drag and zoom',()=>{
 const floor={x:0,y:0,z:0};
 for(const side of [-1,1])for(const [yaw,pitch,distance]of [[0,.13,4.8],[.25,.4,4.8],[-1,-.1,3]]){
  const seat={x:side*15,y:H.balconyHeight,z:24},a=localCameraFrame(floor,true,yaw,pitch,distance),b=localCameraFrame(seat,true,yaw,pitch,distance);
  for(const key of ['look','position','origin'] as const)assert.ok(b[key].clone().sub(a[key]).distanceTo(a.origin.clone().set(seat.x,seat.y,seat.z))<.000001);
  assert.ok(Math.hypot(b.look.x-seat.x,b.look.z-seat.z)<=2.000001);
  assert.ok(Math.hypot(b.position.x-seat.x,b.position.z-seat.z)<=distance+.000001);
 }
});

test('the deep rear gallery overhangs the last row and is a solid floor',async()=>{
 const {FLOOR_ROWS}=await import('../shared/venue');
 assert.ok(GALLERY_BRIDGE.minZ>FLOOR_ROWS.at(-1)!+.48,'the gallery front stays behind the last parterre row');
 assert.ok(H.rear-GALLERY_BRIDGE.maxZ<.3);
 for(const side of [-1,1])for(const z of [GALLERY_BRIDGE.minZ+.1,44.5,48,51.5])assert.equal(hasGalleryFloor(side*11,z),true);
});
