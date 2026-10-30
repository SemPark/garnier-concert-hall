import {GOLDEN_HALL} from './goldenHall';
export type Zone='lobby'|'auditorium';
export type Point={x:number;z:number};
export type Pose='idle'|'walk'|'sit';
export type Visitor={id:string;name:string;color:number;zone:Zone;x:number;z:number;yaw:number;pose:Pose;seatId:string|null;gesture:'wave'|'clap'|null;gestureAt:number};
export type Seat={id:string;x:number;z:number;approach:Point;row:number;column:number;level:'parterre'|'balcony';y:number;yaw:number};
export type Obstacle={x:number;z:number;hx:number;hz:number};
export const SEAT_COLUMNS=[-12.3,-10.8,-9.3,-7.8,-6.3,-4.8,-3.3,-1.8,1.8,3.3,4.8,6.3,7.8,9.3,10.8,12.3];
export const FLOOR_SEATS:Seat[]=Array.from({length:22},(_,row)=>SEAT_COLUMNS.map((x,column)=>({id:`parterre-${row*16+column+1}`,x,z:-1+row*2.1,approach:{x,z:.05+row*2.1},row:row+1,column:column+1,level:'parterre' as const,y:0,yaw:0}))).flat();
export const BALCONY_SEATS:Seat[]=[-1,1].flatMap(side=>GOLDEN_HALL.bayCenters.flatMap((z,row)=>[-1.8,-.6,.6,1.8].map((offset,column)=>({id:`balcony-${side<0?'left':'right'}-${row*4+column+1}`,x:side*15.3,z:z-side*offset,approach:{x:side*13.5,z:Math.max(-7,Math.min(47,z-side*offset))},row:row+1,column:column+1+(side>0?4:0),level:'balcony' as const,y:GOLDEN_HALL.balconyHeight,yaw:side<0?-Math.PI/2:Math.PI/2}))));
export const SEATS:Seat[]=[...FLOOR_SEATS,...BALCONY_SEATS];
export function seatLabel(s:Seat){return `${s.level==='parterre'?'1층':'발코니'} ${s.row}열 ${s.column}번`;}
export const BOUNDS={lobby:{minX:-6.5,maxX:6.5,minZ:-16,maxZ:16},auditorium:{minX:-13.8,maxX:13.8,minZ:-8,maxZ:49}};
export const SPAWN={lobby:{x:0,z:10},auditorium:{x:0,z:47}};
export const CAPACITY=40;
export const PALETTE=[0xc09a61,0x8c9c92,0x9c7181,0x71899c,0xc0ab87,0x9180a3];
const OBSTACLES:Record<Zone,Obstacle[]>={auditorium:FLOOR_SEATS.map(s=>({x:s.x,z:s.z,hx:.57,hz:.48})),lobby:[-10,-3,4,11].flatMap(z=>[-5.4,5.4].map(x=>({x,z,hx:.48,hz:.48})))};
const CELLS:Record<Zone,Map<string,Obstacle[]>>={lobby:new Map(),auditorium:new Map()};
for(const zone of ['lobby','auditorium'] as const)for(const o of OBSTACLES[zone])for(let x=Math.floor((o.x-o.hx-1)/2);x<=Math.floor((o.x+o.hx+1)/2);x++)for(let z=Math.floor((o.z-o.hz-1)/2);z<=Math.floor((o.z+o.hz+1)/2);z++){const key=`${x},${z}`,items=CELLS[zone].get(key)??[];items.push(o);CELLS[zone].set(key,items);}
export function obstacles(zone:Zone):Obstacle[]{return OBSTACLES[zone];}
export function walkable(zone:Zone,p:Point,padding=.27){const b=BOUNDS[zone];return Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ&&!(padding>1?OBSTACLES[zone]:CELLS[zone].get(`${Math.floor(p.x/2)},${Math.floor(p.z/2)}`)??[]).some(o=>Math.abs(p.x-o.x)<o.hx+padding&&Math.abs(p.z-o.z)<o.hz+padding);}
export function distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.z-b.z);}
