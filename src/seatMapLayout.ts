import {FLOOR_ROWS,type Seat} from '../shared/venue';
import {GOLDEN_HALL as H} from '../shared/goldenHall';
import {GALLERY_BRIDGE} from '../shared/gallery';
import {STAGE} from './orchestra/layout';
/** One scale for both axes, so the stage, stalls and galleries keep their true proportions and positions. */
export const SEAT_MAP_SCALE=19;
const TOP=20,SEAT={w:20,h:22};
export const mapX=(x:number)=>400+x*SEAT_MAP_SCALE;
export const mapY=(z:number)=>TOP+(z-STAGE.back)*SEAT_MAP_SCALE;
export const SEAT_MAP_SIZE={width:800,height:Math.ceil(mapY(H.rear))+20};
export const seatMapRowY=(row:number)=>mapY(FLOOR_ROWS[row-1])-SEAT.h/2;
/** Top-left of a seat button, centred on the seat's real position. */
export function seatMapPosition(s:Seat){return {x:mapX(s.x)-SEAT.w/2,y:mapY(s.z)-SEAT.h/2};}
export const SEAT_MAP_PARTS={
 stage:{left:mapX(-STAGE.width/2),top:mapY(STAGE.back),width:STAGE.width*SEAT_MAP_SCALE,height:(STAGE.front-STAGE.back)*SEAT_MAP_SCALE},
 hall:{left:mapX(-H.width/2),top:mapY(STAGE.back),width:H.width*SEAT_MAP_SCALE,height:mapY(H.rear)-mapY(STAGE.back)},
 rearGallery:{left:mapX(GALLERY_BRIDGE.minX),top:mapY(GALLERY_BRIDGE.minZ),width:(GALLERY_BRIDGE.maxX-GALLERY_BRIDGE.minX)*SEAT_MAP_SCALE,height:(GALLERY_BRIDGE.maxZ-GALLERY_BRIDGE.minZ)*SEAT_MAP_SCALE},
 floorTop:mapY(STAGE.front),floorBottom:mapY(FLOOR_ROWS.at(-1)!)+SEAT.h/2,
};
