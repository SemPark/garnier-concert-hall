import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {PARTERRE} from '../shared/parterre';
import {DINNER_TABLE_HEIGHT,TABLE_RADIUS} from '../shared/dinnerTables';
import {TEA_TABLE} from '../shared/storyGuestSeats';
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


test('the rear-right tea seat frames the hosts beside a clear tabletop',()=>{
 const seat=SEATS.find(seat=>seat.row===TEA_TABLE&&seat.column===3)!;
 const [hatter,hare]=NPC_SEATS.filter(guest=>guest.row===TEA_TABLE);
 const table=DINNER_TABLES[TEA_TABLE-1];
 const aspect=1041/878,fov=61;
 const point=new T.Vector3(seat.x,seat.y,seat.z);
 const {position,look}=dinnerCameraFrame(point,seat,table,0,.13,DINNER_CAMERA_DISTANCE,aspect,fov);
 const camera=new T.PerspectiveCamera(fov,aspect,.08,150);
 camera.position.copy(position);
 camera.lookAt(look);
 camera.updateMatrixWorld(true);
 const screen=(actor:{x:number;y:number;z:number})=>new T.Vector3(actor.x,actor.y+1.3,actor.z).project(camera);
 const hostsAndVisitor=[hatter,hare,seat].map(screen);
 for(const actor of hostsAndVisitor)assert.ok(Math.abs(actor.x)<1&&Math.abs(actor.y)<1);
 const tableCenter=new T.Vector3(table.x,0,table.z);
 const sightline=new T.Line3(tableCenter,new T.Vector3(position.x,0,position.z));
 for(const host of [hatter,hare]){
  const location=new T.Vector3(host.x,0,host.z);
  assert.ok(sightline.closestPointToPoint(location,true,new T.Vector3()).distanceTo(location)>1.1);
 }
});

test('each default dinner view shows the visitor face and the whole table',()=>{
 for(const seat of SEATS){
  if(seat.level!=='parterre')continue;
  const table=DINNER_TABLES[seat.row-1];
  const point=new T.Vector3(seat.x,seat.y,seat.z);
  const facing=new T.Vector2(table.x-seat.x,table.z-seat.z).normalize();
  for(const [aspect,fov] of [[16/9,61],[390/844,70],[.39,61]]){
   const {position,look}=dinnerCameraFrame(point,seat,table,0,.13,DINNER_CAMERA_DISTANCE,aspect,fov);
   const context=`table ${seat.row}, chair ${seat.column}, aspect ${aspect}`;
   const eyeSide=new T.Vector2(position.x-seat.x,position.z-seat.z).normalize();
   assert.ok(eyeSide.dot(facing)>.6,`face turns away at ${context}`);
   const camera=new T.PerspectiveCamera(fov,aspect,.08,150);
   camera.position.copy(position);
   camera.lookAt(look);
   camera.updateMatrixWorld(true);
   const inFrame=(x:number,y:number,z:number)=>{
    const projected=new T.Vector3(x,y,z).project(camera);
    return Math.abs(projected.x)<.97&&Math.abs(projected.y)<.97&&projected.z<1;
   };
   assert.ok(inFrame(seat.x,seat.y+1.45,seat.z),`top of visitor is clipped at ${context}`);
   for(let i=0;i<16;i++){
    const angle=i*Math.PI/8;
    const x=table.x+Math.cos(angle)*TABLE_RADIUS,z=table.z+Math.sin(angle)*TABLE_RADIUS;
    assert.ok(inFrame(x,PARTERRE.floor,z)&&inFrame(x,PARTERRE.floor+DINNER_TABLE_HEIGHT,z),`table is clipped at ${context}`);
   }
  }
 }
});
