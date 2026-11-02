import {GOLDEN_HALL as H} from './goldenHall';
import type {Gesture} from './gestures';
import {STAIR_DOORS,GALLERY_BRIDGE,REAR_COLUMNS,REAR_SCREENS,hasGalleryFloor} from './gallery';
import {ATRIUM,ATRIUM_COLUMNS,GRAND_STAIR,LOBBY_FURNITURE as F,onLobbyFloor} from './grandStair';
export {STAIR_DOORS} from './gallery';
export type Zone='lobby'|'auditorium';
export type Point={x:number;z:number;y?:number};
export type Pose='idle'|'walk'|'sit';
export type Look='man'|'woman';
export const isLook=(v:unknown):v is Look=>v==='man'||v==='woman';
/** Avatar variant for a visitor: the chosen look decides man or woman; skin and hair still vary by id. */
export function visitorVariant(v:{id:string;look?:Look}){const base=parseInt(v.id.slice(0,2),16)||0,look=v.look??(base%8>=4?'woman':'man');return base%4+(look==='woman'?4:0);}
export type Visitor={id:string;name:string;color:number;look?:Look;zone:Zone;x:number;y?:number;z:number;yaw:number;pose:Pose;seatId:string|null;gesture:Gesture|null;gestureAt:number};
export type Seat={id:string;x:number;z:number;approach:Point;row:number;column:number;level:'parterre'|'balcony';y:number;yaw:number};
export type Obstacle={x:number;z:number;hx:number;hz:number;y?:number};
// Adapt the official three-block stalls to the app's existing 352 seats.
// Two inner aisles, two wall-side aisles and a cross aisle connect every row.
export const SEAT_COLUMNS=[-12.1,-10.7,-9.3,-7.9,-4.9,-3.5,-2.1,-.7,.7,2.1,3.5,4.9,7.9,9.3,10.7,12.1];
export const FLOOR_AISLES=[-13.4,-6.4,6.4,13.4];
export const FLOOR_ROWS=Array.from({length:22},(_,row)=>-6+row*2.2+(row>=10?2:0));
export const FLOOR_CROSS_AISLE=(FLOOR_ROWS[9]+FLOOR_ROWS[10])/2;
export const FLOOR_SEATS:Seat[]=FLOOR_ROWS.flatMap((z,row)=>SEAT_COLUMNS.map((x,column)=>({id:`parterre-${row*16+column+1}`,x,z,approach:{x,y:0,z:z-1.05},row:row+1,column:column+1,level:'parterre' as const,y:0,yaw:0})));
// Leave the four seats next to each organ-loft wing empty. Retain all other IDs.
// Chairs stand near the balustrade so they show from the hall; the bay by the stair top stays empty.
export const BALCONY_SEATS:Seat[]=[-1,1].flatMap(side=>H.bayCenters.flatMap((z,row)=>row===0||z>GALLERY_BRIDGE.minZ?[]:[-1.8,-.6,.6,1.8].map((offset,column)=>({id:`balcony-${side<0?'left':'right'}-${row*4+column+1}`,x:side*14.4,z:z-side*offset,approach:{x:side*13.4,y:H.balconyHeight,z:z-side*offset},row:row+1,column:column+1+(side>0?4:0),level:'balcony' as const,y:H.balconyHeight,yaw:side<0?-Math.PI/2:Math.PI/2}))));
export const SEATS:Seat[]=[...FLOOR_SEATS,...BALCONY_SEATS];
/** The hall admits as many visitors as it has seats (1F 352 + 2F 88). */
export const CAPACITY=SEATS.length;
/** Gallery seats are numbered 1, 2, 3… along each side, from the stage end towards the back. */
const BALCONY_NUMBER=new Map([-1,1].flatMap(side=>BALCONY_SEATS.filter(s=>Math.sign(s.x)===side).sort((a,b)=>a.z-b.z).map((s,i)=>[s.id,i+1] as const)));
export function seatNumber(s:Seat){return s.level==='parterre'?s.column:BALCONY_NUMBER.get(s.id)!;}
export type SeatGrade='R'|'S'|'A'|'B'|'C';
export const SEAT_GRADES:SeatGrade[]=['R','S','A','B','C'];
const balconyMid=(()=>{const z=BALCONY_SEATS.map(s=>s.z).sort((a,b)=>a-b);return z[Math.floor(z.length/2)];})();
/** Price zones run in arcs around the front of the stage, as in real halls: R from the front rows, then S, then A at the back;
 * seats further to the side drop sooner. The balcony half nearer the stage is B, the rear C. */
