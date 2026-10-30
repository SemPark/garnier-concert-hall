import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {batchArchitecture,batchCharacters} from '../src/scene/batching';
test('architecture batches different colors while retaining invisible seat picking proxies',()=>{
 const scene=new T.Scene(),geometry=new T.BoxGeometry(1,1,1);
 const a=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0xff0000})),b=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x00ff00}));b.position.x=2;scene.add(a,b);
 const proxy=new T.Mesh(geometry,new T.MeshBasicMaterial({visible:false}));proxy.userData.seatId='seat';scene.add(proxy);
 batchArchitecture(scene,[proxy]);scene.updateMatrixWorld(true);
 const batch=scene.children.find(o=>o instanceof T.InstancedMesh) as T.InstancedMesh;assert.equal(batch.count,2);
 const color=new T.Color();batch.getColorAt(0,color);assert.equal(color.getHex(),0xff0000);batch.getColorAt(1,color);assert.equal(color.getHex(),0x00ff00);
 const ray=new T.Raycaster(new T.Vector3(0,0,3),new T.Vector3(0,0,-1));assert.ok(ray.intersectObject(proxy).length);
});
test('detached character rigs still update instance transforms after poses change',()=>{
 const scene=new T.Scene(),root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial());root.add(mesh);scene.add(root);
 const update=batchCharacters(scene,[root]);assert.equal(root.parent,null);root.position.set(2,3,4);mesh.position.x=1;update();
 const batch=scene.children[0] as T.InstancedMesh,matrix=new T.Matrix4();batch.getMatrixAt(0,matrix);const position=new T.Vector3().setFromMatrixPosition(matrix);assert.deepEqual(position.toArray(),[3,3,4]);
});
