import {SEATS,SPAWN,PALETTE,distance,walkable,type Visitor} from '../../shared/venue';
import type {ClientMessage,Snapshot} from '../../shared/protocol';

/** A single visitor session for static hosts that cannot run WebSocket servers. */
export class LocalConcert{
 readonly visitor:Visitor={id:crypto.randomUUID(),name:'나',color:PALETTE[0],zone:'lobby',...SPAWN.lobby,yaw:0,pose:'idle',seatId:null,gesture:null,gestureAt:0};
 private seats:Snapshot['seats']={};private revision=0;private reservationRequest='';
 snapshot():Snapshot{return {revision:++this.revision,visitors:[{...this.visitor}],seats:structuredClone(this.seats),serverNow:Date.now(),roomId:'혼자 감상'};}
 private release(){const v=this.visitor,seat=SEATS.find(s=>s.id===v.seatId);if(v.pose==='sit'&&seat)Object.assign(v,seat.approach);this.seats={};v.seatId=null;v.pose='idle';}
 send(msg:ClientMessage):boolean{
  const v=this.visitor;
  switch(msg.type){
   case 'zone':this.release();Object.assign(v,{zone:msg.zone,...SPAWN[msg.zone],yaw:0});return true;
   case 'move':if(v.pose==='sit'||!walkable(v.zone,msg)||!Number.isFinite(msg.yaw))return false;Object.assign(v,{x:msg.x,z:msg.z,yaw:msg.yaw,pose:msg.pose});return true;
   case 'reserve':if(v.zone!=='auditorium'||!SEATS.some(s=>s.id===msg.seatId))return false;this.release();this.reservationRequest=msg.requestId;v.seatId=msg.seatId;this.seats[msg.seatId]={visitorId:v.id,status:'reserved',expiresAt:null};return true;
   case 'seated':{const seat=SEATS.find(s=>s.id===msg.seatId);if(!seat||v.zone!=='auditorium'||v.seatId!==seat.id||(seat.level==='parterre'&&distance(v,seat.approach)>1.7))return false;Object.assign(v,{x:seat.x,z:seat.z,yaw:seat.yaw,pose:'sit'});this.seats[seat.id]={visitorId:v.id,status:'seated',expiresAt:null};return true;}
   case 'release':if(msg.requestId&&msg.requestId!==this.reservationRequest)return false;this.release();return true;
   case 'gesture':v.gesture=msg.gesture;v.gestureAt=Date.now();return true;
   default:return true;
  }
 }
}
