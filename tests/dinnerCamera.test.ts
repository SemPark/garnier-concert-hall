import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {PARTERRE} from '../shared/parterre';
import {DINNER_TABLES,NPC_SEATS,SEATS} from '../shared/venue';
import {DINNER_CAMERA_DISTANCE,dinnerCameraFrame} from '../src/controls/localCamera';

test('the default view keeps a clear sightline to a visitor at every ghost table',()=>{
 for(const seat of SEATS){
  const guests=NPC_SEATS.filter(guest=>guest.row===seat.row);
  if(!guests.length)continue;
  for(const aspect of [16/9,390/844,.39]){
   const point=new T.Vector3(seat.x,seat.y,seat.z);
   const {position}=dinnerCameraFrame(point,seat,DINNER_TABLES[seat.row-1],0,.13,DINNER_CAMERA_DISTANCE,aspect,61);
   assert.ok(Math.abs(position.x)<PARTERRE.sideFront-.3,`camera behind side box at table ${seat.row}, chair ${seat.column}, aspect ${aspect}`);
   position.y=point.y;
   const sightline=new T.Line3(point,position);
   for(const guest of guests){
    const where=new T.Vector3(guest.x,point.y,guest.z);
    const nearest=sightline.closestPointToPoint(where,true,new T.Vector3());
    assert.ok(nearest.distanceTo(where)>.85,`table ${seat.row}, chair ${seat.column}, aspect ${aspect}`);
   }
  }
 }
});

test('dragging still rotates the ghost table camera from its default side',()=>{
 const seat=SEATS.find(seat=>seat.row===8&&seat.column===2)!;
 const start=new T.Vector3(seat.x,seat.y,seat.z),table=DINNER_TABLES[seat.row-1];
 const angle=(yaw:number)=>{
  const {position,look}=dinnerCameraFrame(start,seat,table,yaw,.13,DINNER_CAMERA_DISTANCE,16/9,61);
  return Math.atan2(position.x-look.x,position.z-look.z);
 };
 const rotation=.7;
 const delta=T.MathUtils.euclideanModulo(angle(rotation)-angle(0),Math.PI*2);
 assert.ok(Math.abs(delta-rotation)<1e-8);
});

test('an outward drag shortens the portrait orbit before the side box',()=>{
 const seat=SEATS.find(seat=>seat.row===8&&seat.column===2)!;
 const point=new T.Vector3(seat.x,seat.y,seat.z);
 const {position,look}=dinnerCameraFrame(point,seat,DINNER_TABLES[seat.row-1],-Math.PI/2,.13,8,390/844,70);
 assert.ok(Math.abs(position.x)<PARTERRE.sideFront-.3);
 assert.ok(position.distanceTo(look)>2.5);
});
