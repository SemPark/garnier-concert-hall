export type Zone='lobby'|'auditorium';
export type Point={x:number;z:number};
export type Pose='idle'|'walk'|'sit';
export type Visitor={id:string;name:string;color:number;zone:Zone;x:number;z:number;yaw:number;pose:Pose;seatId:string|null;gesture:'wave'|'clap'|null;gestureAt:number};
export type Seat={id:string;x:number;z:number;approach:Point};
export type Obstacle={x:number;z:number;hx:number;hz:number};
export const SEATS:Seat[]=Array.from({length:8},(_,i)=>({id:`parterre-${i+1}`,x:i%4<2?-4.2+(i%4)*1.9:2.3+((i%4)-2)*1.9,z:-1+Math.floor(i/4)*3.2,approach:{x:i%4<2?-4.2+(i%4)*1.9:2.3+((i%4)-2)*1.9,z:.05+Math.floor(i/4)*3.2}}));
export const BOUNDS={lobby:{minX:-6.5,maxX:6.5,minZ:-16,maxZ:16},auditorium:{minX:-13.8,maxX:13.8,minZ:-8,maxZ:49}};
export const SPAWN={lobby:{x:0,z:10},auditorium:{x:0,z:47}};
export const CAPACITY=40;
export const DECORATIVE_SEATS=Array.from({length:20},(_,i)=>5.5+i*2.1).flatMap(z=>[-12.3,-10.8,-9.3,-7.8,-6.3,-4.8,-3.3,-1.8,1.8,3.3,4.8,6.3,7.8,9.3,10.8,12.3].map(x=>({x,z})));
export const PALETTE=[0xc09a61,0x8c9c92,0x9c7181,0x71899c,0xc0ab87,0x9180a3];
export function obstacles(zone:Zone):Obstacle[]{return zone==='auditorium'?[...SEATS,...DECORATIVE_SEATS].map(s=>({x:s.x,z:s.z,hx:.57,hz:.48})):[-10,-3,4,11].flatMap(z=>[-5.4,5.4].map(x=>({x,z,hx:.48,hz:.48})));}
export function walkable(zone:Zone,p:Point,padding=.27){const b=BOUNDS[zone];return Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ&&!obstacles(zone).some(o=>Math.abs(p.x-o.x)<o.hx+padding&&Math.abs(p.z-o.z)<o.hz+padding);}
export function distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.z-b.z);}
