import {removeBuriedFaces} from './hiddenFaces';
import {projectedHeight} from './projectedDetail';
import {removeDuplicates} from './removeDuplicates';
import {solidOcclusion} from './solidOcclusion';
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
type ActorPose={dirty:boolean};
const actorPoses=new WeakMap<T.Object3D,ActorPose>();
type Item={pose?:ActorPose;actorEnd?:number;mesh:T.Mesh;matrix:T.Matrix4;center:T.Vector3;radius:number;limit:number;min:number;color:T.Color|null;level:number;shown:boolean;morph?:number[];occluder?:T.Box3};
type BatchGroup={material:T.Material;objects:T.Mesh[];colors:boolean};
type Cell={items:Item[];shown:boolean;bounds?:T.Box3;center?:T.Vector3;extent?:T.Vector3};
// Character parts share one view test per character per update: on screen, detail level and wall occlusion were
// repeated for each of ~36 parts (a few thousand tests per frame for the orchestra).
let occlusionStamp=0;const actorRoots=new WeakMap<T.Object3D,T.Object3D>();
type ActorView={stamp:number;shown:boolean;level:number};
const actorViews=new Map<T.Object3D,ActorView>(),actorCenter=new T.Vector3(),actorSphere=new T.Sphere();
function actorView(scene:T.Scene,root:T.Object3D,eye:T.Vector3|undefined,frustum:T.Frustum|null,camera:T.Camera|undefined){
 let view=actorViews.get(root);
 if(view&&view.stamp===occlusionStamp)return view;
 actorCenter.setFromMatrixPosition(root.matrixWorld);actorCenter.y+=.8;
 const previous=view?.level??0,distance=eye?actorCenter.distanceTo(eye):0,nearLimit=previous===0?LOD_NEAR+1.5:LOD_NEAR-1.5;
 const level=!camera||distance<nearLimit||projectedHeight(1.4,distance,camera.projectionMatrix.elements[5])>(previous===0?.07:.09)?0:1;
 const shown=(!frustum||frustum.intersectsSphere(actorSphere.set(actorCenter,2)))&&(!eye||!scene.userData.solidOccluded?.(eye,actorCenter,1));
 view={stamp:occlusionStamp,shown,level};actorViews.set(root,view);return view;
}

