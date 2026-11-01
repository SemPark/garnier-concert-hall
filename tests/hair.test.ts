import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Avatar} from '../src/character/Avatar';

test('one simple cap with no fringe, nothing below the ears, and lashes for women',()=>{
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
 for(const a of [man,woman]){const hair=a.head.children.filter(o=>o.userData.hairPart);assert.equal(hair.length,1,'just the cap: no fringe or long fall');
  // Every part of the cap lower than the bottom of the ears stays hidden inside the head.
  const cap=hair[0] as T.Mesh,skull=a.head.children[0] as T.Mesh,earBottom=-.03-.07;
  for(let u=0;u<48;u++)for(let v=0;v<=24;v++){const th=u/48*Math.PI*2,ph=v/24*Math.PI;
   const p=new T.Vector3(Math.sin(ph)*Math.cos(th)*cap.scale.x,Math.cos(ph)*cap.scale.y,Math.sin(ph)*Math.sin(th)*cap.scale.z).add(cap.position);if(p.y>=earBottom)continue;
   const q=p.clone().sub(skull.position);assert.ok(Math.hypot(q.x/skull.scale.x,q.y/skull.scale.y,q.z/skull.scale.z)<1,`hair shows below the ears at ${p.toArray().map(n=>n.toFixed(2))}`);}}
 const lashes=(a:Avatar)=>a.eyes.children.filter(o=>o.userData.eyelash).length;assert.equal(lashes(man),0);assert.equal(lashes(woman),4);
});
