import {findPath} from '../src/navigation/path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_DANCES,danceNpc,danceMoveDuration,findNearbyDanceSpace,handleDance,dancePose,partnerRoutineYaw,expireDance,finishDance,clearDanceSpace} from '../shared/dance';
import {SEATS,surfaceHeight,type Visitor} from '../shared/venue';
import {PARTERRE} from '../shared/parterre';
import * as T from 'three';
import {Avatar,AVATAR_HEAD_HEIGHT,DANCE_ARM_LENGTH} from '../src/character/Avatar';
import {poseDancingAvatar} from '../src/scene/DancePose';
import {Ghosts} from '../src/scene/Ghosts';
function guest(id:string,x:number):Visitor{return {id,name:id,color:0,zone:'auditorium',x,y:0,z:47.7,yaw:0,pose:'idle',seatId:null,gesture:null,gestureAt:0};}
function pair(){
 const a=guest('a',-.6),b=guest('b',.6),all=[a,b];
 b.yaw=Math.PI/2;
 assert.equal(handleDance(b,all,{type:'danceStart'},10000),null);
 assert.ok(b.dance?.joinSpot);
 return {a,b,all};
}
test('solo is opt in and stops after the farewell',()=>{const a=guest('a',0);assert.equal(a.dance,undefined);handleDance(a,[a],{type:'danceStart'},10000);assert.ok(a.dance);handleDance(a,[a],{type:'danceStop'},11000);expireDance([a],12600);assert.equal(a.dance,undefined);});
test('a seated guest can dance solo on the cushion and sit back down on the same claim',()=>{
 const seat=SEATS.find(s=>s.level==='parterre')!;
 const host={...guest('seat-dancer',seat.x),x:seat.x,y:seat.y,z:seat.z,yaw:seat.yaw,pose:'sit',seatId:seat.id} as Visitor;
 const poses=[host];
 assert.equal(handleDance(host,poses,{type:'danceStart'},10000),null);
 assert.equal(host.dance?.chair,true);
 assert.equal(host.dance?.joinSpot,undefined);
 assert.equal(dancePose(host,10000).y,seat.y);
 assert.ok(Math.abs(dancePose(host,10500).y-seat.y-.625)<1e-9);
 assert.ok(handleDance(host,poses,{type:'danceJoinNpc'},10500));
 assert.equal(handleDance(host,poses,{type:'danceStart',style:'hop'},10600),null);
 assert.ok(dancePose(host,11000).bob>0);
 assert.equal(handleDance(host,poses,{type:'danceStop'},12000),null);
 assert.equal(dancePose(host,13600).y,seat.y);
 expireDance(poses,13600);
 assert.deepEqual([host.x,host.y,host.z,host.yaw,host.seatId,host.pose],[seat.x,seat.y,seat.z,seat.yaw,seat.id,'sit']);
 assert.equal(host.dance,undefined);
 const train={...host,trainSeat:0};
 assert.ok(handleDance(train,[train],{type:'danceStart'},14000));
});
test('a ghost can fill the free dance spot and shares the host’s moves and farewell',()=>{
 const host={...guest('host',.6),y:8.3,z:46};
 host.yaw=Math.PI/2;
 assert.ok(handleDance(host,[host],{type:'danceJoinNpc'},10000));
 assert.equal(handleDance(host,[host],{type:'danceStart'},10000),null);
 const spot=host.dance!.joinSpot!;
 const blocker={...guest('blocker',spot.x),...spot};
 assert.ok(handleDance(host,[host,blocker],{type:'danceJoinNpc'},10000));
 assert.equal(handleDance(host,[host],{type:'danceJoinNpc'},10000),null);
 const npc=danceNpc(host)!;
 assert.deepEqual([npc.x,npc.y,npc.z],[spot.x,spot.y,spot.z]);
 assert.equal(host.dance?.joinSpot,undefined);
 assert.ok(handleDance(blocker,[host,blocker],{type:'danceJoin',targetId:host.id},10150));
 expireDance([host],12000);
 assert.equal(host.dance?.endingAt,undefined);
 assert.equal(handleDance(host,[host],{type:'danceStart',style:'hop'},12000),null);
 const peak=host.dance!.moveStartedAt!+danceMoveDuration(host.dance)/2;
 assert.ok(dancePose(host,peak).bob>.2);
 assert.equal(dancePose(danceNpc(host)!,peak).bob,0);
 handleDance(host,[host],{type:'danceStop'},peak);
 const endingNpc=danceNpc(host)!;
 assert.equal(endingNpc.dance!.endingAt,peak);
 assert.ok(host.dance?.stop?.back&&endingNpc.dance?.stop?.back);
 assert.equal(dancePose(endingNpc,peak+650).x,dancePose(endingNpc,peak+1200).x);
 assertFarewell(host,endingNpc,peak);
 expireDance([host],peak+1600);
 assert.equal(danceNpc(host),undefined);
});
test('solo dance visibly swings both arms and alternates lifted feet at a fixed anchor',()=>{
 const v=guest('solo',0),avatar=new Avatar();
 handleDance(v,[v],{type:'danceStart'},10000);
 const samples=[.375,1.125].map(age=>{
  avatar.update(age,0,false,false,null,10,1/30);
  poseDancingAvatar(avatar,dancePose(v,10000+age*1000));
  assert.equal(avatar.root.position.x,v.x);
  assert.equal(avatar.root.position.z,v.z);
  return {arm:avatar.leftArm.rotation.x,left:avatar.leftLeg.position.y,right:avatar.rightLeg.position.y};
 });
 assert.ok(Math.abs(samples[0].arm-samples[1].arm)>.7);
 assert.ok(samples[0].right-samples[0].left>.06);
 assert.ok(samples[1].left-samples[1].right>.06);
});
test('switching from captain to solo floss restores straight arms and crosses the front wrist',()=>{
 const visitor=guest('solo',0),avatar=new Avatar(0x252733,undefined,4),mitten=new T.Vector3();
 assert.equal(handleDance(visitor,[visitor],{type:'danceStart'},9500),null);
 assert.equal(handleDance(visitor,[visitor],{type:'danceStart',style:'step'},10000),null);
 const captain=dancePose(visitor,11900);
 avatar.update(11.9,0,false,false,null,10,1/30,undefined,!!captain.captain);
 poseDancingAvatar(avatar,captain);
 assert.ok(avatar.leftHand.parent!==avatar.leftArm&&avatar.rightHand.parent!==avatar.rightArm);

 assert.equal(handleDance(visitor,[visitor],{type:'danceStart',style:'clap'},12000),null);
 const duration=danceMoveDuration(visitor.dance);
 const soloAvatar=new Avatar(0x252733,undefined,4),soloMitten=new T.Vector3();
 for(const [phase,side,hand,arm] of [
  [.125,-1,avatar.leftHand,avatar.leftArm],
  [.625,1,avatar.rightHand,avatar.rightArm],
 ] as const){
  const now=12000+duration*(1+phase),floss=dancePose(visitor,now);
  avatar.update(now/1000,0,false,false,null,10,1/30,undefined,!!floss.captain);
  poseDancingAvatar(avatar,floss);
  assert.ok(hand.parent===arm,'the hand returns to its straight arm after the captain move');
  avatar.body.worldToLocal(hand.getWorldPosition(mitten));
  assert.ok(side*mitten.x<0,'the front mitten crosses the waist toward the other side');
  assert.ok(mitten.z<-.25,'the crossed mitten stays in front of the torso');
  soloAvatar.update(now/1000,0,false,false,null,10,1/30);
  poseDancingAvatar(soloAvatar,floss);
  const soloHand=side<0?soloAvatar.leftHand:soloAvatar.rightHand;
  soloAvatar.body.worldToLocal(soloHand.getWorldPosition(soloMitten));
  assert.ok(mitten.distanceTo(soloMitten)<.001,'the previous captain pose does not alter the solo floss position');
 }
});
test('solo move buttons repeat and keep their selection across cycles',()=>{
 const host=guest('solo',0);
 const visitors=[host];
 handleDance(host,visitors,{type:'danceStart'},10000);
 const spot=host.dance?.joinSpot;
 for(const [index,{id}] of SOLO_DANCES.entries()){
  assert.equal(handleDance(host,visitors,{type:'danceStart',style:id},11000+index*5000),null);
  const pressedAt=11000+index*5000;
  assert.equal(host.dance?.moveStartedAt,pressedAt);
  assert.equal(host.dance?.previousMove,undefined);
  assert.equal(host.dance?.startedAt,10000);
  assert.deepEqual(host.dance?.joinSpot,spot);
  const duration=danceMoveDuration(host.dance);
  for(const jazz of [false,true]){
   const middle=dancePose(host,pressedAt+duration/2,jazz);
   if(id==='sweep'){
    assert.ok(middle.handsUp>.95);
    assert.equal(middle.step,dancePose({...host,dance:{startedAt:10000}},pressedAt+duration/2,jazz).step);
   }
   if(id==='step')assert.equal(duration,8655);
   if(id==='sweep'){
    assert.equal(duration,2200);
    for(let index=0;index<8;index++){
     const {handsUp,handsSway}=dancePose(host,pressedAt+duration*(index+.5)/8,jazz);
     assert.ok(handsUp>.95&&handsSway*(index%2?-1:1)>.99);
    }
   }
   if(id==='hop'){
    const at=(p:number)=>dancePose(host,pressedAt+duration*p,jazz).bob;
    assert.equal(duration,2200*2/3);
    assert.ok(at(.25)>.18&&at(.75)>.18&&at(.5)<1e-6);
   }
   if(id==='shimmy')assert.equal(duration,2200);
   if(id==='clap')assert.equal(duration,2200);
   const sample={step:.25,sweep:.1875,bad:.35,clap:7/24,shimmy:.1875,hop:.25}[id];
   const repeated=dancePose(host,pressedAt+duration*(2+sample),jazz);
   const amplitude={step:repeated.captain,sweep:repeated.handsUp,bad:repeated.badPop,
    clap:repeated.flossCross,shimmy:-repeated.shimmy,hop:repeated.bob/.19}[id];
   assert.ok(amplitude>.7,`${id} is still visible after the second cycle`);
  }
 }
});
test('switching from a legacy solo turn starts the new move immediately',()=>{
 const v=guest('solo',0);
 handleDance(v,[v],{type:'danceStart'},10000);
 assert.ok(handleDance(v,[v],{type:'danceStart',style:'spin'},11000));
 v.dance={...v.dance!,style:'spin',moveStartedAt:11000};
 handleDance(v,[v],{type:'danceStart',style:'clap'},11550);
 assert.equal(v.dance?.style,'clap');
 assert.equal(v.dance?.moveStartedAt,11550);
 assert.equal(v.dance?.previousMove,undefined);
 assert.ok(dancePose(v,12650).floss>.9);
 handleDance(v,[v],{type:'danceStart',style:'clap'},13200);
 assert.equal(v.dance?.moveStartedAt,11550);
});
test('a dancer facing the rear wall opens a safe spot in another direction',()=>{
 const host={...guest('host',0),z:49.4,yaw:Math.PI};
 const visitors:Visitor[]=[host];
 assert.equal(handleDance(host,visitors,{type:'danceStart'},10000),null);
 const dancer=visitors[0];
 const spot=dancer.dance?.joinSpot;
 assert.ok(spot);
 assert.ok(spot.z<host.z);
 assert.ok(clearDanceSpace(dancer,{...dancer,...spot},[]));
});
test('partners can start on the rear table aisle and keep the center of their advertised spots',()=>{
 const host={...guest('host',0),y:PARTERRE.floor,z:39.2};
 const room=[host];
 assert.equal(handleDance(host,room,{type:'danceStart'},10000),null);
 const spot=host.dance!.joinSpot!;
 assert.deepEqual(spot,{x:0,y:PARTERRE.floor,z:38});
 const partner={...guest('partner',.15),y:spot.y,z:spot.z};
 room.push(partner);
 assert.equal(handleDance(partner,room,{type:'danceJoin',targetId:host.id},11000),null);
 assert.deepEqual(host.dance!.center,{x:0,y:PARTERRE.floor,z:38.6});
 assert.deepEqual(partner.dance!.center,host.dance!.center);
});
test('a tight space allows solo in place, but a duet still needs a reachable spot on the same floor',()=>{
 for(const start of [{x:0,z:43,y:0},{x:14.7,z:10,y:8.3}]){
  const y=surfaceHeight('auditorium',start)!;
  const host:Visitor={...guest('host',start.x),...start,y};
  assert.equal(handleDance(host,[host],{type:'danceStart'},10000),null);
  assert.equal(host.z,start.z);
  assert.deepEqual(host.dance,{startedAt:10000});
  assert.ok(handleDance(host,[host],{type:'danceJoinNpc'},10500));
  finishDance(host,[host],11000,true);
  const target=findNearbyDanceSpace(host,point=>findPath('auditorium',host,point)!==null);
  assert.ok(target);
  assert.notEqual(target.z,start.z);
  assert.equal(target.y>=4,start.y>=4);
  Object.assign(host,target);
  const visitors=[host];
  assert.equal(handleDance(host,visitors,{type:'danceStart'},12000),null);
  const spot=visitors[0].dance?.joinSpot;
  assert.ok(spot);
  assert.equal(spot.y,target.y);
 }
});
test('a physically blocked spot cannot start a standing dance',()=>{
 const host:Visitor={...guest('host',15.5),y:8.3,z:10};
 assert.ok(handleDance(host,[host],{type:'danceStart'},10000));
 assert.equal(host.dance,undefined);
});
test('an available spot admits only one partner',()=>{
 const {a,b,all}=pair();
 assert.equal(handleDance(a,all,{type:'danceJoin',targetId:b.id},11000),null);
 const visitor=guest('third',-.6);
 assert.ok(handleDance(visitor,[...all,visitor],{type:'danceJoin',targetId:b.id},11001));
 assert.equal(visitor.dance,undefined);
});
test('accept shares center, time and roles and yields repeatable facing poses',()=>{const {a,b,all}=pair();assert.ok(clearDanceSpace(a,b,all));assert.equal(handleDance(a,all,{type:'danceJoin',targetId:b.id},11000),null);assert.equal(a.dance!.startedAt,b.dance!.startedAt);for(const age of [0,2000,5000,9000,15000,25000]){const p=dancePose(a,14000+age),q=dancePose(b,14000+age);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>=.68&&Math.hypot(p.x-q.x,p.z-q.z)<=.99);assert.deepEqual(p.hand,q.rightHand);assert.deepEqual(p.rightHand,q.hand);assert.deepEqual(p,dancePose(structuredClone(a),14000+age));}});
test('shared routines release the grip and play the solo choreography in sync',()=>{
 for(const useNpc of [false,true])for(const [style,field] of [['step','captain'],['bad','badLean'],['clap','floss'],['shimmy','shimmy']] as const){
  const {a,b,all}=pair();
  const room=useNpc?[b]:all;
  const join=useNpc?{type:'danceJoinNpc'} as const:{type:'danceJoin',targetId:b.id} as const;
  assert.equal(handleDance(useNpc?b:a,room,join,11000),null);
  assert.equal(handleDance(b,room,{type:'danceStart',style},13000),null);
  const partner=useNpc?danceNpc(b)!:a;
  const duration=danceMoveDuration(b.dance);
  assert.equal(duration,danceMoveDuration({style}));
  const at=13000+duration*.33,first=dancePose(b,at),second=dancePose(partner,at);
  assert.notEqual(first[field],0);
  assert.equal(first[field],second[field]);
  assert.equal(first.yaw,second.yaw);
  assert.equal(first.yaw,partnerRoutineYaw(b.dance!.angle!));
  assert.equal(first.hold,0);
  assert.equal(second.hold,0);
  assert.ok(Math.hypot(first.x-second.x,first.z-second.z)>1.5);
 }
});
test('pressing the selected pair move again immediately returns both partners to the basic step',()=>{
 for(const useNpc of [false,true]){
  const {a,b,all}=pair();
  const room=useNpc?[b]:all;
  const join=useNpc?{type:'danceJoinNpc'} as const:{type:'danceJoin',targetId:b.id} as const;
  assert.equal(handleDance(useNpc?b:a,room,join,11000),null);
  const move={type:'danceStart',style:'hop'} as const;
  assert.equal(handleDance(b,room,move,13000),null);
  const duration=danceMoveDuration(b.dance);
  const peak=13000+duration/2;
  assert.ok(dancePose(b,peak).bob>.2,'the selected jump is active');
  assert.equal(handleDance(useNpc?b:a,room,move,peak),null);
  const partner=useNpc?danceNpc(b)!:a;
  for(const visitor of [b,partner]){
   assert.equal(visitor.dance!.style,undefined);
   assert.equal(visitor.dance!.moveStartedAt,undefined);
   assert.equal(visitor.dance!.previousMove,undefined);
   assert.equal(visitor.dance!.partnerId,visitor===b?partner.id:b.id);
   const basic=dancePose(visitor,peak);
   assert.equal(basic.bob,0);
   assert.equal(basic.hold,1);
  }
 }
});
test('pressing a queued pair move again clears it and returns both partners to the basic step',()=>{
 const {a,b,all}=pair();
 assert.equal(handleDance(a,all,{type:'danceJoin',targetId:b.id},11000),null);
 assert.equal(handleDance(b,all,{type:'danceStart',style:'spin'},13000),null);
 const hop={type:'danceStart',style:'hop'} as const;
 assert.equal(handleDance(b,all,hop,13400),null);
 assert.equal(b.dance!.previousMove?.style,'spin');
 assert.equal(handleDance(a,all,hop,13500),null);
 for(const visitor of [a,b]){
  assert.equal(visitor.dance!.style,undefined);
  assert.equal(visitor.dance!.moveStartedAt,undefined);
  assert.equal(visitor.dance!.previousMove,undefined);
  assert.equal(dancePose(visitor,13500).hold,1);
 }
});
function assertFarewell(a:Visitor,b:Visitor,now:number){
 const lookAt=(from:ReturnType<typeof dancePose>,to:ReturnType<typeof dancePose>)=>{
  const yaw=Math.atan2(from.x-to.x,from.z-to.z);
  assert.ok(Math.cos(from.yaw-yaw)>.9999);
 };
 const turned=[dancePose(a,now+640),dancePose(b,now+640)] as const;
 lookAt(turned[0],turned[1]);lookAt(turned[1],turned[0]);
 assert.ok(turned.every(p=>p.hold===0&&Math.abs(p.headPitch)<.01));
 const bowing=[dancePose(a,now+1072),dancePose(b,now+1072)] as const;
 lookAt(bowing[0],bowing[1]);lookAt(bowing[1],bowing[0]);
 assert.ok(bowing.every(p=>p.headPitch<-.35&&p.bow>.17));
}
test('partners turn to face each other before bowing and both finish',()=>{
 const {a,b,all}=pair();
 handleDance(a,all,{type:'danceJoin',targetId:b.id},11000);
 handleDance(a,all,{type:'danceStart',style:'clap'},13000);
 const now=14000;
 const start=dancePose(a,now);
 finishDance(a,all,now);
 assert.equal(a.dance?.endingAt,b.dance?.endingAt);
 assert.equal(dancePose(a,now).yaw,start.yaw);
 assertFarewell(a,b,now);
 finishDance(b,all,now+500);
 assert.equal(b.dance?.endingAt,now);
 expireDance(all,now+1600);
 assert.equal(a.dance,undefined);
 assert.equal(b.dance,undefined);
});
test('joining requires standing inside the front spot on the same floor',()=>{
 for(const change of [{z:46},{x:1.8},{y:8.3},{pose:'sit' as const}]){
  const {a,b,all}=pair();
  Object.assign(a,change);
  assert.ok(handleDance(a,all,{type:'danceJoin',targetId:b.id},11000));
  assert.equal(a.dance,undefined);
 }
});
test('occupied dance space is refused',()=>{const {a,b,all}=pair();all.push(guest('c',0));assert.ok(handleDance(a,all,{type:'danceJoin',targetId:b.id},11000));assert.equal(a.dance,undefined);});
test('partners open their straight arms on the near step and reach forward on the far step',()=>{
 for(const ghost of [false,true]){
  const {a,b,all}=pair();
  const join=ghost?{type:'danceJoinNpc'} as const:{type:'danceJoin',targetId:b.id} as const;
  const host=ghost?b:a;
  assert.equal(handleDance(host,ghost?[b]:all,join,11000),null);
  const partner=ghost?danceNpc(host)!:b;
  const avatar=new Avatar(),leftHand=new T.Vector3(),rightHand=new T.Vector3();
  const size=new T.Vector3(),one=new T.Vector3(1,1,1),shoulder=new T.Vector3();
  for(const jazz of [false,true]){
   let minGap=Infinity,maxGap=0,nearSpan=0,farSpan=0;
   for(let age=1150;age<5000;age+=35){
    const time=host.dance!.startedAt+age;
    const p=dancePose(host,time,jazz),q=dancePose(partner,time,jazz);
    assert.equal(p.hold,1);
    assert.deepEqual(p.hand,q.rightHand);
    assert.deepEqual(p.rightHand,q.hand);
    avatar.update(0,0,false,false);
    poseDancingAvatar(avatar,p);
    avatar.leftHand.getWorldPosition(leftHand);
    avatar.rightHand.getWorldPosition(rightHand);
    for(const [hand,arm,position] of [[avatar.leftHand,avatar.leftArm,leftHand],[avatar.rightHand,avatar.rightArm,rightHand]] as const){
     hand.getWorldScale(size);
     assert.ok(size.distanceToSquared(one)<1e-12,'mittens keep their original size');
     assert.equal(hand.parent,arm,'the hand stays on the original straight arm');
     arm.getWorldPosition(shoulder);
     assert.ok(Math.abs(shoulder.distanceTo(position)-DANCE_ARM_LENGTH)<1e-9);
    }
    const span=leftHand.distanceTo(rightHand),gap=Math.hypot(p.x-q.x,p.z-q.z);
    if(gap<minGap){minGap=gap;nearSpan=span;}
    if(gap>maxGap){maxGap=gap;farSpan=span;}
    avatar.root.worldToLocal(leftHand);
    avatar.root.worldToLocal(rightHand);
    assert.ok(rightHand.x-leftHand.x>.24,'hands keep their sides');
   }
   assert.ok(nearSpan>.74&&farSpan<.35,'the near step opens and the far step closes');
   assert.ok(maxGap-minGap>.27,'the dancers take a clear step back as the arms come forward');
  }
 }
});
test('the paired hands still meet with straight arms during the circling jump',()=>{
 const {a,b,all}=pair();handleDance(a,all,{type:'danceJoin',targetId:b.id},11000);
 assert.equal(handleDance(a,all,{type:'danceStart',style:'hop'},13000),null);
 const first=new Avatar(),second=new Avatar(),hand=new T.Vector3(),partnerHand=new T.Vector3();
 for(const jazz of [false,true])for(let age=2000;age<26000;age+=137){
  const now=a.dance!.startedAt+age;
  for(const [avatar,visitor] of [[first,a],[second,b]] as const){
   avatar.update(0,0,false,false);
   poseDancingAvatar(avatar,dancePose(visitor,now,jazz));
  }
  for(const [own,other] of [[first.leftHand,second.rightHand],[first.rightHand,second.leftHand]] as const){
   own.getWorldPosition(hand);
   other.getWorldPosition(partnerHand);
   assert.ok(hand.distanceTo(partnerHand)<.075,'the hand centers stay within a mitten radius');
  }
 }
});
test('a ghost meets the mittens at its straight sleeve tips without floating higher',()=>{
 const host=guest('host',0);
 handleDance(host,[host],{type:'danceStart'},10000);
 assert.equal(handleDance(host,[host],{type:'danceJoinNpc'},11000),null);
 const npc=danceNpc(host)!;
 const scene=new T.Scene(),ghosts=new Ghosts(scene),camera=new T.PerspectiveCamera(60,1,.1,100);
 camera.position.set(npc.x,3,npc.z+5);
 camera.lookAt(npc.x,1,npc.z);
 const matrix=new T.Matrix4();
 const avatar=new Avatar(),hands={left:new T.Vector3(),right:new T.Vector3()};
 const hip=new T.Vector3(0,-.7,0),direction=new T.Vector3(),euler=new T.Euler(),rotation=new T.Quaternion();
 const shoulder=new T.Vector3(),cap=new T.Vector3(),shaft=new T.Line3(),nearest=new T.Vector3();
 for(let now=12500;now<15500;now+=37){
  const dance=dancePose(npc,now);
  avatar.update(0,0,false,false);
  poseDancingAvatar(avatar,dancePose(host,now));
  avatar.leftHand.getWorldPosition(hands.left);
  avatar.rightHand.getWorldPosition(hands.right);
  ghosts.update([{...dance,id:npc.id,npc:true,yaw:dance.yaw+Math.PI,sitting:false,dance,danceHands:hands}],camera,now);
  const batch=scene.children.find(o=>o instanceof T.InstancedMesh&&o.count===1) as T.InstancedMesh;
  batch.getMatrixAt(0,matrix);
  assert.ok(Math.abs(matrix.elements[13]-dance.y-AVATAR_HEAD_HEIGHT)<1e-6);
  const body=batch.geometry.getAttribute('aBody');
  rotation.setFromEuler(euler.set(body.getX(0),body.getZ(0),body.getY(0)));
  for(const [side,name,hand] of [[-1,'aLeft',hands.left],[1,'aRight',hands.right]] as const){
   direction.fromBufferAttribute(batch.geometry.getAttribute(name),0);
   assert.ok(Math.abs(direction.length()-1)<1e-6);
   shoulder.set(.31*side,-.12,.02);
   cap.copy(shoulder).addScaledVector(direction,.38);
   for(const p of [shoulder,cap])p.sub(hip).applyQuaternion(rotation).add(hip).applyMatrix4(matrix);
   shaft.set(shoulder,cap).closestPointToPoint(hand,true,nearest);
   assert.ok(nearest.distanceTo(cap)<1e-5,'the nearest point is at the sleeve cap');
   assert.ok(Math.abs(cap.distanceTo(hand)-.183)<1e-5,'the cap and mitten surfaces meet');
  }
 }
});
test('partners bow down, release both hands for a solo turn, then only the jump initiator lifts',()=>{
 const {a,b,all}=pair();
 assert.equal(handleDance(a,all,{type:'danceJoin',targetId:b.id},11000),null);
 const greeting=dancePose(a,a.dance!.startedAt+575);
 assert.ok(greeting.bow>.2&&greeting.headPitch<-.28);
 assert.equal(handleDance(a,all,{type:'danceStart',style:'spin'},14000),null);
 const spinStart=14000,spinDuration=danceMoveDuration(a.dance);
 assert.equal(spinDuration,1350);
 const gap=(now:number)=>{const p=dancePose(a,now),q=dancePose(b,now);return Math.hypot(p.x-q.x,p.z-q.z);};
 const near=spinStart+232,far=spinStart+580;
 const assertLookAtPartner=(p:ReturnType<typeof dancePose>,q:ReturnType<typeof dancePose>)=>{
  const target=Math.atan2(p.x-q.x,p.z-q.z);
  assert.ok(Math.cos(p.yaw+p.headYaw-target)>.9999);
 };
 assertLookAtPartner(dancePose(a,near),dancePose(b,near));
 assertLookAtPartner(dancePose(b,near),dancePose(a,near));
 assert.ok(gap(far)-gap(near)>.1);
 assert.equal(dancePose(a,near).hold,1);
 assert.equal(dancePose(a,far).hold,1);
 const turnStart=far+110,turnEnd=turnStart+418;
 const turnMid=(turnStart+turnEnd)/2;
 const turn=dancePose(a,turnMid),anchor=dancePose(b,turnMid);
 assert.equal(turn.hold,0);
 assert.equal(anchor.hold,0);
 assert.ok(Math.abs(Math.sin((turn.yaw-dancePose(a,turnStart).yaw)/2))>.99);
 assert.ok(Math.abs(dancePose(a,turnEnd).yaw-dancePose(a,turnStart).yaw-Math.PI*2)<1e-6);
 assert.equal(anchor.yaw,dancePose(b,turnStart).yaw);
 assert.equal(dancePose(a,spinStart+spinDuration).hold,1);
 assert.equal(dancePose(b,spinStart+spinDuration).hold,1);
 assert.equal(dancePose(a,turnMid+spinDuration).hold,0);
 assert.equal(handleDance(b,all,{type:'danceStart',style:'hop'},15700),null);
 const jumpStart=b.dance!.moveStartedAt!,jumpDuration=danceMoveDuration(b.dance);
 assert.equal(jumpStart,spinStart+spinDuration*2);
 assert.equal(jumpDuration,1450);
 const peak=jumpStart+jumpDuration/2;
 const standing=dancePose(a,peak),jumping=dancePose(b,peak);
 assert.equal(standing.bob,0);
 assert.ok(jumping.bob>.2);
 assert.equal(standing.hop,0);
 assert.equal(standing.hold,1);
 assertLookAtPartner(standing,jumping);
 assertLookAtPartner(jumping,standing);
 assert.deepEqual(standing.rightHand,jumping.hand);
 assert.deepEqual(standing.hand,jumping.rightHand);
 assert.ok(Math.abs(Math.sin((standing.yaw-dancePose(a,jumpStart).yaw)/2))>.99);
 const launch=dancePose(b,jumpStart);
 assert.ok(Math.abs(Math.sin((jumping.yaw-launch.yaw)/2))>.99);
 assert.ok(Math.hypot(jumping.x-launch.x,jumping.z-launch.z)>.7);
 assert.equal(dancePose(b,jumpStart+jumpDuration).bob,0);
 assert.ok(dancePose(b,peak+jumpDuration).bob>.2);
 finishDance(a,all,peak+jumpDuration);
 assert.ok(dancePose(b,peak+jumpDuration+800).bob<jumping.bob);
});
test('ending during the approach steps back continuously before bowing',()=>{
 const {a,b,all}=pair();handleDance(a,all,{type:'danceJoin',targetId:b.id},11000);
 const now=11800,start=dancePose(a,now),other=dancePose(b,now);
 finishDance(a,all,now);
 const initial=dancePose(a,now),facing=dancePose(a,now+640),partner=dancePose(b,now+640);
 assert.deepEqual([initial.x,initial.z],[start.x,start.z]);
 assert.ok(Math.hypot(facing.x-partner.x,facing.z-partner.z)>Math.hypot(start.x-other.x,start.z-other.z));
 const later=dancePose(a,now+1072);
 assert.deepEqual([facing.x,facing.z],[later.x,later.z]);
 expireDance(all,now+1600);assert.equal(a.x,facing.x);assert.equal(a.z,facing.z);
});
test('disconnect gives the remaining partner a bounded farewell',()=>{
 const {a,b,all}=pair();handleDance(a,all,{type:'danceJoin',targetId:b.id},11000);
 expireDance([a],15000);assert.equal(a.dance?.endingAt,15000);expireDance([a],16600);assert.equal(a.dance,undefined);
});
