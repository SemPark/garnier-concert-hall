import {DurableObject} from 'cloudflare:workers';
import {SEATS,SPAWN,CAPACITY,PALETTE,walkable,surfaceHeight,distance,stairLink,isLook,isCandleState,type Visitor} from '../shared/venue';
import type {ClientMessage,ServerMessage,Snapshot,SeatClaim,Delta} from '../shared/protocol';
import {isGesture} from '../shared/gestures';
import {isOutfit,atCloakroom} from '../shared/wardrobe';
import {LOUNGE_SEATS} from '../shared/loungeSeats';
import {freeVisitorPosition} from '../shared/visitorCollision';

type Attachment={lastActivity?:number;visitor:Visitor;token:string;generation:string;lastMessage:number;windowAt:number;messageCount:number;reservationRequest?:string;roomId:string};
type ClaimRow={seatId:string;visitorId:string;status:'reserved'|'seated';expiresAt:number|null};
type SessionRow={id:string;token:string;visitor:string;until:number|null};
const RESERVE_MS=20000,GRACE_MS=12000,FLUSH_MS=100;
/** Millimetres are plenty for drawing; shorter numbers keep a full house's updates small. */
const round=(n:number)=>Math.round(n*1000)/1000;

export class VenueRoom extends DurableObject<Env>{
 private revision=0;
 // What everyone was last sent, so each update carries only the changes.
 private sentVisitors=new Map<string,string>();private sentSeats=new Map<string,string>();private flushTimer:ReturnType<typeof setTimeout>|null=null;private flushedAt=0;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,token TEXT UNIQUE,visitor TEXT NOT NULL,until INTEGER)');
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS claims(seatId TEXT PRIMARY KEY,visitorId TEXT UNIQUE,status TEXT NOT NULL,expiresAt INTEGER)');
 }
 private attachment(ws:WebSocket):Attachment|null{return ws.deserializeAttachment() as Attachment|null;}
 private send(ws:WebSocket,message:ServerMessage){try{ws.send(JSON.stringify(message));}catch{/* A close event will release this connection. */}}
 private active(){return this.ctx.getWebSockets().flatMap(ws=>{const a=this.attachment(ws);return a?[{ws,a}]:[]});}
 private claims(){const seats:Record<string,SeatClaim>={};for(const r of this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims').toArray())seats[r.seatId]={visitorId:r.visitorId,status:r.status,expiresAt:r.expiresAt};return seats;}
 /** The whole hall, matching what everyone has been sent so far, so later deltas apply on top of it. */
 private snapshot(roomId:string):Snapshot{this.flush();return {revision:this.revision,visitors:this.active().map(({a})=>a.visitor),seats:this.claims(),serverNow:Date.now(),roomId};}
 private roomId(){return this.active()[0]?.a.roomId??'hall-1';}
 /** Changes are gathered and sent at most ten times a second, as one message built once for everybody. */
 private broadcast(){if(!this.flushTimer)this.flushTimer=setTimeout(()=>this.flush(),Math.max(0,this.flushedAt+FLUSH_MS-Date.now()));}
 private flush(){
  if(this.flushTimer){clearTimeout(this.flushTimer);this.flushTimer=null;}this.flushedAt=Date.now();
  const visitors:Visitor[]=[],left:string[]=[],seats:Record<string,SeatClaim|null>={},present=new Set<string>(),active=this.active();
  for(const {a} of active){const v=a.visitor,json=JSON.stringify(v);present.add(v.id);if(this.sentVisitors.get(v.id)!==json){this.sentVisitors.set(v.id,json);visitors.push(v);}}
  for(const id of this.sentVisitors.keys())if(!present.has(id)){this.sentVisitors.delete(id);left.push(id);}
  const claims=this.claims();
  for(const [id,claim]of Object.entries(claims)){const json=JSON.stringify(claim);if(this.sentSeats.get(id)!==json){this.sentSeats.set(id,json);seats[id]=claim;}}
  for(const id of this.sentSeats.keys())if(!claims[id]){this.sentSeats.delete(id);seats[id]=null;}
  if(!visitors.length&&!left.length&&!Object.keys(seats).length)return;
  const delta:Delta={revision:this.revision+1,base:this.revision,visitors,left,seats,serverNow:Date.now()};this.revision++;
  const message=JSON.stringify({type:'delta',delta} satisfies ServerMessage);for(const {ws} of active){try{ws.send(message);}catch{/* A close event will release this connection. */}}
 }
 private release(id:string){this.ctx.storage.sql.exec('DELETE FROM claims WHERE visitorId=?',id);}
 private async schedule(){
  const a=this.ctx.storage.sql.exec<{next:number|null}>('SELECT MIN(expiresAt) AS next FROM claims WHERE expiresAt IS NOT NULL').one().next;
  const b=this.ctx.storage.sql.exec<{next:number|null}>('SELECT MIN(until) AS next FROM sessions WHERE until IS NOT NULL').one().next;
  let idle=Infinity;for(const {ws,a:attachment} of this.active())if(attachment.visitor.zone==='lobby'){if(!attachment.lastActivity){attachment.lastActivity=Date.now();ws.serializeAttachment(attachment);}idle=Math.min(idle,attachment.lastActivity+30000);}
  const next=Math.min(a??Infinity,b??Infinity,idle);if(Number.isFinite(next))await this.ctx.storage.setAlarm(Math.max(Date.now()+10,next));else await this.ctx.storage.deleteAlarm();
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
  let claim:ClaimRow|undefined=this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims WHERE visitorId=?',visitor.id).toArray()[0];
  if(claim&&!SEATS.some(s=>s.id===claim?.seatId)){this.ctx.storage.sql.exec('DELETE FROM claims WHERE visitorId=?',visitor.id);claim=undefined;}
  const lounge=visitor.zone==='lobby'&&LOUNGE_SEATS.find(s=>s.id===visitor.loungeSeatId)&&!this.active().some(({a})=>a.visitor.id!==visitor.id&&a.visitor.pose==='sit'&&a.visitor.loungeSeatId===visitor.loungeSeatId);
  if(!claim){visitor.seatId=null;if(visitor.pose==='sit'&&!lounge){visitor.pose='idle';visitor.loungeSeatId=null;Object.assign(visitor,SPAWN[visitor.zone]);}}
  if(visitor.pose==='sit')visitor.y=SEATS.find(s=>s.id===visitor.seatId)?.y??0;else visitor.y=surfaceHeight(visitor.zone,visitor,visitor.y??0)??visitor.y??0;
  if(visitor.pose!=='sit'){
   const point=freeVisitorPosition(visitor.zone,visitor,this.active().map(({a})=>a.visitor),visitor.id);
   if(!point)return new Response('No clear entry space',{status:409});Object.assign(visitor,point);
  }
  if(active){active.ws.serializeAttachment(null);active.ws.close(4001,'Session resumed elsewhere');}
  this.ctx.storage.sql.exec('INSERT INTO sessions(id,token,visitor,until) VALUES(?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET visitor=excluded.visitor,until=NULL',visitor.id,savedToken,JSON.stringify(visitor));
  const pair=new WebSocketPair(),server=pair[1];this.ctx.acceptWebSocket(server);
  server.serializeAttachment({lastActivity:Date.now(),visitor,token:savedToken,generation:crypto.randomUUID(),lastMessage:0,windowAt:Date.now(),messageCount:0,roomId});
  // The snapshot first sends everyone (the newcomer ignores it) the delta that adds this visitor.
  this.send(server,{type:'welcome',selfId:visitor.id,resumeToken:savedToken,state:this.snapshot(roomId)});await this.schedule();
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
  if(msg.type==='activity'){a.lastActivity=now;ws.serializeAttachment(a);await this.schedule();return;}
  if(msg.type==='move'){
   if(!walkable(v.zone,{x:msg.x,y:msg.y??0,z:msg.z})||!Number.isFinite(msg.yaw)||!['idle','walk'].includes(msg.pose))return;
   // A generous per-packet allowance accommodates interpolation and mobile pauses.
   if(distance(v,msg)>Math.max(2.2,(now-a.lastMessage)/1000*6)&&a.lastMessage&&!stairLink(v,msg))return;
   if(v.pose==='sit')return;
   if(distance(v,msg)>.02)a.lastActivity=now;
   Object.assign(v,{x:round(msg.x),y:round(msg.y??0),z:round(msg.z),yaw:round(msg.yaw),pose:msg.pose});
  }else if(msg.type==='zone'){
   if(!['lobby','auditorium'].includes(msg.zone)||msg.zone===v.zone)return;
   const point=freeVisitorPosition(msg.zone,SPAWN[msg.zone],this.active().map(({a})=>a.visitor),v.id);
   if(!point){this.send(ws,{type:'error',message:'입구가 붐벼요. 잠시 후 다시 들어와 주세요.'});return;}
   this.release(v.id);Object.assign(v,{zone:msg.zone,...point,seatId:null,loungeSeatId:null,pose:'idle'});delete v.candle;
  }else if(msg.type==='reserve'){
   if(typeof msg.requestId!=='string'||msg.requestId.length>80||typeof msg.seatId!=='string')return;
   const seat=SEATS.find(s=>s.id===msg.seatId),claim=this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims WHERE seatId=?',msg.seatId).toArray()[0];
   if(v.zone!=='auditorium'||!seat||(claim&&claim.visitorId!==v.id)){this.send(ws,{type:'seatResult',ok:false,seatId:msg.seatId,requestId:msg.requestId,reason:'다른 관객이 선택한 좌석이에요.'});return;}
   if(a.reservationRequest===msg.requestId&&claim?.visitorId===v.id){this.send(ws,{type:'seatResult',ok:true,seatId:seat.id,requestId:msg.requestId});return;}
   this.release(v.id);this.ctx.storage.sql.exec('INSERT INTO claims VALUES(?,?,?,?)',seat.id,v.id,'reserved',now+RESERVE_MS);v.seatId=seat.id;v.pose='idle';a.reservationRequest=msg.requestId;
   // A claimed seat reaches everyone at once, before the reply, so no one picks it a moment later.
   ws.serializeAttachment({...a,roomId:this.roomId()});this.flush();
   this.send(ws,{type:'seatResult',ok:true,seatId:seat.id,requestId:msg.requestId});
  }else if(msg.type==='seated'){
   const seat=SEATS.find(s=>s.id===msg.seatId),claim=this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims WHERE seatId=? AND visitorId=?',msg.seatId,v.id).toArray()[0];
   // A seat the visitor holds may be taken straight away (the seat map seats without a walk).
   if(!seat||!claim||claim.visitorId!==v.id||v.zone!=='auditorium'){this.send(ws,{type:'error',message:'좌석 가까이로 이동해 주세요.'});return;}
   this.ctx.storage.sql.exec("UPDATE claims SET status='seated',expiresAt=NULL WHERE seatId=?",seat.id);Object.assign(v,{x:seat.x,y:seat.y,z:seat.z,yaw:seat.yaw,pose:'sit',seatId:seat.id});
  }else if(msg.type==='loungeSit'){
   const seat=LOUNGE_SEATS.find(s=>s.id===msg.seatId);
   if(v.zone!=='lobby'||!seat||distance(v,seat.approach)>.45){this.send(ws,{type:'error',message:'의자 앞으로 이동해 주세요.'});return;}
   if(this.active().some(({a})=>a.visitor.id!==v.id&&a.visitor.loungeSeatId===seat.id&&a.visitor.pose==='sit')){this.send(ws,{type:'error',message:'다른 관객이 앉아 있어요.'});return;}
   this.release(v.id);Object.assign(v,{x:seat.x,y:seat.y,z:seat.z,yaw:seat.yaw,pose:'sit',seatId:null,loungeSeatId:seat.id});
  }else if(msg.type==='release'){
   if(msg.requestId&&msg.requestId!==a.reservationRequest)return;
   const seat=v.loungeSeatId?LOUNGE_SEATS.find(s=>s.id===v.loungeSeatId):SEATS.find(s=>s.id===v.seatId);
   if(v.pose==='sit'&&seat){const point=freeVisitorPosition(v.zone,seat.approach,this.active().map(({a})=>a.visitor),v.id);if(!point){this.send(ws,{type:'error',message:'의자 앞이 붐벼요. 잠시 기다려 주세요.'});return;}Object.assign(v,point);}
   this.release(v.id);v.seatId=null;v.loungeSeatId=null;v.pose='idle';
  }else if(msg.type==='renew'){
   this.ctx.storage.sql.exec("UPDATE claims SET expiresAt=? WHERE seatId=? AND visitorId=? AND status='reserved'",now+RESERVE_MS,msg.seatId,v.id);
  }else if(msg.type==='candle'){
   if(!isCandleState(msg.state)||v.zone!=='auditorium')return;v.candle=msg.state;
  }else if(msg.type==='outfit'){
   if(!isOutfit(msg.outfit)||!atCloakroom(v))return;v.outfit=msg.outfit;
  }else if(msg.type==='look'){
   if(!isLook(msg.look))return;v.look=msg.look;
  }else if(msg.type==='gesture'){
   if(!isGesture(msg.gesture)||now-v.gestureAt<1200)return;v.gesture=msg.gesture;v.gestureAt=now;
  }else return;
  if(msg.type!=='move')a.lastActivity=now;
  a.lastMessage=now;ws.serializeAttachment({...a,roomId:this.roomId()});this.broadcast();await this.schedule();
 }
 async webSocketClose(ws:WebSocket){await this.disconnected(ws);}
 async webSocketError(ws:WebSocket){await this.disconnected(ws);}
 private async disconnected(ws:WebSocket){const a=this.attachment(ws);if(!a)return;ws.serializeAttachment(null);
  if(this.active().some(x=>x.a.visitor.id===a.visitor.id))return;
  this.ctx.storage.sql.exec('UPDATE sessions SET visitor=?,until=? WHERE id=?',JSON.stringify(a.visitor),Date.now()+GRACE_MS,a.visitor.id);this.broadcast();await this.schedule();
 }
 async alarm(){
  this.expire();const now=Date.now();
  for(const {ws,a} of this.active())if(a.visitor.zone==='lobby'&&a.lastActivity&&now-a.lastActivity>=30000){
   const v=a.visitor;this.release(v.id);Object.assign(v,{zone:'auditorium',...SPAWN.auditorium,pose:'idle',seatId:null,loungeSeatId:null});delete v.candle;
   ws.serializeAttachment(a);this.ctx.storage.sql.exec('UPDATE sessions SET visitor=? WHERE id=?',JSON.stringify(v),v.id);
  }
  this.broadcast();await this.schedule();
 }
}
