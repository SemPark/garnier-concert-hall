import {MAGIC_CHAIR_ID,MAGIC_CHAIR_SEAT,MAGIC_CHAIR_TRAVEL,chairOffset} from '../shared/magicChair';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import playlist from '../content/playlist.json';
import {applyDelta,type ServerMessage,type Snapshot,type ClientMessage} from '../shared/protocol';
import {surfaceHeight,CAPACITY,SEATS,BALCONY_SEATS,HALL_DESTINATIONS,distance,type Point} from '../shared/venue';import {findPath} from '../src/navigation/path';
const base=process.env.CONCERT_TEST_URL??'http://127.0.0.1:8787';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(check:()=>boolean,label:string,ms=7000){const end=Date.now()+ms;while(Date.now()<end){if(check())return;await delay(30);}throw new Error(`Timed out: ${label}`);}
class Client{
 socket!:WebSocket;messages:ServerMessage[]=[];state!:Snapshot;id='';token='';
 async connect(token=''){const url=new URL('/api/presence',base);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('room','hall-98');if(token)url.searchParams.set('resume',token);
  this.socket=new WebSocket(url,{origin:new URL(base).origin});this.socket.on('message',raw=>{const msg=JSON.parse(raw.toString()) as ServerMessage;this.messages.push(msg);if(msg.type==='welcome'){this.id=msg.selfId;this.token=msg.resumeToken;this.state=msg.state;}if(msg.type==='state')this.state=msg.state;if(msg.type==='delta'&&this.state){const next=applyDelta(this.state,msg.delta);if(next)this.state=next;else this.send({type:'sync'});}});await until(()=>!!this.id,'welcome',15000);return this;}
 send(msg:ClientMessage){this.socket.send(JSON.stringify(msg));}
 async walk(end:Point){let v=this.state.visitors.find(v=>v.id===this.id)!;let path=findPath('auditorium',v,end);
  // No stairs: jump to the other floor first, then walk.
  if(!path){const up=(end.y??0)>4;this.send({type:'hallMove',destination:up?'upper':'rear'});await until(()=>Math.abs((this.state.visitors.find(v=>v.id===this.id)!.y??0)-(up?8.3:0))<.1,'floor jump');v=this.state.visitors.find(v=>v.id===this.id)!;path=findPath('auditorium',v,end);}
  assert.ok(path);let p:Point={x:v.x,y:v.y??0,z:v.z};for(const target of path){while(distance(p,target)>.02){const d=distance(p,target),step=Math.min(.5,d);p={x:p.x+(target.x-p.x)/d*step,y:(p.y??0)+((target.y??0)-(p.y??0))/d*step,z:p.z+(target.z-p.z)/d*step};p.y=surfaceHeight('auditorium',p,p.y)??p.y;this.send({type:'move',...p,yaw:0,pose:'walk'});await delay(80);}}this.send({type:'move',...end,yaw:0,pose:'idle'});await delay(100);}
 close(){this.socket.close();}
}

const clients:Client[]=[];
try{
 const a=await new Client().connect(),b=await new Client().connect();clients.push(a,b);
 a.send({type:'zone',zone:'auditorium'});b.send({type:'zone',zone:'auditorium'});
 await until(()=>a.state.visitors.find(v=>v.id===a.id)?.zone==='auditorium'&&b.state.visitors.find(v=>v.id===b.id)?.zone==='auditorium','hall');
 await a.walk(MAGIC_CHAIR_SEAT.approach);
 await until(()=>a.state.magicChair?.to===MAGIC_CHAIR_TRAVEL&&b.state.magicChair?.to===MAGIC_CHAIR_TRAVEL,'shared opening');
 assert.deepEqual(a.state.magicChair,b.state.magicChair);
 await delay(1400);assert.equal(chairOffset(a.state.magicChair,Date.now()),MAGIC_CHAIR_TRAVEL);
 a.send({type:'hallMove',destination:'rear'});
 await until(()=>a.state.magicChair?.to===0,'departure return');
 const returnState=a.state.magicChair!;assert.ok(returnState.at>Date.now());
 await delay(3500);assert.equal(chairOffset(returnState,Date.now()),0);
 await a.walk(MAGIC_CHAIR_SEAT.approach);
 a.send({type:'reserve',seatId:MAGIC_CHAIR_ID,requestId:'magic-a'});
 await until(()=>a.state.seats[MAGIC_CHAIR_ID]?.visitorId===a.id,'reserve');
 a.send({type:'seated',seatId:MAGIC_CHAIR_ID});
 await until(()=>a.state.seats[MAGIC_CHAIR_ID]?.status==='seated'&&b.state.magicChair?.to===0,'sit return');
 assert.deepEqual(a.state.magicChair,b.state.magicChair);
 await delay(1000);assert.equal(chairOffset(a.state.magicChair,Date.now()),0);
 await b.walk(MAGIC_CHAIR_SEAT.approach);
 assert.equal(b.state.magicChair?.to,0);
 b.send({type:'reserve',seatId:MAGIC_CHAIR_ID,requestId:'magic-b'});
 await until(()=>b.messages.some(m=>m.type==='seatResult'&&m.requestId==='magic-b'),'occupied rejection');
 assert.ok(b.messages.some(m=>m.type==='seatResult'&&m.requestId==='magic-b'&&!m.ok));
 const c=await new Client().connect();clients.push(c);
 assert.deepEqual(c.state.magicChair,a.state.magicChair);
 // Existing train ownership: the same berth cannot be claimed twice.
 a.send({type:'trainBoard',direct:true});b.send({type:'trainBoard',direct:true});
 await until(()=>a.state.visitors.find(v=>v.id===a.id)?.trainSeat!==undefined&&b.state.visitors.find(v=>v.id===b.id)?.trainSeat!==undefined,'train boarding');
 const aSeat=a.state.visitors.find(v=>v.id===a.id)!.trainSeat!;
 const bSeat=b.state.visitors.find(v=>v.id===b.id)!.trainSeat!;
 assert.notEqual(aSeat,bSeat);
 b.send({type:'trainBoard',seat:aSeat});
 await until(()=>b.messages.some(m=>m.type==='error'),'occupied train rejected');
 assert.equal(b.state.visitors.find(v=>v.id===b.id)?.trainSeat,bSeat);
 a.send({type:'trainLeave'});b.send({type:'trainLeave'});
 await until(()=>a.state.visitors.find(v=>v.id===a.id)?.trainSeat===undefined&&b.state.visitors.find(v=>v.id===b.id)?.trainSeat===undefined,'train leave');
 assert.equal(a.state.seats[MAGIC_CHAIR_ID],undefined);
 console.log('PASS: train boarding ownership and release');
 console.log('PASS: approach, shared opening, delayed return, sitting return, occupied rejection, new-client sync');
}finally{for(const c of clients)c.close();}