function spatialCells(items:Item[]):Cell[]{
 const cells=new Map<string,{items:Item[];bounds:T.Box3}>();
 const min=new T.Vector3(),max=new T.Vector3();
 for(const item of items){
  const {x,y,z}=item.center,key=`${Math.floor(x/8)}/${Math.floor(y/6)}/${Math.floor(z/8)}`;
  let cell=cells.get(key);
  if(!cell){cell={items:[],bounds:new T.Box3()};cells.set(key,cell);}
  cell.items.push(item);
  const padding=item.radius+.3;
  cell.bounds.expandByPoint(min.copy(item.center).addScalar(-padding));
  cell.bounds.expandByPoint(max.copy(item.center).addScalar(padding));
 }
 return [...cells.values()].map(({items,bounds})=>({items,bounds,shown:true,
  center:bounds.getCenter(new T.Vector3()),extent:bounds.getSize(new T.Vector3()).multiplyScalar(.5)}));
}
function isLit(mat:T.Material):mat is Lit{return mat instanceof T.MeshStandardMaterial||mat instanceof T.MeshLambertMaterial;}
function collect(groups:Map<string,BatchGroup>,mesh:T.Mesh){
 if(Array.isArray(mesh.material))return;
 const mat=mesh.material,lit=isLit(mat)&&!mat.map;
 const key=mesh.geometry.uuid+'/'+(mesh.castShadow?'shadow/':'unshadowed/')+(mesh.userData.fullDetail?'full/':'adaptive/')+(mesh.userData.preserveSilhouette?'persistent/':'')+(lit?JSON.stringify([mat.type,mat instanceof T.MeshStandardMaterial?mat.roughness:0,mat instanceof T.MeshStandardMaterial?mat.metalness:0,mat.emissive.getHex(),mat.emissiveIntensity,mat.transparent,mat.opacity,mat.depthWrite,mat.side,mat.userData.characterLight??'']):mat.uuid);
 let group=groups.get(key);if(!group){const material=lit?mat.clone():mat;keepFrontLight(mat,material);if(lit)(material as Lit).color.setHex(0xffffff);group={material,objects:[],colors:lit};groups.set(key,group);}group.objects.push(mesh);
}
function createLOD(scene:T.Scene,group:BatchGroup,dynamic:boolean,partition=false){
 const geometry=group.objects[0].geometry,fullDetail=!!group.objects[0].userData.fullDetail,lowGeometry=fullDetail?geometry:(group.objects[0].userData.lowDetail as T.BufferGeometry|undefined)??coarseGeometry(geometry);
 const make=(g:T.BufferGeometry)=>{const batch=new T.InstancedMesh(g,group.material,group.objects.length);batch.instanceMatrix.setUsage(dynamic?T.DynamicDrawUsage:T.StaticDrawUsage);batch.matrixAutoUpdate=false;batch.frustumCulled=false;batch.castShadow=!dynamic&&group.objects[0].castShadow;batch.receiveShadow=true;prepareInstanceMorph(batch);scene.add(batch);return batch;};
 const high=make(geometry),low=lowGeometry===geometry?high:make(lowGeometry);
 geometry.computeBoundingSphere();
 const items:Item[]=group.objects.map(mesh=>({mesh,matrix:mesh.matrixWorld.clone(),center:geometry.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld),radius:geometry.boundingSphere!.radius*mesh.matrixWorld.getMaxScaleOnAxis(),limit:fullDetail||mesh.userData.preserveSilhouette?Infinity:detailDistance(mesh),min:mesh.userData.lodMin??0,color:group.colors?(mesh.material as Lit).color.clone():null,level:0,shown:false,occluder:mesh.userData.occluderBox??(mesh.userData.cameraOccluder?new T.Box3().setFromObject(mesh).expandByScalar(.12):undefined)}));
 // Parts were collected actor by actor. Keep that compact order; an unchanged actor's
 // contiguous run can be skipped without another hierarchy or per-part matrix tests.
 if(dynamic)for(let start=0;start<items.length;){
  const root=actorRoots.get(items[start].mesh),pose=root?actorPoses.get(root):undefined;let end=start+1;
  while(end<items.length&&actorRoots.get(items[end].mesh)===root)end++;
  for(let i=start;i<end;i++){items[i].pose=pose;items[i].actorEnd=end-1;}start=end;
 }
 const cells:Cell[]=partition&&items.length>=16&&!group.material.transparent?spatialCells(items):[{items,shown:true}];
 const frustum=new T.Frustum(),projection=new T.Matrix4(),sphere=new T.Sphere(),occlusionRay=new T.Ray(),intersection=new T.Vector3();
 let initialized=false;
 const write=(camera?:T.Camera,sharedFrustum?:T.Frustum,reuseVisibility=false)=>{
  let changed=!initialized,poseChanged=!initialized;const eye=camera?.position;if(camera&&!sharedFrustum){camera.updateMatrixWorld();frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));}
  const viewFrustum=sharedFrustum??frustum;
  const focus=scene.userData.cameraFocus as T.Vector3|undefined;
  for(const cell of cells){
   const shown=!camera||!cell.bounds||viewFrustum.intersectsBox(cell.bounds)&&!scene.userData.solidOccluded?.(eye,cell.center,cell.extent);
   if(shown!==cell.shown){changed=true;cell.shown=shown;}
   if(!shown)continue;
   for(let i=0;i<cell.items.length;i++){
   const item=cell.items[i],checkPose=dynamic&&(!initialized||!item.pose||item.pose.dirty);
   if(dynamic&&initialized&&reuseVisibility&&item.pose&&!item.pose.dirty){i=item.actorEnd!;continue;}
   const matrixChanged=checkPose&&!item.matrix.equals(item.mesh.matrixWorld);
   // A blink can change even when the head matrix stays still.
   if(checkPose){
    const morph=item.mesh.morphTargetInfluences;
    if(morph&&(!item.morph||morph.some((value,i)=>value!==item.morph![i]))){item.morph=[...morph];poseChanged=true;}
    if(matrixChanged)poseChanged=true;
   }
   if(dynamic&&reuseVisibility&&!item.occluder&&!matrixChanged)continue;
   const actor=actorRoots.get(item.mesh);
   if(actor){
    if(matrixChanged)item.matrix.copy(item.mesh.matrixWorld);
    const view=actorView(scene,actor,eye,camera?viewFrustum:null,camera),shown=view.shown&&!(scene.userData.conducting&&item.mesh.userData.demoConductor);
    if(view.level!==item.level||shown!==item.shown)changed=true;item.level=view.level;item.shown=shown;continue;
   }
   if(dynamic){item.matrix.copy(item.mesh.matrixWorld);item.center.copy(geometry.boundingSphere!.center).applyMatrix4(item.matrix);item.radius=geometry.boundingSphere!.radius*item.matrix.getMaxScaleOnAxis();}
   let occluded=false;if(eye&&focus&&item.occluder){occlusionRay.origin.copy(eye);occlusionRay.direction.copy(focus).sub(eye);const length=occlusionRay.direction.length();occlusionRay.direction.normalize();const hit=occlusionRay.intersectBox(item.occluder,intersection);// Decoration right beside the camera, or between it and the visitor, steps aside so it never fills the view.
   occluded=item.occluder.distanceToPoint(eye)<1.1||!!hit&&eye.distanceTo(hit)<Math.min(5,length-.05);}
   const distance=eye?item.center.distanceTo(eye):0,nearLimit=item.level===0?LOD_NEAR+1.5:LOD_NEAR-1.5,level=distance<nearLimit||(camera&&projectedHeight(item.mesh.userData.detailRadius??item.radius,distance,camera.projectionMatrix.elements[5])>(item.level===0?.07:.09))?0:1,shown=!(scene.userData.conducting&&item.mesh.userData.demoConductor)&&!occluded&&distance<=item.limit&&distance>=item.min&&(!camera||viewFrustum.intersectsSphere(sphere.set(item.center,item.radius+.3)))&&(!eye||!scene.userData.solidOccluded?.(eye,item.center,item.radius+.05));
   if(level!==item.level||shown!==item.shown)changed=true;item.level=level;item.shown=shown;
   }
  }
  if(!changed&&(!dynamic||!poseChanged))return;
  let highCount=0,lowCount=0;
  for(const cell of cells){if(!cell.shown)continue;
   for(const item of cell.items){if(!item.shown)continue;const batch=item.level===0?high:low,index=batch===high?highCount++:lowCount++;batch.setMatrixAt(index,item.matrix);if(item.mesh.morphTargetInfluences)batch.setMorphAt(index,item.mesh);if(item.color&&changed)batch.setColorAt(index,item.color);}
  }
  // Upload only what is drawn: an empty batch sends nothing, a partly filled one sends just its used range.
  const upload=(mesh:T.InstancedMesh,count:number)=>{mesh.count=count;mesh.visible=count>0;if(!count)return;if(mesh.morphTexture)mesh.morphTexture.needsUpdate=true;
   mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,count*16);mesh.instanceMatrix.needsUpdate=true;if(changed&&mesh.instanceColor)mesh.instanceColor.needsUpdate=true;};
  upload(high,highCount);if(low!==high)upload(low,lowCount);
  initialized=true;
 };
 write();return write;
}
/** Combine uncommon static shapes by finish and spatial cell; repeated shapes still use instancing. */
function mergeStaticCells(groups:Map<string,BatchGroup>){
 const cells=new Map<string,{material:T.Material;meshes:T.Mesh[];limit:number;min:number;occluder?:T.Box3}>(),center=new T.Vector3(),owners=new Map<T.Mesh,string>();
 const boxIds=new Map<T.Box3,number>(),pieceBox=new T.Box3();
 for(const [key,group]of groups){
  if(group.objects.length>3||group.material.transparent)continue;
  for(const mesh of [...group.objects]){
   if(Array.isArray(mesh.material)||!mesh.geometry.getAttribute('normal')||!mesh.geometry.getAttribute('uv')||Object.keys(mesh.geometry.morphAttributes).length)continue;
   // Pieces that step aside for the camera merge only with pieces that step aside together.
   const shared=mesh.userData.occluderBox as T.Box3|undefined;
   const occluderKey=shared?'box'+(boxIds.get(shared)??boxIds.set(shared,boxIds.size).size-1):mesh.userData.cameraOccluder&&mesh.parent?'parent'+mesh.parent.uuid:'';
   const limit=mesh.userData.fullDetail||mesh.userData.preserveSilhouette?Infinity:detailDistance(mesh),min=mesh.userData.lodMin??0;
   center.setFromMatrixPosition(mesh.matrixWorld);const cell=[Math.floor(center.x/24),Math.floor(center.y/14),Math.floor(center.z/24)].join('/');
   // Source material retains the original colour when this is an untextured instanced group.
   const cellKey=mesh.material.uuid+'/'+(occluderKey||cell)+'/'+limit+'/'+min+'/'+mesh.castShadow;
   let bucket=cells.get(cellKey);if(!bucket){bucket={material:mesh.material,meshes:[],limit,min,occluder:shared??(occluderKey?new T.Box3():undefined)};cells.set(cellKey,bucket);}bucket.meshes.push(mesh);owners.set(mesh,key);
   if(occluderKey&&!shared)bucket.occluder!.union(pieceBox.setFromObject(mesh).expandByScalar(.12));
  }
 }
 for(const cell of cells.values()){
  // A merged occluder hides as one piece: tall columns are fine, but keep it narrow so it never empties a wide view.
  if(cell.meshes.length<2||cell.occluder&&Math.max(cell.occluder.getSize(center).x,center.z)>4)continue;
  const geometries=cell.meshes.map(mesh=>{let g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);if(g.index){const indexed=g;g=indexed.toNonIndexed();indexed.dispose();}const attributes=['position','normal','uv'];if((mesh.material as T.Material).userData.characterLight==='cloth')attributes.push('clothContact');for(const name of Object.keys(g.attributes))if(!attributes.includes(name))g.deleteAttribute(name);g.clearGroups();return g;});
  const geometry=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();if(!geometry)continue;
  const mesh=new T.Mesh(geometry,cell.material);mesh.userData.lodMax=cell.limit;mesh.userData.lodMin=cell.min;mesh.userData.fullDetail=cell.limit===Infinity;mesh.userData.staticCell=true;if(cell.occluder)mesh.userData.occluderBox=cell.occluder;mesh.castShadow=cell.meshes[0].castShadow;mesh.updateMatrixWorld(true);
  for(const original of cell.meshes){const key=owners.get(original)!,group=groups.get(key)!;group.objects.splice(group.objects.indexOf(original),1);if(!group.objects.length)groups.delete(key);original.removeFromParent();}
  collect(groups,mesh);
 }
}
/** Small leftovers with the same finish but different shapes become one mesh: each piece's colour moves into vertex
 * colours, so ~250 one-off draws collapse to about one per finish. Pieces that step aside for the camera stay apart. */
