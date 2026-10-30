import * as T from 'three';
const cache=new Map<string,T.BufferGeometry>();
/** Reuse coarse geometry. Silhouettes remain; small surface details disappear with distance. */
export function coarseGeometry(source:T.BufferGeometry){
 let low=cache.get(source.uuid);if(low)return low;
 if(source instanceof T.SphereGeometry)low=new T.SphereGeometry(source.parameters.radius,4,3);
 else if(source instanceof T.CylinderGeometry){const p=source.parameters;low=new T.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,4,1,p.openEnded);}
 else if(source instanceof T.TorusGeometry){const p=source.parameters;low=new T.TorusGeometry(p.radius,p.tube,3,8,p.arc);}
 else if(source instanceof T.TubeGeometry){const p=source.parameters;low=new T.TubeGeometry(p.path,6,p.radius,3,p.closed);}
 else if(source instanceof T.ExtrudeGeometry){source.computeBoundingBox();const bounds=source.boundingBox!,size=bounds.getSize(new T.Vector3());if(size.length()<3){low=new T.BoxGeometry(size.x,size.y,size.z);low.translate(...bounds.getCenter(new T.Vector3()).toArray());}}
 low??=source;cache.set(source.uuid,low);return low;
}
export function detailDistance(mesh:T.Mesh){
 mesh.geometry.computeBoundingBox();const size=mesh.geometry.boundingBox!.getSize(new T.Vector3()).multiply(mesh.getWorldScale(new T.Vector3()));const dims=[Math.abs(size.x),Math.abs(size.y),Math.abs(size.z)].sort((a,b)=>a-b);
 // Thread, beads, keys, moulding grooves and eye dots are subpixel from far away.
 return dims[1]<.075?12:dims[2]<.17?19:Infinity;
}
export const LOD_NEAR=16;
