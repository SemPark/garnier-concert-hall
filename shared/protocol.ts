import type {Outfit} from './wardrobe';
import type {Visitor,Zone,Pose,Look,CandleState} from './venue';
import type {Gesture} from './gestures';
export type SeatClaim={visitorId:string;status:'reserved'|'seated';expiresAt:number|null};
export type Snapshot={revision:number;visitors:Visitor[];seats:Record<string,SeatClaim>;serverNow:number;roomId:string};
/**
 * Only what changed since revision `base`: visitors who joined or changed, ids of those who left, and seat claims
 * (null = released). With a full house this keeps each update to a few kilobytes instead of the whole hall.
 */
export type Delta={revision:number;base:number;visitors:Visitor[];left:string[];seats:Record<string,SeatClaim|null>;serverNow:number};
/** Merge a delta into the state it was built on; null when the client missed one and needs a full sync. */
export function applyDelta(state:Snapshot,delta:Delta):Snapshot|null{
 if(state.revision!==delta.base)return null;
 const gone=new Set(delta.left),changed=new Map(delta.visitors.map(v=>[v.id,v])),visitors:Visitor[]=[];
 for(const v of state.visitors){if(gone.has(v.id))continue;visitors.push(changed.get(v.id)??v);changed.delete(v.id);}
 visitors.push(...changed.values());
 const seats={...state.seats};for(const [id,claim]of Object.entries(delta.seats)){if(claim)seats[id]=claim;else delete seats[id];}
 return {revision:delta.revision,visitors,seats,serverNow:delta.serverNow,roomId:state.roomId};
}
export type ClientMessage=
 |{type:'move';x:number;y?:number;z:number;yaw:number;pose:Pose}
 |{type:'zone';zone:Zone}
 |{type:'reserve';seatId:string;requestId:string}
 |{type:'seated';seatId:string}
 |{type:'loungeSit';seatId:string}
 |{type:'release';requestId?:string}
 |{type:'renew';seatId:string}
 |{type:'gesture';gesture:Gesture}
 |{type:'look';look:Look}
 |{type:'outfit';outfit:Outfit}
 |{type:'candle';state:CandleState}
 |{type:'activity'}
 |{type:'sync'}
 |{type:'clock';sentAt:number};
export type ServerMessage=
 |{type:'moveBlocked';x:number;y:number;z:number}
 |{type:'welcome';selfId:string;resumeToken:string;state:Snapshot}
 |{type:'state';state:Snapshot}
 |{type:'delta';delta:Delta}
 |{type:'seatResult';ok:boolean;seatId:string;requestId:string;reason?:string}
 |{type:'clock';sentAt:number;serverNow:number}
 |{type:'error';message:string};
