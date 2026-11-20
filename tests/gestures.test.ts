import {dancePose,danceMoveDuration,finishDance} from '../shared/dance';
import {poseDancingAvatar} from '../src/scene/DancePose';
import type {Visitor} from '../shared/venue';
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
const sleeveRay=new T.Raycaster();
const sleeveSurface=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({side:T.DoubleSide}));
const sleeveRayDirection=new T.Vector3(0,0,1);
const sleeveTriangle=new T.Triangle();
const sleeveNearest=new T.Vector3();
function bentSleeveDepth(point:T.Vector3,geometry:T.BufferGeometry){
 if(!geometry.boundingBox!.containsPoint(point))return 0;
 sleeveSurface.geometry=geometry;
 sleeveRay.set(point,sleeveRayDirection);
 const hit=sleeveRay.intersectObject(sleeveSurface)[0];
 if(!hit?.face||hit.face.normal.dot(sleeveRayDirection)<=0)return 0;
 const positions=geometry.getAttribute('position');
 const indices=geometry.getIndex()!;
 let depthSquared=Infinity;
 for(let i=0;i<indices.count;i+=3){
  sleeveTriangle.a.fromBufferAttribute(positions,indices.getX(i));
  sleeveTriangle.b.fromBufferAttribute(positions,indices.getX(i+1));
  sleeveTriangle.c.fromBufferAttribute(positions,indices.getX(i+2));
  if(sleeveTriangle.getArea()<1e-10)continue;
  depthSquared=Math.min(depthSquared,sleeveTriangle.closestPointToPoint(point,sleeveNearest).distanceToSquared(point));
 }
 return Math.sqrt(depthSquared);
}
/** Deepest overlap between either arm (or mitten) and the skull, ears or any hair piece. */
export function headClipping(a:Avatar,allowLongHair=false){
 a.root.updateMatrixWorld(true);let worst=0;
 const shapes=a.head.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&((o.userData.hairPart&&(!allowLongHair||o.userData.hairPart!=='long'))||o===a.head.children[0]));
 for(const [arm,hand] of [[a.leftArm,a.leftHand],[a.rightArm,a.rightHand]] as const){
  // The sleeve capsule and mitten ellipsoid have different centres and radii.
  const sleeves:T.Mesh<T.CapsuleGeometry>[]=[];
  arm.traverseVisible(o=>{
   if(o instanceof T.Mesh&&o.geometry instanceof T.CapsuleGeometry&&(o.parent===arm||o.userData.clothContact==='sleeve'))sleeves.push(o);
  });
  for(const sleeve of sleeves){
  const {height,radius}=sleeve.geometry.parameters;
  const bent=sleeve.geometry.userData.bentSleeve;
  if(bent)sleeve.geometry.computeBoundingBox();
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
    const sleeveDepth=bent?bentSleeveDepth(local,sleeve.geometry):radius-Math.hypot(local.x,dy,local.z);
    const mittenDepth=(1-local.copy(p).applyMatrix4(mittenSpace).length())*mitten.scale.x;
    worst=Math.max(worst,sleeveDepth,mittenDepth);
   }
  }
 }
 }
 return worst;
}
test('raised dance hands stay clear of the head and hair throughout the sway',()=>{
 for(const variant of [0,4]){
  const avatar=new Avatar(0x654321,undefined,variant);
  const visitor={x:0,y:0,z:0,yaw:0,dance:{startedAt:0,moveStartedAt:1000,style:'sweep' as const}} as Visitor;
  const duration=danceMoveDuration(visitor.dance);
  const shoulders=[avatar.leftArm.position.clone(),avatar.rightArm.position.clone()];
  for(let age=0;age<=duration;age+=20){
   avatar.update(age/1000,0,false,false,null,10,1/30);
   poseDancingAvatar(avatar,dancePose(visitor,1000+age));
   assert.ok(avatar.leftArm.position.equals(shoulders[0])&&avatar.rightArm.position.equals(shoulders[1]));
   const penetration=headClipping(avatar);
   assert.ok(penetration<.015,`Raised sleeve intersects the head by ${penetration}m at ${age}ms`);
  }
 }
});

