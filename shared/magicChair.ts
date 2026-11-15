import {SEATS,type Visitor} from './venue';
import type {SeatClaim} from './protocol';
import {MAGIC_CHAIR_ID,MAGIC_CHAIR_TRAVEL,isMagicChair} from './magicChairConfig';
export {MAGIC_CHAIR_ID,MAGIC_CHAIR_TRAVEL};
const MAGIC_CHAIR_SEATS=SEATS.filter(seat=>isMagicChair(seat.id));
const MAGIC_CHAIR_SEATS_BY_ID=new Map(MAGIC_CHAIR_SEATS.map(seat=>[seat.id,seat]));
export const MAGIC_CHAIR_SEAT=SEATS.find(s=>s.id===MAGIC_CHAIR_ID)!;
export type MagicChairState={from:number;to:number;at:number;duration:number;chairs?:Record<string,MagicChairState>};
export const RESTING_CHAIR:MagicChairState={from:0,to:0,at:0,duration:1000};
export function chairOffset(state:MagicChairState|undefined,now:number){
 if(!state)return 0;
 const t=Math.max(0,Math.min(1,(now-state.at)/state.duration));
 return state.from+(state.to-state.from)*t*t*(3-2*t);
}
/** Called only by the authority on validated visitor/claim changes. All clients sample the same tween. */
export function updateMagicChair(previous:MagicChairState,visitors:readonly Visitor[],claim:SeatClaim|undefined,now:number,seat=MAGIC_CHAIR_SEAT):MagicChairState{
 const near=visitors.some(v=>v.zone==='auditorium'&&v.pose!=='sit'&&v.trainSeat===undefined&&
  (!claim||claim.visitorId===v.id)&&Math.abs((v.y??0)-seat.approach.y!)<.6&&Math.hypot(v.x-seat.approach.x,v.z-seat.approach.z)<2.5);
 const open=claim?.status!=='seated'&&near;
 if(open&&previous.to===MAGIC_CHAIR_TRAVEL||!open&&previous.to===0)return previous;
 return {from:chairOffset(previous,now),to:open?MAGIC_CHAIR_TRAVEL:0,at:now+(!open&&claim?.status!=='seated'?1600:0),duration:open?1000:claim?.status==='seated'?900:1800};
}

export function updateMagicChairs(previous:MagicChairState,visitors:readonly Visitor[],claims:Record<string,SeatClaim>,now:number){
 const chairs={...previous.chairs};let changed=false;
 for(const seat of MAGIC_CHAIR_SEATS){
  const old=chairs[seat.id]??RESTING_CHAIR;
  const next=updateMagicChair(old,visitors,claims[seat.id],now,seat);
  chairs[seat.id]=next;changed ||= old!==next;
 }
 return changed?{...chairs[MAGIC_CHAIR_ID],chairs}:previous;
}
export function magicChairPose(id:string|null|undefined,state:MagicChairState|undefined,now:number){
 const seat=id?MAGIC_CHAIR_SEATS_BY_ID.get(id):undefined;
 const offset=seat?chairOffset(state?.chairs?.[seat.id]??(seat.id===MAGIC_CHAIR_ID?state:undefined),now):0;
 return {x:Math.sin(seat?.yaw??0)*offset,z:Math.cos(seat?.yaw??0)*offset,turn:offset/MAGIC_CHAIR_TRAVEL*.22};
}
