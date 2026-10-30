import type {Seat} from '../shared/venue';
export const SEAT_MAP_SIZE={width:800,height:920};
/** The stage is at the top; both side galleries remain visible alongside the stalls. */
export function seatMapPosition(s:Seat){
 if(s.level==='parterre')return {x:400+s.x*15-10,y:170+(s.row-1)*29};
 return {x:s.x<0?25+((s.column-1)%4)*23:683+((s.column-1)%4)*23,y:120+(s.row-1)*54};
}
