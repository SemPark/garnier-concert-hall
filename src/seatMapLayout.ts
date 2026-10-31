import {FLOOR_ROWS,BALCONY_SEATS,type Seat} from '../shared/venue';
export const SEAT_MAP_SIZE={width:800,height:1160};
export const seatMapRowY=(row:number)=>170+(FLOOR_ROWS[row-1]-FLOOR_ROWS[0])*12.8;
/** Each side gallery is a single line of seats, ordered from the stage end to the back. */
const BALCONY_ORDER=new Map([-1,1].flatMap(side=>BALCONY_SEATS.filter(s=>Math.sign(s.x)===side).sort((a,b)=>a.z-b.z).map((s,i)=>[s.id,i] as const)));
/** The stage is at the top; both side galleries remain visible alongside the stalls. */
export function seatMapPosition(s:Seat){
 if(s.level==='parterre')return {x:400+s.x*16-10,y:seatMapRowY(s.row)};
 return {x:s.x<0?45:735,y:100+BALCONY_ORDER.get(s.id)!*23};
}
