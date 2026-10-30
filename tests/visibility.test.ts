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
test('all 102 faces remain partly visible above risers, stands and large instruments',()=>{
 const {scene,actors}=orchestra(),ray=new T.Raycaster(),eye=new T.Vector3(...CONCERT_CAMERA.eye);assert.equal(actors.length,102);assert.equal(actors.filter(a=>a.appearance==='woman').length,49);
 for(const a of actors){let visible=0;
  for(const point of [[-.115,-.035,-.329],[.115,-.035,-.329],[0,.09,-.34],[-.2,-.1,-.29],[.2,-.1,-.29]]){
   const target=a.head.localToWorld(new T.Vector3(...point as [number,number,number])),direction=target.clone().sub(eye);ray.set(eye,direction.clone().normalize());ray.far=direction.length()+.3;
   let hit=ray.intersectObjects(scene.children,true)[0]?.object;while(hit){if(hit===a.head){visible++;break;}hit=hit.parent??undefined;}
  }
  assert.ok(visible>=2,`${a.root.userData.section??'conductor'} / ${a.instrumentType}: face hidden`);
 }
});
