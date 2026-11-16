import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {applyDelta,type ClientMessage,type ServerMessage,type Snapshot} from '../shared/protocol';
import {danceMoveDuration,danceNpc,dancePose} from '../shared/dance';

// Run against a local Worker: CONCERT_TEST_URL=http://127.0.0.1:8788 node --import tsx tests/dance-integration.ts
const base=process.env.CONCERT_TEST_URL??'http://127.0.0.1:8787';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(check:()=>unknown,label:string){const end=Date.now()+6000;while(Date.now()<end){if(check())return;await sleep(25);}throw new Error(label);}
class Client{
 socket!:WebSocket;state!:Snapshot;id='';errors:string[]=[];
 get self(){return this.state?.visitors.find(v=>v.id===this.id)!;}
 async open(room:string){const url=new URL('/api/presence',base);url.protocol='ws:';url.searchParams.set('room',room);
  this.socket=new WebSocket(url,{origin:new URL(base).origin});
  this.socket.on('message',raw=>{const m=JSON.parse(raw.toString()) as ServerMessage;
   if(m.type==='welcome'){this.id=m.selfId;this.state=m.state;}
   if(m.type==='state')this.state=m.state;
   if(m.type==='delta'&&this.state){const next=applyDelta(this.state,m.delta);if(next)this.state=next;else this.send({type:'sync'});}
   if(m.type==='error')this.errors.push(m.message);
  });await until(()=>this.id,'connect');return this;
 }
 send(m:ClientMessage){this.socket.send(JSON.stringify(m));}
}
for(const room of ['hall-97','jazz-97']){
 const a=await new Client().open(room),b=await new Client().open(room);
 try{
  a.send({type:'zone',zone:'auditorium'});b.send({type:'zone',zone:'auditorium'});
  await until(()=>a.self.zone==='auditorium'&&b.self.zone==='auditorium','enter');
  a.send({type:'move',x:-.6,y:0,z:47.7,yaw:0,pose:'idle'});b.send({type:'move',x:.6,y:0,z:47.7,yaw:Math.PI/2,pose:'idle'});
  await until(()=>a.self.x===-.6&&b.self.x===.6,'position');
  b.send({type:'danceStart'});await until(()=>b.self.dance,'solo');
  a.send({type:'danceJoin',targetId:b.id});
  await until(()=>a.self.dance?.partnerId&&b.self.dance?.partnerId,'join immediately');
  assert.equal(a.self.dance!.startedAt,b.self.dance!.startedAt);
  for(const v of a.state.visitors){const other=b.state.visitors.find(p=>p.id===v.id)!;assert.deepEqual(dancePose(v,v.dance!.startedAt+9500),dancePose(other,v.dance!.startedAt+9500));}
  a.send({type:'danceStart',style:'spin'});
  await until(()=>a.self.dance?.style==='spin'&&b.self.dance?.style==='spin','shared one-hand turn');
  assert.equal(a.self.dance!.moveStartedAt,b.self.dance!.moveStartedAt);
  assert.equal(a.self.dance!.moveLeader,a.self.dance!.role);
  const turnStart=a.self.dance!.moveStartedAt!;
  const duration=danceMoveDuration(a.self.dance);
  assert.equal(dancePose(a.self,turnStart+duration+899).hold,0,'turn repeats');
  b.send({type:'danceStart',style:'hop'});
  await until(()=>a.self.dance?.style==='hop'&&b.self.dance?.style==='hop','initiated jump');
  assert.equal(a.self.dance!.moveStartedAt,b.self.dance!.moveStartedAt);
  assert.deepEqual(a.self.dance!.previousMove,b.self.dance!.previousMove);
  assert.equal(a.self.dance!.previousMove?.style,'spin');
  const jumpDuration=danceMoveDuration(b.self.dance);
  const secondJump=b.self.dance!.moveStartedAt!+jumpDuration*1.5;
  assert.ok(dancePose(b.self,secondJump).bob>.2);
  const grounded=dancePose(a.self,secondJump),airborne=dancePose(b.self,secondJump);
  assert.equal(grounded.bob,0);
  assert.equal(grounded.hold,1);
  assert.deepEqual(grounded.hand,airborne.rightHand);
  const launch=dancePose(b.self,secondJump-jumpDuration/2);
  assert.ok(Math.hypot(airborne.x-launch.x,airborne.z-launch.z)>.7);
  a.send({type:'move',x:0,y:0,z:46,yaw:0,pose:'walk'});await sleep(150);assert.equal(a.self.x,-.6,'movement locked');
  a.send({type:'danceStart',style:'bad'});
  await until(()=>a.self.dance?.style==='bad'&&b.self.dance?.style==='bad','shared solo routine');
  const at=a.self.dance!.moveStartedAt!+800;
  assert.equal(dancePose(a.self,at).badLean,dancePose(b.self,at).badLean);
  assert.equal(dancePose(a.self,at).hold,0);
  a.send({type:'danceStop'});
  await until(()=>a.self.dance?.endingAt&&b.self.dance?.endingAt,'shared farewell');
  const bowAt=a.self.dance!.endingAt!+1072;
  const bowA=dancePose(a.self,bowAt),bowB=dancePose(b.self,bowAt);
  const facing=Math.atan2(bowA.x-bowB.x,bowA.z-bowB.z);
  assert.ok(Math.cos(bowA.yaw-facing)>.9999&&Math.cos(bowB.yaw-facing+Math.PI)>.9999);
  assert.ok(bowA.headPitch<-.35&&bowB.headPitch<-.35);
  await until(()=>!a.self.dance&&!b.self.dance,'both end');
  // Disconnect while paired, and verify the remaining participant can move afterwards.
  b.send({type:'danceStart'});await until(()=>b.self.dance?.joinSpot,'restart');
  const spot=b.self.dance!.joinSpot!;
  a.send({type:'move',...spot,yaw:0,pose:'idle'});
  await until(()=>Math.hypot(a.self.x-spot.x,a.self.z-spot.z)<.01,'enter open spot');
  a.send({type:'danceJoin',targetId:b.id});await until(()=>a.self.dance?.partnerId,'pair again');
  b.socket.close();await until(()=>!a.self.dance&&!a.state.visitors.some(v=>v.id===b.id),'disconnect cleanup');
  a.send({type:'move',x:0,y:0,z:47.7,yaw:0,pose:'idle'});await until(()=>a.self.x===0,'movement restored');
  a.send({type:'danceStart'});await until(()=>a.self.dance?.joinSpot,'solo with a vacant spot');
  a.send({type:'danceJoinNpc'});await until(()=>a.self.dance?.npcSpot,'ghost partner');
  assert.equal(a.state.visitors.length,1,'the ghost does not count as a connected visitor');
  assert.equal(danceNpc(a.self)?.dance?.startedAt,a.self.dance?.startedAt);
  a.send({type:'danceStart',style:'spin'});await until(()=>a.self.dance?.style==='spin','select pair move with ghost');
  assert.equal(danceNpc(a.self)?.dance?.style,'spin');
  a.send({type:'danceStart',style:'clap'});await until(()=>a.self.dance?.style==='clap','shared solo routine with ghost');
  const ghostMove=a.self.dance!.moveStartedAt!+800;
  assert.equal(dancePose(a.self,ghostMove).floss,dancePose(danceNpc(a.self)!,ghostMove).floss);
  a.send({type:'danceStop'});await until(()=>!a.self.dance,'finish ghost dance');
  a.send({type:'reserve',seatId:'parterre-1',requestId:'chair-dance'});
  await until(()=>a.self.seatId==='parterre-1','claim a seat');
  a.send({type:'seated',seatId:'parterre-1'});
  await until(()=>a.self.pose==='sit','sit before dancing');
  a.send({type:'danceStart'});
  await until(()=>a.self.dance?.chair,'start chair dance');
  assert.equal(a.state.seats['parterre-1']?.status,'seated');
  a.send({type:'danceStop'});
  await until(()=>!a.self.dance,'finish chair dance');
  assert.equal(a.state.seats['parterre-1']?.visitorId,a.id);
  assert.equal(a.self.pose,'sit');
  console.log(`${room}: solo, direct join, shared poses, movement lock, ending, disconnect, ghost partner, and chair dance passed`);
 }finally{a.socket.close();b.socket.close();}
}
