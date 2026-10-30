import {BOUNDS,walkable,distance,type Point,type Zone} from '../../shared/venue';
const STEP=.35;
export function segmentClear(zone:Zone,a:Point,b:Point){const n=Math.max(1,Math.ceil(distance(a,b)/.12));for(let i=0;i<=n;i++)if(!walkable(zone,{x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;return true;}
export function findPath(zone:Zone,start:Point,end:Point):Point[]|null{
 if(!walkable(zone,end))return null;if(segmentClear(zone,start,end))return [end];
 const b=BOUNDS[zone];const toCell=(p:Point)=>({x:Math.round((p.x-b.minX)/STEP),z:Math.round((p.z-b.minZ)/STEP)});const point=(x:number,z:number)=>({x:b.minX+x*STEP,z:b.minZ+z*STEP});const key=(x:number,z:number)=>`${x},${z}`;
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
