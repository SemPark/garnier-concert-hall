import {SEATS,type Visitor} from './venue';
import {TEA_TABLE} from './storyGuestSeats';

export const TEA_POUR_MS=6000;
export function atTeaTable(visitor:Visitor){
 const seat=SEATS.find(s=>s.id===visitor.seatId);
 return visitor.zone==='auditorium'&&visitor.pose==='sit'&&seat?.level==='parterre'&&seat.row===TEA_TABLE;
}
export function serveTea(visitor:Visitor,visitors:Visitor[],now:number){
 if(!atTeaTable(visitor)||visitor.drink==='tea')return false;
 const available=visitors.reduce((latest,v)=>v.drink==='tea'&&atTeaTable(v)?Math.max(latest,v.teaReadyAt??0):latest,now);
 visitor.drink='tea';visitor.drinkSips=0;visitor.teaReadyAt=available+TEA_POUR_MS;
 delete visitor.drinkEmptyAt;
 return true;
}
