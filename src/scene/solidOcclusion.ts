import * as T from 'three';
/** Cull only when the whole bound lies behind one opaque, axis-aligned solid wall. */
export function solidOcclusion(boxes:T.Box3[]){
 const ray=new T.Ray(),target=new T.Vector3(),hit=new T.Vector3();
 const blocked=(eye:T.Vector3,p:T.Vector3,box:T.Box3)=>{ray.origin.copy(eye);ray.direction.copy(p).sub(eye);const length=ray.direction.length();ray.direction.normalize();return !!ray.intersectBox(box,hit)&&eye.distanceTo(hit)<length-.05;};
 return (eye:T.Vector3,center:T.Vector3,extent:number|T.Vector3)=>{
  const x=typeof extent==='number'?extent:extent.x;
  const y=typeof extent==='number'?extent:extent.y;
  const z=typeof extent==='number'?extent:extent.z;
  for(const box of boxes){if(box.containsPoint(eye)||!blocked(eye,center,box))continue;let hidden=true;
   for(let i=0;i<8;i++){target.set(center.x+(i&1?x:-x),center.y+(i&2?y:-y),center.z+(i&4?z:-z));if(!blocked(eye,target,box)){hidden=false;break;}}
   if(hidden)return true;
  }return false;
 };
}
