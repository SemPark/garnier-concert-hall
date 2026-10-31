import {BOUNDS,FLOOR_AISLES,FLOOR_CROSS_AISLE,walkable,distance,stairPoint,type Point,type Zone} from '../../shared/venue';
const STEP=.35;
export function segmentClear(zone:Zone,a:Point,b:Point){const n=Math.max(1,Math.ceil(distance(a,b)/.12));for(let i=0;i<=n;i++)if(!walkable(zone,{x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n,y:(a.y??0)+((b.y??0)-(a.y??0))*i/n}))return false;return true;}
function planarPath(zone:Zone,start:Point,end:Point):Point[]|null{
 if(!walkable(zone,end))return null;if(segmentClear(zone,start,end))return [end];
 // Follow the actual gaps between the three seating blocks. The cross aisle
 // also connects different blocks without sending visitors around the hall.
 if(zone==='auditorium'&&Math.abs(start.y??0)<.1&&Math.abs(end.y??0)<.1){
  const candidates:Point[][]=FLOOR_AISLES.map(x=>[{x,y:0,z:start.z},{x,y:0,z:end.z},end]);
  for(const a of FLOOR_AISLES)for(const b of FLOOR_AISLES)if(a!==b)candidates.push([{x:a,y:0,z:start.z},{x:a,y:0,z:FLOOR_CROSS_AISLE},{x:b,y:0,z:FLOOR_CROSS_AISLE},{x:b,y:0,z:end.z},end]);
  let best:Point[]|null=null,cost=Infinity;
  for(const route of candidates){let p=start,total=0,clear=true;for(const q of route){if(!segmentClear(zone,p,q)){clear=false;break;}total+=distance(p,q);p=q;}if(clear&&total<cost){best=route;cost=total;}}
  if(best)return best;
 }

 const b=BOUNDS[zone];const toCell=(p:Point)=>({x:Math.round((p.x-b.minX)/STEP),z:Math.round((p.z-b.minZ)/STEP)});const point=(x:number,z:number)=>({x:b.minX+x*STEP,z:b.minZ+z*STEP,y:end.y??0});const key=(x:number,z:number)=>`${x},${z}`;
 const a=toCell(start),goal=toCell(end);type Node={x:number;z:number;g:number;f:number;parent?:string};
 const freeCache=new Map<string,boolean>();const free=(x:number,z:number)=>{const k=key(x,z);let value=freeCache.get(k);if(value===undefined){value=walkable(zone,point(x,z));freeCache.set(k,value);}return value;};
 const first={...a,g:0,f:distance(start,end)},open=new Map<string,Node>([[key(a.x,a.z),first]]),nodes=new Map(open),closed=new Set<string>();let reached:string|undefined;
 for(let step=0;open.size&&step<16000;step++){
  let current:Node|undefined;for(const n of open.values())if(!current||n.f<current.f)current=n;if(!current)break;
  const ck=key(current.x,current.z);open.delete(ck);closed.add(ck);
  if(current.x===goal.x&&current.z===goal.z){reached=ck;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const x=current.x+dx,z=current.z+dz,k=key(x,z),p=point(x,z);if(closed.has(k)||!free(x,z)||!segmentClear(zone,point(current.x,current.z),p))continue;
   const g=current.g+Math.hypot(dx,dz)*STEP;if((nodes.get(k)?.g??Infinity)<=g)continue;
   const n={x,z,g,f:g+distance(p,end),parent:ck};nodes.set(k,n);open.set(k,n);
  }
 }
 if(!reached)return null;const raw:Point[]=[end];let k:string|undefined=reached;
 while(k){const n:Node=nodes.get(k)!;raw.unshift(point(n.x,n.z));k=n.parent;}raw.unshift(start);
 const result:Point[]=[];let i=0;while(i<raw.length-1){let next=i+1;for(let j=i+2;j<raw.length;j++){if(segmentClear(zone,raw[i],raw[j]))next=j;else break;}result.push(raw[next]);i=next;}return result;
}

/** Connect the two walkable storeys only through the physical rear stair flights. */
export function findPath(zone:Zone,start:Point,end:Point):Point[]|null{
 if(!walkable(zone,start)||!walkable(zone,end))return null;
 if(segmentClear(zone,start,end))return [end];
 if(zone==='lobby')return planarPath(zone,start,end);
 if(Math.abs((start.y??0)-(end.y??0))<.1){const planar=planarPath(zone,start,end);if(planar)return planar;}
 const nodes=[start,end,stairPoint(-1,false),stairPoint(-1,true),stairPoint(1,false),stairPoint(1,true)],best=nodes.map(()=>Infinity),previous=new Map<number,{from:number;path:Point[]}>(),done=new Set<number>();best[0]=0;
 while(done.size<nodes.length){let current=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(current<0||best[i]<best[current]))current=i;if(current<0||!Number.isFinite(best[current]))break;if(current===1){const parts:Point[][]=[];let at=1;while(at!==0){const edge=previous.get(at)!;parts.unshift(edge.path);at=edge.from;}return parts.flat();}done.add(current);
  for(let i=1;i<nodes.length;i++){if(done.has(i)||i===current)continue;const a=nodes[current],b=nodes[i];let path:Point[]|null=null;
   if(segmentClear(zone,a,b))path=[b];else if(Math.abs((a.y??0)-(b.y??0))<.1)path=planarPath(zone,a,b);
   if(!path)continue;let cost=0,p=a;for(const point of path){cost+=distance(p,point);p=point;}if(best[current]+cost<best[i]){best[i]=best[current]+cost;previous.set(i,{from:current,path});}
  }
 }
 return null;
}
