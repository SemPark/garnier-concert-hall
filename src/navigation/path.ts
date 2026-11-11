import {GOLDEN_HALL} from '../../shared/goldenHall';
import {PARTERRE,parterreHeight} from '../../shared/parterre';
import {BOUNDS,FLOOR_AISLES,FLOOR_CROSS_AISLE,walkable,obstacles,distance,surfaceHeight,type Point,type Zone} from '../../shared/venue';
import {lobbyRouteNodes} from '../../shared/grandStair';
import {DINNER_LANES_X,DINNER_LANES_Z,DINNER_FRONT_LANE,DINNER_REAR_LANE} from '../../shared/dinnerTables';
const STEP=.35;
const upperGallery=(zone:Zone,p:Point)=>zone==='auditorium'&&(p.y??0)>=GOLDEN_HALL.balconyHeight-.3;
export function segmentClear(zone:Zone,a:Point,b:Point){
 const n=Math.max(1,Math.ceil(distance(a,b)/.12)),ground=zone==='auditorium'&&(a.y??0)<1&&(b.y??0)<1;
 const gallery=upperGallery(zone,a)&&upperGallery(zone,b);
 // Sampled checks alone can miss a chair corner between two samples.
 // Test the continuous horizontal segment against the same padded obstacles.
 for(const o of obstacles(zone)){
  let enter=0,leave=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,o.x-o.hx-.27,o.x+o.hx+.27],[a.z,b.z-a.z,o.z-o.hz-.27,o.z+o.hz+.27]]){
   if(Math.abs(delta)<1e-10){if(start<=min||start>=max){leave=-1;break;}}
   else {const t1=(min-start)/delta,t2=(max-start)/delta;enter=Math.max(enter,Math.min(t1,t2));leave=Math.min(leave,Math.max(t1,t2));}
  }
  if(enter>=leave)continue;
  const t=(enter+leave)/2,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
  const y=ground?parterreHeight(x,z):gallery?surfaceHeight(zone,{x,z},GOLDEN_HALL.balconyHeight):(a.y??0)+((b.y??0)-(a.y??0))*t;
  if(y!==null&&Math.abs((o.y??0)-y)<.6)return false;
 }
 let previousY:number|undefined;
 for(let i=0;i<=n;i++){
  const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n;
  const y=ground?parterreHeight(x,z):gallery?surfaceHeight(zone,{x,z},GOLDEN_HALL.balconyHeight):(a.y??0)+((b.y??0)-(a.y??0))*i/n;
  if(y===null||((ground||gallery)&&previousY!==undefined&&Math.abs(y-previousY)>.28)||!walkable(zone,{x,z,y}))return false;
  previousY=y;
 }
 return true;
}
function planarPath(zone:Zone,start:Point,end:Point):Point[]|null{
 if(!walkable(zone,end))return null;if(segmentClear(zone,start,end))return [end];
 // Follow the actual gaps between the three seating blocks. The cross aisle
 // also connects different blocks without sending visitors around the hall.
 // The lane routes are only a fallback: the grid search below finds the direct way between the tables.
 let best:Point[]|null=null,cost=Infinity;
 if(zone==='auditorium'&&(start.y??0)<1&&(end.y??0)<1){
  const ground=(x:number,z:number)=>({x,z,y:parterreHeight(x,z)??PARTERRE.floor});
  const candidates:Point[][]=FLOOR_AISLES.map(x=>[ground(x,start.z),ground(x,end.z),end]);
  for(const a of FLOOR_AISLES)for(const b of FLOOR_AISLES)if(a!==b)candidates.push([ground(a,start.z),ground(a,FLOOR_CROSS_AISLE),ground(b,FLOOR_CROSS_AISLE),ground(b,end.z),end]);
  // Dinner tables leave no straight lanes front to back: go along the rear (or front) lane to a side lane, down to the
  // lane across the room beside the target table's row, then across to the seat.
  for(const z of [...DINNER_LANES_Z,DINNER_FRONT_LANE,DINNER_REAR_LANE])for(const side of DINNER_LANES_X){
   candidates.push([ground(start.x,z),ground(end.x,z),end]);
   candidates.push([ground(side,start.z),ground(side,z),ground(end.x,z),end]);
   for(const via of [DINNER_REAR_LANE,DINNER_FRONT_LANE])candidates.push([ground(start.x,via),ground(side,via),ground(side,z),ground(end.x,z),end]);
  }
  for(const route of candidates){let p=start,total=0,clear=true;for(const q of route){if(!segmentClear(zone,p,q)){clear=false;break;}total+=distance(p,q);p=q;}if(clear&&total<cost){best=route;cost=total;}}
 }

 const b=BOUNDS[zone];const toCell=(p:Point)=>({x:Math.round((p.x-b.minX)/STEP),z:Math.round((p.z-b.minZ)/STEP)});const point=(cellX:number,cellZ:number)=>{
  const x=b.minX+cellX*STEP,z=b.minZ+cellZ*STEP;
  const y=upperGallery(zone,end)?surfaceHeight(zone,{x,z},GOLDEN_HALL.balconyHeight)??100:
   zone==='auditorium'&&(end.y??0)<1?parterreHeight(x,z)??100:end.y??0;
  return {x,y,z};
 };const key=(x:number,z:number)=>`${x},${z}`;
 const a=toCell(start),goal=toCell(end);type Node={x:number;z:number;g:number;f:number;parent?:string};
 const freeCache=new Map<string,boolean>();const free=(x:number,z:number)=>{const k=key(x,z);let value=freeCache.get(k);if(value===undefined){value=walkable(zone,point(x,z));freeCache.set(k,value);}return value;};
 const first={...a,g:0,f:distance(start,end)},open=new Map<string,Node>([[key(a.x,a.z),first]]),nodes=new Map(open),closed=new Set<string>();let reached:string|undefined;
 for(let step=0;open.size&&step<16000;step++){
  let current:Node|undefined;for(const n of open.values())if(!current||n.f<current.f)current=n;if(!current)break;
  const ck=key(current.x,current.z);open.delete(ck);closed.add(ck);
  if(Math.abs(current.x-goal.x)<=1&&Math.abs(current.z-goal.z)<=1&&segmentClear(zone,point(current.x,current.z),end)){reached=ck;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const x=current.x+dx,z=current.z+dz,k=key(x,z),p=point(x,z);if(closed.has(k)||!free(x,z)||!segmentClear(zone,point(current.x,current.z),p))continue;
   const g=current.g+Math.hypot(dx,dz)*STEP;if((nodes.get(k)?.g??Infinity)<=g)continue;
   const n={x,z,g,f:g+distance(p,end),parent:ck};nodes.set(k,n);open.set(k,n);
  }
 }
 if(!reached)return best;const raw:Point[]=[end];let k:string|undefined=reached;
 while(k){const n:Node=nodes.get(k)!;raw.unshift(point(n.x,n.z));k=n.parent;}raw.unshift(start);
 const result:Point[]=[];let i=0;while(i<raw.length-1){let next=i+1;for(let j=i+2;j<raw.length;j++){if(segmentClear(zone,raw[i],raw[j]))next=j;else break;}result.push(raw[next]);i=next;}
 let length=0,from=start;for(const q of result){length+=distance(from,q);from=q;}
 return best&&cost<=length?best:result;
}

