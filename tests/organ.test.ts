import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildFrontWindows,buildOrgan,FRONT_WINDOW_AXES,ORGAN_CASE,organBalconyFront} from '../src/scene/GoldenHall';
import {WALL_LEVELS} from '../src/scene/HallWallBands';
import {GOLDEN_HALL as H} from '../shared/goldenHall';
import {buildOrchestra} from '../src/orchestra/buildOrchestra';
import {CONCERT_CAMERA} from '../src/orchestra/layout';
import {musicianSits} from '../src/character/Avatar';

test('the front has one symmetric, evenly spaced row of full-height blind arches',()=>{
 const scene=new T.Scene();buildFrontWindows(scene);scene.updateMatrixWorld(true);const windows:T.Object3D[]=[];scene.traverse(o=>{if(o.userData.landmark==='front-window')windows.push(o);});
 assert.equal(windows.length,8);let previous:T.Box3|undefined;
 for(const [i,w]of windows.entries()){
  const bounds=new T.Box3().setFromObject(w);assert.equal(w.position.x,FRONT_WINDOW_AXES[i]);assert.ok(bounds.min.y<WALL_LEVELS.window&&bounds.max.y>WALL_LEVELS.window+5.4&&bounds.max.y<WALL_LEVELS.window+6);
  if(previous){assert.ok(bounds.min.x>previous.max.x);assert.ok(Math.abs(bounds.min.y-previous.min.y)<1e-8);assert.ok(Math.abs(bounds.max.y-previous.max.y)<1e-8);}previous=bounds;
  assert.ok(Math.abs(FRONT_WINDOW_AXES[i]+FRONT_WINDOW_AXES[7-i])<1e-8);
 }
});
test('organ pipes sit inside deep chambers behind projecting case columns and a solid pediment',()=>{
 const scene=new T.Scene(),organ=buildOrgan(scene,new T.MeshLambertMaterial());scene.updateMatrixWorld(true);const chambers:T.Object3D[]=[],pipes:T.Mesh[]=[];let pediment:T.Object3D|undefined;
 organ.traverse(o=>{if(o.userData.landmark==='organ-pipe-chamber')chambers.push(o);if(o.userData.organPipe)pipes.push(o as T.Mesh);if(o.userData.landmark==='organ-pediment')pediment=o;});
 assert.equal(chambers.length,3);assert.equal(pipes.length,63);assert.equal(organ.children.filter(o=>o.userData.landmark==='organ-case-pier').length,6);
 const depth=new T.Box3().setFromObject(pediment!).getSize(new T.Vector3()).z;assert.ok(depth>3);
 const z=pipes.map(p=>p.getWorldPosition(new T.Vector3()).z);assert.ok(Math.max(...z)-Math.min(...z)>.8,'pipes must occupy different depth planes');
 assert.ok(Math.max(...z)<ORGAN_CASE.back+ORGAN_CASE.frameDepth-.8,'the pipes must be recessed behind the frame');
 for(const chamber of chambers)assert.ok(new T.Box3().setFromObject(chamber).getSize(new T.Vector3()).z>2);
});
test('the projecting organ balcony has a solid floor at gallery height under its entire curved rail',()=>{
 const scene=new T.Scene(),organ=buildOrgan(scene,new T.MeshLambertMaterial());scene.updateMatrixWorld(true);const floor=organ.children.find(o=>o.userData.landmark==='organ-loft-floor')!;
 for(const x of [-15,-10,-5,0,5,10,15]){
  const z=ORGAN_CASE.back+organBalconyFront(x)-.2,ray=new T.Raycaster(new T.Vector3(x,H.balconyHeight+1,z),new T.Vector3(0,-1,0)),hit=ray.intersectObject(floor)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-H.balconyHeight)<1e-6);
 }
 const bounds=new T.Box3().setFromObject(floor);assert.ok(bounds.getSize(new T.Vector3()).z>6.5);assert.ok(Math.abs(bounds.min.y-(H.balconyHeight-.48))<1e-6);
 assert.ok(organBalconyFront(0)>organBalconyFront(4.3)+1.7);assert.ok(organBalconyFront(8.3)>organBalconyFront(4.3)+.8);assert.ok(Math.abs(organBalconyFront(15.35)-3.1)<1e-6);
});

test('the organ has three manuals, stop knobs, pedals and a bench inside its projecting loft',()=>{
 const scene=new T.Scene(),organ=buildOrgan(scene,new T.MeshLambertMaterial());scene.updateMatrixWorld(true);const console=organ.children.find(o=>o.userData.landmark==='organ-console')!;assert.ok(console);
 for(const [name,count]of [['organ-manual',3],['organ-stop',24],['organ-pedalboard',1],['organ-bench',1]] as const){const parts:T.Object3D[]=[];console.traverse(o=>{if(o.userData.landmark===name)parts.push(o);});assert.equal(parts.length,count);}
 const floor=organ.children.find(o=>o.userData.landmark==='organ-loft-floor')!,bounds=new T.Box3().setFromObject(console);assert.ok(bounds.max.y>H.balconyHeight+1.9,'the console must stand above the rail');
 // Check actual low parts, rather than the empty corners of an aggregate box
 // combining the wide case and the narrower pedalboard extending forward.
 let checked=0;console.traverse(o=>{if(!(o instanceof T.Mesh))return;const b=new T.Box3().setFromObject(o);if(b.min.y>H.balconyHeight+.3)return;for(const x of [b.min.x,b.max.x])for(const z of [b.min.z,b.max.z]){assert.ok(new T.Raycaster(new T.Vector3(x,H.balconyHeight+.1,z),new T.Vector3(0,-1,0)).intersectObject(floor).length,'console foot or pedalboard must be supported by the loft');checked++;}});assert.ok(checked>20);
 for(const x of [bounds.min.x,0,bounds.max.x]){
  const clearDepth=ORGAN_CASE.back+organBalconyFront(x)-.24-bounds.max.z;
  assert.ok(clearDepth>=2,`the performer must have at least two units of free floor behind the bench, at x=${x}`);
  for(const z of [bounds.max.z+.5,bounds.max.z+1.5])assert.ok(new T.Raycaster(new T.Vector3(x,H.balconyHeight+.1,z),new T.Vector3(0,-1,0)).intersectObject(floor).length);
 }
});

test('the deeper organ balcony and corbels leave every musician face visible from the concert camera',()=>{
 const scene=new T.Scene(),organ=buildOrgan(scene,new T.MeshLambertMaterial()),actors=buildOrchestra(scene);for(const a of actors)a.update(0,0,musicianSits(a.instrumentType),false,null,10,1);scene.updateMatrixWorld(true);
 const eye=new T.Vector3(...CONCERT_CAMERA.eye),ray=new T.Raycaster();for(const a of actors){const target=a.head.localToWorld(new T.Vector3(0,.09,-.34)),d=target.clone().sub(eye);ray.set(eye,d.clone().normalize());ray.far=d.length()-.02;assert.equal(ray.intersectObject(organ,true).length,0,`${a.instrumentType} is hidden by the organ balcony`);}
});