function mergeByFinish(groups:Map<string,BatchGroup>){
 const buckets=new Map<string,{material:Lit;meshes:T.Mesh[];keys:string[];limit:number;min:number}>();
 for(const [key,group]of groups){
  if(group.objects.length>3||!group.colors||group.material.transparent)continue;
  for(const mesh of group.objects){
   const g=mesh.geometry;if(mesh.userData.occluderBox||mesh.userData.cameraOccluder||!g.getAttribute('normal')||!g.getAttribute('uv')||Object.keys(g.morphAttributes).length)continue;
   const mat=mesh.material as Lit,limit=mesh.userData.fullDetail||mesh.userData.preserveSilhouette?Infinity:detailDistance(mesh),min=mesh.userData.lodMin??0;
   // A hall-wide mesh has no single distance, so pieces that appear or vanish with distance stay apart.
   if(limit!==Infinity||min>0)continue;
   const finish=JSON.stringify([mat.type,mat instanceof T.MeshStandardMaterial?[mat.roughness,mat.metalness]:0,mat.emissive.getHex(),mat.emissiveIntensity,mat.side,mat.depthWrite,mat.userData.characterLight??'',mesh.castShadow,limit,min]);
   let bucket=buckets.get(finish);if(!bucket){bucket={material:mat,meshes:[],keys:[],limit,min};buckets.set(finish,bucket);}bucket.meshes.push(mesh);bucket.keys.push(key);
  }
 }
 const color=new T.Color();
 for(const bucket of buckets.values()){
  if(bucket.meshes.length<2)continue;
  const geometries=bucket.meshes.map(mesh=>{let g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);if(g.index){const indexed=g;g=indexed.toNonIndexed();indexed.dispose();}
   for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);g.clearGroups();
   color.copy((mesh.material as Lit).color);const n=g.getAttribute('position').count,colors=new Float32Array(n*3);for(let i=0;i<n;i++)color.toArray(colors,i*3);g.setAttribute('color',new T.BufferAttribute(colors,3));return g;});
  const geometry=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();if(!geometry)continue;
  const material=bucket.material.clone();material.vertexColors=true;material.color.setHex(0xffffff);keepFrontLight(bucket.material,material);
  const merged=new T.Mesh(geometry,material);merged.userData.lodMax=bucket.limit;merged.userData.lodMin=bucket.min;merged.userData.fullDetail=bucket.limit===Infinity;merged.userData.staticCell=true;merged.castShadow=bucket.meshes[0].castShadow;merged.receiveShadow=true;merged.updateMatrixWorld(true);
  bucket.meshes.forEach((mesh,i)=>{const group=groups.get(bucket.keys[i]);if(group){group.objects.splice(group.objects.indexOf(mesh),1);if(!group.objects.length)groups.delete(bucket.keys[i]);}mesh.removeFromParent();});
  collect(groups,merged);
 }
}
export function batchArchitecture(scene:T.Scene,exclude:T.Object3D[]){return finishBuild(batchArchitectureSteps(scene,exclude));}
export function* batchArchitectureSteps(scene:T.Scene,exclude:T.Object3D[]){
 const protectedObjects=new Set<T.Object3D>();for(const root of exclude)root.traverse(o=>protectedObjects.add(o));
 scene.updateMatrixWorld(true);scene.userData.removedDuplicateMeshes=removeDuplicates(scene,protectedObjects);const groups=new Map<string,BatchGroup>();
 const solids:T.Box3[]=[];
 // Only the permanent shell: decorative bounds would wrongly seal doors and arches.
 scene.traverse(o=>{if(!(o instanceof T.Mesh)||o.userData.landmark!=='hall-shell'||!(o.geometry instanceof T.BoxGeometry)||Array.isArray(o.material)||o.material.transparent||!o.material.visible)return;
  const e=o.matrixWorld.elements,aligned=[0,4,8].every(i=>[e[i],e[i+1],e[i+2]].filter(v=>Math.abs(v)>1e-6).length===1);
  if(aligned)solids.push(new T.Box3().setFromObject(o).expandByScalar(-.02));
 });
 scene.userData.solidOccluded=solidOcclusion(solids);

 // A group marked occluderGroup (a column with its flutes and capital) hides as one piece.
 scene.traverse(o=>{if(!o.userData.occluderGroup)return;const box=new T.Box3().setFromObject(o).expandByScalar(.12);o.traverse(m=>{m.userData.occluderBox=box;});});
 scene.userData.removedBuriedTriangles=removeBuriedFaces(scene,protectedObjects);
 const bounds=new T.Box3(),size=new T.Vector3(),center=new T.Vector3();
 scene.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||protectedObjects.has(o))return;
  bounds.setFromObject(o).getSize(size);bounds.getCenter(center);
  o.castShadow=Math.max(size.x,size.y,size.z)<12&&center.y<20&&!Array.isArray(o.material)&&!o.material.transparent&&o.material.visible;
  collect(groups,o);
 });
 mergeStaticCells(groups);
 mergeByFinish(groups);
 const updates:ReturnType<typeof createLOD>[]=[];
 for(const group of groups.values()){updates.push(createLOD(scene,group,false,true));for(const mesh of group.objects)mesh.removeFromParent();yield;}
 scene.traverse(o=>{if(!protectedObjects.has(o)){o.updateMatrix();o.matrixAutoUpdate=false;}});
 const eye=new T.Vector3(Infinity,Infinity,Infinity),rotation=new T.Quaternion(),projection=new T.Matrix4();
 scene.userData.showArchitectureForShadow=()=>{for(const update of updates)update();eye.set(Infinity,Infinity,Infinity);};
 const previousFocus=new T.Vector3();let hadFocus=false;
 return (camera:T.Camera)=>{
  const focus=scene.userData.cameraFocus as T.Vector3|null|undefined,focusChanged=!!focus!==hadFocus||!!focus&&previousFocus.distanceToSquared(focus)>.0025;
  if(!focusChanged&&eye.distanceToSquared(camera.position)<.0025&&rotation.angleTo(camera.quaternion)<.003&&projection.equals(camera.projectionMatrix))return;
  for(const update of updates)update(camera);eye.copy(camera.position);rotation.copy(camera.quaternion);projection.copy(camera.projectionMatrix);hadFocus=!!focus;if(focus)previousFocus.copy(focus);
 };
}
/** Instruments, torsos and legs are static; only live head/arm subtrees upload each tick. Characters are never hidden
 * by distance, but beyond LOD_NEAR they switch to their far shapes (lowDetail or a coarse copy). */
