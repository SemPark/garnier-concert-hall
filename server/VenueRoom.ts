import {serveTea} from '../shared/tea';
import {RESTING_CHAIR,updateMagicChairs,MAGIC_CHAIR_ID} from '../shared/magicChair';
import {onTrainDeck,TRAIN_EXIT,TRAIN_PLATFORM,TRAIN_SEATS} from '../shared/encoreTrain';
import {isDish,isDrink,DISH_BITES} from '../shared/dishes';
import {zoneUpdate} from '../shared/zoneUpdates';
import {DurableObject} from 'cloudflare:workers';
import {ALL_SEATS,NPC_SEATS,SEATS,HALL_DESTINATIONS,DESTINATION_ZONE,isHallDestination,SPAWN,CAPACITY,PALETTE,atCafe,walkable,surfaceHeight,distance,isLook,isCandleState,type Visitor} from '../shared/venue';
import type {ClientMessage,ServerMessage,Snapshot,SeatClaim,Delta} from '../shared/protocol';
import {isGesture,gestureSeconds} from '../shared/gestures';
import {isOutfit,atCloakroom} from '../shared/wardrobe';
import {LOUNGE_SEATS} from '../shared/loungeSeats';
import {visitorName} from '../shared/visitorNames';
import {freeVisitorPosition} from '../shared/visitorCollision';

type Attachment={lastActivity?:number;visitor:Visitor;token:string;generation:string;lastMessage:number;windowAt:number;messageCount:number;reservationRequest?:string;roomId:string};
type ClaimRow={seatId:string;visitorId:string;status:'reserved'|'seated';expiresAt:number|null};
type SessionRow={id:string;token:string;visitor:string;until:number|null};
const RESERVE_MS=20000,GRACE_MS=12000,FLUSH_MS=100;
/** Millimetres are plenty for drawing; shorter numbers keep a full house's updates small. */
const round=(n:number)=>Math.round(n*1000)/1000;
const availableSeatIds=new Set(SEATS.map(seat=>seat.id));

