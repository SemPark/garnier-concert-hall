import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Avatar} from '../src/character/Avatar';
import {poseVillager,GESTURE_ICON} from '../src/character/villager';
import {EmoteLayer} from '../src/character/EmoteLayer';
import {GESTURES,isGesture,gestureSeconds} from '../shared/gestures';
import {LocalConcert} from '../src/network/LocalConcert';
const footY=(a:Avatar)=>{a.root.updateMatrixWorld(true);return Math.min(...[a.leftLeg,a.rightLeg].map(l=>l.children.at(-1)!.getWorldPosition(new T.Vector3()).y));};
test('eight gestures are listed once and validated',()=>{
 assert.equal(GESTURES.length,8);assert.equal(new Set(GESTURES.map(g=>g.id)).size,8);
 for(const g of GESTURES){assert.ok(isGesture(g.id));assert.ok(gestureSeconds(g.id)>=2);}
 assert.equal(isGesture('dance'),false);assert.equal(isGesture(3),false);
 const room=new LocalConcert();assert.equal(room.send({type:'gesture',gesture:'dance' as never}),false);assert.ok(room.send({type:'gesture',gesture:'bravo'}));assert.equal(room.visitor.gesture,'bravo');
});
test('every gesture keeps the standing feet on the floor, including the bow',()=>{
 for(const g of GESTURES){const a=new Avatar();for(let age=0;age<=g.seconds;age+=.05){a.update(0,0,false,false,g.id,age,1/30);assert.ok(Math.abs(footY(a)-.07)<.03,`${g.id} at ${age.toFixed(2)}: foot left the floor`);}}
 const a=new Avatar();a.update(0,0,false,false,'bow',1.2,1);assert.ok(a.body.rotation.x<-.4,'bow bends forward at the hips');
});
test('a seated ovation stands up in front of the chair, then sits again',()=>{
 const a=new Avatar();for(let i=0;i<60;i++)a.update(0,0,true,false,null,10,1/30);
 a.update(0,0,true,false,'ovation',1.5,1/30);assert.ok(a.leftLeg.rotation.x<.2,'legs straighten to stand');assert.ok(a.body.position.z<-.4,'steps forward off the cushion');
 a.update(0,0,true,false,'ovation',10,1/30);assert.ok(Math.abs(a.leftLeg.rotation.x-Math.PI/2)<1e-6);
});
test('icons appear only while a gesture plays and fade at its end',()=>{
 for(const g of GESTURES){const mid=poseVillager({time:0,speed:0,sit:0,music:false,musician:false,gesture:g.id,age:g.seconds/2});assert.equal(mid.icon,GESTURE_ICON[g.id]);assert.ok(mid.weight>.99);
  assert.equal(poseVillager({time:0,speed:0,sit:0,music:false,musician:false,gesture:g.id,age:g.seconds+.1}).icon,null);}
 const layer=new EmoteLayer(4);layer.set(1,new T.Vector3(1,2,3),'heart',1);assert.equal(layer.visibleCount(),1);assert.equal(layer.iconAt(1),'heart');layer.set(9,new T.Vector3(),'zz',1);layer.clear();assert.equal(layer.visibleCount(),0);
});
test('musicians keep facing the conductor with only a tiny nod',()=>{
 for(let t=0;t<20;t+=.37){const p=poseVillager({time:t,speed:0,sit:1,music:true,musician:true,gesture:null,age:10});assert.ok(Math.abs(p.headPitch)<=.035&&p.headYaw===0&&p.lean===0);}
});
/** Deepest overlap between either arm (or mitten) and the skull, ears or any hair piece. */
export function headClipping(a:Avatar){
 a.root.updateMatrixWorld(true);let worst=0;
 const shapes=a.head.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&o.geometry instanceof T.SphereGeometry&&Math.max(o.scale.x,o.scale.y,o.scale.z)>.06);
 for(const [arm,hand] of [[a.leftArm,a.leftHand],[a.rightArm,a.rightHand]] as const){
  const line=new T.Line3(a.head.worldToLocal(arm.getWorldPosition(new T.Vector3())),a.head.worldToLocal(hand.getWorldPosition(new T.Vector3()))),c=new T.Vector3(),p=new T.Vector3(),length=line.distance();
  for(const m of shapes)for(let u=0;u<16;u++)for(let v=1;v<9;v++){const th=u/16*Math.PI*2,ph=v/9*Math.PI;p.set(Math.sin(ph)*Math.cos(th)*m.scale.x,Math.cos(ph)*m.scale.y,Math.sin(ph)*Math.sin(th)*m.scale.z).add(m.position);
   line.closestPointToPoint(p,true,c);const r=line.start.distanceTo(c)>length-.05?.082:.066;worst=Math.max(worst,r-p.distanceTo(c));}
 }
 return worst;
}
test('raised arms and hands never pass into the head or hair',()=>{
 for(const variant of [0,4,5])for(const g of GESTURES){
  const a=new Avatar(0x5a7d8c,undefined,variant);for(let i=0;i<40;i++)a.update(0,0,false,false,null,10,1/30);
  for(let age=0;age<=g.seconds;age+=.1){a.update(0,0,false,false,g.id,age,1/30);const depth=headClipping(a);assert.ok(depth<.015,`${a.hair} ${g.id} at ${age.toFixed(1)}: arm ${(depth*100).toFixed(1)}cm inside the head`);}
 }
});

test('hush raises one short index finger against the lips, on the thumb side of the mitten',()=>{
 for(const variant of [0,4,5]){const a=new Avatar(0x5a7d8c,undefined,variant);
  a.update(0,0,false,false,null,10,1/30);assert.equal(a.finger.scale.x,0,'no finger outside the hush');
  a.update(0,0,false,false,'shh',1.2,1/30);a.root.updateMatrixWorld(true);assert.ok(a.finger.scale.x>.99);
  const tip=a.head.worldToLocal(a.finger.getWorldPosition(new T.Vector3())),hand=a.body.worldToLocal(a.rightHand.getWorldPosition(new T.Vector3())),finger=a.body.worldToLocal(a.finger.getWorldPosition(new T.Vector3()));
  // Mouth sits at (0,-.165,-.322) in head space: the finger crosses it, just in front of the lips.
  assert.ok(Math.abs(tip.x)<.05&&Math.abs(tip.y+.165)<.05,`finger misses the mouth: ${tip.toArray()}`);assert.ok(tip.z<-.34&&tip.z>-.4,`finger not touching the lips: ${tip.z}`);
  assert.ok(finger.x<hand.x,'finger stays on the thumb side, not centred on the fist');
  for(const g of ['wave','clap','bravo'] as const){a.update(0,0,false,false,g,1,1/30);assert.equal(a.finger.scale.x,0);}
 }
});
