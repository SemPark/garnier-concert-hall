import assert from 'node:assert/strict';
import WebSocket from 'ws';
import playlist from '../content/playlist.json';
import type {ServerMessage,Snapshot,ClientMessage} from '../shared/protocol';
import {SEATS,BALCONY_SEATS,stairPoint,distance,type Point} from '../shared/venue';import {findPath} from '../src/navigation/path';
const base=process.env.CONCERT_TEST_URL??'http://127.0.0.1:8787';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(check:()=>boolean,label:string,ms=7000){const end=Date.now()+ms;while(Date.now()<end){if(check())return;await delay(30);}throw new Error(`Timed out: ${label}`);}
class Client{
 socket!:WebSocket;messages:ServerMessage[]=[];state!:Snapshot;id='';token='';
 async connect(token=''){const url=new URL('/api/presence',base);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('room','hall-99');if(token)url.searchParams.set('resume',token);
  this.socket=new WebSocket(url,{origin:new URL(base).origin});this.socket.on('message',raw=>{const msg=JSON.parse(raw.toString()) as ServerMessage;this.messages.push(msg);if(msg.type==='welcome'){this.id=msg.selfId;this.token=msg.resumeToken;this.state=msg.state;}if(msg.type==='state')this.state=msg.state;});await until(()=>!!this.id,'welcome');return this;}
 send(msg:ClientMessage){this.socket.send(JSON.stringify(msg));}
 async walk(end:Point){const v=this.state.visitors.find(v=>v.id===this.id)!;const path=findPath('auditorium',v,end);assert.ok(path);let p:Point={x:v.x,y:v.y??0,z:v.z};for(const target of path){while(distance(p,target)>.02){const d=distance(p,target),step=Math.min(1.5,d);p={x:p.x+(target.x-p.x)/d*step,y:(p.y??0)+((target.y??0)-(p.y??0))/d*step,z:p.z+(target.z-p.z)/d*step};this.send({type:'move',...p,yaw:0,pose:'walk'});await delay(80);}}this.send({type:'move',...end,yaw:0,pose:'idle'});await delay(100);}
 close(){this.socket.close();}
}
const clients:Client[]=[];
try{
 const health=await fetch(base+'/api/health');assert.equal(health.status,200);
 const range=await fetch(base+playlist.tracks[0].url,{headers:{Range:'bytes=0-1023'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,1024);
 const tail=await fetch(base+playlist.tracks[0].url,{headers:{Range:'bytes=-1024'}});assert.equal(tail.status,206);assert.match(tail.headers.get('Content-Type')??'',/^audio\//);assert.equal((await tail.arrayBuffer()).byteLength,1024);
 const a=await new Client().connect(),b=await new Client().connect();clients.push(a,b);
 await until(()=>a.state.visitors.length>=2&&b.state.visitors.length>=2,'two visitors');assert.notEqual(a.id,b.id);
 a.send({type:'zone',zone:'auditorium'});b.send({type:'zone',zone:'auditorium'});await until(()=>a.state.visitors.every(v=>v.zone==='auditorium'),'zone transfer');
 a.send({type:'reserve',seatId:SEATS[0].id,requestId:'race-a'});b.send({type:'reserve',seatId:SEATS[0].id,requestId:'race-b'});
 await until(()=>a.messages.some(m=>m.type==='seatResult')&&b.messages.some(m=>m.type==='seatResult'),'seat race');
 const results=[...a.messages,...b.messages].filter(m=>m.type==='seatResult');assert.equal(results.filter(m=>m.ok).length,1);assert.equal(results.filter(m=>!m.ok).length,1);
 const winner=a.state.seats[SEATS[0].id]?.visitorId===a.id?a:b,observer=winner===a?b:a;
 winner.send({type:'seated',seatId:SEATS[0].id});await until(()=>winner.messages.some(m=>m.type==='error'),'reject distant seating');
 await winner.walk(SEATS[0].approach);winner.send({type:'seated',seatId:SEATS[0].id});await until(()=>winner.state.seats[SEATS[0].id]?.status==='seated','confirm seat');
 const oldId=winner.id,token=winner.token;winner.close();await until(()=>!observer.state.visitors.some(v=>v.id===oldId),'disconnect visible');
 const resumed=await new Client().connect(token);clients.push(resumed);assert.equal(resumed.id,oldId);assert.equal(resumed.state.seats[SEATS[0].id].visitorId,oldId);assert.equal(resumed.state.visitors.find(v=>v.id===oldId)?.pose,'sit');
 resumed.send({type:'release'});await until(()=>!observer.state.seats[SEATS[0].id],'release after reconnect');
 resumed.send({type:'reserve',seatId:SEATS[0].id,requestId:'old-request'});await until(()=>resumed.state.seats[SEATS[0].id]?.visitorId===oldId,'old reservation');
 resumed.send({type:'reserve',seatId:SEATS[1].id,requestId:'new-request'});await until(()=>resumed.state.seats[SEATS[1].id]?.visitorId===oldId,'replacement reservation');
 resumed.send({type:'release',requestId:'old-request'});resumed.send({type:'sync'});await delay(150);assert.equal(resumed.state.seats[SEATS[1].id].visitorId,oldId);
 resumed.send({type:'release'});await until(()=>!resumed.state.seats[SEATS[1].id],'replacement release');
 const balcony=BALCONY_SEATS.at(-3)!;resumed.send({type:'reserve',seatId:balcony.id,requestId:'stairs-seat'});await until(()=>resumed.state.seats[balcony.id]?.visitorId===oldId,'balcony reserved');
 const oldErrors=resumed.messages.filter(m=>m.type==='error').length;resumed.send({type:'seated',seatId:balcony.id});await until(()=>resumed.messages.filter(m=>m.type==='error').length>oldErrors,'reject balcony teleport');
 await resumed.walk(balcony.approach);resumed.send({type:'seated',seatId:balcony.id});await until(()=>resumed.state.visitors.find(v=>v.id===oldId)?.pose==='sit','balcony seated after stairs');assert.equal(resumed.state.visitors.find(v=>v.id===oldId)?.y,8.3);
 resumed.send({type:'release'});await until(()=>!resumed.state.seats[balcony.id],'balcony release');assert.equal(resumed.state.visitors.find(v=>v.id===oldId)?.y,8.3);
 await resumed.walk(stairPoint(1,false));assert.ok((resumed.state.visitors.find(v=>v.id===oldId)?.y??0)<.1);
 resumed.send({type:'clock',sentAt:123});await until(()=>resumed.messages.some(m=>m.type==='clock'&&m.sentAt===123),'clock response');
 const crowd=await Promise.all(Array.from({length:18},()=>new Client().connect()));clients.push(...crowd);await until(()=>observer.state.visitors.length===20,'20 simultaneous clients');
 console.log('PASS: health, audio Range requests, 2-way presence, zone transfer, atomic seat race, distant seating rejection, route movement, seating, authenticated resume, stale-request protection, seat release, clock sync, physical stairs, upper-floor seating and descent, 20 simultaneous clients.');
}finally{for(const c of clients)c.close();}
