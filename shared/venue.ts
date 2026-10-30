import {GOLDEN_HALL as H} from './goldenHall';
import {STAIR,GALLERY_BRIDGE,hasGalleryFloor} from './gallery';
export {STAIR} from './gallery';
export type Zone='lobby'|'auditorium';
export type Point={x:number;z:number;y?:number};
export type Pose='idle'|'walk'|'sit';
export type Visitor={id:string;name:string;color:number;zone:Zone;x:number;y?:number;z:number;yaw:number;pose:Pose;seatId:string|null;gesture:'wave'|'clap'|null;gestureAt:number};
export type Seat={id:string;x:number;z:number;approach:Point;row:number;column:number;level:'parterre'|'balcony';y:number;yaw:number};
export type Obstacle={x:number;z:number;hx:number;hz:number;y?:number};
export const SEAT_COLUMNS=[-12.3,-10.8,-9.3,-7.8,-6.3,-4.8,-3.3,-1.8,1.8,3.3,4.8,6.3,7.8,9.3,10.8,12.3];
export const FLOOR_SEATS:Seat[]=Array.from({length:22},(_,row)=>SEAT_COLUMNS.map((x,column)=>({id:`parterre-${row*16+column+1}`,x,z:-1+row*2.1,approach:{x,y:0,z:-2.05+row*2.1},row:row+1,column:column+1,level:'parterre' as const,y:0,yaw:0}))).flat();
export const BALCONY_SEATS:Seat[]=[-1,1].flatMap(side=>H.bayCenters.flatMap((z,row)=>[-1.8,-.6,.6,1.8].map((offset,column)=>({id:`balcony-${side<0?'left':'right'}-${row*4+column+1}`,x:side*15,z:z-side*offset,approach:{x:side*13.95,y:H.balconyHeight,z:z-side*offset},row:row+1,column:column+1+(side>0?4:0),level:'balcony' as const,y:H.balconyHeight,yaw:side<0?-Math.PI/2:Math.PI/2}))));
export const SEATS:Seat[]=[...FLOOR_SEATS,...BALCONY_SEATS];
export function seatLabel(s:Seat){return `${s.level==='parterre'?'1층':'2층'} ${s.row}열 ${s.column}번`;}
export const BOUNDS={lobby:{minX:-6.5,maxX:6.5,minZ:-16,maxZ:16},auditorium:{minX:-15.65,maxX:15.65,minZ:-26.5,maxZ:50.3}};
export const SPAWN={lobby:{x:0,y:0,z:10},auditorium:{x:0,y:0,z:47}};
export const CAPACITY=40;
export const PALETTE=[0xc09a61,0x8c9c92,0x9c7181,0x71899c,0xc0ab87,0x9180a3];
export function stairPoint(side:number,upper:boolean):Point{return {x:side*(upper?STAIR.topX:STAIR.bottomX),y:upper?STAIR.height:0,z:STAIR.z};}
export function onStair(p:Point,padding=0){return Math.abs(p.x)>=STAIR.bottomX-padding&&Math.abs(p.x)<=STAIR.topX+padding&&Math.abs(p.z-STAIR.z)<=STAIR.width/2-padding;}
export function stairHeight(x:number){return Math.max(0,Math.min(STAIR.height,(Math.abs(x)-STAIR.bottomX)/(STAIR.topX-STAIR.bottomX)*STAIR.height));}
export function inGallery(p:Point,padding=.27){const side=Math.abs(p.x)>=12.9+padding&&Math.abs(p.x)<=15.9-padding&&p.z>=-26.5+padding&&p.z<=50.3-padding;const rear=Math.abs(p.x)<=15.9-padding&&p.z>=GALLERY_BRIDGE.minZ+padding&&p.z<=GALLERY_BRIDGE.maxZ-padding;return (side||rear)&&hasGalleryFloor(p.x,p.z);}
/** Pick the surface contiguous with the visitor, never jump to another floor. */
export function surfaceHeight(zone:Zone,p:Point,fromY=p.y??0):number|null{
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(fromY))return null;
 if(zone==='lobby')return Math.abs(fromY)<.4?0:null;
 if(onStair(p)){const h=stairHeight(p.x);if(Math.abs(h-fromY)<.65)return h;if(Math.abs(fromY)<.4&&h>2)return 0;return null;}
 // Tiny landing margins let a step enter or leave the continuous stair slope.
 if(Math.abs(p.z-STAIR.z)<=STAIR.width/2&&Math.abs(p.x)>STAIR.topX&&Math.abs(p.x)<14.3&&fromY>H.balconyHeight-.65)return H.balconyHeight;
 if(fromY>H.balconyHeight-.45&&inGallery(p))return H.balconyHeight;
 if(Math.abs(fromY)<.4&&Math.abs(p.x)<=13.8&&p.z>=-8&&p.z<=50.3)return 0;
 return null;
}
const OBSTACLES:Record<Zone,Obstacle[]>={auditorium:[...FLOOR_SEATS.map(s=>({x:s.x,z:s.z,hx:.57,hz:.48,y:0})),...BALCONY_SEATS.map(s=>({x:s.x,z:s.z,hx:.48,hz:.57,y:s.y}))],lobby:[-10,-3,4,11].flatMap(z=>[-5.4,5.4].map(x=>({x,z,hx:.48,hz:.48,y:0})))};
const CELLS:Record<Zone,Map<string,Obstacle[]>>={lobby:new Map(),auditorium:new Map()};
for(const zone of ['lobby','auditorium'] as const)for(const o of OBSTACLES[zone])for(let x=Math.floor((o.x-o.hx-1)/2);x<=Math.floor((o.x+o.hx+1)/2);x++)for(let z=Math.floor((o.z-o.hz-1)/2);z<=Math.floor((o.z+o.hz+1)/2);z++){const key=`${x},${z}`,items=CELLS[zone].get(key)??[];items.push(o);CELLS[zone].set(key,items);}
export function obstacles(zone:Zone):Obstacle[]{return OBSTACLES[zone];}
export function walkable(zone:Zone,p:Point,padding=.27){const b=BOUNDS[zone],y=p.y??0,h=surfaceHeight(zone,p,y);return h!==null&&Math.abs(h-y)<.32&&p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ&&!(padding>1?OBSTACLES[zone]:CELLS[zone].get(`${Math.floor(p.x/2)},${Math.floor(p.z/2)}`)??[]).some(o=>Math.abs((o.y??0)-y)<.6&&Math.abs(p.x-o.x)<o.hx+padding&&Math.abs(p.z-o.z)<o.hz+padding);}
export function distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.z-b.z,(a.y??0)-(b.y??0));}
export function canSit(p:Point,seat:Seat){return distance(p,seat.approach)<.4&&Math.abs((p.y??0)-seat.y)<.25;}
