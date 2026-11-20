import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Ghosts,type GhostSpot} from '../src/scene/Ghosts';

test('only the ghost between the camera and avatar fades, including its costume',()=>{
 const scene=new T.Scene(),crowd=new Ghosts(scene);
 const camera=new T.PerspectiveCamera(65,1.4,.05,100);
 const avatar=new T.Vector3(0,1.36,0);
 camera.position.set(0,1.36,5);camera.lookAt(avatar);
 const guest=(id:string,x:number,z:number):GhostSpot=>({id,x,y:0,z,yaw:0,sitting:true,npc:true});
 const ghosts:GhostSpot[]=[
  {...guest('queen',0,2),costume:'queen'},
  guest('beside',1.6,1),guest('behind avatar',0,-2),guest('distant',0,-18),
 ];
 crowd.update(ghosts,camera,0,false,true);
 const costume=scene.getObjectByName('ghost-queen')!;
 const originalParts=new Map<T.Mesh,T.Material>();
 costume.traverse(object=>{
  if(object instanceof T.Mesh&&!Array.isArray(object.material))originalParts.set(object,object.material);
 });
 assert.ok(originalParts.size>0);
 const batches=()=>scene.children.filter((child):child is T.InstancedMesh=>child instanceof T.InstancedMesh);
 assert.equal(batches().length,2);
 crowd.update(ghosts,camera,50,false,true,avatar);
 const faded=batches().find(batch=>(batch.material as T.Material).transparent)!;
 assert.equal(faded.count,1);
 const body=faded.material as T.ShaderMaterial;
 assert.ok(body.uniforms.uOpacity.value>0&&body.uniforms.uOpacity.value<.5);
 assert.equal(body.depthWrite,false);
 assert.deepEqual(batches().filter(batch=>batch!==faded).map(batch=>batch.count),[2,1]);
 for(const [mesh,original] of originalParts){
  assert.notEqual(mesh.material,original);
  assert.ok((mesh.material as T.Material).opacity<original.opacity);
 }
 crowd.update(ghosts,camera,100,false,true);
 assert.equal(faded.visible,false);
 assert.deepEqual(batches().filter(batch=>batch!==faded).map(batch=>batch.count),[3,1]);
 for(const [mesh,original] of originalParts)assert.equal(mesh.material,original);
});

test('a tall guest hat can cover a seated avatar even when the sightline passes above the sheet',()=>{
 const scene=new T.Scene(),crowd=new Ghosts(scene),camera=new T.PerspectiveCamera(65,1,.05,50);
 const avatar=new T.Vector3(0,1.36,0);
 camera.position.set(0,3.36,5);camera.lookAt(avatar);
 const ghost:GhostSpot={id:'hare',x:0,y:0,z:2.4,yaw:0,sitting:true,npc:true,teaGuest:'hare'};
 crowd.update([ghost],camera,0,false,true,avatar);
 const faded=scene.children.find(object=>object instanceof T.InstancedMesh&&(object.material as T.Material).transparent) as T.InstancedMesh;
 assert.equal(faded.count,1);
 camera.position.x=3;camera.lookAt(avatar);
 crowd.update([ghost],camera,50,false,true,avatar);
 assert.equal(faded.visible,false);
});
