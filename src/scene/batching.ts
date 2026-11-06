import * as T from 'three';
import {keepFrontLight} from '../character/characterLight';
import {prepareInstanceMorph} from './instanceMorph';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {finishBuild} from './buildBudget';
import {detailedMaterial} from './primitives';
import {coarseGeometry,detailDistance,LOD_NEAR} from './lodGeometry';
const restoredSphere=new T.SphereGeometry(1,16,12);
// Far musicians (beyond LOD_NEAR) use this lighter ball; at that distance a hand or nose is a few pixels wide.
const farSphere=new T.SphereGeometry(1,9,6);
type Lit=T.MeshStandardMaterial|T.MeshLambertMaterial;
type Item={mesh:T.Mesh;matrix:T.Matrix4;center:T.Vector3;radius:number;limit:number;min:number;color:T.Color|null;level:number;shown:boolean;occluder?:T.Box3};
type BatchGroup={material:T.Material;objects:T.Mesh[];colors:boolean};
function isLit(mat:T.Material):mat is Lit{return mat instanceof T.MeshStandardMaterial||mat instanceof T.MeshLambertMaterial;}
function collect(groups:Map<string,BatchGroup>,mesh:T.Mesh){
 if(Array.isArray(mesh.material))return;
 const mat=mesh.material,lit=isLit(mat)&&!mat.map;
 const key=mesh.geometry.uuid+'/'+(mesh.castShadow?'shadow/':'unshadowed/')+(mesh.userData.fullDetail?'full/':'adaptive/')+(mesh.userData.preserveSilhouette?'persistent/':'')+(lit?JSON.stringify([mat.type,mat instanceof T.MeshStandardMaterial?mat.roughness:0,mat instanceof T.MeshStandardMaterial?mat.metalness:0,mat.emissive.getHex(),mat.emissiveIntensity,mat.transparent,mat.opacity,mat.depthWrite,mat.side,mat.userData.characterLight??'']):mat.uuid);
 let group=groups.get(key);if(!group){const material=lit?mat.clone():mat;keepFrontLight(mat,material);if(lit)(material as Lit).color.setHex(0xffffff);group={material,objects:[],colors:lit};groups.set(key,group);}group.objects.push(mesh);
}
function createLOD(scene:T.Scene,group:BatchGroup,dynamic:boolean){
 const geometry=group.objects[0].geometry,fullDetail=!!group.objects[0].userData.fullDetail,lowGeometry=fullDetail?geometry:(group.objects[0].userData.lowDetail as T.BufferGeometry|undefined)??coarseGeometry(geometry);
 const make=(g:T.BufferGeometry)=>{const batch=new T.InstancedMesh(g,group.material,group.objects.length);batch.instanceMatrix.setUsage(dynamic?T.DynamicDrawUsage:T.StaticDrawUsage);batch.matrixAutoUpdate=false;batch.frustumCulled=false;batch.castShadow=!dynamic&&group.objects[0].castShadow;batch.receiveShadow=true;prepareInstanceMorph(batch);scene.add(batch);return batch;};
 const high=make(geometry),low=lowGeometry===geometry?high:make(lowGeometry);
 geometry.computeBoundingSphere();
 const items:Item[]=group.objects.map(mesh=>({mesh,matrix:mesh.matrixWorld.clone(),center:geometry.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld),radius:geometry.boundingSphere!.radius*mesh.matrixWorld.getMaxScaleOnAxis(),limit:fullDetail||mesh.userData.preserveSilhouette?Infinity:detailDistance(mesh),min:mesh.userData.lodMin??0,color:group.colors?(mesh.material as Lit).color.clone():null,level:0,shown:false,occluder:mesh.userData.occluderBox??(mesh.userData.cameraOccluder?new T.Box3().setFromObject(mesh).expandByScalar(.12):undefined)}));
 const frustum=new T.Frustum(),projection=new T.Matrix4(),sphere=new T.Sphere(),occlusionRay=new T.Ray(),intersection=new T.Vector3();
 let initialized=false;
 const write=(camera?:T.Camera)=>{
  let changed=!initialized;const eye=camera?.position;if(camera){camera.updateMatrixWorld();frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));}
  for(const item of items){if(dynamic){item.matrix.copy(item.mesh.matrixWorld);item.center.copy(geometry.boundingSphere!.center).applyMatrix4(item.matrix);item.radius=geometry.boundingSphere!.radius*item.matrix.getMaxScaleOnAxis();}
   const focus=scene.userData.cameraFocus as T.Vector3|undefined;let occluded=false;if(eye&&focus&&item.occluder){occlusionRay.origin.copy(eye);occlusionRay.direction.copy(focus).sub(eye);const length=occlusionRay.direction.length();occlusionRay.direction.normalize();const hit=occlusionRay.intersectBox(item.occluder,intersection);// Decoration right beside the camera, or between it and the visitor, steps aside so it never fills the view.
   occluded=item.occluder.distanceToPoint(eye)<1.1||!!hit&&eye.distanceTo(hit)<Math.min(5,length-.05);}
   const distance=eye?item.center.distanceTo(eye):0,nearLimit=item.level===0?LOD_NEAR+1.5:LOD_NEAR-1.5,level=distance<nearLimit?0:1,shown=!occluded&&distance<=item.limit&&distance>=item.min&&(!camera||frustum.intersectsSphere(sphere.set(item.center,item.radius+.3)));
   if(level!==item.level||shown!==item.shown)changed=true;item.level=level;item.shown=shown;
  }
  if(!dynamic&&!changed)return;
  let highCount=0,lowCount=0;
  for(const item of items){if(!item.shown)continue;const batch=item.level===0?high:low,index=batch===high?highCount++:lowCount++;batch.setMatrixAt(index,item.matrix);if(item.mesh.morphTargetInfluences)batch.setMorphAt(index,item.mesh);if(item.color&&changed)batch.setColorAt(index,item.color);}
  if(high.morphTexture)high.morphTexture.needsUpdate=true;if(low!==high&&low.morphTexture)low.morphTexture.needsUpdate=true;
  high.count=highCount;high.visible=highCount>0;high.instanceMatrix.needsUpdate=true;if(changed&&high.instanceColor)high.instanceColor.needsUpdate=true;
  if(low!==high){low.count=lowCount;low.visible=lowCount>0;low.instanceMatrix.needsUpdate=true;if(changed&&low.instanceColor)low.instanceColor.needsUpdate=true;}
  initialized=true;
 };
 write();return write;
}
/** Combine uncommon static shapes by finish and spatial cell; repeated shapes still use instancing. */
function mergeStaticCells(groups:Map<string,BatchGroup>){
 const cells=new Map<string,{material:T.Material;meshes:T.Mesh[];limit:number;min:number}>(),center=new T.Vector3(),owners=new Map<T.Mesh,string>();
 for(const [key,group]of groups){
  if(group.objects.length>3||group.material.transparent)continue;
  for(const mesh of [...group.objects]){
   if(mesh.userData.occluderBox||mesh.userData.cameraOccluder||Array.isArray(mesh.material)||!mesh.geometry.getAttribute('normal')||!mesh.geometry.getAttribute('uv'))continue;
   const limit=mesh.userData.fullDetail||mesh.userData.preserveSilhouette?Infinity:detailDistance(mesh),min=mesh.userData.lodMin??0;
   center.setFromMatrixPosition(mesh.matrixWorld);const cell=[Math.floor(center.x/10),Math.floor(center.y/7),Math.floor(center.z/10)].join('/');
   // Source material retains the original colour when this is an untextured instanced group.
   const cellKey=mesh.material.uuid+'/'+cell+'/'+limit+'/'+min+'/'+mesh.castShadow;
   let bucket=cells.get(cellKey);if(!bucket){bucket={material:mesh.material,meshes:[],limit,min};cells.set(cellKey,bucket);}bucket.meshes.push(mesh);owners.set(mesh,key);
  }
 }
 for(const cell of cells.values()){
  if(cell.meshes.length<2)continue;
  const geometries=cell.meshes.map(mesh=>{let g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);if(g.index){const indexed=g;g=indexed.toNonIndexed();indexed.dispose();}const attributes=['position','normal','uv'];if((mesh.material as T.Material).userData.characterLight==='cloth')attributes.push('clothContact');for(const name of Object.keys(g.attributes))if(!attributes.includes(name))g.deleteAttribute(name);g.clearGroups();return g;});
  const geometry=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();if(!geometry)continue;
  const mesh=new T.Mesh(geometry,cell.material);mesh.userData.lodMax=cell.limit;mesh.userData.lodMin=cell.min;mesh.userData.fullDetail=cell.limit===Infinity;mesh.userData.staticCell=true;mesh.castShadow=cell.meshes[0].castShadow;mesh.updateMatrixWorld(true);
  for(const original of cell.meshes){const key=owners.get(original)!,group=groups.get(key)!;group.objects.splice(group.objects.indexOf(original),1);if(!group.objects.length)groups.delete(key);original.removeFromParent();}
  collect(groups,mesh);
 }
}
export function batchArchitecture(scene:T.Scene,exclude:T.Object3D[]){return finishBuild(batchArchitectureSteps(scene,exclude));}
export function* batchArchitectureSteps(scene:T.Scene,exclude:T.Object3D[]){
 const protectedObjects=new Set<T.Object3D>();for(const root of exclude)root.traverse(o=>protectedObjects.add(o));
 scene.updateMatrixWorld(true);const groups=new Map<string,BatchGroup>();
 // A group marked occluderGroup (a column with its flutes and capital) hides as one piece.
 scene.traverse(o=>{if(!o.userData.occluderGroup)return;const box=new T.Box3().setFromObject(o).expandByScalar(.12);o.traverse(m=>{m.userData.occluderBox=box;});});
 const bounds=new T.Box3(),size=new T.Vector3(),center=new T.Vector3();
 scene.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||protectedObjects.has(o))return;
  bounds.setFromObject(o).getSize(size);bounds.getCenter(center);
  o.castShadow=Math.max(size.x,size.y,size.z)<12&&center.y<20&&!Array.isArray(o.material)&&!o.material.transparent&&o.material.visible;
  collect(groups,o);
 });
 mergeStaticCells(groups);
 const updates:ReturnType<typeof createLOD>[]=[];
 for(const group of groups.values()){updates.push(createLOD(scene,group,false));for(const mesh of group.objects)mesh.removeFromParent();yield;}
 scene.traverse(o=>{if(!protectedObjects.has(o)){o.updateMatrix();o.matrixAutoUpdate=false;}});
 const eye=new T.Vector3(Infinity,Infinity,Infinity),rotation=new T.Quaternion(),projection=new T.Matrix4();
 scene.userData.showArchitectureForShadow=()=>{for(const update of updates)update();eye.set(Infinity,Infinity,Infinity);};
 return (camera:T.Camera)=>{
  if(eye.distanceToSquared(camera.position)<.0025&&rotation.angleTo(camera.quaternion)<.003&&projection.equals(camera.projectionMatrix))return;
  for(const update of updates)update(camera);eye.copy(camera.position);rotation.copy(camera.quaternion);projection.copy(camera.projectionMatrix);
 };
}
/** Instruments, torsos and legs are static; only live head/arm subtrees upload each tick. Characters are never hidden
 * by distance, but beyond LOD_NEAR they switch to their far shapes (lowDetail or a coarse copy). */
