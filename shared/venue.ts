import {PROGRAM_BOOK} from './programBook';
import {hasStoryGuest} from './storyGuestSeats';
import {isMagicChair,MAGIC_CHAIR_TRAVEL} from './magicChairConfig';
import {TRAIN_DECK,TRAIN_STEP} from './encoreTrain';
import {LOWER_FINISH_RECESS,LOWER_WALL_INNER_X,LOWER_HALL} from './lowerHall';
import {UPPER_WALK_LIMIT} from './upperHall';
import {LOWER_STATUES} from './lowerHall';
import {PARTERRE,parterreHeight} from './parterre';
import {AMPHITHEATRE_DOOR} from './grandStair';
import {LOBBY_CHRISTMAS_TREE} from './grandStair';
import {OUTFITS,type Outfit} from './wardrobe';
import {GOLDEN_HALL as H} from './goldenHall';
import type {Gesture} from './gestures';
import type {Dish} from './dishes';
import {STAIR_DOORS,GALLERY_BRIDGE,REAR_COLUMNS,REAR_SCREENS,hasGalleryFloor} from './gallery';
import {ATRIUM,GRAND_STAIR,LOBBY_FURNITURE as F,LOBBY_ARCADE,lobbyHeight} from './grandStair';
export {STAIR_DOORS} from './gallery';
export type Zone='lobby'|'auditorium';
export type Point={x:number;z:number;y?:number};
export type Pose='idle'|'walk'|'sit';
export type Look='man'|'woman';
export const isLook=(v:unknown):v is Look=>v==='man'||v==='woman';
function appearanceSeed(id:string){let hash=2166136261;for(const ch of id)hash=Math.imul(hash^ch.charCodeAt(0),16777619);return hash>>>0;}
/** Independent skin, look and hair choices, stable for the same visitor on every screen. */
export function visitorVariant(v:{id:string;look?:Look}){const seed=appearanceSeed(v.id),look=v.look??(seed&4?'woman':'man');return (seed&3)+(look==='woman'?4:0)+((seed>>>8)&7)*8;}
export type Visitor={trainSeat?:number;id:string;name:string;color:number;look?:Look;outfit?:Outfit;candle?:CandleState;macaron?:boolean;macaronBites?:number;macaronEmptyAt?:number;dish?:Dish;dishBites?:number;dishEmptyAt?:number;drink?:'coffee'|'wine'|'tea';drinkSips?:number;teaReadyAt?:number;drinkEmptyAt?:number;coffee?:boolean;coffeeSips?:number;coffeeEmptyAt?:number;zone:Zone;x:number;y?:number;z:number;yaw:number;pose:Pose;seatId:string|null;loungeSeatId?:string|null;gesture:Gesture|null;gestureAt:number};
export type Seat={id:string;x:number;z:number;approach:Point;row:number;column:number;level:'parterre'|'balcony';y:number;yaw:number};
export type Obstacle={x:number;z:number;hx:number;hz:number;y?:number};
// Dinner-show floor: round tables with chairs all around (the theatre rows are kept in theatreSeating.ts).
export {DINNER_TABLES,TABLE_RADIUS} from './dinnerTables';
import {DINNER_TABLES,DINNER_ROWS,DINNER_LANES_X,DINNER_CROSS_LANE,TABLE_RADIUS,DINNER_SIT_DROP,dinnerSeats} from './dinnerTables';
/** Walking lanes between the table columns, and the wall-side aisles. */
export const FLOOR_AISLES=[-12.9,...DINNER_LANES_X,12.9];
/** Table rows (centre z), front to back. */
export const FLOOR_ROWS=DINNER_ROWS;
export const FLOOR_CROSS_AISLE=DINNER_CROSS_LANE;
export const FLOOR_SEATS:Seat[]=dinnerSeats(PARTERRE.floor);
// Leave the four seats next to each organ-loft wing empty. Retain all other IDs.
// Chairs stand near the balustrade so they show from the hall; the bay by the stair top stays empty.
export const BALCONY_SEATS:Seat[]=[];
/** Raised wall-side boxes face the orchestra across the room, with an aisle behind the front rail. */
export const SIDE_BOX_SEATS:Seat[]=[];
/** Physical chairs include the permanently seated story cast. */
export const ALL_SEATS:Seat[]=[...FLOOR_SEATS,...SIDE_BOX_SEATS,...BALCONY_SEATS];
export const NPC_SEATS=FLOOR_SEATS.filter(seat=>hasStoryGuest(seat.row,seat.column));
/** Only visitor seats may be reserved, displayed as available, or counted toward capacity. */
export const SEATS=ALL_SEATS.filter(seat=>seat.level!=='parterre'||!hasStoryGuest(seat.row,seat.column));
/** The hall admits as many visitors as it has visitor seats. */
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
export function seatLabel(s:Seat){if(s.id.startsWith('box-'))return `1층 ${s.x<0?'왼쪽':'오른쪽'} 측면석 ${(s.row-1)*3+s.column}번`;return s.level==='parterre'?`${s.row}번 테이블 ${s.column}번 자리`:`2층 ${s.x<0?'왼쪽':'오른쪽'} ${seatNumber(s)}번`;}
/** The parterre runs right up to the stage lip (stage front is z -9.5). */
export const STAGE_APRON_Z=-9.2;
/** Jump points: stage front and rear of the hall, the middle of the rear gallery (2F), and the middle of the lobby floor. */
export const HALL_DESTINATIONS={front:{x:0,y:PARTERRE.floor,z:-8.6},rear:{x:0,y:0,z:48.8},upper:{x:0,y:STAIR_DOORS.height,z:46},lobby:{x:0,y:0,z:25.5}} as const;
export type HallDestination=keyof typeof HALL_DESTINATIONS;
export const DESTINATION_ZONE:Record<HallDestination,'auditorium'|'lobby'>={front:'auditorium',rear:'auditorium',upper:'auditorium',lobby:'lobby'};
export const isHallDestination=(v:unknown):v is HallDestination=>typeof v==='string'&&Object.hasOwn(HALL_DESTINATIONS,v);
export const BOUNDS={lobby:{minX:-ATRIUM.halfWidth+.5,maxX:ATRIUM.halfWidth-.5,minZ:ATRIUM.front+.5,maxZ:ATRIUM.back-.5},auditorium:{minX:-15.65,maxX:15.65,minZ:-26.5,maxZ:50.3}};
/** A candle carried in the hall: lit or blown out. Picked up at the candle table just ahead and to the right of where
 * visitors come into the hall, marked by a glowing candle sign on the floor. */
