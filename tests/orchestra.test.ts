import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Avatar,musicianSits,PERCUSSION} from '../src/character/Avatar';
import {ORCHESTRA_LAYOUT,REFERENCE_COUNTS,STAGE,CONDUCTOR,REAR_TIERS,STRING_TIERS,MUSICIAN_SCALE} from '../src/orchestra/layout';
function bodyHand(a:Avatar,side:'left'|'right'){a.root.updateMatrixWorld(true);return a.body.worldToLocal((side==='left'?a.leftHand:a.rightHand).getWorldPosition(new T.Vector3()));}
test('all reference instrument symbols get a player in the correct section',()=>{
 const counts=Object.fromEntries(Object.keys(REFERENCE_COUNTS).map(section=>[section,ORCHESTRA_LAYOUT.filter(p=>p.section===section).length]));
 assert.deepEqual(counts,REFERENCE_COUNTS);assert.equal(ORCHESTRA_LAYOUT.length,101);
 const instruments=(name:string)=>ORCHESTRA_LAYOUT.filter(p=>p.instrument===name).length;
 assert.equal(instruments('flute'),3);assert.equal(instruments('piccolo'),1);assert.equal(instruments('english-horn'),2);assert.equal(instruments('bassoon'),3);assert.equal(instruments('horn'),6);assert.equal(instruments('trumpet'),4);assert.equal(instruments('trombone'),4);
 for(const type of PERCUSSION)assert.equal(instruments(type),1,type);
});
test('every musician fits on the enlarged stage, faces the conductor and has personal space',()=>{
 for(const p of ORCHESTRA_LAYOUT){
  assert.ok(Math.abs(p.x)<STAGE.width/2-1);assert.ok(p.z>STAGE.back+1&&p.z<STAGE.front-1);
  const forward=new T.Vector3(-Math.sin(p.yaw),0,-Math.cos(p.yaw)),toward=new T.Vector3(CONDUCTOR.x-p.x,0,CONDUCTOR.z-p.z).normalize();assert.ok(forward.dot(toward)>.999);
  for(const q of ORCHESTRA_LAYOUT)if(p!==q)assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>MUSICIAN_SCALE*1.16,`${p.section} overlaps ${q.section}`);
 }
 for(const tiers of [STRING_TIERS,REAR_TIERS])for(let i=1;i<tiers.length;i++)assert.ok(tiers[i].rise>tiers[i-1].rise);
});
test('straight arms wave beside the body and clap in front without crossing',()=>{
 const a=new Avatar();
 for(let age=.3;age<=2.3;age+=.025){
  a.update(0,0,false,false,'wave',age);const l=bodyHand(a,'left'),r=bodyHand(a,'right');assert.ok(l.x<-.55&&r.x>.55);assert.ok(l.z>-.1&&r.z>-.1);
  a.update(0,0,false,false,'clap',age);const cl=bodyHand(a,'left'),cr=bodyHand(a,'right');assert.ok(cl.z<-.27&&cr.z<-.27);assert.ok(cr.x-cl.x>=.119);assert.ok(cr.x-cl.x<.51);
  for(const [hand,arm]of [[a.leftHand,a.leftArm],[a.rightHand,a.rightArm]]){assert.equal(hand.parent,arm);assert.ok(Math.abs(hand.position.length()-.4)<1e-9);}
 }
});
test('sitting keeps both legs straight forward at cushion height, then returns to standing',()=>{
 const a=new Avatar();for(let i=0;i<120;i++)a.update(0,0,true,false,null,10);
 for(const leg of [a.leftLeg,a.rightLeg]){assert.ok(Math.abs(leg.rotation.x-Math.PI/2)<1e-8);assert.equal(leg.children.filter(o=>o instanceof T.Group).length,0);const foot=leg.children.at(-1)!;a.root.updateMatrixWorld(true);const pos=foot.getWorldPosition(new T.Vector3());assert.ok(pos.z<-.55);assert.ok(pos.y>.55&&pos.y<.73);}
 assert.ok(Math.abs(a.body.position.y-.1)<1e-8);
 for(let i=0;i<120;i++)a.update(0,0,false,false,null,10);assert.ok(a.leftLeg.rotation.x<1e-8);assert.ok(a.body.position.length()<1e-8);
 assert.equal(musicianSits('bass'),false);assert.equal(musicianSits('timpani'),false);assert.equal(musicianSits('piano'),true);
});

test('front-right cellos and rear-right violas keep distinct instruments and footprints',()=>{
 const cellos=ORCHESTRA_LAYOUT.filter(p=>p.section==='cellos'),violas=ORCHESTRA_LAYOUT.filter(p=>p.section==='violas');
 assert.ok(cellos.every(p=>p.instrument==='cello'&&p.x>0));assert.ok(violas.every(p=>p.instrument==='viola'&&p.x>0));
 const radius=(p:{x:number;z:number})=>Math.hypot(p.x-CONDUCTOR.x,p.z-CONDUCTOR.z);assert.ok(Math.max(...cellos.map(radius))<Math.min(...violas.map(radius)));
 const cello=new Avatar(0x202020,'cello'),viola=new Avatar(0x202020,'viola');cello.root.updateMatrixWorld(true);viola.root.updateMatrixWorld(true);
 assert.ok(new T.Box3().setFromObject(cello.instrument).getSize(new T.Vector3()).y>new T.Box3().setFromObject(viola.instrument).getSize(new T.Vector3()).y*1.7);
});