/** Walking stays on one storey; the galleries are reached from the floor menu, not on foot. */
export function findPath(zone:Zone,start:Point,end:Point):Point[]|null{
 if(!walkable(zone,start)||!walkable(zone,end))return null;
 if(segmentClear(zone,start,end))return [end];
 if(zone==='lobby')return lobbyPath(start,end);
 if((upperGallery(zone,start)&&upperGallery(zone,end))||Math.abs((start.y??0)-(end.y??0))<.1||zone==='auditorium'&&(start.y??0)<1&&(end.y??0)<1){const planar=planarPath(zone,start,end);if(planar)return planar;}
 return null;
}

/** The lobby is a multi-level graph: the only rising edges are the actual visible flights. */
function lobbyPath(start:Point,end:Point):Point[]|null{
 const nodes=[start,end,...lobbyRouteNodes()],best=nodes.map(()=>Infinity),done=new Set<number>(),prev=new Map<number,{from:number;path:Point[]}>();best[0]=0;
 while(done.size<nodes.length){let at=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(at<0||best[i]<best[at]))at=i;if(at<0||!Number.isFinite(best[at]))return null;if(at===1){const parts:Point[][]=[];while(at!==0){const p=prev.get(at)!;parts.unshift(p.path);at=p.from;}return parts.flat();}done.add(at);
  for(let i=1;i<nodes.length;i++){if(done.has(i))continue;const a=nodes[at],b=nodes[i];let path:Point[]|null=segmentClear('lobby',a,b)?[b]:null;
   if(!path&&Math.abs(a.y??0)<.05&&Math.abs(b.y??0)<.05)path=planarPath('lobby',a,b);
   if(!path)continue;let cost=best[at],p=a;for(const q of path){cost+=distance(p,q);p=q;}if(cost<best[i]){best[i]=cost;prev.set(i,{from:at,path});}
  }
 }
 return null;
}
