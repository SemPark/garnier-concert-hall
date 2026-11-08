import * as T from 'three';
import {GALLERY_FLOORS} from '../../shared/gallery';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {ORGAN_LOFT_BACK,ORGAN_LOFT_CONTOUR} from '../../shared/organLoft';
import {box,material} from './primitives';
import {applyWoodSurface} from './HallTextures';
import {buildTimberFloor,type TimberRegion} from './HallTimberFloor';
/** Trim the two side slabs against the organ loft instead of drawing two floors at y=8.3. */
export function buildGalleryFloors(scene:T.Scene){
 const slabs:T.Mesh[]=[],parquet:TimberRegion[]=[];
 for(const r of GALLERY_FLOORS){
  let front=r.minZ;
  let mesh:T.Mesh;
  if(r.minZ===-26.5){
   const edge=[{x:r.minX,z:r.minZ},...ORGAN_LOFT_CONTOUR.filter(p=>p.x>=r.minX&&p.x<=r.maxX).map(p=>({x:p.x,z:Math.max(r.minZ,ORGAN_LOFT_BACK+p.z)})),{x:r.maxX,z:r.minZ}].sort((a,b)=>a.x-b.x);
   // At the inner corner the contour, not the old rectangular slab, is the edge.
   for(const p of edge)if(Math.abs(p.x)===12.5){const q=ORGAN_LOFT_CONTOUR.find(q=>q.x===p.x)!;p.z=ORGAN_LOFT_BACK+q.z;}
   front=Math.max(...edge.map(p=>p.z));
   const shape=new T.Shape();shape.moveTo(edge[0].x,edge[0].z);for(const p of edge.slice(1))shape.lineTo(p.x,p.z);shape.lineTo(r.maxX,r.maxZ);shape.lineTo(r.minX,r.maxZ);shape.closePath();
   mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:false,curveSegments:1}),material(0xe8d6ac));mesh.rotation.x=Math.PI/2;mesh.position.y=H.balconyHeight;scene.add(mesh);
  }else mesh=box(scene,[r.maxX-r.minX,.3,r.maxZ-r.minZ],[(r.minX+r.maxX)/2,H.balconyHeight-.15,(r.minZ+r.maxZ)/2],0xe8d6ac);
  mesh.userData.landmark='gallery-floor';mesh.userData.walkSurface=true;mesh.userData.rearGallery=r.minX<0&&r.maxX>0;applyWoodSurface(mesh,'oak',true);slabs.push(mesh);
  parquet.push({left:r.minX,right:r.maxX,front,rear:r.maxZ,y:H.balconyHeight+.003});
 }
 // The same herringbone parquet as the parterre, laid on top of each gallery slab.
 buildTimberFloor(scene,parquet,'herringbone-gallery-floor');
 return slabs;
}
