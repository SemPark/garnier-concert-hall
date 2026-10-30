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

test('distance LOD switches to coarse spheres and drops subpixel decoration, then restores close detail',()=>{
 const scene=new T.Scene(),geometry=new T.SphereGeometry(1,12,8),material=new T.MeshStandardMaterial({color:0xcca022});
 const body=new T.Mesh(geometry,material),detail=new T.Mesh(geometry,material);detail.scale.setScalar(.02);scene.add(body,detail);
 const update=batchArchitecture(scene,[]),camera=new T.PerspectiveCamera();camera.position.set(0,0,4);update(camera);
 const batches=scene.children.filter(o=>o instanceof T.InstancedMesh) as T.InstancedMesh[];const high=batches.find(b=>b.geometry===geometry)!;assert.equal(high.count,2);
 camera.position.z=60;update(camera);assert.equal(high.count,0);const low=batches.find(b=>b.geometry!==geometry)!;assert.equal(low.count,1);assert.ok(low.geometry.getAttribute('position').count<geometry.getAttribute('position').count/3);
 camera.position.z=4;update(camera);assert.equal(high.count,2);assert.equal(low.count,0);
});

test('fixed musician meshes keep their GPU buffers while head/arm transforms continue animating',()=>{
 const scene=new T.Scene(),root=new T.Group(),body=new T.Group(),arm=new T.Group();arm.userData.animated=true;root.add(body);body.add(arm);scene.add(root);
 const geometry=new T.BoxGeometry(1,1,1),material=new T.MeshLambertMaterial({color:0xaabbcc}),fixed=new T.Mesh(geometry,material),hand=new T.Mesh(geometry,material);body.add(fixed);arm.add(hand);
 const update=batchCharacters(scene,[root]),camera=new T.PerspectiveCamera();camera.position.z=4;update(camera);
 assert.equal(fixed.parent,null);assert.equal(hand.parent,arm);const batches=scene.children.filter(o=>o instanceof T.InstancedMesh) as T.InstancedMesh[];
 const staticBatch=batches.find(b=>b.instanceMatrix.usage===T.StaticDrawUsage)!,movingBatch=batches.find(b=>b.instanceMatrix.usage===T.DynamicDrawUsage)!;
 const version=staticBatch.instanceMatrix.version;arm.position.x=2;update(camera);assert.equal(staticBatch.instanceMatrix.version,version);const matrix=new T.Matrix4();movingBatch.getMatrixAt(0,matrix);assert.equal(new T.Vector3().setFromMatrixPosition(matrix).x,2);
});

test('instances outside the camera are omitted and restored after turning around',()=>{
 const scene=new T.Scene(),geometry=new T.BoxGeometry(1,1,1),material=new T.MeshLambertMaterial();
 const front=new T.Mesh(geometry,material),back=new T.Mesh(geometry,material);front.position.z=-6;back.position.z=6;scene.add(front,back);
 const update=batchArchitecture(scene,[]),camera=new T.PerspectiveCamera(60,1,.1,100);update(camera);
 const batch=scene.children.find(o=>o instanceof T.InstancedMesh) as T.InstancedMesh,matrix=new T.Matrix4();assert.equal(batch.count,1);batch.getMatrixAt(0,matrix);assert.equal(matrix.elements[14],-6);
 camera.rotation.y=Math.PI;update(camera);assert.equal(batch.count,1);batch.getMatrixAt(0,matrix);assert.equal(matrix.elements[14],6);
});
test('stationary musician camera rotations restore fixed meshes outside the old view',()=>{
 const scene=new T.Scene(),root=new T.Group(),head=new T.Group();head.userData.animated=true;root.add(head);const mesh=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial());mesh.position.z=6;root.add(mesh);scene.add(root);
 const update=batchCharacters(scene,[root]),camera=new T.PerspectiveCamera(60,1,.1,100);update(camera);const batch=scene.children.find(o=>o instanceof T.InstancedMesh) as T.InstancedMesh;assert.equal(batch.count,0);camera.rotation.y=Math.PI;update(camera);assert.equal(batch.count,1);
});
