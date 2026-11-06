import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {batchCharacters} from '../src/scene/batching';
test('the original conductor hides for the personal experience and returns with a stationary camera',()=>{
 const scene=new T.Scene(),root=new T.Group();root.userData.demoConductor=true;root.userData.animated=true;root.position.z=-4;root.add(new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial()));scene.add(root);
 const update=batchCharacters(scene,[root]),camera=new T.PerspectiveCamera(60,1,.1,100);camera.updateMatrixWorld();update(camera);const batch=scene.children.find(o=>o instanceof T.InstancedMesh) as T.InstancedMesh;assert.equal(batch.count,1);
 scene.userData.conducting=true;update(camera);assert.equal(batch.count,0);scene.userData.conducting=false;update(camera);assert.equal(batch.count,1);
});
