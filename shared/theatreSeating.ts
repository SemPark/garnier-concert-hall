import {PARTERRE} from './parterre';
import type {Seat} from './venue';
/**
 * The original theatre-style parterre (352 seats in 20 rows, three blocks), kept so the hall can go back to it.
 * The hall now uses round dinner tables (shared/dinnerTables.ts). To restore, export these from venue.ts again.
 */
// Adapt the official three-block stalls to the app's existing 352 seats.
// Two inner aisles, two wall-side aisles and a cross aisle connect every row.
export const THEATRE_SEAT_COLUMNS=[-10.45,-9.35,-8.25,-7.15,-3.85,-2.75,-1.65,-.55,.55,1.65,2.75,3.85,7.15,8.25,9.35,10.45];
export const THEATRE_FLOOR_AISLES=[-12.9,-5.5,5.5,12.9];
export const THEATRE_FLOOR_ROWS=Array.from({length:20},(_,row)=>-6.2+row*1.95+(row>=10?2:0));
export const THEATRE_FLOOR_CROSS_AISLE=(THEATRE_FLOOR_ROWS[9]+THEATRE_FLOOR_ROWS[10])/2;
export const THEATRE_FLOOR_SEATS:Seat[]=THEATRE_FLOOR_ROWS.flatMap((z,row)=>THEATRE_SEAT_COLUMNS.map((x,column)=>({id:`parterre-${row*16+column+1}`,x,z,approach:{x,y:PARTERRE.floor,z:z-1.05},row:row+1,column:column+1,level:'parterre' as const,y:PARTERRE.floor,yaw:0})));
