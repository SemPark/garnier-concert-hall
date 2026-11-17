import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import {danceCameraFrame,duetSideYaw,soloCameraFacing} from '../src/controls/danceCamera';

test('duet opens on the nearest perpendicular side with both dancers in frame',()=>{
 const center={x:2,y:-.2,z:16},axis=.63;
 const direction=new T.Vector3(Math.sin(axis),0,Math.cos(axis));
 for(const aspect of [9/16,16/9]){
  for(const side of [-1,1]){
   const previous=axis+side*.9;
   const distance=aspect<.8?5.4:4.6;
   const yaw=duetSideYaw(axis,previous,()=>distance);
   assert.ok(Math.cos(yaw-previous)>.7);
   const {look,position}=danceCameraFrame(center,yaw,.18,distance,true,[]);
   const horizontal=position.clone().sub(look);horizontal.y=0;
   assert.ok(Math.abs(horizontal.normalize().dot(direction))<1e-9,'the sightline is perpendicular to the pair');
   const camera=new T.PerspectiveCamera(61,aspect,.08,150);
   camera.position.copy(position);camera.lookAt(look);camera.updateMatrixWorld(true);
   for(const dy of [.05,1.72]){
    const screens=[-1,1].map(sign=>new T.Vector3(center.x,center.y+dy,center.z).addScaledVector(direction,sign*.84).project(camera));
    assert.ok(screens.every(p=>Math.abs(p.x)<.9&&Math.abs(p.y)<.9),'both full bodies are in frame');
    assert.ok(Math.abs(screens[0].x-screens[1].x)>.2,'neither dancer is hidden behind the other');
   }
  }
 }
});

test('duet uses the other side when the current side is blocked by a wall',()=>{
 const center={x:0,y:0,z:0},radius=4.6;
 const wall=new T.Mesh(new T.BoxGeometry(.3,6,6),new T.MeshBasicMaterial());
 wall.position.x=1.5;wall.updateMatrixWorld(true);
 const clearance=(yaw:number)=>{
  const f=danceCameraFrame(center,yaw,.18,radius,true,[wall]);
  return f.position.distanceTo(f.look);
 };
 const yaw=duetSideYaw(0,Math.PI/2,clearance);
 assert.ok(Math.sin(yaw)<0);
 assert.ok(clearance(yaw)>4);
 assert.ok(clearance(Math.PI/2)<2);
 wall.geometry.dispose();wall.material.dispose();
});

test('solo base looks directly at the actual camera without losing choreography turns',()=>{
 const dancer={x:2,z:7},eye={x:4,z:2},base=.8;
 const yaw=soloCameraFacing(base,base,dancer,eye);
 const towardEye=new T.Vector2(eye.x-dancer.x,eye.z-dancer.z).normalize();
 assert.ok(new T.Vector2(-Math.sin(yaw),-Math.cos(yaw)).dot(towardEye)>.999);
 assert.ok(Math.abs(soloCameraFacing(base+.46,base,dancer,eye)-yaw-.46)<1e-9);
 assert.equal(soloCameraFacing(base,base,dancer,dancer),base);
});
