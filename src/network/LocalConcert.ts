import {visitorName} from '../../shared/visitorNames';
import {newId} from '../util/requestId';
import {isOutfit,atCloakroom} from '../../shared/wardrobe';
import {LOUNGE_SEATS} from '../../shared/loungeSeats';
import {SEATS,HALL_DESTINATIONS,DESTINATION_ZONE,isHallDestination,SPAWN,PALETTE,atCafe,distance,walkable,isLook,isCandleState,type Visitor} from '../../shared/venue';
import type {ClientMessage,Snapshot} from '../../shared/protocol';
import {isGesture,gestureSeconds} from '../../shared/gestures';

/** A single visitor session for static hosts that cannot run WebSocket servers. */
export class LocalConcert{
 readonly visitor:Visitor={id:newId(),name:visitorName(),color:PALETTE[0],zone:'lobby',...SPAWN.lobby,yaw:0,pose:'idle',seatId:null,gesture:null,gestureAt:0};
 private seats:Snapshot['seats']={};private revision=0;private reservationRequest='';
 snapshot():Snapshot{if(this.visitor.macaronEmptyAt&&Date.now()>=this.visitor.macaronEmptyAt){delete this.visitor.macaron;delete this.visitor.macaronBites;delete this.visitor.macaronEmptyAt;}if(this.visitor.coffeeEmptyAt&&Date.now()>=this.visitor.coffeeEmptyAt){delete this.visitor.coffee;delete this.visitor.coffeeSips;delete this.visitor.coffeeEmptyAt;}return {revision:++this.revision,visitors:[{...this.visitor}],seats:structuredClone(this.seats),serverNow:Date.now(),roomId:'혼자 감상'};}
 private release(){const v=this.visitor,seat=v.loungeSeatId?LOUNGE_SEATS.find(s=>s.id===v.loungeSeatId):SEATS.find(s=>s.id===v.seatId);if(v.pose==='sit'&&seat)Object.assign(v,seat.approach);this.seats={};v.seatId=null;v.loungeSeatId=null;v.pose='idle';}
 send(msg:ClientMessage):boolean{
  const v=this.visitor;
  switch(msg.type){
   case 'zone':this.release();Object.assign(v,{zone:msg.zone,...SPAWN[msg.zone],yaw:0});delete v.candle;delete v.macaron;delete v.macaronBites;delete v.macaronEmptyAt;delete v.coffee;delete v.coffeeSips;delete v.coffeeEmptyAt;return true;
   case 'hallMove':if(!isHallDestination(msg.destination)||v.zone!==DESTINATION_ZONE[msg.destination])return false;this.release();Object.assign(v,HALL_DESTINATIONS[msg.destination],{yaw:0,pose:'idle'});return true;
   case 'move':if(v.pose==='sit'||!walkable(v.zone,msg)||!Number.isFinite(msg.yaw)||distance(v,msg)>2.2)return false;Object.assign(v,{x:msg.x,y:msg.y??0,z:msg.z,yaw:msg.yaw,pose:msg.pose});return true;
   case 'reserve':if(v.zone!=='auditorium'||!SEATS.some(s=>s.id===msg.seatId))return false;this.release();this.reservationRequest=msg.requestId;v.seatId=msg.seatId;this.seats[msg.seatId]={visitorId:v.id,status:'reserved',expiresAt:null};return true;
   case 'seated':{const seat=SEATS.find(s=>s.id===msg.seatId);if(!seat||v.zone!=='auditorium'||v.seatId!==seat.id)return false;Object.assign(v,{x:seat.x,y:seat.y,z:seat.z,yaw:seat.yaw,pose:'sit'});this.seats[seat.id]={visitorId:v.id,status:'seated',expiresAt:null};return true;}
   case 'loungeSit':{const seat=LOUNGE_SEATS.find(s=>s.id===msg.seatId);if(!seat||v.zone!=='lobby'||distance(v,seat.approach)>.45)return false;this.release();Object.assign(v,{x:seat.x,y:seat.y,z:seat.z,yaw:seat.yaw,pose:'sit',loungeSeatId:seat.id});return true;}
   case 'release':if(msg.requestId&&msg.requestId!==this.reservationRequest)return false;this.release();return true;
   case 'macaron':if(!atCafe(v)||v.macaron)return false;v.macaron=true;v.macaronBites=0;return true;
   case 'coffee':if(!atCafe(v)||v.coffee)return false;v.coffee=true;v.coffeeSips=0;return true;
   case 'candle':if(!isCandleState(msg.state)||v.zone!=='auditorium')return false;v.candle=msg.state;return true;
   case 'outfit':if(!isOutfit(msg.outfit)||!atCloakroom(v))return false;v.outfit=msg.outfit;return true;
   case 'look':if(!isLook(msg.look))return false;v.look=msg.look;return true;
   case 'gesture':if(!isGesture(msg.gesture)||(msg.gesture==='eat'||msg.gesture==='drink')&&(v.gesture==='eat'||v.gesture==='drink')&&Date.now()-v.gestureAt<3200||msg.gesture==='eat'&&(!v.macaron||(v.macaronBites??0)>=2||!!v.macaronEmptyAt)||msg.gesture==='drink'&&(!v.coffee||(v.coffeeSips??0)>=3||v.gesture==='drink'&&Date.now()-v.gestureAt<gestureSeconds('drink')*1000))return false;if(msg.gesture==='eat'){v.macaronBites=(v.macaronBites??0)+1;if(v.macaronBites===2)v.macaronEmptyAt=Date.now()+gestureSeconds('eat')*1000;}if(msg.gesture==='drink'){v.coffeeSips=(v.coffeeSips??0)+1;if(v.coffeeSips===3)v.coffeeEmptyAt=Date.now()+gestureSeconds('drink')*1000;}v.gesture=msg.gesture;v.gestureAt=Date.now();return true;
   default:return true;
  }
 }
}
