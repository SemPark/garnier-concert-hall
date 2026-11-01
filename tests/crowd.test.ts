import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Avatar} from '../src/character/Avatar';
import {Crowd} from '../src/scene/Crowd';
import {SEATS,visitorVariant} from '../shared/venue';

const fullHouse=()=>SEATS.map((seat,i)=>{const a=new Avatar(0x5a6a8a,undefined,visitorVariant({id:(i*37%256).toString(16).padStart(2,'0')+'-x',look:i%2?'woman':'man'}));
 a.root.position.set(seat.x,seat.y,seat.z);a.root.rotation.y=seat.yaw;a.update(1,0,true,true,null,10,1);return a;});
const batches=(scene:T.Scene)=>scene.children.filter((o):o is T.InstancedMesh=>o instanceof T.InstancedMesh&&o.visible);

test('a full house is drawn in a few dozen shared batches, not 25 pieces per visitor',()=>{
 const scene=new T.Scene(),crowd=new Crowd(scene),avatars=fullHouse(),camera=new T.PerspectiveCamera(61,4/3,.1,200);
 camera.position.set(0,4,30);camera.lookAt(0,2,-10);camera.updateMatrixWorld();
 crowd.update(avatars,camera,0);
 const drawn=batches(scene);assert.ok(drawn.length<60,`${drawn.length} draw calls`);
 assert.ok(drawn.reduce((n,b)=>n+b.count,0)>2000,'most visitors are drawn');
 // Every slot that is drawn carries a real pose (no leftover identity matrices from an unused slot).
 const m=new T.Matrix4(),identity=new T.Matrix4();for(const b of drawn)for(let i=0;i<b.count;i++){b.getMatrixAt(i,m);assert.ok(!m.equals(identity),'a drawn slot was never posed');}
});

test('visitors behind the camera are skipped and distant ones drop parts too small to see',()=>{
 const scene=new T.Scene(),crowd=new Crowd(scene),avatars=fullHouse(),camera=new T.PerspectiveCamera(61,4/3,.1,200);
 const count=()=>batches(scene).reduce((n,b)=>n+b.count,0);
 camera.position.set(0,2,-20);camera.lookAt(0,2,-40);camera.updateMatrixWorld();crowd.update(avatars,camera,0);
 assert.equal(count(),0,'looking at the stage wall, no listener is drawn');
 const near=new Crowd(new T.Scene()),far=new Crowd(new T.Scene()),one=[avatars[0]];
 const eye=avatars[0].root.position.clone().add(new T.Vector3(0,1.5,3));
 camera.position.copy(eye);camera.lookAt(avatars[0].root.position);camera.updateMatrixWorld();near.update(one,camera,0);
 camera.position.copy(eye).add(new T.Vector3(0,0,30));camera.lookAt(avatars[0].root.position);camera.updateMatrixWorld();far.update(one,camera,0);
 const parts=(c:Crowd)=>(c as unknown as {parts:Map<string,{used:number}>}).parts;
 const used=(c:Crowd)=>[...parts(c).values()].reduce((n,p)=>n+p.used,0);
 assert.ok(used(far)<used(near),'far visitors drop the eyes, nose and cheeks');
});

test('crowd updates follow the orchestra at 30 per second',()=>{
 const scene=new T.Scene(),crowd=new Crowd(scene),avatars=fullHouse().slice(0,4),camera=new T.PerspectiveCamera(61,4/3,.1,200);
 camera.position.set(0,4,30);camera.lookAt(0,2,-10);camera.updateMatrixWorld();
 crowd.update(avatars,camera,0);const before=batches(scene).reduce((n,b)=>n+b.count,0);
 avatars[0].root.visible=false;crowd.update(avatars,camera,10);
 assert.equal(batches(scene).reduce((n,b)=>n+b.count,0),before,'a second update within 33 ms is skipped');
 crowd.update(avatars,camera,40);assert.ok(batches(scene).reduce((n,b)=>n+b.count,0)<before);
});