export function batchCharacters(scene:T.Scene,roots:T.Object3D[]){return finishBuild(batchCharactersSteps(scene,roots));}
export function* batchCharactersSteps(scene:T.Scene,roots:T.Object3D[]){
 scene.updateMatrixWorld(true);const moving=new Map<string,BatchGroup>(),fixed=new Map<string,BatchGroup>();
 for(const root of roots){root.updateMatrixWorld(true);let marked=false;root.traverse(o=>{if(o.userData.animated)marked=true;});
  const visit=(node:T.Object3D,animated:boolean)=>{animated=animated||!!node.userData.animated;if(node instanceof T.Mesh){node.userData.preserveSilhouette=true;if(!Array.isArray(node.material))node.material=detailedMaterial(node.material);if(node.geometry instanceof T.SphereGeometry&&node.geometry.parameters.widthSegments<16)node.geometry=restoredSphere;if(node.geometry instanceof T.SphereGeometry)node.userData.lowDetail??=farSphere;collect(animated?moving:fixed,node);}for(const child of node.children)visit(child,animated);};visit(root,!marked);
  if(marked){const freeze=(node:T.Object3D,animated:boolean)=>{animated=animated||!!node.userData.animated;node.updateMatrix();node.matrixAutoUpdate=animated;for(const child of node.children)freeze(child,animated);};freeze(root,false);}
  root.removeFromParent();yield;
 }
 const fixedUpdates:ReturnType<typeof createLOD>[]=[];for(const group of fixed.values()){fixedUpdates.push(createLOD(scene,group,false));for(const mesh of group.objects)mesh.removeFromParent();yield;}
 const prune=(root:T.Object3D)=>{for(const child of [...root.children]){prune(child);if(child instanceof T.Group&&!child.children.length&&!child.userData.animated)child.removeFromParent();}};for(const root of roots)prune(root);
 const movingUpdates:ReturnType<typeof createLOD>[]=[];for(const group of moving.values()){movingUpdates.push(createLOD(scene,group,true));yield;}
 const eye=new T.Vector3(Infinity,Infinity,Infinity),rotation=new T.Quaternion(),projection=new T.Matrix4();
 const poseFrustum=new T.Frustum(),poseProjection=new T.Matrix4(),poseCenter=new T.Vector3(),poseSphere=new T.Sphere();
 return (camera?:T.Camera)=>{if(camera)poseFrustum.setFromProjectionMatrix(poseProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));for(const root of roots){poseCenter.copy(root.position);poseCenter.y+=1;if(!camera||poseFrustum.intersectsSphere(poseSphere.set(poseCenter,2)))root.updateMatrixWorld(false);}for(const update of movingUpdates)update(camera);if(!camera||eye.distanceToSquared(camera.position)>.04||rotation.angleTo(camera.quaternion)>.015||!projection.equals(camera.projectionMatrix)){for(const update of fixedUpdates)update(camera);if(camera){eye.copy(camera.position);rotation.copy(camera.quaternion);projection.copy(camera.projectionMatrix);}}};
}