export function batchCharacters(scene:T.Scene,roots:T.Object3D[]){return finishBuild(batchCharactersSteps(scene,roots));}
export function* batchCharactersSteps(scene:T.Scene,roots:T.Object3D[]){
 scene.updateMatrixWorld(true);const moving=new Map<string,BatchGroup>(),fixed=new Map<string,BatchGroup>();
 for(const root of roots){actorPoses.set(root,{dirty:true});root.updateMatrixWorld(true);let marked=false;root.traverse(o=>{if(o.userData.animated)marked=true;});
  const visit=(node:T.Object3D,animated:boolean)=>{animated=animated||!!node.userData.animated;if(node instanceof T.Mesh){node.userData.demoConductor=!!root.userData.demoConductor;actorRoots.set(node,root);node.userData.preserveSilhouette=true;node.userData.detailRadius=1.4;if(!Array.isArray(node.material))node.material=detailedMaterial(node.material);if(node.geometry instanceof T.SphereGeometry&&node.geometry.parameters.widthSegments<16)node.geometry=restoredSphere;if(node.geometry instanceof T.SphereGeometry)node.userData.lowDetail??=farSphere;collect(animated?moving:fixed,node);}for(const child of node.children)visit(child,animated);};visit(root,!marked);
  if(marked){const freeze=(node:T.Object3D,animated:boolean)=>{animated=animated||!!node.userData.animated;node.updateMatrix();node.matrixAutoUpdate=animated;for(const child of node.children)freeze(child,animated);};freeze(root,false);}
  root.removeFromParent();yield;
 }
 const fixedUpdates:ReturnType<typeof createLOD>[]=[];for(const group of fixed.values()){fixedUpdates.push(createLOD(scene,group,false));for(const mesh of group.objects)mesh.removeFromParent();yield;}
 const prune=(root:T.Object3D)=>{for(const child of [...root.children]){prune(child);if(child instanceof T.Group&&!child.children.length&&!child.userData.animated)child.removeFromParent();}};for(const root of roots)prune(root);
 const movingUpdates:ReturnType<typeof createLOD>[]=[];for(const group of moving.values()){movingUpdates.push(createLOD(scene,group,true));yield;}
 const eye=new T.Vector3(Infinity,Infinity,Infinity),rotation=new T.Quaternion(),projection=new T.Matrix4();
 let conducting=false;
 const poseFrustum=new T.Frustum(),poseProjection=new T.Matrix4(),poseCenter=new T.Vector3(),poseSphere=new T.Sphere();
 const previousView=new T.Matrix4(),previousEye=new T.Vector3(),posed=new WeakMap<T.Object3D,unknown>();
 let previousConducting=false,hasPreviousView=false;
 return (camera?:T.Camera)=>{
  let reuseVisibility=false;
  if(camera){
   camera.updateMatrixWorld();
   poseProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
   poseFrustum.setFromProjectionMatrix(poseProjection);
   reuseVisibility=hasPreviousView&&previousView.equals(poseProjection)&&previousEye.equals(camera.position)&&previousConducting===!!scene.userData.conducting;
   previousView.copy(poseProjection);
   previousEye.copy(camera.position);
   previousConducting=!!scene.userData.conducting;
   hasPreviousView=true;
  }else hasPreviousView=false;
  occlusionStamp++;
  // Players re-pose at 30Hz or less (poseAt); recompute a subtree only after its pose changed.
  for(const root of roots){const state=actorPoses.get(root)!,posedAt=root.userData.poseAt;state.dirty=false;
   if(camera&&posedAt!==undefined&&posed.get(root)===posedAt)continue;
   poseCenter.copy(root.position);poseCenter.y+=1;
   if(!camera||poseFrustum.intersectsSphere(poseSphere.set(poseCenter,2))){root.updateMatrixWorld(false);posed.set(root,posedAt);state.dirty=true;}
  }
  for(const update of movingUpdates)update(camera,poseFrustum,reuseVisibility);
  if(conducting!==!!scene.userData.conducting||!camera||eye.distanceToSquared(camera.position)>.04||rotation.angleTo(camera.quaternion)>.015||!projection.equals(camera.projectionMatrix)){for(const update of fixedUpdates)update(camera,poseFrustum);conducting=!!scene.userData.conducting;if(camera){eye.copy(camera.position);rotation.copy(camera.quaternion);projection.copy(camera.projectionMatrix);}}
 };
}
