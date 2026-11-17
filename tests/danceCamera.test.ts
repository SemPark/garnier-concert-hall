import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import {duetCameraFacesFront,partnerRoutineYaw,type DanceState} from '../shared/dance';
import {danceCameraFrame,duetFrontYaw,duetSideYaw,soloCameraFacing,stepDuetCameraYaw} from '../src/controls/danceCamera';

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

test('both earlier camera sides reach the shared-routine front with both dancers visible',()=>{
 const center={x:2,y:-.2,z:16},axis=.63,distance=4.6;
 const pairDirection=new T.Vector3(Math.sin(axis),0,Math.cos(axis));
 const forward=new T.Vector3(-Math.sin(partnerRoutineYaw(axis)),0,-Math.cos(partnerRoutineYaw(axis)));
 for(const side of [-1,1])for(const aspect of [9/16,16/9]){
  const yaw=duetFrontYaw(axis,axis+side*Math.PI/2,()=>distance,3.2);
  const {position,look}=danceCameraFrame(center,yaw,.18,distance,true,[]);
  const eye=position.clone().sub(look).setY(0).normalize();
  assert.ok(eye.dot(forward)>.999);
  const camera=new T.PerspectiveCamera(61,aspect,.08,150);
  camera.position.copy(position);camera.lookAt(look);camera.updateMatrixWorld(true);
  const screens=[-1,1].map(sign=>new T.Vector3(center.x,center.y+1.7,center.z).addScaledVector(pairDirection,sign*.72).project(camera));
  assert.ok(screens.every(p=>Math.abs(p.x)<.9&&Math.abs(p.y)<.9));
  assert.ok(Math.abs(screens[0].x-screens[1].x)>.2);
 }
});

test('a wall on the direct front uses a front diagonal when available, otherwise the clear side',()=>{
 const center={x:0,y:0,z:0},distance=4.6,front=-Math.PI/2;
 const wall=new T.Mesh(new T.BoxGeometry(.3,6,1),new T.MeshBasicMaterial());
 wall.position.x=-1.5;wall.updateMatrixWorld(true);
 const clearance=(yaw:number)=>{
  const f=danceCameraFrame(center,yaw,.18,distance,true,[wall]);
  return f.position.distanceTo(f.look);
 };
 const diagonal=duetFrontYaw(0,Math.PI/2,clearance,3.2);
 assert.ok(clearance(front)<2&&clearance(diagonal)>4&&Math.sin(diagonal)<-.75);
 wall.scale.z=30;wall.updateMatrixWorld(true);
 const fallback=duetFrontYaw(0,front,clearance,3.2);
 assert.ok(clearance(fallback)>4&&Math.sin(fallback)>.999);
 wall.geometry.dispose();wall.material.dispose();
});

test('shot stays fixed through each active routine and ignores queued changes and transient spins',()=>{
 const center={x:0,y:0,z:0};
 const base:DanceState={startedAt:0,center,partnerId:'other'};
 assert.equal(duetCameraFacesFront(base,500),false);
 for(const style of ['bad','clap','step','shimmy'] as const){
  const dance:DanceState={...base,style,moveStartedAt:1000};
  assert.equal(duetCameraFacesFront(dance,999),false);
  assert.equal(duetCameraFacesFront(dance,1000),true);
  assert.equal(duetCameraFacesFront(dance,12500),true);
 }
 for(const style of ['spin','hop'] as const){
  const dance:DanceState={...base,style,moveStartedAt:1500,previousMove:{style:'bad',moveStartedAt:1000}};
  assert.equal(duetCameraFacesFront(dance,1499),true);
  assert.equal(duetCameraFacesFront(dance,1500),false);
 }
});

test('the smooth change from behind or a diagonal keeps the orbit away from the pair',()=>{
 const center={x:0,y:0,z:0},target=-Math.PI/2;
 for(const startingYaw of [Math.PI/2,2,-2,2*Math.PI+.3]){
  let yaw=startingYaw;
  const clearance=()=>4.6;
  assert.ok(Math.cos(duetFrontYaw(0,yaw,clearance,3.2)-target)>.999);
  for(let i=0;i<190;i++){
   const next=stepDuetCameraYaw(yaw,target,1/60);
   assert.ok(Math.abs(Math.atan2(Math.sin(next.yaw-yaw),Math.cos(next.yaw-yaw)))<=.061);
   const frame=danceCameraFrame(center,next.yaw,.18,4.6,true,[]);
   assert.ok(frame.position.distanceTo(frame.look)>4.5);
   yaw=next.yaw;
  }
  assert.ok(Math.cos(yaw-target)>.999);
 }
});
