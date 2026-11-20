import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GALLERY_BRIDGE} from '../shared/gallery';
import {PARTERRE} from '../shared/parterre';
import {NPC_SEATS,SEATS} from '../shared/venue';
import {seatedStageFrame,seatedStageRail} from '../src/controls/seatedStageCamera';
import {STAGE,STAGE_FLOOR} from '../src/orchestra/layout';

test('the seated stage camera moves only forward and backward within the hall',()=>{
 for(const seat of SEATS){
  const rail=seatedStageRail(seat);
  const near=seatedStageFrame(rail,-1,16/9).position;
  const far=seatedStageFrame(rail,2,16/9).position;
  assert.equal(near.x,far.x);
  assert.equal(near.y,far.y);
  assert.ok(far.z>near.z&&far.z<GALLERY_BRIDGE.minZ);
  assert.ok(Math.abs(near.x)<PARTERRE.sideFront);
 }
});

test('the seated character and stage stay inside the frame at either end of the dolly',()=>{
 for(const seat of SEATS){
  const rail=seatedStageRail(seat);
  for(const [aspect,fov] of [[16/9,61],[390/844,70]]){
   const camera=new T.PerspectiveCamera(fov,aspect,.08,150);
   for(const dolly of [0,.38,1]){
    const {position,look}=seatedStageFrame(rail,dolly,aspect);
    camera.position.copy(position);camera.lookAt(look);camera.updateMatrixWorld();
    const points=[
     new T.Vector3(seat.x,seat.y+.12,seat.z),
     new T.Vector3(seat.x,seat.y+1.7,seat.z),
     new T.Vector3(-1.25,STAGE_FLOOR+2,STAGE.front-6),
     new T.Vector3(1.25,STAGE_FLOOR+2,STAGE.front-6),
    ];
    for(const point of points){
     const p=point.project(camera);
     assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1,`table ${seat.row}, chair ${seat.column}, aspect ${aspect}, dolly ${dolly}`);
    }
   }
  }
 }
});

test('fixed story guests do not block the line to the seated character',()=>{
 for(const seat of SEATS){
  const rail=seatedStageRail(seat);
  const {position,origin}=seatedStageFrame(rail,1,16/9);
  for(const guest of NPC_SEATS){
   const relativeDepth=(guest.z-origin.z)/(position.z-origin.z);
   if(relativeDepth<=0||relativeDepth>=1)continue;
   const ray=origin.clone().lerp(position,relativeDepth);
   assert.ok(Math.abs(guest.x-ray.x)>=.75||ray.y>guest.y+2.15,
    `table ${seat.row} chair ${seat.column}, guest table ${guest.row} chair ${guest.column}`);
  }
 }
});
