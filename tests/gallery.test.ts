import test from 'node:test';import assert from 'node:assert/strict';
import {GALLERY_FLOORS,GALLERY_BRIDGE,STAIR,galleryRailSpans,hasGalleryFloor} from '../shared/gallery';
import {GOLDEN_HALL as H} from '../shared/goldenHall';
import {localCameraFrame} from '../src/controls/localCamera';
test('upper slabs never overlap and leave both stair flights open to the landing',()=>{
 for(let i=0;i<GALLERY_FLOORS.length;i++)for(let j=i+1;j<GALLERY_FLOORS.length;j++){const a=GALLERY_FLOORS[i],b=GALLERY_FLOORS[j],overlapX=Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX),overlapZ=Math.min(a.maxZ,b.maxZ)-Math.max(a.minZ,b.minZ);assert.ok(overlapX<=0||overlapZ<=0);}
 for(const side of [-1,1]){for(const x of [12.55,12.9,13.3])assert.equal(hasGalleryFloor(side*x,STAIR.z),false);assert.equal(hasGalleryFloor(side*13.8,STAIR.z),true);assert.equal(hasGalleryFloor(side*13.8,46),true);}
 assert.equal(hasGalleryFloor(0,46),true);
});
test('gallery guardrail spans have a clear opening above each stair approach',()=>{
 for(const z of H.bayCenters)for(const span of galleryRailSpans(z)){assert.ok(span.end<=STAIR.z-STAIR.width/2-.35);assert.ok(span.start>=-26.5);assert.ok(span.end>span.start);assert.ok(span.end<=GALLERY_BRIDGE.minZ-.35||span.start>=GALLERY_BRIDGE.maxZ+.35);}
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