export type CandleState='on'|'off';
export const isCandleState=(v:unknown):v is CandleState=>v==='on'||v==='off';
export const CANDLE_TABLE={x:2.8,z:44.6,approach:{x:2.8,y:0,z:45.6}} as const;
export const CANDLE_TABLES=[CANDLE_TABLE,{x:-2.8,z:44.6,approach:{x:-2.8,y:0,z:45.6}}] as const;
export type CandleTable=(typeof CANDLE_TABLES)[number];
export const CAFE_APPROACH={x:F.cafeCounter.x+1.25,y:0,z:F.cafeCounter.z};
export const cafeApproach=(z:number)=>({...CAFE_APPROACH,z:Math.max(F.cafeCounter.z-F.cafeCounter.hz+.4,Math.min(F.cafeCounter.z+F.cafeCounter.hz-.4,z))});
export const atCafe=(v:{zone:string;x:number;y?:number;z:number})=>v.zone==='lobby'&&Math.abs(v.y??0)<.5&&Math.abs(v.x-CAFE_APPROACH.x)<1.1&&Math.abs(v.z-F.cafeCounter.z)<F.cafeCounter.hz;
export const SPAWN={lobby:{x:0,y:0,z:24},auditorium:HALL_DESTINATIONS.rear};
export const PALETTE=[0xc9564d,0xd98a4f,0xd9b04f,0x5fa860,0x3f9c8f,0x4f7fd0,0x7462c9,0xd7769f,0xc25283,0x5aa9c9,0x95b856,0xd86662];
export function visitorColor(v:{id:string;outfit?:Outfit}){return OUTFITS.find(o=>o.id===v.outfit)?.color??PALETTE[(appearanceSeed(v.id)>>>16)%PALETTE.length];}
export function inGallery(p:Point,padding=.27){const side=Math.abs(p.x)>=12.9+padding&&Math.abs(p.x)<=15.9-padding&&p.z>=-26.5+padding&&p.z<=50.3-padding;const rear=Math.abs(p.x)<=15.9-padding&&p.z>=GALLERY_BRIDGE.minZ+padding&&p.z<=GALLERY_BRIDGE.maxZ-padding;return (side||rear)&&hasGalleryFloor(p.x,p.z);}
/** Pick the surface contiguous with the visitor, never jump to another floor. */
export function surfaceHeight(zone:Zone,p:Point,fromY=p.y??0):number|null{
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(fromY))return null;
 // Select the connected lobby floor, stair flight or balcony at the current elevation.
 if(zone==='lobby')return lobbyHeight(p.x,p.z,fromY);
 if(fromY>H.balconyHeight-.45&&inGallery(p)){
  if(Math.abs(p.x)<=TRAIN_DECK.width/2){
   if(Math.abs(p.z-TRAIN_DECK.z)<=TRAIN_DECK.depth/2)return H.balconyHeight+TRAIN_DECK.height;
   if(Math.abs(p.z-TRAIN_STEP.z)<=TRAIN_STEP.depth/2)return H.balconyHeight+TRAIN_STEP.height;
  }
  return H.balconyHeight;
 }
 if(fromY<1&&fromY>PARTERRE.floor-.4&&Math.abs(p.x)<=15.65&&p.z>=STAGE_APRON_Z&&p.z<=50.3)return parterreHeight(p.x,p.z);
 return null;
}
const OBSTACLES:Record<Zone,Obstacle[]>={auditorium:[PROGRAM_BOOK,...FLOOR_SEATS.map(s=>({x:s.x+(isMagicChair(s.id)?Math.sin(s.yaw)*MAGIC_CHAIR_TRAVEL/2:0),z:s.z+(isMagicChair(s.id)?Math.cos(s.yaw)*MAGIC_CHAIR_TRAVEL/2:0),hx:.38+(isMagicChair(s.id)?Math.abs(Math.sin(s.yaw))*MAGIC_CHAIR_TRAVEL/2:0),hz:.38+(isMagicChair(s.id)?Math.abs(Math.cos(s.yaw))*MAGIC_CHAIR_TRAVEL/2:0),y:s.y+DINNER_SIT_DROP})),...DINNER_TABLES.map(t=>({x:t.x,z:t.z,hx:TABLE_RADIUS+.1,hz:TABLE_RADIUS+.1,y:PARTERRE.floor})),...[-1,1].flatMap(side=>LOWER_STATUES.map(z=>({x:side*(15.3+LOWER_FINISH_RECESS),z,hx:.45,hz:.48,y:0}))),...SIDE_BOX_SEATS.map(s=>({x:s.x,z:s.z,hx:.45,hz:.54,y:0})),...BALCONY_SEATS.map(s=>({x:s.x,z:s.z,hx:.48,hz:.57,y:s.y})),...[-1,1].flatMap(side=>[PARTERRE.floor,0].map(y=>({x:side*(16+PARTERRE.stairHalfWidth)/2,z:(PARTERRE.stairFront+44.2)/2,hx:(16-PARTERRE.stairHalfWidth)/2,hz:(44.2-PARTERRE.stairFront)/2,y}))),...REAR_COLUMNS.xs.map(x=>({x,z:REAR_COLUMNS.z,hx:REAR_COLUMNS.radius,hz:REAR_COLUMNS.radius,y:0})),...[-1,1].flatMap(side=>{const r=REAR_SCREENS,t=r.thickness/2;return [PARTERRE.floor,0].map(y=>({x:side*(r.innerX+r.outerX)/2,z:r.z,hx:(r.outerX-r.innerX)/2,hz:t,y}));})],lobby:[
 ...[-1,1].map(side=>({x:side*(GRAND_STAIR.flightHalf+.06),z:GRAND_STAIR.flightEnd,hx:.29,hz:.29,y:GRAND_STAIR.rise})),
 ...[-1,1].map(side=>({x:side*2.55,z:AMPHITHEATRE_DOOR.z-.75,hx:.52,hz:.46,y:GRAND_STAIR.rise})),
 ...LOBBY_ARCADE.endColumns.flatMap(x=>[ATRIUM.front+ATRIUM.balconyDepth,ATRIUM.back-ATRIUM.balconyDepth].map(z=>({x,z,hx:.33,hz:.33,y:ATRIUM.balconyY}))),
 ...[-1,1].flatMap(side=>[0,ATRIUM.balconyY].flatMap(y=>LOBBY_ARCADE.columns.map(z=>({x:side*LOBBY_ARCADE.x,z,hx:.33,hz:.33,y})))),

 {x:LOBBY_CHRISTMAS_TREE.x,z:LOBBY_CHRISTMAS_TREE.z,hx:LOBBY_CHRISTMAS_TREE.radius,hz:LOBBY_CHRISTMAS_TREE.radius,y:0},
 ...[F.boxOffice,F.cloakroom,F.cafeCounter,...F.ticketRails,...F.wardrobeRails,...F.sofas,F.ottoman,...F.busts,...F.torchieres,F.programBoard].map(f=>({...f,y:0}))]};
