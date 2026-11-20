import type {SeatClaim} from '../shared/protocol';
import {QUEEN_SEAT,TAROT_HOST_SEAT,TEA_TABLE} from '../shared/storyGuestSeats';
import {SEATS} from '../shared/venue';

export function isGhostTable(table:number){
 return table===TAROT_HOST_SEAT.row||table===QUEEN_SEAT.row||table===TEA_TABLE;
}

export function availableGhostTableSeat(table:number,claims:Record<string,SeatClaim>,selfId:string){
 if(!isGhostTable(table))return;
 return SEATS.find(seat=>seat.row===table&&seat.level==='parterre'
  &&(!claims[seat.id]||claims[seat.id].visitorId===selfId));
}
