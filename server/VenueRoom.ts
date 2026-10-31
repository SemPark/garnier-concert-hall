import {DurableObject} from 'cloudflare:workers';
import {SEATS,SPAWN,CAPACITY,PALETTE,walkable,distance,canSit,type Visitor} from '../shared/venue';
import type {ClientMessage,ServerMessage,Snapshot,SeatClaim} from '../shared/protocol';
import {isGesture} from '../shared/gestures';

type Attachment={visitor:Visitor;token:string;generation:string;lastMessage:number;windowAt:number;messageCount:number;reservationRequest?:string;roomId:string};
type ClaimRow={seatId:string;visitorId:string;status:'reserved'|'seated';expiresAt:number|null};
type SessionRow={id:string;token:string;visitor:string;until:number|null};
const RESERVE_MS=20000,GRACE_MS=12000;

export class VenueRoom extends DurableObject<Env>{
 private revision=0;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,token TEXT UNIQUE,visitor TEXT NOT NULL,until INTEGER)');
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS claims(seatId TEXT PRIMARY KEY,visitorId TEXT UNIQUE,status TEXT NOT NULL,expiresAt INTEGER)');
 }
 private attachment(ws:WebSocket):Attachment|null{return ws.deserializeAttachment() as Attachment|null;}
 private send(ws:WebSocket,message:ServerMessage){try{ws.send(JSON.stringify(message));}catch{/* A close event will release this connection. */}}
 private active(){return this.ctx.getWebSockets().flatMap(ws=>{const a=this.attachment(ws);return a?[{ws,a}]:[]});}
 private snapshot(roomId:string):Snapshot{
  const seats:Record<string,SeatClaim>={};for(const r of this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims').toArray())seats[r.seatId]={visitorId:r.visitorId,status:r.status,expiresAt:r.expiresAt};
  return {revision:this.revision,visitors:this.active().map(({a})=>a.visitor),seats,serverNow:Date.now(),roomId};
 }
 private roomId(){return this.active()[0]?.a.roomId??'hall-1';}
 private broadcast(){this.revision++;const state=this.snapshot(this.roomId());for(const {ws} of this.active())this.send(ws,{type:'state',state});}
 private release(id:string){this.ctx.storage.sql.exec('DELETE FROM claims WHERE visitorId=?',id);}
 private async schedule(){
  const a=this.ctx.storage.sql.exec<{next:number|null}>('SELECT MIN(expiresAt) AS next FROM claims WHERE expiresAt IS NOT NULL').one().next;
  const b=this.ctx.storage.sql.exec<{next:number|null}>('SELECT MIN(until) AS next FROM sessions WHERE until IS NOT NULL').one().next;
  const next=Math.min(a??Infinity,b??Infinity);if(Number.isFinite(next))await this.ctx.storage.setAlarm(Math.max(Date.now()+10,next));else await this.ctx.storage.deleteAlarm();
 }
 private expire(){const now=Date.now();
  const expired=this.ctx.storage.sql.exec<{id:string}>('SELECT id FROM sessions WHERE until IS NOT NULL AND until<=?',now).toArray();for(const {id} of expired)this.release(id);
  this.ctx.storage.sql.exec('DELETE FROM sessions WHERE until IS NOT NULL AND until<=?',now);
  this.ctx.storage.sql.exec('DELETE FROM claims WHERE expiresAt IS NOT NULL AND expiresAt<=?',now);
  for(const {ws,a} of this.active())if(a.visitor.seatId&&!this.ctx.storage.sql.exec('SELECT seatId FROM claims WHERE visitorId=?',a.visitor.id).toArray().length){a.visitor.seatId=null;a.visitor.pose='idle';ws.serializeAttachment({...a,roomId:this.roomId()});}
 }
 async fetch(request:Request):Promise<Response>{
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
  this.expire();const url=new URL(request.url),roomId=url.searchParams.get('room')??'hall-1',token=url.searchParams.get('resume')??'';
  const existing=token?this.ctx.storage.sql.exec<SessionRow>('SELECT * FROM sessions WHERE token=?',token).toArray()[0]:undefined;
  if(this.active().length>=CAPACITY&&!existing)return new Response('Room full',{status:409});
  const active=existing?this.active().find(({a})=>a.visitor.id===existing.id):undefined;
  const nameParts=['고요한','느긋한','다정한','작은','빛나는','포근한'];
  const visitor:Visitor=active?.a.visitor??(existing?JSON.parse(existing.visitor) as Visitor:{id:crypto.randomUUID(),name:`${nameParts[crypto.getRandomValues(new Uint8Array(1))[0]%nameParts.length]} 관객`,color:PALETTE[crypto.getRandomValues(new Uint8Array(1))[0]%PALETTE.length],zone:'lobby',...SPAWN.lobby,yaw:0,pose:'idle',seatId:null,gesture:null,gestureAt:0});
  const savedToken=existing?.token??crypto.randomUUID();
  const claim=this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims WHERE visitorId=?',visitor.id).toArray()[0];
  if(!claim){visitor.seatId=null;if(visitor.pose==='sit'){visitor.pose='idle';Object.assign(visitor,SPAWN[visitor.zone]);}}
  if(visitor.pose==='sit')visitor.y=SEATS.find(s=>s.id===visitor.seatId)?.y??0;else visitor.y??=0;
  if(active){active.ws.serializeAttachment(null);active.ws.close(4001,'Session resumed elsewhere');}
  this.ctx.storage.sql.exec('INSERT INTO sessions(id,token,visitor,until) VALUES(?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET visitor=excluded.visitor,until=NULL',visitor.id,savedToken,JSON.stringify(visitor));
  const pair=new WebSocketPair(),server=pair[1];this.ctx.acceptWebSocket(server);
  server.serializeAttachment({visitor,token:savedToken,generation:crypto.randomUUID(),lastMessage:0,windowAt:Date.now(),messageCount:0,roomId});
  this.send(server,{type:'welcome',selfId:visitor.id,resumeToken:savedToken,state:this.snapshot(roomId)});this.broadcast();await this.schedule();
  return new Response(null,{status:101,webSocket:pair[0]});
 }
 async webSocketMessage(ws:WebSocket,raw:string|ArrayBuffer){
  const a=this.attachment(ws);if(!a)return;
  if(typeof raw!=='string'||raw.length>2048){ws.close(1009,'Message too large');return;}
  const now=Date.now();if(now-a.windowAt>1000){a.windowAt=now;a.messageCount=0;}if(++a.messageCount>30){ws.close(1008,'Rate limit');return;}
  let msg:ClientMessage;try{msg=JSON.parse(raw) as ClientMessage;}catch{this.send(ws,{type:'error',message:'올바르지 않은 요청입니다.'});return;}
  if(!msg||typeof msg!=='object'||typeof msg.type!=='string')return;
  this.expire();const v=a.visitor;
  if(msg.type==='clock'){if(Number.isFinite(msg.sentAt))this.send(ws,{type:'clock',sentAt:msg.sentAt,serverNow:now});return;}
  if(msg.type==='sync'){this.send(ws,{type:'state',state:this.snapshot(this.roomId())});return;}
  if(msg.type==='move'){
   if(!walkable(v.zone,{x:msg.x,y:msg.y??0,z:msg.z})||!Number.isFinite(msg.yaw)||!['idle','walk'].includes(msg.pose))return;
   // A generous per-packet allowance accommodates interpolation and mobile pauses.
   if(distance(v,msg)>Math.max(2.2,(now-a.lastMessage)/1000*4.5)&&a.lastMessage)return;
   if(v.pose==='sit')return;Object.assign(v,{x:msg.x,y:msg.y??0,z:msg.z,yaw:msg.yaw,pose:msg.pose});
  }else if(msg.type==='zone'){
   if(!['lobby','auditorium'].includes(msg.zone)||msg.zone===v.zone)return;
   this.release(v.id);Object.assign(v,{zone:msg.zone,...SPAWN[msg.zone],seatId:null,pose:'idle'});
  }else if(msg.type==='reserve'){
   if(typeof msg.requestId!=='string'||msg.requestId.length>80||typeof msg.seatId!=='string')return;
   const seat=SEATS.find(s=>s.id===msg.seatId),claim=this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims WHERE seatId=?',msg.seatId).toArray()[0];
   if(v.zone!=='auditorium'||!seat||(claim&&claim.visitorId!==v.id)){this.send(ws,{type:'seatResult',ok:false,seatId:msg.seatId,requestId:msg.requestId,reason:'다른 관객이 선택한 좌석이에요.'});return;}
   if(a.reservationRequest===msg.requestId&&claim?.visitorId===v.id){this.send(ws,{type:'seatResult',ok:true,seatId:seat.id,requestId:msg.requestId});return;}
   this.release(v.id);this.ctx.storage.sql.exec('INSERT INTO claims VALUES(?,?,?,?)',seat.id,v.id,'reserved',now+RESERVE_MS);v.seatId=seat.id;v.pose='idle';a.reservationRequest=msg.requestId;
   this.send(ws,{type:'seatResult',ok:true,seatId:seat.id,requestId:msg.requestId});
  }else if(msg.type==='seated'){
   const seat=SEATS.find(s=>s.id===msg.seatId),claim=this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims WHERE seatId=? AND visitorId=?',msg.seatId,v.id).toArray()[0];
   if(!seat||!claim||v.zone!=='auditorium'||!canSit(v,seat)){this.send(ws,{type:'error',message:'좌석 가까이로 이동해 주세요.'});return;}
   this.ctx.storage.sql.exec("UPDATE claims SET status='seated',expiresAt=NULL WHERE seatId=?",seat.id);Object.assign(v,{x:seat.x,y:seat.y,z:seat.z,yaw:seat.yaw,pose:'sit',seatId:seat.id});
  }else if(msg.type==='release'){
   if(msg.requestId&&msg.requestId!==a.reservationRequest)return;
   const seat=SEATS.find(s=>s.id===v.seatId);this.release(v.id);if(v.pose==='sit'&&seat)Object.assign(v,seat.approach);v.seatId=null;v.pose='idle';
  }else if(msg.type==='renew'){
   this.ctx.storage.sql.exec("UPDATE claims SET expiresAt=? WHERE seatId=? AND visitorId=? AND status='reserved'",now+RESERVE_MS,msg.seatId,v.id);
  }else if(msg.type==='gesture'){
   if(!isGesture(msg.gesture)||now-v.gestureAt<1200)return;v.gesture=msg.gesture;v.gestureAt=now;
  }else return;
  a.lastMessage=now;ws.serializeAttachment({...a,roomId:this.roomId()});this.broadcast();await this.schedule();
 }
 async webSocketClose(ws:WebSocket){await this.disconnected(ws);}
 async webSocketError(ws:WebSocket){await this.disconnected(ws);}
 private async disconnected(ws:WebSocket){const a=this.attachment(ws);if(!a)return;ws.serializeAttachment(null);
  if(this.active().some(x=>x.a.visitor.id===a.visitor.id))return;
  this.ctx.storage.sql.exec('UPDATE sessions SET visitor=?,until=? WHERE id=?',JSON.stringify(a.visitor),Date.now()+GRACE_MS,a.visitor.id);this.broadcast();await this.schedule();
 }
 async alarm(){this.expire();this.broadcast();await this.schedule();}
}
