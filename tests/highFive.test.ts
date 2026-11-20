import assert from 'node:assert/strict';
import test from 'node:test';
import {InstancedMesh,Matrix4,PerspectiveCamera,Scene,Vector3} from 'three';
import {activeHighFive,HIGH_FIVE_CONTACT_MS,HIGH_FIVE_MS,startHighFive,USHER_HIGH_FIVE_ID,withinHighFiveReach} from '../shared/highFive';
import {SPAWN,type Visitor} from '../shared/venue';
import {Avatar} from '../src/character/Avatar';
import {highFivePoses} from '../src/character/highFivePose';
import {Ghosts} from '../src/scene/Ghosts';

const now=10_000;
const visitor=(id:string,x:number):Visitor=>({
 id,name:id,color:0,zone:'lobby',...SPAWN.lobby,x,yaw:0,pose:'idle',seatId:null,gesture:null,gestureAt:0,
});

test('one accepted greeting coordinates both visitors and expires without replay',()=>{
 const a=visitor('a',0),b=visitor('b',1),c=visitor('c',-1);
 const visitors=[a,b,c];
 assert.ok(startHighFive(a,{id:b.id},visitors,now));
 assert.equal(activeHighFive(a,now)?.id,b.id);
 assert.equal(startHighFive(b,{id:a.id},visitors,now+50),undefined);
 assert.equal(startHighFive(c,{id:a.id},visitors,now+50),undefined);
 assert.equal(activeHighFive(a,now+HIGH_FIVE_MS),undefined);
 assert.ok(startHighFive(c,{id:a.id},visitors,now+HIGH_FIVE_MS));
});

test('visitor greetings reject other rooms, floors and out-of-reach targets',()=>{
 const a=visitor('a',0),b=visitor('b',1);
 assert.equal(startHighFive(a,{id:a.id},[a,b],now),undefined);
 assert.equal(startHighFive(a,{id:b.id},[a,b],now),true);
 for(const target of [{...b,zone:'auditorium' as const},{...b,y:.65},{...b,x:2},{...b,gesture:'eat' as const,gestureAt:now}]){
  delete a.highFive;
  assert.equal(startHighFive(a,{id:b.id},[a,target],now),undefined);
 }
 assert.equal(startHighFive(a,{id:b.id,npc:true},[a,b],now),undefined);
});

test('a valid NPC gesture can be recorded in a solo session',()=>{
 const sender={...visitor('a',0),zone:'auditorium' as const,...SPAWN.auditorium};
 assert.ok(startHighFive(sender,{id:USHER_HIGH_FIVE_ID,npc:true},[sender],now));
 assert.equal(activeHighFive(sender,now)?.npc,true);
 sender.zone='lobby';
 assert.equal(activeHighFive(sender,now),undefined);
});

test('both visitors sidestep and strike at the same point before recoiling',()=>{
 const a={...SPAWN.lobby,sitting:false},b={...a,x:a.x+1.25};
 const contact=HIGH_FIVE_CONTACT_MS/1000;
 assert.ok(withinHighFiveReach('lobby',a,b));
 const [first,second]=highFivePoses(a,b,contact,false);
 assert.ok(first.yaw>Math.PI/2);
 assert.ok(second.yaw>-Math.PI/2);
 assert.equal(first.reach,1);
 assert.equal(first.hand.y,second.hand.y);
 assert.ok(Math.abs(second.hand.x-first.hand.x-.156)<1e-8);
 assert.ok(Math.abs(first.dx+second.dx)<1e-8);
 assert.ok(first.dz<-.2&&second.dz>.2);
 for(const age of [contact-.13,contact+.13]){
  const [beforeOrAfter,partner]=highFivePoses(a,b,age,false);
  assert.ok(partner.hand.x-beforeOrAfter.hand.x>second.hand.x-first.hand.x+.12);
 }
 for(const pose of [highFivePoses({...a,sitting:true},b,contact,false)[0],highFivePoses(a,b,contact,true)[0]]){
  assert.equal(Math.hypot(pose.dx,pose.dz),0);
 }
});

test('the player and usher make palm contact with enough room between their heads',()=>{
 const a={x:0,y:0,z:0,sitting:false},b={...a,x:.75,z:.33};
 const contact=HIGH_FIVE_CONTACT_MS/1000;
 const visitor=new Avatar(),usher=new Avatar();
 visitor.root.position.set(a.x,a.y,a.z);
 usher.root.position.set(b.x,b.y,b.z);
 visitor.settlePose(false);
 usher.settlePose(false);
 const [visitorPose,usherPose]=highFivePoses(a,b,contact,false,'right','left');
 visitor.highFive(visitorPose);
 usher.highFive(usherPose);
 const palmGap=visitor.rightHand.getWorldPosition(new Vector3()).distanceTo(usher.leftHand.getWorldPosition(new Vector3()));
 assert.ok(palmGap>=.14&&palmGap<=.164,`palms are ${palmGap} m apart`);
 assert.ok(visitor.head.getWorldPosition(new Vector3()).distanceTo(usher.head.getWorldPosition(new Vector3()))>1);
});

test('visitors at the same spawn point take separate stances and strike toward each other',()=>{
 const a={...SPAWN.lobby,sitting:false};
 const [first,second]=highFivePoses(a,a,HIGH_FIVE_CONTACT_MS/1000,false);
 assert.ok(Math.hypot(first.dx-second.dx,first.dz-second.dz)>1);
 assert.ok(Math.abs(second.hand.z-first.hand.z-.156)<1e-8);
});

test('the batched visitor uses the chosen hand and reaches the shared point',()=>{
 const a={x:0,y:0,z:0,sitting:false},b={...a,x:1.2};
 const [,highFive]=highFivePoses(a,b,HIGH_FIVE_CONTACT_MS/1000,false,'right','left');
 const scene=new Scene(),ghosts=new Ghosts(scene),camera=new PerspectiveCamera(60,1,.1,100);
 camera.position.set(.5,2,4);
 camera.lookAt(.5,1,0);
 ghosts.update([{...b,id:'visitor',yaw:0,highFive}],camera,now);
 const batch=scene.children.find(object=>object instanceof InstancedMesh&&object.count===1) as InstancedMesh;
 assert.ok(batch);
 const matrix=new Matrix4();
 batch.getMatrixAt(0,matrix);
 const arm=new Vector3().fromBufferAttribute(batch.geometry.getAttribute('aRight'),0);
 const palm=new Vector3(.28,-.12,0).addScaledVector(arm,.38).applyMatrix4(matrix);
 assert.ok(palm.distanceTo(new Vector3(highFive.hand.x,highFive.hand.y,highFive.hand.z))<1e-6);
});
