import {FLOOR_ROWS,type Seat} from '../shared/venue';
export const SEAT_MAP_SIZE={width:800,height:920};
export const seatMapRowY=(row:number)=>170+(FLOOR_ROWS[row-1]-FLOOR_ROWS[0])*12.8;
/** The stage is at the top; both side galleries remain visible alongside the stalls. */
export function seatMapPosition(s:Seat){
 if(s.level==='parterre')return {x:400+s.x*16-10,y:seatMapRowY(s.row)};
 return {x:s.x<0?25+((s.column-1)%4)*23:683+((s.column-1)%4)*23,y:120+(s.row-1)*54};
}
