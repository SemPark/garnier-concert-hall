import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildOrchestra} from '../src/orchestra/buildOrchestra';
import {CONCERT_CAMERA} from '../src/orchestra/layout';
import {Avatar,musicianSits} from '../src/character/Avatar';
function orchestra(){const scene=new T.Scene(),actors=buildOrchestra(scene);for(const a of actors)a.update(0,0,musicianSits(a.instrumentType),false,null,10,1);scene.updateMatrixWorld(true);return {scene,actors};}
test('both character appearances retain straight-limb gestures and seating',()=>{
 for(const variant of [0,4,5]){const a=new Avatar(0x202020,'violin',variant);assert.equal(a.appearance,variant>=4?'woman':'man');a.update(0,0,true,false,'clap',1,1);assert.ok(a.leftLeg.rotation.x>1.56);assert.equal(a.leftHand.parent,a.leftArm);assert.equal(a.rightHand.parent,a.rightArm);}
});
test('all 103 faces remain partly visible above risers, stands and large instruments',()=>{
 const {scene,actors}=orchestra(),ray=new T.Raycaster(),eye=new T.Vector3(...CONCERT_CAMERA.eye);assert.equal(actors.length,103);assert.equal(actors.filter(a=>a.appearance==='woman').length,50);
 for(const a of actors){let visible=0;
  for(const point of [[-.115,-.035,-.329],[.115,-.035,-.329],[0,.09,-.34],[-.2,-.1,-.29],[.2,-.1,-.29]]){
   const target=a.head.localToWorld(new T.Vector3(...point as [number,number,number])),direction=target.clone().sub(eye);ray.set(eye,direction.clone().normalize());ray.far=direction.length()+.3;
   let hit=ray.intersectObjects(scene.children,true)[0]?.object;while(hit){if(hit===a.head){visible++;break;}hit=hit.parent??undefined;}
  }
  assert.ok(visible>=2,`${a.root.userData.section??'conductor'} / ${a.instrumentType}: face hidden`);
 }
});

test('all 16 brass instruments are visible from the concert camera, including the back trombones',()=>{
 const {scene,actors}=orchestra(),eye=new T.Vector3(...CONCERT_CAMERA.eye),ray=new T.Raycaster();
 const brass=actors.filter(a=>['horn','trumpet','trombone','tuba'].includes(a.instrumentType??''));assert.equal(brass.length,16);
 for(const a of brass){let visible=0,total=0;const own=new Set<T.Object3D>();a.instrument.traverse(o=>own.add(o));
  a.instrument.traverse(o=>{if(!(o instanceof T.Mesh))return;const vertices=o.geometry.getAttribute('position');
   for(let i=0;i<vertices.count;i+=Math.max(1,Math.floor(vertices.count/12))){
    const target=new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(o.matrixWorld),d=target.clone().sub(eye);ray.set(eye,d.clone().normalize());ray.far=d.length()+.01;
    const hit=ray.intersectObjects(scene.children,true)[0];total++;if(hit&&own.has(hit.object))visible++;
   }
  });
  assert.ok(visible/total>=.25,`${a.instrumentType} at ${a.root.position.x}: brass hidden behind other players`);
 }
});

test('the full orchestra including the two outer harps fits inside the default concert frame',()=>{
 const {actors}=orchestra(),camera=new T.PerspectiveCamera(61,1182/655,.08,150);camera.position.set(...CONCERT_CAMERA.eye);camera.lookAt(new T.Vector3(...CONCERT_CAMERA.look));camera.updateMatrixWorld(true);
 for(const actor of actors){const b=new T.Box3().setFromObject(actor.root);for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new T.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<.98&&Math.abs(p.y)<.98,`${actor.instrumentType} is cropped out of the concert frame`);}}
});