const CELLS:Record<Zone,Map<string,Obstacle[]>>={lobby:new Map(),auditorium:new Map()};
for(const zone of ['lobby','auditorium'] as const)for(const o of OBSTACLES[zone])for(let x=Math.floor((o.x-o.hx-1)/2);x<=Math.floor((o.x+o.hx+1)/2);x++)for(let z=Math.floor((o.z-o.hz-1)/2);z<=Math.floor((o.z+o.hz+1)/2);z++){const key=`${x},${z}`,items=CELLS[zone].get(key)??[];items.push(o);CELLS[zone].set(key,items);}
export function obstacles(zone:Zone):Obstacle[]{return OBSTACLES[zone];}
export function walkable(zone:Zone,p:Point,padding=.27){const b=BOUNDS[zone],h=surfaceHeight(zone,p,p.y??0),y=p.y??0;return !(zone==='auditorium'&&y<1&&p.z>=LOWER_HALL.front&&p.z<=LOWER_HALL.rear&&Math.abs(p.x)>LOWER_WALL_INNER_X-padding)&&!(zone==='auditorium'&&Math.abs(y-H.balconyHeight)<.6&&Math.abs(p.x)>UPPER_WALK_LIMIT-padding)&&h!==null&&Math.abs(h-y)<.32&&p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ&&!(padding>1?OBSTACLES[zone]:CELLS[zone].get(`${Math.floor(p.x/2)},${Math.floor(p.z/2)}`)??[]).some(o=>Math.abs((o.y??0)-y)<.6&&Math.abs(p.x-o.x)<o.hx+padding&&Math.abs(p.z-o.z)<o.hz+padding);}
export function distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.z-b.z,(a.y??0)-(b.y??0));}
export function canSit(p:Point,seat:Seat){return distance(p,seat.approach)<.4&&Math.abs((p.y??0)-seat.y)<.25;}
