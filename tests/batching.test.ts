import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {batchArchitecture,batchCharacters} from '../src/scene/batching';
test('architecture batches different colors while retaining invisible seat picking proxies',()=>{
 const scene=new T.Scene(),geometry=new T.BoxGeometry(1,1,1);
 const a=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0xff0000})),b=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x00ff00}));b.position.x=2;scene.add(a,b);
 const proxy=new T.Mesh(geometry,new T.MeshBasicMaterial({visible:false}));proxy.userData.seatId='seat';scene.add(proxy);
 batchArchitecture(scene,[proxy]);scene.updateMatrixWorld(true);
 const batches=scene.children.filter((o):o is T.InstancedMesh=>o instanceof T.InstancedMesh);const colours=new Set<number>(),c=new T.Color();
 for(const batch of batches){const vertices=batch.geometry.getAttribute('color');if(vertices)for(let i=0;i<vertices.count;i++)colours.add(c.fromBufferAttribute(vertices,i).getHex());else for(let i=0;i<batch.count;i++){batch.getColorAt(i,c);colours.add(c.getHex());}}
 assert.deepEqual(colours,new Set([0xff0000,0x00ff00]));
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
 const front=new T.Mesh(geometry,material),back=new T.Mesh(geometry,material);front.position.z=-6;back.position.z=6;scene.add(front,back);for(const source of [front,back]){const copy=source.clone();copy.position.x=2;scene.add(copy);}
 const update=batchArchitecture(scene,[]),camera=new T.PerspectiveCamera(60,1,.1,100);update(camera);
 const visibleZ=()=>scene.children.filter((o):o is T.InstancedMesh=>o instanceof T.InstancedMesh&&o.visible).map(o=>{const m=new T.Matrix4();o.getMatrixAt(0,m);return m.elements[14];});
 assert.deepEqual(visibleZ(),[-6]);camera.rotation.y=Math.PI;update(camera);assert.deepEqual(visibleZ(),[6]);
});
test('stationary musician camera rotations restore fixed meshes outside the old view',()=>{
 const scene=new T.Scene(),root=new T.Group(),head=new T.Group();head.userData.animated=true;root.add(head);const mesh=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial());root.position.z=6;root.add(mesh);scene.add(root);
 const update=batchCharacters(scene,[root]),camera=new T.PerspectiveCamera(60,1,.1,100);update(camera);const batch=scene.children.find(o=>o instanceof T.InstancedMesh) as T.InstancedMesh;assert.equal(batch.count,0);camera.rotation.y=Math.PI;update(camera);assert.equal(batch.count,1);
});
test('widening the viewport restores musician instances without moving the camera',()=>{
 const scene=new T.Scene(),root=new T.Group(),head=new T.Group();head.userData.animated=true;root.add(head);const mesh=new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshLambertMaterial());root.position.set(7,0,-6);root.add(mesh);scene.add(root);
 const update=batchCharacters(scene,[root]),camera=new T.PerspectiveCamera(60,.5,.1,100);update(camera);const batch=scene.children.find(o=>o instanceof T.InstancedMesh) as T.InstancedMesh;assert.equal(batch.count,0);camera.aspect=2;camera.updateProjectionMatrix();update(camera);assert.equal(batch.count,1);
});

