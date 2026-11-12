import * as T from 'three';
import {buildOrchestra} from '../src/orchestra/buildOrchestra';
import {musicianSits} from '../src/character/Avatar';
import {projectedHeight,musicianInterval} from '../src/scene/projectedDetail';
const scenarios=['idle','far','near','moving','conducting'] as const;
export function fixture(batchCharacters:(scene:T.Scene,roots:T.Object3D[])=>((camera?:T.Camera)=>void)){
 const scene=new T.Scene();const random=Math.random;let seed=123;
 Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 const actors=buildOrchestra(scene);Math.random=random;
 const matrices=new Set<T.Matrix4>();for(const actor of actors)actor.root.traverse(o=>matrices.add(o.matrixWorld));
 const update=batchCharacters(scene,actors.map(a=>a.root));
 const camera=new T.PerspectiveCamera(50,2,.1,200),frustum=new T.Frustum(),projection=new T.Matrix4(),center=new T.Vector3(),sphere=new T.Sphere();
 const batches=scene.children.filter((o):o is T.InstancedMesh=>o instanceof T.InstancedMesh);
 return {scene,actors,matrices,update,camera,frustum,projection,center,sphere,batches};
}
export function pose(f:ReturnType<typeof fixture>,kind:typeof scenarios[number],frame:number){
 const {scene,actors,camera,frustum,projection,center,sphere}=f,now=(frame+1)*1000/30;
 const near=kind==='near'||kind==='conducting';camera.position.set(kind==='moving'?Math.sin(frame*.027)*28:0,near?5:15.2,near?-5:47.35);
 camera.lookAt(kind==='moving'?Math.sin(frame*.014)*32:0,4,-22);
 // Include FOV/aspect and visibility changes during camera replay.
 camera.aspect=kind==='moving'&&frame%120>90?.65:2;camera.updateProjectionMatrix();camera.updateMatrixWorld();frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 scene.userData.conducting=kind==='conducting'&&frame%120<90;
 for(const a of actors){
  center.copy(a.root.position);center.y+=1;const conductor=a.instrumentType==='conductor',old=a.root.userData.poseAt??0;
  if(kind==='idle'&&frame>0)continue;
  if(!conductor&&!frustum.intersectsSphere(sphere.set(center,2)))continue;
  if(!conductor&&now-old<musicianInterval(projectedHeight(1.4,camera.position.distanceTo(center),camera.projectionMatrix.elements[5])))continue;
  a.root.userData.poseAt=now;a.update(now/1000,0,musicianSits(a.instrumentType),true,null,10,Math.min(.25,Math.max(1/30,(now-old)/1000)));
  if(kind==='conducting'){a.head.rotation.y=Math.sin(frame*.02)*.3;if(conductor)a.rightArm.rotation.x=Math.sin(frame*.08);}
 }
}
export function clearRanges(f:ReturnType<typeof fixture>){for(const b of f.batches){b.instanceMatrix.clearUpdateRanges();b.instanceColor?.clearUpdateRanges();}}
