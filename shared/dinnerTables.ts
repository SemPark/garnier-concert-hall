import type {Seat} from './venue';
/**
 * Dinner-show parterre: large round tables in staggered rows (4 then 3 across), four chairs at each, every chair
 * facing its table on the diagonals so nobody sits with their back square to the stage. The stage front is z −9.5,
 * the rear steps start at z 39.8; the floor runs to x ±12.2.
 */
export const TABLE_RADIUS=1;
/** Chair centres sit this far from the table centre, drawn in close so seated knees go under the cloth. Visitors walk up
 * beside the chair (APPROACH_SIDE along the table's edge) and slide in from the side, never through the backrest. */
export const CHAIR_RING=1.5,APPROACH_SIDE=1.05,
 /** Dining chairs are lower than the theatre seats the sitting pose was made for, so a seated visitor is set this much
  * lower; and they sit this far back from the chair centre: as far back as the bent knees allow while clearing the seat's
  * front edge. */
 DINNER_SIT_DROP=.14,DINNER_SIT_BACK=.04,CHAIRS_PER_TABLE=4;
const COLUMN_SPACING=6,ROW_SPACING=5.2;
export const DINNER_ROWS=Array.from({length:9},(_,i)=>-4.5+i*ROW_SPACING);
/** Even rows hold four tables, odd rows three, set in the gaps of the rows either side. */
const rowColumns=(row:number)=>row%2===0?[-1.5,-.5,.5,1.5]:[-1,0,1];
/** Clear lanes run down both sides of the tables; between rows there is a clear lane across the room. */
export const DINNER_LANES_X=[-11.4,11.4];
export const DINNER_LANES_Z=DINNER_ROWS.slice(1).map((z,i)=>(z+DINNER_ROWS[i])/2);
export const DINNER_CROSS_LANE=DINNER_LANES_Z[3];
/** Clear lanes across the room in front of the first row and behind the last (the rear steps start at z 39.8). */
export const DINNER_FRONT_LANE=-7.4,DINNER_REAR_LANE=39.3;
export const DINNER_TABLES=(()=>{let id=0;return DINNER_ROWS.flatMap((z,row)=>rowColumns(row).map(c=>({id:++id,x:c*COLUMN_SPACING,z})));})();
export function dinnerSeats(floor:number):Seat[]{
 return DINNER_TABLES.flatMap(t=>Array.from({length:CHAIRS_PER_TABLE},(_,k)=>{
  // Chair 1 sits front-left (stage side), then round clockwise seen from above.
  const a=-Math.PI*3/4+k*Math.PI*2/CHAIRS_PER_TABLE,dx=Math.cos(a),dz=Math.sin(a);
  const ring=CHAIR_RING+DINNER_SIT_BACK;
  return {id:`parterre-${(t.id-1)*CHAIRS_PER_TABLE+k+1}`,x:t.x+dx*ring,z:t.z+dz*ring,approach:{x:t.x+dx*CHAIR_RING-dz*APPROACH_SIDE,y:floor,z:t.z+dz*CHAIR_RING+dx*APPROACH_SIDE},
   row:t.id,column:k+1,level:'parterre' as const,y:floor-DINNER_SIT_DROP,yaw:Math.atan2(dx,dz)};
 }));
}
