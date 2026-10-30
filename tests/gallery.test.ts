import test from 'node:test';import assert from 'node:assert/strict';
import {GALLERY_FLOORS,STAIR,galleryRailSpans,hasGalleryFloor} from '../shared/gallery';
import {GOLDEN_HALL as H} from '../shared/goldenHall';
import {galleryCameraFrame} from '../src/controls/galleryCamera';
test('upper slabs never overlap and leave both stair flights open to the landing',()=>{
 for(let i=0;i<GALLERY_FLOORS.length;i++)for(let j=i+1;j<GALLERY_FLOORS.length;j++){const a=GALLERY_FLOORS[i],b=GALLERY_FLOORS[j],overlapX=Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX),overlapZ=Math.min(a.maxZ,b.maxZ)-Math.max(a.minZ,b.minZ);assert.ok(overlapX<=0||overlapZ<=0);}
 for(const side of [-1,1]){for(const x of [12.55,12.9,13.3])assert.equal(hasGalleryFloor(side*x,STAIR.z),false);assert.equal(hasGalleryFloor(side*13.8,STAIR.z),true);assert.equal(hasGalleryFloor(side*13.8,46),true);}
 assert.equal(hasGalleryFloor(0,46),true);
});
test('gallery guardrail spans have a clear opening above each stair approach',()=>{
 for(const z of H.bayCenters)for(const span of galleryRailSpans(z)){assert.ok(span.end<=STAIR.z-STAIR.width/2-.35);assert.ok(span.start>=-26.5);assert.ok(span.end>span.start);}
});
test('both balcony seat cameras respond to horizontal and vertical drag and zoom within the hall',()=>{
 for(const side of [-1,1]){const seat={x:side*15,y:H.balconyHeight,z:0},initial=galleryCameraFrame(seat,0,.13,4.8);for(const frame of [galleryCameraFrame(seat,.25,.13,4.8),galleryCameraFrame(seat,0,.4,4.8),galleryCameraFrame(seat,0,.13,3)]){assert.ok(frame.position.distanceTo(initial.position)>.2);assert.ok(Math.abs(frame.position.x)<=15.35);assert.ok(frame.position.y>=H.balconyHeight+.6);}}
});