export function seatGrade(s:Seat):SeatGrade{
 if(s.level==='balcony')return s.z<balconyMid?'B':'C';
 const d=Math.hypot(s.x*1.35,s.z+9.2);
 if(d<20)return 'R';
 if(d<40)return 'S';
 return 'A';
}
export function seatLabel(s:Seat){return s.level==='parterre'?`1층 ${s.row}열 ${s.column}번`:`2층 ${s.x<0?'왼쪽':'오른쪽'} ${seatNumber(s)}번`;}
/** The parterre runs right up to the stage lip (stage front is z -9.5). */
export const STAGE_APRON_Z=-9.2;
export const BOUNDS={lobby:{minX:-ATRIUM.halfWidth+.5,maxX:ATRIUM.halfWidth-.5,minZ:-16,maxZ:ATRIUM.back-.5},auditorium:{minX:-15.65,maxX:15.65,minZ:-26.5,maxZ:50.3}};
export const SPAWN={lobby:{x:0,y:0,z:24},auditorium:{x:0,y:0,z:47}};
export const PALETTE=[0xc09a61,0x8c9c92,0x9c7181,0x71899c,0xc0ab87,0x9180a3];
/** The door on one level that leads to the hidden corridor stair on that side. */
export function stairPoint(side:number,upper:boolean):Point{const d=upper?STAIR_DOORS.upper:STAIR_DOORS.lower;return {x:side*d.x,y:upper?STAIR_DOORS.height:0,z:d.z};}
/** True when a step from a to b is a pass through the corridor stair: from one stair door to its partner on the same side. */
export function stairLink(a:Point,b:Point,tolerance=1.6){
 for(const side of [-1,1]){const lo=stairPoint(side,false),hi=stairPoint(side,true);
  if((distance(a,lo)<tolerance&&distance(b,hi)<tolerance)||(distance(a,hi)<tolerance&&distance(b,lo)<tolerance))return true;}
 return false;
}
export function inGallery(p:Point,padding=.27){const side=Math.abs(p.x)>=12.9+padding&&Math.abs(p.x)<=15.9-padding&&p.z>=-26.5+padding&&p.z<=50.3-padding;const rear=Math.abs(p.x)<=15.9-padding&&p.z>=GALLERY_BRIDGE.minZ+padding&&p.z<=GALLERY_BRIDGE.maxZ-padding;return (side||rear)&&hasGalleryFloor(p.x,p.z);}
/** Pick the surface contiguous with the visitor, never jump to another floor. */
export function surfaceHeight(zone:Zone,p:Point,fromY=p.y??0):number|null{
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(fromY))return null;
 if(zone==='lobby')return Math.abs(fromY)<.4&&onLobbyFloor(p.x,p.z)?0:null;
 if(fromY>H.balconyHeight-.45&&inGallery(p))return H.balconyHeight;
 if(Math.abs(fromY)<.4&&Math.abs(p.x)<=13.8&&p.z>=STAGE_APRON_Z&&p.z<=50.3)return 0;
 return null;
}
const OBSTACLES:Record<Zone,Obstacle[]>={auditorium:[...FLOOR_SEATS.map(s=>({x:s.x,z:s.z,hx:.57,hz:.48,y:0})),...BALCONY_SEATS.map(s=>({x:s.x,z:s.z,hx:.48,hz:.57,y:s.y})),...REAR_COLUMNS.xs.map(x=>({x,z:REAR_COLUMNS.z,hx:REAR_COLUMNS.radius,hz:REAR_COLUMNS.radius,y:0})),...[-1,1].flatMap(side=>{const r=REAR_SCREENS,t=r.thickness/2;return [{x:side*(r.innerX+r.outerX)/2,z:r.z,hx:(r.outerX-r.innerX)/2,hz:t,y:0}];})],lobby:[...[-10,-3,4,11].flatMap(z=>[-5.4,5.4].map(x=>({x,z,hx:.48,hz:.48,y:0}))),...ATRIUM_COLUMNS.map(c=>({x:c.x,z:c.z,hx:.45,hz:.45,y:0})),
 // Only the central flight and its landing stand on the floor; the curved branches pass overhead.
 {x:0,z:(GRAND_STAIR.flightStart+GRAND_STAIR.landingEnd)/2,hx:GRAND_STAIR.branchInner+1.5,hz:(GRAND_STAIR.landingEnd-GRAND_STAIR.flightStart)/2+.2,y:0},...[-1,1].map(side=>({x:side*(GRAND_STAIR.flightHalf+3.6),z:GRAND_STAIR.flightStart-.9,hx:.65,hz:.65,y:0})),
 ...[F.boxOffice,F.cloakroom,F.cafeCounter,...F.cafeTables,...F.sofas,F.ottoman,...F.busts,F.programBoard].map(f=>({...f,y:0}))]};
const CELLS:Record<Zone,Map<string,Obstacle[]>>={lobby:new Map(),auditorium:new Map()};
for(const zone of ['lobby','auditorium'] as const)for(const o of OBSTACLES[zone])for(let x=Math.floor((o.x-o.hx-1)/2);x<=Math.floor((o.x+o.hx+1)/2);x++)for(let z=Math.floor((o.z-o.hz-1)/2);z<=Math.floor((o.z+o.hz+1)/2);z++){const key=`${x},${z}`,items=CELLS[zone].get(key)??[];items.push(o);CELLS[zone].set(key,items);}
export function obstacles(zone:Zone):Obstacle[]{return OBSTACLES[zone];}
export function walkable(zone:Zone,p:Point,padding=.27){const b=BOUNDS[zone],y=p.y??0,h=surfaceHeight(zone,p,y);return h!==null&&Math.abs(h-y)<.32&&p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ&&!(padding>1?OBSTACLES[zone]:CELLS[zone].get(`${Math.floor(p.x/2)},${Math.floor(p.z/2)}`)??[]).some(o=>Math.abs((o.y??0)-y)<.6&&Math.abs(p.x-o.x)<o.hx+padding&&Math.abs(p.z-o.z)<o.hz+padding);}
export function distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.z-b.z,(a.y??0)-(b.y??0));}
export function canSit(p:Point,seat:Seat){return distance(p,seat.approach)<.4&&Math.abs((p.y??0)-seat.y)<.25;}
