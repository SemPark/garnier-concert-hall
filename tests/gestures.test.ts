import {faceSurfaceZ} from '../src/character/Face';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Avatar} from '../src/character/Avatar';
import {poseVillager,GESTURE_ICON} from '../src/character/villager';
import {EmoteLayer} from '../src/character/EmoteLayer';
import {GESTURES,isGesture,gestureSeconds} from '../shared/gestures';
import {LocalConcert} from '../src/network/LocalConcert';
const footY=(a:Avatar)=>{a.root.updateMatrixWorld(true);return Math.min(...[a.leftLeg,a.rightLeg].map(l=>l.children.at(-1)!.children.at(-1)!.getWorldPosition(new T.Vector3()).y));};
test('ten gestures are listed once and validated',()=>{
 assert.equal(GESTURES.length,10);assert.equal(new Set(GESTURES.map(g=>g.id)).size,10);
 for(const g of GESTURES){assert.ok(isGesture(g.id));assert.ok(gestureSeconds(g.id)>=2);}
 assert.equal(isGesture('dance'),false);assert.equal(isGesture(3),false);
 const room=new LocalConcert();assert.equal(room.send({type:'gesture',gesture:'dance' as never}),false);assert.ok(room.send({type:'gesture',gesture:'bravo'}));assert.equal(room.visitor.gesture,'bravo');
});
test('every gesture keeps the standing feet on the floor, including the bow',()=>{
 for(const g of GESTURES){const a=new Avatar();for(let age=0;age<=g.seconds;age+=.05){a.update(0,0,false,false,g.id,age,1/30);assert.ok(Math.abs(footY(a)-.07)<.03,`${g.id} at ${age.toFixed(2)}: foot left the floor`);}}
 const a=new Avatar();a.update(0,0,false,false,'bow',1.2,1);assert.ok(a.body.rotation.x<-.4,'bow bends forward at the hips');
});
test('a seated greeting turns toward the camera without leaving the cushion',()=>{
 const a=new Avatar();for(let i=0;i<60;i++)a.update(0,0,true,false,null,10,1/30);
 a.update(0,0,true,false,'ovation',1.5,1/30);assert.ok(Math.abs(a.leftLeg.rotation.x-Math.PI/2)<1e-6,'stays seated');assert.ok(Math.abs(a.body.rotation.y)>1,'turns to greet');
 a.update(0,0,true,false,'ovation',10,1/30);assert.ok(Math.abs(a.leftLeg.rotation.x-Math.PI/2)<1e-6);
});
test('icons appear only while a gesture plays and fade at its end',()=>{
 for(const g of GESTURES){const mid=poseVillager({time:0,speed:0,sit:0,music:false,musician:false,gesture:g.id,age:g.seconds/2});assert.equal(mid.icon,GESTURE_ICON[g.id]);assert.ok(mid.weight>.99);
  assert.equal(poseVillager({time:0,speed:0,sit:0,music:false,musician:false,gesture:g.id,age:g.seconds+.1}).icon,null);}
 const layer=new EmoteLayer(4);layer.set(1,new T.Vector3(1,2,3),'heart',1);assert.equal(layer.visibleCount(),1);assert.equal(layer.iconAt(1),'heart');layer.set(9,new T.Vector3(),'zz',1);layer.clear();assert.equal(layer.visibleCount(),0);
});
test('playing musicians move clearly with the music but keep facing the conductor',()=>{
 let pitch=0,roll=0;
 for(let t=0;t<20;t+=.37){const p=poseVillager({time:t,speed:0,sit:1,music:true,musician:true,gesture:null,age:10});
  assert.ok(Math.abs(p.headYaw)<=.08,'eyes stay on the conductor');assert.ok(Math.abs(p.lean)<=.09&&Math.abs(p.sway)<=.08,'a gentle body sway, not a wobble');assert.ok(Math.abs(p.headPitch)<=.16&&Math.abs(p.headRoll)<=.1,'no wild head motion');
  pitch=Math.max(pitch,Math.abs(p.headPitch));roll=Math.max(roll,Math.abs(p.headRoll));}
 assert.ok(pitch>.1&&roll>.07,'the nod and sway are big enough to see from the back of the hall');
 const still=poseVillager({time:3,speed:0,sit:1,music:false,musician:true,gesture:null,age:10});assert.equal(still.headPitch,0);
});
/** Deepest overlap between either arm (or mitten) and the skull, ears or any hair piece. */
export function headClipping(a:Avatar){
 a.root.updateMatrixWorld(true);let worst=0;
 const shapes=a.head.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&(o.userData.hairPart||o===a.head.children[0]));
 for(const [arm,hand] of [[a.leftArm,a.leftHand],[a.rightArm,a.rightHand]] as const){
  // The sleeve capsule and mitten ellipsoid have different centres and radii.
  for(const sleeve of arm.children.filter((o):o is T.Mesh<T.CapsuleGeometry>=>o instanceof T.Mesh&&o.visible&&o.geometry instanceof T.CapsuleGeometry)){
  const {height,radius}=sleeve.geometry.parameters;
  const sleeveInverse=sleeve.matrixWorld.clone().invert();
  const mitten=hand.children[0];
  const mittenInverse=mitten.matrixWorld.clone().invert();
  const p=new T.Vector3(),local=new T.Vector3();
  for(const m of shapes){
   const vertices=m.geometry.getAttribute('position');
   const sleeveSpace=sleeveInverse.clone().multiply(m.matrixWorld);
   const mittenSpace=mittenInverse.clone().multiply(m.matrixWorld);
   for(let i=0;i<vertices.count;i++){
    p.fromBufferAttribute(vertices,i);
    local.copy(p).applyMatrix4(sleeveSpace);
    const dy=local.y-T.MathUtils.clamp(local.y,-height/2,height/2);
    const sleeveDepth=radius-Math.hypot(local.x,dy,local.z);
    const mittenDepth=(1-local.copy(p).applyMatrix4(mittenSpace).length())*mitten.scale.x;
    worst=Math.max(worst,sleeveDepth,mittenDepth);
   }
  }
 }
 }
 return worst;
}
test('raised arms and hands never pass into the head or hair',()=>{
 for(const variant of [0,4,5])for(const g of GESTURES){
  const a=new Avatar(0x5a7d8c,undefined,variant);for(let i=0;i<40;i++)a.update(0,0,false,false,null,10,1/30);
  for(let age=0;age<=g.seconds;age+=.1){a.update(0,0,false,false,g.id,age,1/30);const depth=headClipping(a);assert.ok(depth<.015,`${a.hair} ${g.id} at ${age.toFixed(1)}: arm ${(depth*100).toFixed(1)}cm inside the head`);}
 }
});

