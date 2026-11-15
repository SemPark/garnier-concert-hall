import {findPath} from '../src/navigation/path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_DANCES,danceNpc,danceMoveDuration,findNearbyDanceSpace,handleDance,dancePose,partnerRoutineYaw,expireDance,finishDance,clearDanceSpace} from '../shared/dance';
import {SEATS,surfaceHeight,type Visitor} from '../shared/venue';
import * as T from 'three';
import {Avatar} from '../src/character/Avatar';
import {poseDancingAvatar} from '../src/scene/DancePose';
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
test('a tight space requires walking to a reachable dance spot on the same floor',()=>{
 for(const start of [{x:0,z:43,y:0},{x:14.7,z:10,y:8.3}]){
  const y=surfaceHeight('auditorium',start)!;
  const host:Visitor={...guest('host',start.x),...start,y};
  assert.ok(handleDance(host,[host],{type:'danceStart'},10000));
  assert.equal(host.z,start.z);
  assert.equal(host.dance,undefined);
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
test('an available spot admits only one partner',()=>{
 const {a,b,all}=pair();
 assert.equal(handleDance(a,all,{type:'danceJoin',targetId:b.id},11000),null);
 const visitor=guest('third',-.6);
 assert.ok(handleDance(visitor,[...all,visitor],{type:'danceJoin',targetId:b.id},11001));
 assert.equal(visitor.dance,undefined);
});
test('accept shares center, time and roles and yields repeatable facing poses',()=>{const {a,b,all}=pair();assert.ok(clearDanceSpace(a,b,all));assert.equal(handleDance(a,all,{type:'danceJoin',targetId:b.id},11000),null);assert.equal(a.dance!.startedAt,b.dance!.startedAt);for(const age of [0,2000,5000,9000,15000,25000]){const p=dancePose(a,14000+age),q=dancePose(b,14000+age);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>=.87&&Math.hypot(p.x-q.x,p.z-q.z)<=1.33);assert.deepEqual(p.hand,q.rightHand);assert.deepEqual(p.rightHand,q.hand);assert.deepEqual(p,dancePose(structuredClone(a),14000+age));}});
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
test('the real avatar hand stays on the shared contact throughout the turn',()=>{
 const {a,b,all}=pair();handleDance(a,all,{type:'danceJoin',targetId:b.id},11000);
 assert.equal(handleDance(a,all,{type:'danceStart',style:'hop'},13000),null);
 const avatar=new Avatar(),hand=new T.Vector3();
 for(const v of [a,b])for(let age=2000;age<26000;age+=137){
  const p=dancePose(v,v.dance!.startedAt+age);avatar.update(0,0,false,false,null,10,1/30);poseDancingAvatar(avatar,p);
  avatar.root.updateMatrixWorld(true);avatar.leftHand.getWorldPosition(hand);
  assert.ok(hand.distanceTo(new T.Vector3(p.hand!.x,p.hand!.y,p.hand!.z))<1e-6);
  avatar.rightHand.getWorldPosition(hand);
  assert.ok(hand.distanceTo(new T.Vector3(p.rightHand!.x,p.rightHand!.y,p.rightHand!.z))<1e-6);
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
 assert.ok(gap(far)-gap(near)>.4);
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
 assert.ok(Math.hypot(jumping.x-launch.x,jumping.z-launch.z)>.88);
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