export class VenueRoom extends DurableObject<Env>{
 private magicChair={...RESTING_CHAIR};
 private revision=0;
 private visibleVisitors=new WeakMap<WebSocket,Set<string>>();
 // What everyone was last sent, so each update carries only the changes.
 private sentVisitors=new Map<string,string>();private sentSeats=new Map<string,string>();private flushTimer:ReturnType<typeof setTimeout>|null=null;private flushedAt=0;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,token TEXT UNIQUE,visitor TEXT NOT NULL,until INTEGER)');
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS claims(seatId TEXT PRIMARY KEY,visitorId TEXT UNIQUE,status TEXT NOT NULL,expiresAt INTEGER)');
  for(const seat of NPC_SEATS)this.ctx.storage.sql.exec('DELETE FROM claims WHERE seatId=?',seat.id);
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS magic_furniture(id TEXT PRIMARY KEY,state TEXT NOT NULL)');
  const stored=this.ctx.storage.sql.exec<{state:string}>('SELECT state FROM magic_furniture WHERE id=?',MAGIC_CHAIR_ID).toArray()[0];
  if(stored)this.magicChair=JSON.parse(stored.state);

 }
 private releaseRemovedTrainSeat(visitor:Visitor){
  if(visitor.trainSeat===undefined||visitor.trainSeat<TRAIN_SEATS)return false;
  delete visitor.trainSeat;
  Object.assign(visitor,TRAIN_EXIT,{pose:'idle',seatId:null,loungeSeatId:null,yaw:0});
  return true;
 }
 private attachment(ws:WebSocket):Attachment|null{
  const attachment=ws.deserializeAttachment() as Attachment|null;
  if(attachment){
   const trainChanged=this.releaseRemovedTrainSeat(attachment.visitor);
   const seatChanged=this.releaseUnavailableSeat(attachment.visitor);
   if(trainChanged||seatChanged)ws.serializeAttachment(attachment);
  }
  return attachment;
 }
 private releaseUnavailableSeat(visitor:Visitor){
  if(!visitor.seatId||availableSeatIds.has(visitor.seatId))return false;
  const oldSeat=ALL_SEATS.find(seat=>seat.id===visitor.seatId);
  const point=freeVisitorPosition(visitor.zone,oldSeat?.approach??SPAWN[visitor.zone])??SPAWN[visitor.zone];
  this.release(visitor.id);
  Object.assign(visitor,point,{seatId:null,pose:'idle',loungeSeatId:null});
  this.ctx.storage.sql.exec('UPDATE sessions SET visitor=? WHERE id=?',JSON.stringify(visitor),visitor.id);
  return true;
 }
 private send(ws:WebSocket,message:ServerMessage){try{ws.send(JSON.stringify(message));}catch{/* A close event will release this connection. */}}
 private active(){return this.ctx.getWebSockets().flatMap(ws=>{const a=this.attachment(ws);return a?[{ws,a}]:[]});}
 private claims(){const seats:Record<string,SeatClaim>={};for(const r of this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims').toArray())seats[r.seatId]={visitorId:r.visitorId,status:r.status,expiresAt:r.expiresAt};return seats;}
 /** The whole hall, matching what everyone has been sent so far, so later deltas apply on top of it. */
 private snapshot(roomId:string,ws:WebSocket):Snapshot{this.flush();const zone=this.attachment(ws)!.visitor.zone,visitors=this.active().map(({a})=>a.visitor).filter(v=>v.zone===zone);this.visibleVisitors.set(ws,new Set(visitors.map(v=>v.id)));return {magicChair:this.magicChair,revision:this.revision,visitors,seats:this.claims(),serverNow:Date.now(),roomId};}
 private roomId(){return this.active()[0]?.a.roomId??'hall-1';}
 /** Changes are gathered and sent at most ten times a second, as one message built once for everybody. */
 private broadcast(){if(!this.flushTimer)this.flushTimer=setTimeout(()=>this.flush(),Math.max(0,this.flushedAt+FLUSH_MS-Date.now()));}
 private flush(){
  if(this.flushTimer){clearTimeout(this.flushTimer);this.flushTimer=null;}this.flushedAt=Date.now();
  const visitors:Visitor[]=[],left:string[]=[],seats:Record<string,SeatClaim|null>={},present=new Set<string>(),active=this.active();
  for(const {a} of active){const v=a.visitor,json=JSON.stringify(v);present.add(v.id);if(this.sentVisitors.get(v.id)!==json){this.sentVisitors.set(v.id,json);visitors.push(v);}}
  for(const id of this.sentVisitors.keys())if(!present.has(id)){this.sentVisitors.delete(id);left.push(id);}
  const claims=this.claims();
  const chair=updateMagicChairs(this.magicChair,active.map(({a})=>a.visitor),claims,Date.now());
  const chairChanged=chair!==this.magicChair;
  if(chairChanged){this.magicChair=chair;this.ctx.storage.sql.exec('INSERT OR REPLACE INTO magic_furniture(id,state) VALUES(?,?)',MAGIC_CHAIR_ID,JSON.stringify(chair));}
  for(const [id,claim]of Object.entries(claims)){const json=JSON.stringify(claim);if(this.sentSeats.get(id)!==json){this.sentSeats.set(id,json);seats[id]=claim;}}
  for(const id of this.sentSeats.keys())if(!claims[id]){this.sentSeats.delete(id);seats[id]=null;}
  if(!chairChanged&&!visitors.length&&!left.length&&!Object.keys(seats).length)return;
  const delta:Delta={...(chairChanged?{magicChair:this.magicChair}:{}),revision:this.revision+1,base:this.revision,visitors,left,seats,serverNow:Date.now()};this.revision++;
  const all=active.map(({a})=>a.visitor);
  for(const {ws,a} of active){const scope=zoneUpdate(all,visitors,this.visibleVisitors.get(ws)??new Set(this.sentVisitors.keys()),a.visitor.zone);this.visibleVisitors.set(ws,scope.ids);
   this.send(ws,{type:'delta',delta:{...delta,visitors:scope.visitors,left:scope.left}});
  }
 }
 private release(id:string){this.ctx.storage.sql.exec('DELETE FROM claims WHERE visitorId=?',id);}
 private async schedule(){
  const a=this.ctx.storage.sql.exec<{next:number|null}>('SELECT MIN(expiresAt) AS next FROM claims WHERE expiresAt IS NOT NULL').one().next;
  const b=this.ctx.storage.sql.exec<{next:number|null}>('SELECT MIN(until) AS next FROM sessions WHERE until IS NOT NULL').one().next;
  let idle=Infinity;for(const {ws,a:attachment} of this.active())if(attachment.visitor.zone==='lobby'){if(!attachment.lastActivity){attachment.lastActivity=Date.now();ws.serializeAttachment(attachment);}idle=Math.min(idle,attachment.lastActivity+30000);}
  const empty=Math.min(Infinity,...this.active().map(({a})=>Math.min(a.visitor.coffeeEmptyAt??Infinity,a.visitor.macaronEmptyAt??Infinity,a.visitor.dishEmptyAt??Infinity,a.visitor.drinkEmptyAt??Infinity)));
  const next=Math.min(a??Infinity,b??Infinity,idle,empty);if(Number.isFinite(next))await this.ctx.storage.setAlarm(Math.max(Date.now()+10,next));else await this.ctx.storage.deleteAlarm();
 }
 private expire(){const now=Date.now();
  const expired=this.ctx.storage.sql.exec<{id:string}>('SELECT id FROM sessions WHERE until IS NOT NULL AND until<=?',now).toArray();for(const {id} of expired)this.release(id);
  this.ctx.storage.sql.exec('DELETE FROM sessions WHERE until IS NOT NULL AND until<=?',now);
  this.ctx.storage.sql.exec('DELETE FROM claims WHERE expiresAt IS NOT NULL AND expiresAt<=?',now);
  this.ctx.storage.sql.exec("DELETE FROM claims WHERE seatId LIKE 'balcony-%'");
  for(const {ws,a} of this.active())if(a.visitor.seatId&&!this.ctx.storage.sql.exec('SELECT seatId FROM claims WHERE visitorId=?',a.visitor.id).toArray().length){a.visitor.seatId=null;a.visitor.pose='idle';ws.serializeAttachment({...a,roomId:this.roomId()});}
 }
 async fetch(request:Request):Promise<Response>{
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
  this.expire();const url=new URL(request.url),roomId=url.searchParams.get('room')??'hall-1',token=url.searchParams.get('resume')??'';
  const existing=token?this.ctx.storage.sql.exec<SessionRow>('SELECT * FROM sessions WHERE token=?',token).toArray()[0]:undefined;
  if(this.active().length>=CAPACITY&&!existing)return new Response('Room full',{status:409});
  const active=existing?this.active().find(({a})=>a.visitor.id===existing.id):undefined;
  // A new guest gets a name no one here has: first avoiding saved guests who may return, then at least everyone present.
  const newName=()=>{const present=new Set(this.active().map(({a})=>a.visitor.name)),saved=new Set(present);
   for(const row of this.ctx.storage.sql.exec<{visitor:string}>('SELECT visitor FROM sessions'))saved.add((JSON.parse(row.visitor) as Visitor).name);
   const name=visitorName(saved);return saved.has(name)?visitorName(present):name;};
  const visitor:Visitor=active?.a.visitor??(existing?JSON.parse(existing.visitor) as Visitor:{id:crypto.randomUUID(),name:newName(),color:PALETTE[crypto.getRandomValues(new Uint8Array(1))[0]%PALETTE.length],zone:'lobby',...SPAWN.lobby,yaw:0,pose:'idle',seatId:null,gesture:null,gestureAt:0});
  this.releaseRemovedTrainSeat(visitor);
  this.releaseUnavailableSeat(visitor);
  const savedToken=existing?.token??crypto.randomUUID();
  let claim:ClaimRow|undefined=this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims WHERE visitorId=?',visitor.id).toArray()[0];
  if(claim&&!SEATS.some(s=>s.id===claim?.seatId)){this.ctx.storage.sql.exec('DELETE FROM claims WHERE visitorId=?',visitor.id);claim=undefined;}
  const lounge=visitor.zone==='lobby'&&LOUNGE_SEATS.find(s=>s.id===visitor.loungeSeatId)&&!this.active().some(({a})=>a.visitor.id!==visitor.id&&a.visitor.pose==='sit'&&a.visitor.loungeSeatId===visitor.loungeSeatId);
  if(!claim){visitor.seatId=null;if(visitor.pose==='sit'&&!lounge){visitor.pose='idle';visitor.loungeSeatId=null;Object.assign(visitor,SPAWN[visitor.zone]);}}
  if(visitor.pose==='sit')visitor.y=SEATS.find(s=>s.id===visitor.seatId)?.y??0;else visitor.y=surfaceHeight(visitor.zone,visitor,visitor.y??0)??visitor.y??0;
  if(visitor.pose!=='sit'){
   const point=freeVisitorPosition(visitor.zone,visitor);
   if(!point)return new Response('No clear entry space',{status:409});Object.assign(visitor,point);
  }
  if(active){active.ws.serializeAttachment(null);active.ws.close(4001,'Session resumed elsewhere');}
  this.ctx.storage.sql.exec('INSERT INTO sessions(id,token,visitor,until) VALUES(?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET visitor=excluded.visitor,until=NULL',visitor.id,savedToken,JSON.stringify(visitor));
  const pair=new WebSocketPair(),server=pair[1];this.ctx.acceptWebSocket(server);
  server.serializeAttachment({lastActivity:Date.now(),visitor,token:savedToken,generation:crypto.randomUUID(),lastMessage:0,windowAt:Date.now(),messageCount:0,roomId});
  // The snapshot first sends everyone (the newcomer ignores it) the delta that adds this visitor.
  this.send(server,{type:'welcome',selfId:visitor.id,resumeToken:savedToken,state:this.snapshot(roomId,server)});await this.schedule();
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
  if(msg.type==='sync'){this.send(ws,{type:'state',state:this.snapshot(this.roomId(),ws)});return;}
  if(msg.type==='activity'){a.lastActivity=now;ws.serializeAttachment(a);await this.schedule();return;}
  if(msg.type==='move'){
   if(!walkable(v.zone,{x:msg.x,y:msg.y??0,z:msg.z})||!Number.isFinite(msg.yaw)||!['idle','walk'].includes(msg.pose))return;
   // A generous per-packet allowance accommodates interpolation and mobile pauses.
   if(distance(v,msg)>Math.max(2.2,(now-a.lastMessage)/1000*6)&&a.lastMessage)return;
   if(v.pose==='sit')return;
   if(distance(v,msg)>.02)a.lastActivity=now;
   Object.assign(v,{x:round(msg.x),y:round(msg.y??0),z:round(msg.z),yaw:round(msg.yaw),pose:msg.pose});
  }else if(msg.type==='trainLeave'){
   if(v.trainSeat===undefined)return;
   delete v.trainSeat;this.release(v.id);Object.assign(v,TRAIN_EXIT,{pose:'idle',seatId:null,loungeSeatId:null,yaw:0});
  }else if(msg.type==='trainBoard'){
   if(v.zone!=='auditorium')return;
   if(v.trainSeat!==undefined&&msg.seat===undefined)return;
   if(v.trainSeat===undefined&&(msg.seat!==undefined||(msg.direct!==true&&msg.fromMenu!==true&&!onTrainDeck(v)))){
    this.send(ws,{type:'error',message:'승강장에 올라간 뒤 탑승하기를 눌러 주세요.'});return;
   }
   if(msg.seat!==undefined&&(!Number.isInteger(msg.seat)||msg.seat<0||msg.seat>=TRAIN_SEATS))return;
   const occupied=new Set(this.active().filter(({a})=>a.visitor.zone==='auditorium').map(({a})=>a.visitor.trainSeat));
   if(msg.seat===v.trainSeat&&msg.seat!==undefined)return;
   const slot=msg.seat!==undefined?(!occupied.has(msg.seat)?msg.seat:undefined):Array.from({length:TRAIN_SEATS},(_,i)=>(i+2)%TRAIN_SEATS).find(i=>!occupied.has(i));
   if(slot===undefined){this.send(ws,{type:'error',message:'선택할 수 있는 빈자리가 없어요. 다른 좌석을 눌러 주세요.'});return;}
   this.release(v.id);Object.assign(v,{...TRAIN_PLATFORM,trainSeat:slot,pose:'sit',seatId:null,loungeSeatId:null,gesture:null});
  }else if(msg.type==='zone'){
   if(!['lobby','auditorium'].includes(msg.zone)||msg.zone===v.zone)return;
   const point=freeVisitorPosition(msg.zone,SPAWN[msg.zone]);
   if(!point){this.send(ws,{type:'error',message:'입구 위치를 찾지 못했어요. 잠시 후 다시 들어와 주세요.'});return;}
   delete v.trainSeat;this.release(v.id);Object.assign(v,{zone:msg.zone,...point,seatId:null,loungeSeatId:null,pose:'idle'});delete v.candle;delete v.macaron;delete v.macaronBites;delete v.macaronEmptyAt;delete v.dish;delete v.dishBites;delete v.dishEmptyAt;delete v.teaReadyAt;delete v.drink;delete v.drinkSips;delete v.drinkEmptyAt;delete v.coffee;delete v.coffeeSips;delete v.coffeeEmptyAt;
  }else if(msg.type==='hallMove'){
   if(!isHallDestination(msg.destination)||v.zone!==DESTINATION_ZONE[msg.destination])return;
   const point=freeVisitorPosition(v.zone,HALL_DESTINATIONS[msg.destination]);
   if(!point){this.send(ws,{type:'error',message:'이동할 위치를 찾지 못했어요.'});return;}
   delete v.trainSeat;this.release(v.id);Object.assign(v,{...point,yaw:0,pose:'idle',seatId:null,loungeSeatId:null});
   this.send(ws,{type:'relocated',x:v.x,y:v.y??0,z:v.z});
  }else if(msg.type==='reserve'){

   if(typeof msg.requestId!=='string'||msg.requestId.length>80||typeof msg.seatId!=='string')return;
   const seat=SEATS.find(s=>s.id===msg.seatId),claim=this.ctx.storage.sql.exec<ClaimRow>('SELECT * FROM claims WHERE seatId=?',msg.seatId).toArray()[0];
   if(v.zone!=='auditorium'||!seat||(claim&&claim.visitorId!==v.id)){this.send(ws,{type:'seatResult',ok:false,seatId:msg.seatId,requestId:msg.requestId,reason:'다른 관객이 선택한 좌석이에요.'});return;}
   if(a.reservationRequest===msg.requestId&&claim?.visitorId===v.id){this.send(ws,{type:'seatResult',ok:true,seatId:seat.id,requestId:msg.requestId});return;}
   delete v.trainSeat;this.release(v.id);this.ctx.storage.sql.exec('INSERT INTO claims VALUES(?,?,?,?)',seat.id,v.id,'reserved',now+RESERVE_MS);v.seatId=seat.id;v.pose='idle';a.reservationRequest=msg.requestId;
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
   if(v.pose==='sit'&&seat){const point=freeVisitorPosition(v.zone,seat.approach);if(!point){this.send(ws,{type:'error',message:'일어설 위치를 찾지 못했어요.'});return;}Object.assign(v,point);}
   if(v.trainSeat!==undefined){Object.assign(v,TRAIN_EXIT);delete v.trainSeat;}
   this.release(v.id);v.seatId=null;v.loungeSeatId=null;v.pose='idle';delete v.dish;delete v.dishBites;delete v.dishEmptyAt;delete v.teaReadyAt;delete v.drink;delete v.drinkSips;delete v.drinkEmptyAt;
  }else if(msg.type==='renew'){
   this.ctx.storage.sql.exec("UPDATE claims SET expiresAt=? WHERE seatId=? AND visitorId=? AND status='reserved'",now+RESERVE_MS,msg.seatId,v.id);
  }else if(msg.type==='macaron'){
   if(!atCafe(v)||v.macaron)return;v.macaron=true;v.macaronBites=0;
  }else if(msg.type==='dish'){
   // Only at a dinner table (a parterre seat): one food and one drink at a time.
   const seat=SEATS.find(s=>s.id===v.seatId);if(!isDish(msg.dish)||v.pose!=='sit'||seat?.level!=='parterre')return;
   if(msg.dish==='tea'){if(!serveTea(v,this.active().map(({a})=>a.visitor),now))return;}
   else if(isDrink(msg.dish)){if(v.drink)return;v.drink=msg.dish;v.drinkSips=0;delete v.drinkEmptyAt;}else{if(v.dish)return;v.dish=msg.dish;v.dishBites=0;delete v.dishEmptyAt;}
  }else if(msg.type==='clearDish'){
   delete v.dish;delete v.dishBites;delete v.dishEmptyAt;delete v.teaReadyAt;delete v.drink;delete v.drinkSips;delete v.drinkEmptyAt;
  }else if(msg.type==='coffee'){
   if(!atCafe(v)||v.coffee)return;v.coffee=true;v.coffeeSips=0;
  }else if(msg.type==='candle'){
   if(!isCandleState(msg.state)||v.zone!=='auditorium')return;v.candle=msg.state;
  }else if(msg.type==='outfit'){
   if(!isOutfit(msg.outfit)||!atCloakroom(v))return;v.outfit=msg.outfit;
  }else if(msg.type==='look'){
   if(!isLook(msg.look))return;v.look=msg.look;
  }else if(msg.type==='gesture'){
   if(msg.gesture==='drink'&&v.drink==='tea'&&now<(v.teaReadyAt??0))return;
   if(!isGesture(msg.gesture)||(msg.gesture==='eat'||msg.gesture==='drink')&&(v.gesture==='eat'||v.gesture==='drink')&&now-v.gestureAt<3200||msg.gesture==='eat'&&(v.dish?(v.dishBites??0)>=DISH_BITES||!!v.dishEmptyAt:!v.macaron||(v.macaronBites??0)>=2||!!v.macaronEmptyAt)||now-v.gestureAt<1200||msg.gesture==='drink'&&(v.drink?(v.drinkSips??0)>=DISH_BITES||!!v.drinkEmptyAt:!v.coffee||(v.coffeeSips??0)>=3||v.gesture==='drink'&&now-v.gestureAt<gestureSeconds('drink')*1000))return;
   if(msg.gesture==='eat'&&v.dish){v.dishBites=(v.dishBites??0)+1;if(v.dishBites===DISH_BITES)v.dishEmptyAt=now+gestureSeconds('eat')*1000;}
   else if(msg.gesture==='eat'){v.macaronBites=(v.macaronBites??0)+1;if(v.macaronBites===2)v.macaronEmptyAt=now+gestureSeconds('eat')*1000;}
   if(msg.gesture==='drink'&&v.drink){v.drinkSips=(v.drinkSips??0)+1;if(v.drinkSips===DISH_BITES)v.drinkEmptyAt=now+gestureSeconds('drink')*1000;}
   else if(msg.gesture==='drink'){v.coffeeSips=(v.coffeeSips??0)+1;if(v.coffeeSips===3)v.coffeeEmptyAt=now+gestureSeconds('drink')*1000;}
   v.gesture=msg.gesture;v.gestureAt=now;
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
  for(const {ws,a} of this.active())if(a.visitor.macaronEmptyAt&&now>=a.visitor.macaronEmptyAt){delete a.visitor.macaron;delete a.visitor.macaronBites;delete a.visitor.macaronEmptyAt;ws.serializeAttachment(a);this.ctx.storage.sql.exec('UPDATE sessions SET visitor=? WHERE id=?',JSON.stringify(a.visitor),a.visitor.id);}
  for(const {ws,a} of this.active())if(a.visitor.dishEmptyAt&&now>=a.visitor.dishEmptyAt||a.visitor.drinkEmptyAt&&now>=a.visitor.drinkEmptyAt){const v=a.visitor;if(v.dishEmptyAt&&now>=v.dishEmptyAt){delete v.dish;delete v.dishBites;delete v.dishEmptyAt;}if(v.drinkEmptyAt&&now>=v.drinkEmptyAt){delete v.teaReadyAt;delete v.drink;delete v.drinkSips;delete v.drinkEmptyAt;}ws.serializeAttachment(a);this.ctx.storage.sql.exec('UPDATE sessions SET visitor=? WHERE id=?',JSON.stringify(v),v.id);}
  for(const {ws,a} of this.active())if(a.visitor.coffeeEmptyAt&&now>=a.visitor.coffeeEmptyAt){const v=a.visitor;delete v.coffee;delete v.coffeeSips;delete v.coffeeEmptyAt;ws.serializeAttachment(a);this.ctx.storage.sql.exec('UPDATE sessions SET visitor=? WHERE id=?',JSON.stringify(v),v.id);}
  for(const {ws,a} of this.active())if(a.visitor.zone==='lobby'&&a.lastActivity&&now-a.lastActivity>=30000){
   const v=a.visitor;delete v.trainSeat;this.release(v.id);Object.assign(v,{zone:'auditorium',...SPAWN.auditorium,pose:'idle',seatId:null,loungeSeatId:null});delete v.candle;delete v.macaron;delete v.macaronBites;delete v.macaronEmptyAt;delete v.dish;delete v.dishBites;delete v.dishEmptyAt;delete v.teaReadyAt;delete v.drink;delete v.drinkSips;delete v.drinkEmptyAt;delete v.coffee;delete v.coffeeSips;delete v.coffeeEmptyAt;
   ws.serializeAttachment(a);this.ctx.storage.sql.exec('UPDATE sessions SET visitor=? WHERE id=?',JSON.stringify(v),v.id);
  }
  this.broadcast();await this.schedule();
 }
}
