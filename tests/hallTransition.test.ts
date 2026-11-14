import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {HallTransition} from '../src/scene/HallTransition';
test('upper materials fade independently, reverse continuously and restore in five seconds',()=>{
 const scene=new T.Scene(),upper=new T.Scene(),shared=new T.MeshStandardMaterial({emissiveIntensity:2});
 scene.background=new T.Color(0x24201b);scene.fog=new T.FogExp2(0x735337,.0085);
 const mesh=new T.Mesh(new T.BoxGeometry(),shared);upper.add(mesh);scene.add(upper);
 const transition=new HallTransition(scene,upper);
 assert.notEqual(mesh.material,shared);assert.ok(mesh.material.alphaHash);
 transition.setOpen(true);transition.update(2.5);
 assert.equal(transition.progress,.5);assert.equal(shared.opacity,1);assert.equal(mesh.material.opacity,.5);assert.ok(upper.visible);
 transition.setOpen(false);transition.update(1);
 assert.equal(transition.progress,.3);
 transition.setOpen(true);transition.update(5);
 assert.equal(transition.progress,1);assert.equal(upper.visible,false);
 transition.setOpen(false);transition.update(5);
 assert.equal(mesh.material.opacity,1);assert.equal(mesh.material.emissiveIntensity,2);assert.equal(upper.visible,true);
 assert.equal(scene.fog.density,.0085);transition.dispose();
});

test('camera sweep ignores only the dissolved height of an upper wall',async()=>{
 const {constrainCamera}=await import('../src/controls/cameraCollision');
 const wall=new T.Mesh(new T.BoxGeometry(8,30,.4),new T.MeshBasicMaterial());
 wall.position.set(0,15,5);wall.updateMatrixWorld(true);wall.userData.openHallCutoff={value:8.3};
 assert.ok(constrainCamera(new T.Vector3(0,12,0),new T.Vector3(0,12,10),[wall]).z>9);
 assert.ok(constrainCamera(new T.Vector3(0,2,0),new T.Vector3(0,2,10),[wall]).z<5);
 wall.userData.openHallCutoff.value=Infinity;
 assert.ok(constrainCamera(new T.Vector3(0,12,0),new T.Vector3(0,12,10),[wall]).z<5);
});
