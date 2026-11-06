import * as T from 'three';
/** Remove only triangles strictly inside permanent opaque rectangular solids.
 * Never use decorative/camera-cutaway bounds as blockers, or infer a box around an arch. */
export function removeBuriedFaces(scene:T.Scene,protectedObjects:Set<T.Object3D>){
 const meshes:T.Mesh[]=[],solids:{mesh:T.Mesh;box:T.Box3}[]=[],size=new T.Vector3();
 const permanent=(o:T.Object3D)=>{for(let p:T.Object3D|null=o;p;p=p.parent)if(p.userData.cameraOccluder||p.userData.occluderGroup||p.userData.occluderBox||p.userData.animated)return false;return true;};
 scene.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||protectedObjects.has(o)||Array.isArray(o.material)||o.material.transparent||!o.material.visible||o.material.alphaTest>0||o.morphTargetInfluences||o.onBeforeRender!==T.Object3D.prototype.onBeforeRender)return;
  if(!(o.geometry instanceof T.BoxGeometry))return;meshes.push(o);
  const e=o.matrixWorld.elements,aligned=[0,4,8].every(i=>[e[i],e[i+1],e[i+2]].filter(v=>Math.abs(v)>1e-6).length===1);
  if(!aligned||!permanent(o))return;const box=new T.Box3().setFromObject(o),dims=box.getSize(size).toArray().sort((a,b)=>a-b);
  if(dims[1]>2&&dims[0]<.6)solids.push({mesh:o,box:box.expandByScalar(-.002)});
 });
 let removed=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(const mesh of meshes){
  const bounds=new T.Box3().setFromObject(mesh),blockers=solids.filter(s=>s.mesh!==mesh&&s.box.intersectsBox(bounds));if(!blockers.length)continue;
  const geometry=mesh.geometry,index=geometry.index;if(!index)continue;const pos=geometry.getAttribute('position'),kept:number[]=[];
  for(let i=0;i<index.count;i+=3){const ia=index.getX(i),ib=index.getX(i+1),ic=index.getX(i+2);a.fromBufferAttribute(pos,ia).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(pos,ib).applyMatrix4(mesh.matrixWorld);c.fromBufferAttribute(pos,ic).applyMatrix4(mesh.matrixWorld);
   if(blockers.some(s=>s.box.containsPoint(a)&&s.box.containsPoint(b)&&s.box.containsPoint(c)))removed++;else kept.push(ia,ib,ic);
  }
  if(kept.length===index.count)continue;
  if(!kept.length){mesh.removeFromParent();continue;}
  mesh.geometry=geometry.clone();mesh.geometry.setIndex(kept);mesh.geometry.clearGroups();mesh.userData.lowDetail=mesh.geometry;
 }
 return removed;
}
