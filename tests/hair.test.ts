import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Avatar} from '../src/character/Avatar';

test('one simple hairstyle per appearance, and the hair cap leaves no bare patch on the crown or back',()=>{
 const man=new Avatar(0x202020,undefined,0),woman=new Avatar(0x202020,undefined,4);
 assert.equal(man.hair,'short');assert.equal(woman.hair,'long');
 for(const a of [man,woman]){
  const cap=a.head.children.find(o=>o.userData.hairPart==='cap') as T.Mesh,skull=a.head.children[0] as T.Mesh;
  // Sample the skull surface above the brow and behind the ears; every point must sit well inside the cap.
  for(let u=0;u<48;u++)for(let v=0;v<24;v++){const th=u/48*Math.PI*2,ph=v/24*Math.PI;
   const p=new T.Vector3(Math.sin(ph)*Math.cos(th)*skull.scale.x,Math.cos(ph)*skull.scale.y,Math.sin(ph)*Math.sin(th)*skull.scale.z).add(skull.position);
   const crown=p.y>.12&&p.z>-.18,back=p.z>.12&&p.y>-.15;if(!crown&&!back)continue;
   const q=p.clone().sub(cap.position),k=Math.hypot(q.x/cap.scale.x,q.y/cap.scale.y,q.z/cap.scale.z);
   assert.ok(k<.96,`${a.hair}: skin shows through the hair at ${p.toArray().map(n=>n.toFixed(2))}`);}
 }
 assert.ok(woman.head.children.some(o=>o.userData.hairPart==='long-back'));assert.ok(!man.head.children.some(o=>o.userData.hairPart==='long-back'));
});
