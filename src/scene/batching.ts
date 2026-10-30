import * as T from 'three';

type BatchGroup={material:T.Material;objects:T.Mesh[];colors:boolean};
function collect(groups:Map<string,BatchGroup>,mesh:T.Mesh){
 if(Array.isArray(mesh.material))return;
 const mat=mesh.material,standard=mat instanceof T.MeshStandardMaterial&&!mat.map;
 const key=mesh.geometry.uuid+'/'+(standard?JSON.stringify([mat.type,mat.roughness,mat.metalness,mat.emissive.getHex(),mat.emissiveIntensity,mat.transparent,mat.opacity,mat.depthWrite,mat.side]):mat.uuid);
 let group=groups.get(key);if(!group){const material=standard?mat.clone():mat;if(standard)(material as T.MeshStandardMaterial).color.setHex(0xffffff);group={material,objects:[],colors:standard};groups.set(key,group);}group.objects.push(mesh);
}
function createBatch(scene:T.Scene,group:BatchGroup,dynamic=false){
 const {objects,material,colors}=group,batch=new T.InstancedMesh(objects[0].geometry,material,objects.length);
 if(dynamic)batch.instanceMatrix.setUsage(T.DynamicDrawUsage);
 objects.forEach((mesh,i)=>{batch.setMatrixAt(i,mesh.matrixWorld);if(colors)batch.setColorAt(i,(mesh.material as T.MeshStandardMaterial).color);});
 batch.receiveShadow=false;batch.matrixAutoUpdate=false;batch.computeBoundingSphere();scene.add(batch);return batch;
}
/** Merge opaque geometry across colors as well as repeated models. Picking uses separate proxies. */
export function batchArchitecture(scene:T.Scene,exclude:T.Object3D[]){
 const protectedObjects=new Set<T.Object3D>();for(const root of exclude)root.traverse(o=>protectedObjects.add(o));
 scene.updateMatrixWorld(true);const groups=new Map<string,BatchGroup>();
 scene.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||protectedObjects.has(o))return;collect(groups,o);});
 for(const group of groups.values()){createBatch(scene,group);for(const mesh of group.objects)mesh.removeFromParent();}
 // Static ornaments need no per-frame local-matrix recomputation.
 scene.traverse(o=>{if(!protectedObjects.has(o)){o.updateMatrix();o.matrixAutoUpdate=false;}});
}
/** Hidden source rigs are detached so rendering does not update them a second time. */
export function batchCharacters(scene:T.Scene,roots:T.Object3D[]){
 scene.updateMatrixWorld(true);const groups=new Map<string,BatchGroup>();
 for(const root of roots){root.updateMatrixWorld(true);root.traverse(o=>{if(o instanceof T.Mesh)collect(groups,o);});root.removeFromParent();}
 const batches=[...groups.values()].map(group=>({batch:createBatch(scene,group,true),objects:group.objects}));
 for(const {batch} of batches)batch.frustumCulled=false;
 return ()=>{for(const root of roots)root.updateMatrixWorld(true);for(const {batch,objects}of batches){for(let i=0;i<objects.length;i++)batch.setMatrixAt(i,objects[i].matrixWorld);batch.instanceMatrix.needsUpdate=true;}};
}
