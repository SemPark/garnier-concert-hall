import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Avatar} from '../src/character/Avatar';

test('one simple cap with no fringe; women add a fall of hair at the back, with no lines on the face',()=>{
 const man=new Avatar(0x202020,undefined,0),woman=new Avatar(0x202020,undefined,4);
 assert.equal(man.hair,'short');assert.equal(woman.hair,'short');
 for(const a of [man,woman]){
  const cap=a.head.children.find(o=>o.userData.hairPart==='cap') as T.Mesh,skull=a.head.children[0] as T.Mesh;
  // Sample the skull surface above the brow and behind the ears; every point must sit well inside the cap.
  for(let u=0;u<48;u++)for(let v=0;v<24;v++){const th=u/48*Math.PI*2,ph=v/24*Math.PI;
   const p=new T.Vector3(Math.sin(ph)*Math.cos(th)*skull.scale.x,Math.cos(ph)*skull.scale.y,Math.sin(ph)*Math.sin(th)*skull.scale.z).add(skull.position);
   const crown=p.y>.12&&p.z>-.18,back=p.z>.12&&p.y>.06;if(!crown&&!back)continue;
   const q=p.clone().sub(cap.position),k=Math.hypot(q.x/cap.scale.x,q.y/cap.scale.y,q.z/cap.scale.z);
   assert.ok(k<.96,`${a.hair}: skin shows through the hair at ${p.toArray().map(n=>n.toFixed(2))}`);}
 }
 for(const a of [man,woman]){const hair=a.head.children.filter(o=>o.userData.hairPart==='cap');assert.equal(hair.length,1,'one cap and no fringe');
  // Every part of the cap lower than the bottom of the ears stays hidden inside the head.
  const cap=hair[0] as T.Mesh,skull=a.head.children[0] as T.Mesh,earBottom=-.03-.07;
  for(let u=0;u<48;u++)for(let v=0;v<=24;v++){const th=u/48*Math.PI*2,ph=v/24*Math.PI;
   const p=new T.Vector3(Math.sin(ph)*Math.cos(th)*cap.scale.x,Math.cos(ph)*cap.scale.y,Math.sin(ph)*Math.sin(th)*cap.scale.z).add(cap.position);if(p.y>=earBottom)continue;
   const q=p.clone().sub(skull.position);assert.ok(Math.hypot(q.x/skull.scale.x,q.y/skull.scale.y,q.z/skull.scale.z)<1,`hair shows below the ears at ${p.toArray().map(n=>n.toFixed(2))}`);}}
 assert.equal(woman.eyes.children.filter(o=>o.userData.eyelash).length,0,'no lash strokes on the face');
 const back=woman.head.children.find(o=>o.userData.hairPart==='back') as T.Mesh;assert.ok(back,'women have back hair');assert.ok(!man.head.children.some(o=>o.userData.hairPart==='back'));
 const skull=woman.head.children[0] as T.Mesh;assert.ok(back.scale.x<skull.scale.x-.03,'back hair stays narrower than the face');assert.ok(back.position.z>skull.position.z+.15,'it sits behind the head');
});

test('a visitor can choose to appear as a man or a woman, and everyone gets the same avatar',async()=>{
 const {visitorVariant}=await import('../shared/venue');const {LocalConcert}=await import('../src/network/LocalConcert');
 const room=new LocalConcert();assert.ok(room.send({type:'look',look:'woman'}));assert.equal(room.visitor.look,'woman');
 assert.equal(new Avatar(0,undefined,visitorVariant(room.visitor)).appearance,'woman');
 assert.ok(room.send({type:'look',look:'man'}));assert.equal(new Avatar(0,undefined,visitorVariant(room.visitor)).appearance,'man');
 assert.equal(room.send({type:'look',look:'robot' as never}),false);
});