test('musician eyes and instrument details retain their original geometry at auditorium distance',()=>{
 const scene=new T.Scene(),root=new T.Group(),eye=new T.Mesh(new T.SphereGeometry(1,8,6),new T.MeshLambertMaterial()),string=new T.Mesh(new T.CylinderGeometry(1,1,1,12),new T.MeshLambertMaterial());eye.scale.setScalar(.02);string.scale.set(.01,.8,.01);root.add(eye,string);scene.add(root);
 const update=batchCharacters(scene,[root]),camera=new T.PerspectiveCamera(60,1,.1,150);camera.position.z=70;update(camera);
 const batches=scene.children.filter(o=>o instanceof T.InstancedMesh) as T.InstancedMesh[];
 assert.equal(batches.filter(b=>b.visible).reduce((n,b)=>n+b.count,0),2);
 const sphere=batches.find(b=>b.geometry instanceof T.SphereGeometry)!;assert.equal((sphere.geometry as T.SphereGeometry).parameters.widthSegments,16);
 const rod=batches.find(b=>b.visible&&b.geometry instanceof T.CylinderGeometry)!;assert.ok(rod&&rod.count===1);const m=new T.Matrix4();rod.getMatrixAt(0,m);assert.ok(Math.abs(m.elements[5]-.8)<1e-6,'instrument length is retained by LOD');
});

test('static geometry shares one cell without losing world transforms, and idle views do not upload it again',()=>{
 const scene=new T.Scene(),mat=new T.MeshStandardMaterial({color:0xbba98b});
 for(const x of [1,3]){const mesh=new T.Mesh(new T.BoxGeometry(1,2,1),mat);mesh.position.set(x,1,-5);scene.add(mesh);}
 const update=batchArchitecture(scene,[]),camera=new T.PerspectiveCamera(80,1,.1,100);update(camera);
 const batch=scene.children.find(o=>o instanceof T.InstancedMesh) as T.InstancedMesh;
 assert.equal(scene.children.filter(o=>o instanceof T.InstancedMesh).length,1);
 batch.geometry.computeBoundingBox();assert.equal(batch.geometry.boundingBox!.min.x,.5);assert.equal(batch.geometry.boundingBox!.max.x,3.5);
 const version=batch.instanceMatrix.version;update(camera);assert.equal(batch.instanceMatrix.version,version);
});
test('static shadow preparation includes casters behind the camera and restores normal view culling afterward',()=>{
 const scene=new T.Scene(),geometry=new T.BoxGeometry(),mat=new T.MeshStandardMaterial();
 for(const z of [-6,6])for(const x of [-1,1]){const mesh=new T.Mesh(geometry,mat);mesh.position.set(x,0,z);scene.add(mesh);}
 const update=batchArchitecture(scene,[]),camera=new T.PerspectiveCamera(60,1,.1,100);update(camera);
 const count=()=>scene.children.filter((o):o is T.InstancedMesh=>o instanceof T.InstancedMesh&&o.visible).reduce((n,o)=>n+o.count,0);assert.equal(count(),2);
 scene.userData.showArchitectureForShadow();assert.equal(count(),4);assert.ok(scene.children.filter(o=>o instanceof T.InstancedMesh&&o.visible).every(o=>o.castShadow));
 update(camera);assert.equal(count(),2);camera.rotation.y=Math.PI;update(camera);assert.equal(count(),2);
});

