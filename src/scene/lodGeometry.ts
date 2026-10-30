import * as T from 'three';
const cache=new Map<string,T.BufferGeometry>();
/** Reuse coarse geometry. Silhouettes remain; small surface details disappear with distance. */
export function coarseGeometry(source:T.BufferGeometry){
 let low=cache.get(source.uuid);if(low)return low;
 if(source instanceof T.SphereGeometry)low=new T.SphereGeometry(source.parameters.radius,6,4);
 else if(source instanceof T.CylinderGeometry){const p=source.parameters;low=new T.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,6,1,p.openEnded);}
 else if(source instanceof T.TorusGeometry){const p=source.parameters;low=new T.TorusGeometry(p.radius,p.tube,4,12,p.arc);}
 else if(source instanceof T.TubeGeometry){const p=source.parameters;low=new T.TubeGeometry(p.path,8,p.radius,4,p.closed);}
 else if(source instanceof T.ExtrudeGeometry){source.computeBoundingBox();const bounds=source.boundingBox!,size=bounds.getSize(new T.Vector3());if(size.length()<3){low=new T.ExtrudeGeometry(source.parameters.shapes,{...source.parameters.options,bevelEnabled:false,curveSegments:3,steps:1});}}
 low??=source;cache.set(source.uuid,low);return low;
}
export function detailDistance(mesh:T.Mesh){
 if(typeof mesh.userData.lodMax==='number')return mesh.userData.lodMax;
 mesh.geometry.computeBoundingBox();const size=mesh.geometry.boundingBox!.getSize(new T.Vector3()).multiply(mesh.getWorldScale(new T.Vector3()));const dims=[Math.abs(size.x),Math.abs(size.y),Math.abs(size.z)].sort((a,b)=>a-b);
 // Thread, beads, keys, moulding grooves and eye dots are subpixel from far away.
 return dims[1]<.075?12:dims[2]<.17?19:Infinity;
}
export const LOD_NEAR=16;