test('floss mittens and lower sleeves stay outside the torso throughout the move',()=>{
 const visitor={x:0,y:0,z:0,yaw:0,dance:{startedAt:0,moveStartedAt:1000,style:'clap'}} as Visitor;
 const avatar=new Avatar();
 const torso=avatar.body.children.find(child=>child.userData.clothContact==='torso')!;
 const direction=new T.Vector3();
 const sample=new T.Vector3();
 for(let age=20;age<danceMoveDuration(visitor.dance)*2;age+=10){
  avatar.update(age/1000,0,false,false,null,10,1/30);
  poseDancingAvatar(avatar,dancePose(visitor,1000+age));
  for(const [arm,hand] of [[avatar.leftArm,avatar.leftHand],[avatar.rightArm,avatar.rightHand]]){
   direction.copy(hand.position).applyQuaternion(arm.quaternion);
   for(const fraction of [.75,1]){
    sample.copy(arm.position).addScaledVector(direction,fraction).sub(torso.position).divide(torso.scale);
    // The widest lathe ring has radius .285 before torso scaling.
    assert.ok(Math.hypot(sample.x,sample.z)>.36,`Arm crosses the torso at ${age}ms`);
   }
  }
 }
});

test('floss swings both arms together, tucks one behind the hips, and mirrors the move',()=>{
 const visitor={x:0,y:0,z:0,yaw:0,dance:{startedAt:0,moveStartedAt:1000,style:'clap'}} as Visitor;
 const avatar=new Avatar();
 const duration=danceMoveDuration(visitor.dance);
 const outReach=new T.Vector2();
 for(const [frame,side,tucked] of [[0,1,false],[1,1,true],[2,1,false],[3,-1,false],[4,-1,true],[5,-1,false]] as const){
  const age=(frame+.75)/6*duration;
  avatar.update(age/1000,0,false,false,null,10,1/30);
  poseDancingAvatar(avatar,dancePose(visitor,1000+age));
  const left=avatar.leftHand.position.clone().applyQuaternion(avatar.leftArm.quaternion).add(avatar.leftArm.position);
  const right=avatar.rightHand.position.clone().applyQuaternion(avatar.rightArm.quaternion).add(avatar.rightArm.position);
  const [outer,inner]=side===1?[right,left]:[left,right];
  const pelvis=avatar.body.localToWorld(new T.Vector3(0,.55,0));
  const shoulders=avatar.body.localToWorld(new T.Vector3(0,.99,0));
  assert.ok(inner.z<-.25);
  if(tucked){
   assert.ok(outer.z>.24);
   assert.ok(side*outer.x<outReach.x-.22&&side*inner.x<outReach.y-.30);
   const frontHand=avatar.body.localToWorld(inner.clone());
   assert.ok((frontHand.x-shoulders.x)*side<-.18);
   assert.ok((frontHand.x-pelvis.x)*side<-.30);
  }else{
   // At full extension the front mitten passes the centreline.
   assert.ok(side*outer.x>.43&&side*inner.x>.01&&Math.abs(outer.z)<.08);
   outReach.set(side*outer.x,side*inner.x);
  }
  assert.ok((pelvis.x-shoulders.x)*side*(tucked?1:-1)>.10);
  assert.ok(Math.abs(shoulders.x)<.05);
  for(const [i,leg] of [avatar.leftLeg,avatar.rightLeg].entries()){
   const knee=leg.children.find(child=>child instanceof T.Group)!;
   const ankle=knee.localToWorld(new T.Vector3(0,-.24,0));
   assert.ok(ankle.distanceTo(new T.Vector3(i===0?-.16:.16,.06,0))<.008);
   const shoe=knee.children.at(-1)!;
   assert.ok(shoe.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(i===0?-.16:.16,.06,-.045))<.008);
   assert.ok(shoe.getWorldQuaternion(new T.Quaternion()).angleTo(new T.Quaternion())<.001);
  }
 }
});

test('BAD lowers the hand through four even chest hits and repeats without a longer pause',()=>{
 const avatar=new Avatar();
 const visitor={x:0,y:0,z:0,yaw:0,dance:{startedAt:0,moveStartedAt:2000,style:'bad'}} as Visitor;
 const duration=danceMoveDuration(visitor.dance);
 const at=(phase:number)=>{
  const now=2000+phase*duration;
  avatar.update(now/1000,0,false,false,null);
  poseDancingAvatar(avatar,dancePose(visitor,now));
  const hand=avatar.rightHand.getWorldPosition(new T.Vector3());
  return {hand,localHand:avatar.body.worldToLocal(hand.clone()),
   chest:avatar.body.localToWorld(new T.Vector3(0,.88,-.15))};
 };
 assert.equal(duration,2400);
 const peaks=[.10,.35,.60,.85,1.10];
 const prep=at(1),hits=peaks.map(at);
 assert.ok(Math.abs(prep.hand.x-prep.chest.x)<.08&&Math.abs(prep.hand.y-prep.chest.y)<.06);
 assert.ok(prep.hand.z<prep.chest.z-.055);
 for(const [index,hit] of hits.entries()){
  const phase=peaks[index];
  assert.ok(hit.localHand.z<-.19);
  assert.ok(at(phase-.06).chest.z-hit.chest.z>.05);
  assert.ok(at(phase+.14).chest.z-hit.chest.z>.05);
  if(index<4){
   const drop=(hits[index-1]??prep).hand.y-hit.hand.y;
   assert.ok(drop>0&&drop<.075);
  }
 }
 const low=hits[3];
 assert.ok(prep.hand.y-low.hand.y>.1&&Math.abs(low.localHand.x)<.14);
 assert.ok(at(.99).hand.distanceTo(at(1.01).hand)<.01);
 assert.ok(hits[4].hand.distanceTo(hits[0].hand)<.001);
 avatar.update((2000+duration)/1000,0,false,false,null);
 assert.equal(avatar.rightHand.position.y,-.4);
 const sleeve=avatar.rightArm.children.find(child=>child instanceof T.Mesh)!;
 assert.deepEqual(sleeve.morphTargetInfluences,[0,0]);
});