function trackedActors(morph=false){
 const scene=new T.Scene(),geometry=new T.BoxGeometry(.2,.2,.2);
 if(morph)geometry.morphAttributes.position=[geometry.getAttribute('position').clone()];
 const roots=[-1,0,1].map((x,i)=>{const root=new T.Group();root.userData.animated=true;root.userData.poseAt=0;root.position.set(x,0,-5);
  const mesh=new T.Mesh(geometry,new T.MeshLambertMaterial({color:[0xff0000,0x00ff00,0x0000ff][i]}));root.add(mesh);scene.add(root);return root;});
 const update=batchCharacters(scene,roots),camera=new T.PerspectiveCamera(70,2,.1,150);update(camera);
 const batch=scene.children.find((o):o is T.InstancedMesh=>o instanceof T.InstancedMesh&&o.visible)!;batch.instanceMatrix.clearUpdateRanges();
 return {scene,roots,update,camera,batch};
}
test('unchanged poseAt skips part comparisons but camera turns still update visibility',()=>{
 const {roots,update,camera,batch}=trackedActors(),sources=new Set(roots.flatMap(r=>r.children.map(m=>m.matrixWorld))),equals=T.Matrix4.prototype.equals;let comparisons=0;
 T.Matrix4.prototype.equals=function(m){if(sources.has(m))comparisons++;return equals.call(this,m);};
 try{update(camera);assert.equal(comparisons,0);camera.rotation.y=Math.PI;update(camera);assert.equal(batch.count,0);camera.rotation.y=0;update(camera);assert.equal(batch.count,3);assert.equal(comparisons,0);
 roots[1].children[0].position.y=.5;roots[1].userData.poseAt++;update(camera);assert.equal(comparisons,1);
 const matrix=new T.Matrix4();batch.getMatrixAt(1,matrix);assert.equal(matrix.elements[13],.5);
 }finally{T.Matrix4.prototype.equals=equals;}
});
test('blink-only poses still reach the instance morph texture after a skipped pose',()=>{
 const {roots,update,camera,batch}=trackedActors(true);update(camera);
 const eye=roots[1].children[0] as T.Mesh;eye.morphTargetInfluences![0]=.75;roots[1].userData.poseAt++;update(camera);
 assert.deepEqual(Array.from(batch.morphTexture!.image.data).slice(2,4),[.25,.75]);
});
test('slot compaction keeps transforms, colors and morphs aligned across conductor visibility changes',()=>{
 const scene=new T.Scene(),geometry=new T.BoxGeometry(.2,.2,.2);geometry.morphAttributes.position=[geometry.getAttribute('position').clone()];
 const roots=[0,1,2].map(i=>{const r=new T.Group();r.userData.animated=true;r.userData.poseAt=0;r.userData.demoConductor=i===1;r.position.set(i,0,-6);const m=new T.Mesh(geometry,new T.MeshLambertMaterial({color:[0xff0000,0x00ff00,0x0000ff][i]}));m.morphTargetInfluences![0]=i*.25;r.add(m);scene.add(r);return r;});
 const update=batchCharacters(scene,roots),camera=new T.PerspectiveCamera(80,2,.1,100);update(camera);const batch=scene.children.find(o=>o instanceof T.InstancedMesh&&o.visible) as T.InstancedMesh;
 scene.userData.conducting=true;update(camera);assert.equal(batch.count,2);const matrix=new T.Matrix4(),color=new T.Color();batch.getMatrixAt(1,matrix);batch.getColorAt(1,color);assert.equal(matrix.elements[12],2);assert.equal(color.getHex(),0x0000ff);assert.equal(batch.morphTexture!.image.data[3],.5);
 // A hidden conductor changes pose, then returns to a freshly compacted slot.
 roots[1].children[0].position.y=.4;roots[1].userData.poseAt++;update(camera);scene.userData.conducting=false;update(camera);assert.equal(batch.count,3);batch.getMatrixAt(1,matrix);batch.getColorAt(1,color);assert.ok(Math.abs(matrix.elements[13]-.4)<1e-6);assert.equal(color.getHex(),0x00ff00);assert.equal(batch.morphTexture!.image.data[3],.25);
});

test('unchanged tracked poses still switch LOD and restore near geometry',()=>{
 const scene=new T.Scene(),root=new T.Group(),geometry=new T.SphereGeometry(.15,16,12);root.userData.animated=true;root.userData.poseAt=0;root.add(new T.Mesh(geometry,new T.MeshLambertMaterial()));scene.add(root);
 const update=batchCharacters(scene,[root]),camera=new T.PerspectiveCamera(60,1,.1,200);camera.position.z=3;update(camera);
 const batches=scene.children.filter((o):o is T.InstancedMesh=>o instanceof T.InstancedMesh),high=batches.find(b=>b.geometry===geometry)!;
 assert.equal(high.count,1);camera.position.z=80;update(camera);assert.equal(high.count,0);assert.equal(batches.filter(b=>b.visible).reduce((n,b)=>n+b.count,0),1);
 camera.position.z=3;update(camera);assert.equal(high.count,1);
});
