import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {constrainCamera} from '../src/controls/cameraCollision';
import {batchArchitecture} from '../src/scene/batching';
import {buildHallShell} from '../src/scene/GoldenHall';
function wall(z:number){const mesh=new T.Mesh(new T.BoxGeometry(20,20,.1),new T.MeshBasicMaterial());mesh.position.z=z;mesh.updateMatrixWorld(true);return mesh;}
test('very close wall hits cannot push the camera through a wall with a fixed minimum distance',()=>{const origin=new T.Vector3(),desired=new T.Vector3(0,0,5),result=constrainCamera(origin,desired,[wall(.4)]);assert.ok(result.z>0&&result.z<.2);});
test('the near-plane footprint is swept even when the centre ray misses a column',()=>{const mesh=new T.Mesh(new T.BoxGeometry(.15,2,.2));mesh.position.set(.2,0,1);mesh.updateMatrixWorld(true);const result=constrainCamera(new T.Vector3(),new T.Vector3(0,0,4),[mesh]);assert.ok(result.z<1);});
test('close occluding wall instances are hidden and restored when the sight line clears',()=>{const scene=new T.Scene(),mesh=wall(0);mesh.userData.cameraOccluder=true;scene.add(mesh);const update=batchArchitecture(scene,[]),camera=new T.PerspectiveCamera(60,1,.1,100);camera.position.z=2;camera.lookAt(0,0,-2);scene.userData.cameraFocus=new T.Vector3(0,0,-2);update(camera);const batch=scene.children.find(o=>o instanceof T.InstancedMesh) as T.InstancedMesh;assert.equal(batch.count,0);scene.userData.cameraFocus=null;update(camera);assert.equal(batch.count,1);});
test('near-wall cutaways retain the enclosing hall shell instead of opening a hole outside',()=>{
 const scene=new T.Scene();buildHallShell(scene);const update=batchArchitecture(scene,[]),camera=new T.PerspectiveCamera(70,1,.08,150);
 camera.position.set(15.92,10,20);const focus=new T.Vector3(14,10,20);camera.lookAt(focus);scene.userData.cameraFocus=focus;update(camera);
 const matrix=new T.Matrix4(),positions:number[]=[];for(const o of scene.children)if(o instanceof T.InstancedMesh)for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);positions.push(matrix.elements[12]);}
 assert.ok(positions.includes(16),'the side wall enclosing the camera must remain rendered');
});