test('Little Captain repeats the reference phrase with bent elbows and planted feet',()=>{
 const avatar=new Avatar(0x654321,undefined,4);
 const visitor={x:0,y:0,z:0,yaw:0,dance:{startedAt:0,moveStartedAt:2000,style:'step'}} as Visitor;
 const duration=danceMoveDuration(visitor.dance);
 const handsAt=(phase:number)=>{
  const now=2000+phase*duration;
  avatar.update(now/1000,0,false,false,null);
  poseDancingAvatar(avatar,dancePose(visitor,now));
  assert.ok(Math.abs(footY(avatar)-.06)<.008);
  return [avatar.leftHand,avatar.rightHand].map(hand=>avatar.body.worldToLocal(hand.getWorldPosition(new T.Vector3())));
 };
 for(const phase of [1.2,1.4,1.65,1.8]){
  const hands=handsAt(phase),repeated=handsAt(phase+1);
  hands.forEach((hand,i)=>assert.ok(hand.distanceTo(repeated[i])<.001));
  assert.notEqual(avatar.leftHand.parent,avatar.leftArm);
  assert.notEqual(avatar.rightHand.parent,avatar.rightArm);
 }
 const at=(seconds:number)=>handsAt(1+seconds*1000/duration);
 const [leftHeld,rightLow]=at(.8),[leftStill,rightAcross]=at(1.2);
 assert.ok(leftHeld.distanceTo(leftStill)<.001);
 assert.ok(rightLow.x-rightAcross.x>.30&&rightAcross.y<leftHeld.y-.15);
 const [leftHigh,rightUnder]=at(1.65),[leftUnder,rightHigh]=at(1.7875);
 assert.ok(leftHigh.y>rightUnder.y+.13&&rightHigh.y>leftUnder.y+.13);
 const [leftNear,rightFar]=at(1.71875);
 assert.ok(rightFar.z>leftNear.z+.15,'the rolling fists pass in the reverse direction');
 for(const start of [1.65,3.8]){
  for(let offset=0;offset<.37;offset+=.04){
   const [left,right]=at(start+offset);
   assert.ok(Math.abs(left.x)<.004&&Math.abs(right.x)<.004,'both fists stay on the chest centerline');
   assert.ok(left.distanceTo(right)>.16,'the two mittens clear each other throughout the roll');
  }
 }
 const [leftLow,otherHeld]=at(2.6),[leftAcross,otherStill]=at(3);
 assert.ok(otherHeld.distanceTo(otherStill)<.001);
 assert.ok(leftLow.x-leftAcross.x>.30);
 for(const [start,front] of [[4.35,0],[5.55,1]] as const){
  const back=1-front;
  const poses=[.12,.255,.51,.765,.98].map(age=>at(start+age));
  for(const [left,right] of poses){
   const hands=[left,right];
   assert.ok(hands[back].z-hands[front].z>.82);
   assert.ok(Math.abs(left.y+right.y-1.98)<.001);
   assert.ok(Math.abs(left.x+.16)<.001&&Math.abs(right.x-.16)<.001);
  }
  assert.ok(poses[0][front].y>poses[1][front].y+.025);
  assert.ok(poses[2][front].y>poses[1][front].y+.035);
  assert.ok(poses[2][front].y>poses[3][front].y+.035);
  assert.ok(poses[4][front].y>poses[3][front].y+.025);
 }
 const lap=8.2-6.75-.18;
 const [leftBack,rightFront]=at(6.75),[leftFront,rightBack]=at(6.75+lap/2);
 assert.ok(leftBack.z-rightFront.z>.34&&rightBack.z-leftFront.z>.34);
 const [leftHighSwim,rightLowSwim]=at(6.75+lap/4);
 const [leftLowSwim,rightHighSwim]=at(6.75+lap*3/4);
 assert.ok(rightHighSwim.y-leftLowSwim.y>.21&&leftHighSwim.y-rightLowSwim.y>.21);
 for(const seconds of [4.65,5.85,6.66,6.95,7.25,7.65]){
  at(seconds);
  for(const hand of [avatar.leftHand,avatar.rightHand]){
   const elbow=hand.parent!;
   assert.ok(elbow.quaternion.angleTo(new T.Quaternion())<.025,'elbows stay straight at full reach');
  }
 }
 const [finalLeftUp,finalRightDown]=at(8.2);
 const [finalLeftDown,finalRightUp]=at(8.3375);
 assert.ok(finalLeftUp.y>finalRightDown.y+.13&&finalRightUp.y>finalLeftDown.y+.13);
 for(let age=0;age<duration;age+=30){
  const now=2000+age;
  avatar.update(now/1000,0,false,false,null);
  poseDancingAvatar(avatar,dancePose(visitor,now));
  const allowLongHair=age>=4170&&age<6750;
  assert.ok(headClipping(avatar,allowLongHair)<.015,`Captain's arm intersects the face at ${age}ms`);
 }
 avatar.update(20,0,false,false,null);
 assert.equal(avatar.leftHand.parent,avatar.leftArm);
 assert.equal(avatar.rightHand.rotation.y,0);
});

