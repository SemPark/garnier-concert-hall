import {FLOOR_ROWS,type Seat} from '../shared/venue';
import {GOLDEN_HALL as H} from '../shared/goldenHall';
import {STAGE} from './orchestra/layout';
/** Seat positions use the hall scale; the stage is compressed for the ticket map. */
export const SEAT_MAP_SCALE=19;
const STAGE_HALF_WIDTH=9,STAGE_HEIGHT=120,TOP=20,SEAT={w:20,h:22};
export const mapX=(x:number)=>400+x*SEAT_MAP_SCALE;
export const mapY=(z:number)=>TOP+Math.min(z-STAGE.back,STAGE.front-STAGE.back)*STAGE_HEIGHT/(STAGE.front-STAGE.back)+Math.max(0,z-STAGE.front)*SEAT_MAP_SCALE;
export const SEAT_MAP_SIZE={width:800,height:Math.ceil(mapY(FLOOR_ROWS.at(-1)!)+SEAT.h/2)+30};
export const seatMapRowY=(row:number)=>mapY(FLOOR_ROWS[row-1])-SEAT.h/2;
/** Top-left of a seat button, centred on the seat's real position. */
export function seatMapPosition(s:Seat){return {x:mapX(s.x)-SEAT.w/2,y:mapY(s.z)-SEAT.h/2};}
export const SEAT_MAP_PARTS={
 stage:{left:mapX(-STAGE_HALF_WIDTH),top:mapY(STAGE.back),width:STAGE_HALF_WIDTH*2*SEAT_MAP_SCALE,height:STAGE_HEIGHT},
 hall:{left:mapX(-H.width/2),top:mapY(STAGE.back),width:H.width*SEAT_MAP_SCALE,height:SEAT_MAP_SIZE.height-mapY(STAGE.back)-10},
 floorTop:mapY(STAGE.front),floorBottom:mapY(FLOOR_ROWS.at(-1)!)+SEAT.h/2,
};
