import * as T from 'three';
import {coarseGeometry,detailDistance,LOD_NEAR} from './lodGeometry';
type Item={mesh:T.Mesh;matrix:T.Matrix4;center:T.Vector3;limit:number;color:T.Color|null;level:number};
type BatchGroup={material:T.Material;objects:T.Mesh[];colors:boolean};
function collect(groups:Map<string,BatchGroup>,mesh:T.Mesh){
 if(Array.isArray(mesh.material))return;
 const mat=mesh.material,standard=mat instanceof T.MeshStandardMaterial&&!mat.map;
 const key=mesh.geometry.uuid+'/'+(standard?JSON.stringify([mat.type,mat.roughness,mat.metalness,mat.emissive.getHex(),mat.emissiveIntensity,mat.transparent,mat.opacity,mat.depthWrite,mat.side]):mat.uuid);
 let group=groups.get(key);if(!group){const material=standard?mat.clone():mat;if(standard)(material as T.MeshStandardMaterial).color.setHex(0xffffff);group={material,objects:[],colors:standard};groups.set(key,group);}group.objects.push(mesh);
}
function createLOD(scene:T.Scene,group:BatchGroup,dynamic:boolean){
 const geometry=group.objects[0].geometry,lowGeometry=coarseGeometry(geometry);
 const make=(g:T.BufferGeometry)=>{const batch=new T.InstancedMesh(g,group.material,group.objects.length);batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.matrixAutoUpdate=false;batch.frustumCulled=false;scene.add(batch);return batch;};
 const high=make(geometry),low=lowGeometry===geometry?high:make(lowGeometry);
 const items:Item[]=group.objects.map(mesh=>({mesh,matrix:mesh.matrixWorld.clone(),center:new T.Vector3().setFromMatrixPosition(mesh.matrixWorld),limit:detailDistance(mesh),color:group.colors?(mesh.material as T.MeshStandardMaterial).color.clone():null,level:0}));
 const write=(camera?:T.Camera)=>{
  let highCount=0,lowCount=0;const eye=camera?.position;
  for(const item of items){if(dynamic){item.matrix.copy(item.mesh.matrixWorld);item.center.setFromMatrixPosition(item.matrix);}
   const distance=eye?item.center.distanceTo(eye):0;
   // A small hysteresis avoids popping when hovering around the near/far boundary.
   const nearLimit=item.level===0?LOD_NEAR+1.5:LOD_NEAR-1.5;item.level=distance<nearLimit?0:1;
   if(distance>item.limit)continue;const batch=item.level===0?high:low,index=batch===high?highCount++:lowCount++;
   batch.setMatrixAt(index,item.matrix);if(item.color)batch.setColorAt(index,item.color);
  }
  high.count=highCount;high.visible=highCount>0;high.instanceMatrix.needsUpdate=true;if(high.instanceColor)high.instanceColor.needsUpdate=true;
  if(low!==high){low.count=lowCount;low.visible=lowCount>0;low.instanceMatrix.needsUpdate=true;if(low.instanceColor)low.instanceColor.needsUpdate=true;}
 };
 write();return write;
}
/** Distance-aware static batches retain the large surfaces and simplify far ornaments. */
export function batchArchitecture(scene:T.Scene,exclude:T.Object3D[]){
 const protectedObjects=new Set<T.Object3D>();for(const root of exclude)root.traverse(o=>protectedObjects.add(o));
 scene.updateMatrixWorld(true);const groups=new Map<string,BatchGroup>();
 scene.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||protectedObjects.has(o))return;collect(groups,o);});
 const updates=[...groups.values()].map(group=>{const update=createLOD(scene,group,false);for(const mesh of group.objects)mesh.removeFromParent();return update;});
 scene.traverse(o=>{if(!protectedObjects.has(o)){o.updateMatrix();o.matrixAutoUpdate=false;}});
 return (camera:T.Camera)=>{for(const update of updates)update(camera);};
}
/** The detached source rig poses independently; far instruments use coarse geometry. */
export function batchCharacters(scene:T.Scene,roots:T.Object3D[]){
 scene.updateMatrixWorld(true);const groups=new Map<string,BatchGroup>();
 for(const root of roots){root.updateMatrixWorld(true);root.traverse(o=>{if(o instanceof T.Mesh)collect(groups,o);});root.removeFromParent();}
 const updates=[...groups.values()].map(group=>createLOD(scene,group,true));
 return (camera?:T.Camera)=>{for(const root of roots)root.updateMatrixWorld(true);for(const update of updates)update(camera);};
}