test('solo jumps lift both hands sideways from fixed shoulders without crossing the head',()=>{
 const visitor={x:0,y:0,z:0,yaw:0,dance:{startedAt:0,moveStartedAt:2000,style:'hop'}} as Visitor;
 const duration=danceMoveDuration(visitor.dance);
 for(const variant of [0,4,5]){
  const avatar=new Avatar(0x654321,undefined,variant);
  const shoulders=[avatar.leftArm.position.clone(),avatar.rightArm.position.clone()];
  for(let sample=0;sample<=60;sample++){
   const now=2000+sample*duration/60;
   const pose=dancePose(visitor,now);
   avatar.update(now/1000,0,false,false,null);
   poseDancingAvatar(avatar,pose);
   assert.ok(avatar.leftArm.position.equals(shoulders[0])&&avatar.rightArm.position.equals(shoulders[1]));
   assert.ok(headClipping(avatar)<.015,`Variant ${variant} overlaps at jump frame ${sample}`);
   if(pose.hop<.99)continue;
   for(const [hand,side] of [[avatar.leftHand,-1],[avatar.rightHand,1]] as const){
    const position=avatar.body.worldToLocal(hand.getWorldPosition(new T.Vector3()));
    assert.ok(position.x*side>.43&&position.y>1.06&&position.y<1.13&&position.z<0&&position.z>-.27);
   }
  }
 }
});

test('dance greetings tilt the face down and then bring it back up',()=>{
 const a=new Avatar();
 const visitor={x:0,y:0,z:0,yaw:0,dance:{startedAt:0}} as Visitor;
 const at=(now:number)=>{
  a.update(0,0,false,false,null);
  poseDancingAvatar(a,dancePose(visitor,now));
  return a.head.getWorldDirection(new T.Vector3()).negate().y;
 };
 assert.ok(at(600)<-.4&&Math.abs(at(1500))<1e-6);
 finishDance(visitor,[visitor],2000);
 assert.ok(at(2800)<-.4&&Math.abs(at(3600))<1e-6);
});

test('raised gestures keep both shoulders attached at their resting positions',()=>{
 for(const mode of ['standing','seated','train'] as const){
  const seated=mode!=='standing',a=new Avatar(0x5a7d8c,undefined,4);
  a.trainPassenger=mode==='train';
  a.update(0,0,seated,false,null,10,10);
  const leftRest=a.leftArm.position.toArray(),rightRest=a.rightArm.position.toArray();
  for(const gesture of ['wave','bravo','ovation','shh'] as const){
   for(const cameraFacing of [{turn:-3.3,pitch:.4},{turn:.14,pitch:.4},{turn:.5,pitch:-.5},{turn:2.2,pitch:.4}]){
    const facing=gesture==='ovation'||gesture==='shh'?cameraFacing:undefined;
    for(let age=0;age<=gestureSeconds(gesture);age+=.05){
     a.update(age,0,seated,true,gesture,age,1/30,facing);
     const context=`${mode} ${gesture} at ${age.toFixed(2)}`;
     assert.deepEqual(a.leftArm.position.toArray(),leftRest,context);
     assert.deepEqual(a.rightArm.position.toArray(),rightRest,context);
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
