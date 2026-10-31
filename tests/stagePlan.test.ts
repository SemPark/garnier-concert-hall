import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {STAGE_FLOOR,STAGE_TERRACES,STAGE_PLAN_SCALE,CONDUCTOR,ORCHESTRA_LAYOUT,MUSICIAN_SCALE,stageRiseAt,terraceOutline} from '../src/orchestra/layout';
import {buildOrchestra} from '../src/orchestra/buildOrchestra';
import {musicianSits} from '../src/character/Avatar';
test('five ordinary fan terraces span the stage symmetrically without crossing each other',()=>{
 assert.equal(STAGE_TERRACES.length,5);let previous=0;
 for(const [i,t]of STAGE_TERRACES.entries()){
  assert.ok(Math.abs((t.rise-previous)/STAGE_PLAN_SCALE-[.27,.29,.28,.28,.28][i])<1e-9);previous=t.rise;
  const outline=terraceOutline(t);assert.ok(outline[0].x<-15&&outline.at(-1)!.x>15);assert.ok(outline.every((p,j)=>j===0||p.x>outline[j-1].x));
  for(const p of outline){const mirror=outline.find(q=>Math.abs(p.x+q.x)<1e-9);assert.ok(mirror&&Math.abs(mirror.z-p.z)<1e-9);assert.ok(p.z>=-28.1);if(i>0)assert.ok(p.z<=terraceOutline(STAGE_TERRACES[i-1]).find(q=>Math.abs(q.x-p.x)<1e-9)!.z);}
 }
});
test('all four chair feet rest on the same terrace as each seated musician',()=>{
 for(const p of ORCHESTRA_LAYOUT.filter(p=>musicianSits(p.instrument)))for(const [dx,dz]of [[-.22,-.17],[.22,-.17],[-.22,.22],[.22,.22]]){
  const x=p.x+(dx*Math.cos(p.yaw)+dz*Math.sin(p.yaw))*MUSICIAN_SCALE,z=p.z+(-dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))*MUSICIAN_SCALE;
  assert.equal(stageRiseAt(x,z),p.rise,`${p.instrument} chair straddles a step at ${p.x}, ${p.z}`);
 }
});
test('the central wind-family wedges and all nine pictured percussion stations remain',()=>{
 const winds=ORCHESTRA_LAYOUT.filter(p=>p.section==='woodwinds');assert.equal(winds.length,16);
 assert.ok(winds.filter(p=>['flute','piccolo','clarinet','bass-clarinet'].includes(p.instrument)).every(p=>p.x<0));
 assert.ok(winds.filter(p=>['oboe','english-horn','bassoon','contrabassoon'].includes(p.instrument)).every(p=>p.x>0));
 const desks=new Map<string,number>();for(const p of ORCHESTRA_LAYOUT)if(p.deskId)desks.set(p.deskId,(desks.get(p.deskId)??0)+1);assert.ok(desks.size<35);assert.ok([...desks.values()].every(n=>n<=2));
 const scene=new T.Scene();buildOrchestra(scene);assert.ok(scene.children.filter(o=>o.userData.musicDesk).length<75);
 for(const type of ['sleigh-bells','chimes','xylophone','bass-drum','timpani'])assert.equal(ORCHESTRA_LAYOUT.filter(p=>p.instrument===type).length,1);
 const basses=ORCHESTRA_LAYOUT.filter(p=>p.instrument==='bass');assert.equal(basses.length,6);assert.ok(basses.every(p=>p.x>7));
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


test('every rendered player, chair and desk faces the conductor rather than a fixed front direction',()=>{
 const scene=new T.Scene(),actors=buildOrchestra(scene);scene.updateMatrixWorld(true);
 const check=(o:T.Object3D)=>{const p=o.getWorldPosition(new T.Vector3()),forward=new T.Vector3(0,0,-1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())),target=new T.Vector3(CONDUCTOR.x-p.x,0,CONDUCTOR.z-p.z).normalize();assert.ok(forward.dot(target)>.999,'orientation misses the conductor');};
 for(const a of actors.filter(a=>a.instrumentType!=='conductor')){a.update(2,0,musicianSits(a.instrumentType),true,null,10,1);check(a.root);check(a.head);}
 for(const o of scene.children)if(typeof o.userData.chairFor==='number'||o.userData.musicDesk)check(o);
 const left=actors.find(a=>a.instrumentType==='violin')!;assert.ok(Math.abs(left.root.rotation.y)>1&&Math.abs(left.root.rotation.y)<2.1);
});

test('piano uses one ordinary terrace with no extra rectangular platform',()=>{
 const scene=new T.Scene(),actors=buildOrchestra(scene),piano=actors.find(a=>a.instrumentType==='piano')!;scene.updateMatrixWorld(true);
 assert.equal(scene.children.filter(o=>o.userData.keyboardLanding).length,0);let feet=0;const level=piano.root.position.y-STAGE_FLOOR;
 piano.instrument.traverse(o=>{if(!(o instanceof T.Mesh))return;const bbox=new T.Box3().setFromObject(o);
  for(const x of [bbox.min.x,bbox.max.x])for(const z of [bbox.min.z,bbox.max.z])assert.ok(Math.abs(stageRiseAt(x,z)-level)<1e-8,'piano straddles ordinary terrace edges');
  if(o.geometry instanceof T.CylinderGeometry&&Math.abs(o.scale.y-.73)<1e-6){const foot=o.localToWorld(new T.Vector3(0,-.5,0));assert.ok(Math.abs(foot.y-STAGE_FLOOR-level)<1e-7);feet++;}
 });assert.equal(feet,4);
});

test('the conductor stands inside the front fan and the central opening stays compact',()=>{
 const strings=ORCHESTRA_LAYOUT.filter(p=>['first-violins','cellos'].includes(p.section));
 assert.ok(CONDUCTOR.z< -12,'conductor must be inside the stage');
 assert.ok(strings.some(p=>p.x<0&&p.z>CONDUCTOR.z));assert.ok(strings.some(p=>p.x>0&&p.z>CONDUCTOR.z));
 const nearest=(section:string)=>Math.min(...ORCHESTRA_LAYOUT.filter(p=>p.section===section).map(p=>Math.hypot(p.x-CONDUCTOR.x,p.z-CONDUCTOR.z)));
 assert.ok(nearest('first-violins')<3.6);assert.ok(nearest('cellos')<3.6);
 const inner=ORCHESTRA_LAYOUT.filter(p=>['second-violins','violas'].includes(p.section)&&Math.abs(p.x)<1.5);
 assert.equal(inner.length,2);assert.ok(inner.every(p=>p.z<CONDUCTOR.z&&p.z>CONDUCTOR.z-5));
});