test('raised gestures keep the shoulders near their resting height while clearing long hair',()=>{
 for(const mode of ['standing','seated','train'] as const){
  const seated=mode!=='standing',a=new Avatar(0x5a7d8c,undefined,4);
  a.trainPassenger=mode==='train';
  a.update(0,0,seated,false,null,10,10);
  const restY=a.leftArm.position.y;
  for(const gesture of ['wave','bravo','ovation','shh'] as const){
   for(const cameraFacing of [{turn:-3.3,pitch:.4},{turn:.14,pitch:.4},{turn:.5,pitch:-.5},{turn:2.2,pitch:.4}]){
    const facing=gesture==='ovation'||gesture==='shh'?cameraFacing:undefined;
    for(let age=0;age<=gestureSeconds(gesture);age+=.05){
     a.update(age,0,seated,true,gesture,age,1/30,facing);
     const context=`${mode} ${gesture} at ${age.toFixed(2)}`;
     assert.ok(restY-Math.min(a.leftArm.position.y,a.rightArm.position.y)<.07,`${context}: shoulders drop`);
     if(gesture==='wave')assert.equal((a.trainPassenger?a.leftArm:a.rightArm).position.y,restY,context);
     assert.ok(headClipping(a)<.015,`${context}: arm crosses the face or hair`);
    }
   }
  }
 }
});

test('hush raises one short index finger against the lips, on the thumb side of the mitten',()=>{
 for(const variant of [0,4,5]){const a=new Avatar(0x5a7d8c,undefined,variant);
  a.update(0,0,false,false,null,10,1/30);assert.equal(a.finger.scale.x,0,'no finger outside the hush');
  a.update(0,0,false,false,'shh',1.2,1/30);a.root.updateMatrixWorld(true);assert.ok(a.finger.scale.x>.99);
  const tip=a.head.worldToLocal(a.finger.getWorldPosition(new T.Vector3())),hand=a.body.worldToLocal(a.rightHand.getWorldPosition(new T.Vector3())),finger=a.body.worldToLocal(a.finger.getWorldPosition(new T.Vector3()));
  // Mouth sits at (0,-.165,-.322) in head space: the finger crosses it, just in front of the lips.
  assert.ok(Math.abs(tip.x)<.05&&Math.abs(tip.y+.165)<.05,`finger misses the mouth: ${tip.toArray()}`);assert.ok(Math.abs(tip.z-(faceSurfaceZ(tip.x,tip.y)-.012))<.025,`finger not touching the lips: ${tip.z}`);
  assert.ok(finger.x<hand.x,'finger stays on the thumb side, not centred on the fist');
  for(const g of ['wave','clap','bravo'] as const){a.update(0,0,false,false,g,1,1/30);assert.equal(a.finger.scale.x,0);}
 }
});
