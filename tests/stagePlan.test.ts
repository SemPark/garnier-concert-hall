import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {STAGE_FLOOR,STAGE_TERRACES,STAGE_PLAN_SCALE,ORCHESTRA_LAYOUT,MUSICIAN_SCALE,stageRiseAt,terraceOutline} from '../src/orchestra/layout';
import {buildOrchestra} from '../src/orchestra/buildOrchestra';
import {musicianSits} from '../src/character/Avatar';
test('the Golden Hall terraces follow the PDF heights and span the full stage as continuous chevrons',()=>{
 assert.equal(STAGE_TERRACES.length,5);let previous=0;
 for(const [i,t]of STAGE_TERRACES.entries()){
  assert.ok(Math.abs((t.rise-previous)/STAGE_PLAN_SCALE-[.27,.29,.28,.28,.28][i])<1e-9);previous=t.rise;
  const outline=terraceOutline(t);assert.ok(outline[0].x<-15&&outline.at(-1)!.x>15);assert.ok(outline[0].z>t.centerZ);assert.ok(outline.some(p=>p.z===t.centerZ));
  for(const p of outline){const mirror=outline.find(q=>Math.abs(p.x+q.x)<1e-9);assert.ok(mirror&&Math.abs(mirror.z-p.z)<1e-9);}
 }
});
test('all four chair feet rest on the same terrace as each seated musician',()=>{
 for(const p of ORCHESTRA_LAYOUT.filter(p=>musicianSits(p.instrument)))for(const [dx,dz]of [[-.22,-.17],[.22,-.17],[-.22,.22],[.22,.22]]){
  const x=p.x+(dx*Math.cos(p.yaw)+dz*Math.sin(p.yaw))*MUSICIAN_SCALE,z=p.z+(-dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))*MUSICIAN_SCALE;
  assert.equal(stageRiseAt(x,z),p.rise,`${p.instrument} chair straddles a step at ${p.x}, ${p.z}`);
 }
});
test('winds are two compact rows; strings share desks; the five SCL percussion instruments are present',()=>{
 const winds=ORCHESTRA_LAYOUT.filter(p=>p.section==='woodwinds');assert.equal(new Set(winds.map(p=>p.z)).size,2);for(const z of new Set(winds.map(p=>p.z)))assert.equal(winds.filter(p=>p.z===z).length,8);
 const desks=new Map<string,number>();for(const p of ORCHESTRA_LAYOUT)if(p.deskId)desks.set(p.deskId,(desks.get(p.deskId)??0)+1);assert.ok(desks.size<35);assert.ok([...desks.values()].every(n=>n<=2));
 const scene=new T.Scene();buildOrchestra(scene);assert.equal(scene.children.filter(o=>o.userData.musicDesk).length,66);
 for(const type of ['marimba','vibraphone','xylophone','bass-drum','timpani'])assert.equal(ORCHESTRA_LAYOUT.filter(p=>p.instrument===type).length,1);
 const basses=ORCHESTRA_LAYOUT.filter(p=>p.instrument==='bass');assert.equal(new Set(basses.map(p=>p.z)).size,1);assert.ok(basses.every(p=>p.z<Math.min(...winds.map(w=>w.z))));
});

test('no instrument geometry penetrates a terrace after the compact rearrangement',()=>{
 const scene=new T.Scene(),actors=buildOrchestra(scene);scene.updateMatrixWorld(true);
 for(const actor of actors){actor.instrument.traverse(o=>{
  if(!(o instanceof T.Mesh))return;
  const vertices=o.geometry.getAttribute('position'),v=new T.Vector3();
  for(let i=0;i<vertices.count;i++){
   v.fromBufferAttribute(vertices,i).applyMatrix4(o.matrixWorld);
   assert.ok(v.y>=STAGE_FLOOR+stageRiseAt(v.x,v.z)-.06,`${actor.instrumentType} sinks into a step`);
  }
 });}
});
