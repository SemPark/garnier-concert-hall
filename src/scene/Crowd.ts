import * as T from 'three';
import {prepareInstanceMorph} from './instanceMorph';
import type {Avatar} from '../character/Avatar';
import {coarseGeometry,detailDistance,LOD_NEAR} from './lodGeometry';

type Part={mesh:T.InstancedMesh;used:number;colors:boolean};
/** One body part of one visitor, with the batches it joins when near and when far. */
type Piece={mesh:T.Mesh;limit:number;near:Part;far:Part;color:T.Color|null};
type Lit=T.MeshLambertMaterial|T.MeshStandardMaterial;
const isLit=(m:T.Material):m is Lit=>(m instanceof T.MeshLambertMaterial||m instanceof T.MeshStandardMaterial)&&!m.map;

/**
 * Draws the other visitors with one instanced mesh per body part, so a full house (440 seats) costs a few dozen
 * draw calls instead of 25 per person. Avatars stay ordinary object trees outside the scene for posing; each frame
 * the visible ones copy their part matrices into the shared batches, 30 times a second like the orchestra (distant
 * ones refresh their pose in turns, ten times a second). Visitors
 * out of view are skipped, far ones use coarse shapes and drop parts too small to see (eyes, nose, cheeks).
 */
export class Crowd{
 private parts=new Map<string,Part>();private materials=new Map<string,T.Material>();private pieces=new WeakMap<Avatar,Piece[]>();private ids=new WeakMap<Avatar,number>();private nextId=0;private updatedAt=-Infinity;private layout='';private tick=0;
 private frustum=new T.Frustum();private projection=new T.Matrix4();private bounds=new T.Sphere();private center=new T.Vector3();
 constructor(private scene:T.Scene){}
 private partFor(geometry:T.BufferGeometry,source:T.Material){
  const lit=isLit(source);
  const look=lit?[source.type,source instanceof T.MeshStandardMaterial?[source.roughness,source.metalness]:0,source.emissive.getHex(),source.transparent,source.opacity,source.side].join('/'):source.uuid;
  const key=geometry.uuid+'|'+look;let part=this.parts.get(key);
  if(!part){let material=this.materials.get(look);if(!material){material=lit?source.clone():source;if(lit)(material as Lit).color.setHex(0xffffff);this.materials.set(look,material);}
   part={mesh:this.make(geometry,material,64),used:0,colors:lit};this.parts.set(key,part);}
  return part;
 }
 private piece(mesh:T.Mesh):Piece{
  const material=mesh.material as T.Material,low=(mesh.userData.lowDetail as T.BufferGeometry|undefined)??coarseGeometry(mesh.geometry);
  return {mesh,limit:detailDistance(mesh),near:this.partFor(mesh.geometry,material),far:this.partFor(low,material),color:isLit(material)?material.color:null};
 }
 private make(geometry:T.BufferGeometry,material:T.Material,size:number){
  const mesh=new T.InstancedMesh(geometry,material,size);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;prepareInstanceMorph(mesh);mesh.count=0;this.scene.add(mesh);return mesh;
 }
 /** Grow a batch when a full house needs more slots than it has. */
 private reserve(part:Part){
  const capacity=part.mesh.instanceMatrix.count;if(part.used<capacity)return;
  const old=part.mesh;part.mesh=this.make(old.geometry,old.material as T.Material,capacity*2);old.removeFromParent();if(old.morphTexture&&part.mesh.morphTexture){(part.mesh.morphTexture.image.data as Float32Array).set(old.morphTexture.image.data as Float32Array);part.mesh.morphTexture.needsUpdate=true;}old.dispose();
  part.mesh.instanceMatrix.array.set(old.instanceMatrix.array);if(old.instanceColor){part.mesh.setColorAt(0,new T.Color());part.mesh.instanceColor!.array.set(old.instanceColor.array);}
 }
 update(visitors:Iterable<Avatar>,camera:T.Camera,now=performance.now()){
  if(now-this.updatedAt<1000/30)return;this.updatedAt=now;this.tick++;const avatars=[...visitors];
  for(const part of this.parts.values())part.used=0;
  camera.updateMatrixWorld();this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  // Slots only move when the set of visible visitors or their detail changes; colours are rewritten only then.
  let layout='';
  for(const avatar of avatars){
   if(!avatar.root.visible)continue;
   this.center.copy(avatar.root.position);this.center.y+=.8;if(!this.frustum.intersectsSphere(this.bounds.set(this.center,1.1)))continue;
   const distance=this.center.distanceTo(camera.position),far=distance>LOD_NEAR;
   let pieces=this.pieces.get(avatar);
   if(!pieces){pieces=[];avatar.root.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material))pieces!.push(this.piece(o));});this.pieces.set(avatar,pieces);this.ids.set(avatar,this.nextId++);avatar.root.updateMatrixWorld(true);}
   // Distant listeners only sway, so their pose is refreshed in turns, a third of them each tick.
   else if(distance<=19||(this.tick+this.ids.get(avatar)!)%3===0)avatar.root.updateMatrixWorld(true);
   const detail=distance>19?2:distance>12?1:0;layout+=this.ids.get(avatar)+(far?'f':'n')+detail+',';
   for(const piece of pieces){
    const {mesh,limit}=piece;if(distance>limit)continue;
    const part=far?piece.far:piece.near;this.reserve(part);
    part.mesh.setMatrixAt(part.used,mesh.matrixWorld);if(mesh.morphTargetInfluences)part.mesh.setMorphAt(part.used,mesh);part.used++;
   }
  }
  const recolor=layout!==this.layout;this.layout=layout;
  if(recolor)this.recolor(avatars,camera);
  for(const part of this.parts.values()){
   const mesh=part.mesh;mesh.count=part.used;mesh.visible=part.used>0;if(!part.used)continue;
   if(mesh.morphTexture)mesh.morphTexture.needsUpdate=true;
   mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,part.used*16);mesh.instanceMatrix.needsUpdate=true;
   if(recolor&&mesh.instanceColor){mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.addUpdateRange(0,part.used*3);mesh.instanceColor.needsUpdate=true;}
  }
 }
 /** Walk the same visitors in the same order as the matrices, writing each part's colour into its slot. */
 private recolor(avatars:Avatar[],camera:T.Camera){
  for(const part of this.parts.values())part.used=0;
  for(const avatar of avatars){
   if(!avatar.root.visible)continue;
   this.center.copy(avatar.root.position);this.center.y+=.8;if(!this.frustum.intersectsSphere(this.bounds.set(this.center,1.1)))continue;
   const distance=this.center.distanceTo(camera.position),far=distance>LOD_NEAR;
   for(const piece of this.pieces.get(avatar)!){
    if(distance>piece.limit)continue;
    const part=far?piece.far:piece.near;if(piece.color)part.mesh.setColorAt(part.used,piece.color);part.used++;
   }
  }
 }
}
