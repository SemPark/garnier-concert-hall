import * as T from 'three';
import {coarseGeometry,detailDistance,LOD_NEAR} from './lodGeometry';
type Lit=T.MeshStandardMaterial|T.MeshLambertMaterial;
type Item={mesh:T.Mesh;matrix:T.Matrix4;center:T.Vector3;limit:number;min:number;color:T.Color|null;level:number;shown:boolean};
type BatchGroup={material:T.Material;objects:T.Mesh[];colors:boolean};
function isLit(mat:T.Material):mat is Lit{return mat instanceof T.MeshStandardMaterial||mat instanceof T.MeshLambertMaterial;}
function collect(groups:Map<string,BatchGroup>,mesh:T.Mesh){
 if(Array.isArray(mesh.material))return;
 const mat=mesh.material,lit=isLit(mat)&&!mat.map;
 const key=mesh.geometry.uuid+'/'+(lit?JSON.stringify([mat.type,mat instanceof T.MeshStandardMaterial?mat.roughness:0,mat instanceof T.MeshStandardMaterial?mat.metalness:0,mat.emissive.getHex(),mat.emissiveIntensity,mat.transparent,mat.opacity,mat.depthWrite,mat.side]):mat.uuid);
 let group=groups.get(key);if(!group){const material=lit?mat.clone():mat;if(lit)(material as Lit).color.setHex(0xffffff);group={material,objects:[],colors:lit};groups.set(key,group);}group.objects.push(mesh);
}
function createLOD(scene:T.Scene,group:BatchGroup,dynamic:boolean){
 const geometry=group.objects[0].geometry,lowGeometry=coarseGeometry(geometry);
 const make=(g:T.BufferGeometry)=>{const batch=new T.InstancedMesh(g,group.material,group.objects.length);batch.instanceMatrix.setUsage(dynamic?T.DynamicDrawUsage:T.StaticDrawUsage);batch.matrixAutoUpdate=false;batch.frustumCulled=false;scene.add(batch);return batch;};
 const high=make(geometry),low=lowGeometry===geometry?high:make(lowGeometry);
 const items:Item[]=group.objects.map(mesh=>({mesh,matrix:mesh.matrixWorld.clone(),center:new T.Vector3().setFromMatrixPosition(mesh.matrixWorld),limit:detailDistance(mesh),min:mesh.userData.lodMin??0,color:group.colors?(mesh.material as Lit).color.clone():null,level:0,shown:false}));
 let initialized=false;
 const write=(camera?:T.Camera)=>{
  let changed=!initialized;const eye=camera?.position;
  for(const item of items){if(dynamic){item.matrix.copy(item.mesh.matrixWorld);item.center.setFromMatrixPosition(item.matrix);}
   const distance=eye?item.center.distanceTo(eye):0,nearLimit=item.level===0?LOD_NEAR+1.5:LOD_NEAR-1.5,level=distance<nearLimit?0:1,shown=distance<=item.limit&&distance>=item.min;
   if(level!==item.level||shown!==item.shown)changed=true;item.level=level;item.shown=shown;
  }
  if(!dynamic&&!changed)return;
  let highCount=0,lowCount=0;
  for(const item of items){if(!item.shown)continue;const batch=item.level===0?high:low,index=batch===high?highCount++:lowCount++;batch.setMatrixAt(index,item.matrix);if(item.color&&changed)batch.setColorAt(index,item.color);}
  high.count=highCount;high.visible=highCount>0;high.instanceMatrix.needsUpdate=true;if(changed&&high.instanceColor)high.instanceColor.needsUpdate=true;
  if(low!==high){low.count=lowCount;low.visible=lowCount>0;low.instanceMatrix.needsUpdate=true;if(changed&&low.instanceColor)low.instanceColor.needsUpdate=true;}
  initialized=true;
 };
 write();return write;
}
export function batchArchitecture(scene:T.Scene,exclude:T.Object3D[]){
 const protectedObjects=new Set<T.Object3D>();for(const root of exclude)root.traverse(o=>protectedObjects.add(o));
 scene.updateMatrixWorld(true);const groups=new Map<string,BatchGroup>();
 scene.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||protectedObjects.has(o))return;collect(groups,o);});
 const updates=[...groups.values()].map(group=>{const update=createLOD(scene,group,false);for(const mesh of group.objects)mesh.removeFromParent();return update;});
 scene.traverse(o=>{if(!protectedObjects.has(o)){o.updateMatrix();o.matrixAutoUpdate=false;}});
 return (camera:T.Camera)=>{for(const update of updates)update(camera);};
}
/** Instruments, torsos and legs are static; only live head/arm subtrees upload each tick. */
export function batchCharacters(scene:T.Scene,roots:T.Object3D[]){
 scene.updateMatrixWorld(true);const moving=new Map<string,BatchGroup>(),fixed=new Map<string,BatchGroup>();
 for(const root of roots){root.updateMatrixWorld(true);let marked=false;root.traverse(o=>{if(o.userData.animated)marked=true;});
  const visit=(node:T.Object3D,animated:boolean)=>{animated=animated||!!node.userData.animated;if(node instanceof T.Mesh)collect(animated?moving:fixed,node);for(const child of node.children)visit(child,animated);};visit(root,!marked);
  if(marked){const freeze=(node:T.Object3D,animated:boolean)=>{animated=animated||!!node.userData.animated;node.updateMatrix();node.matrixAutoUpdate=animated;for(const child of node.children)freeze(child,animated);};freeze(root,false);}
  root.removeFromParent();
 }
 const fixedUpdates=[...fixed.values()].map(group=>{const update=createLOD(scene,group,false);for(const mesh of group.objects)mesh.removeFromParent();return update;});
 const prune=(root:T.Object3D)=>{for(const child of [...root.children]){prune(child);if(child instanceof T.Group&&!child.children.length&&!child.userData.animated)child.removeFromParent();}};for(const root of roots)prune(root);
 const movingUpdates=[...moving.values()].map(group=>createLOD(scene,group,true));
 const eye=new T.Vector3(Infinity,Infinity,Infinity);
 return (camera?:T.Camera)=>{for(const root of roots)root.updateMatrixWorld(false);for(const update of movingUpdates)update(camera);if(!camera||eye.distanceToSquared(camera.position)>.04){for(const update of fixedUpdates)update(camera);if(camera)eye.copy(camera.position);}};
}
