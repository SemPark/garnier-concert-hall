import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildFrontWindows,buildOrgan,FRONT_WINDOW_AXES,ORGAN_CASE,organBalconyFront} from '../src/scene/GoldenHall';
import {WALL_LEVELS} from '../src/scene/HallWallBands';
import {GOLDEN_HALL as H} from '../shared/goldenHall';

test('the front has one symmetric, evenly spaced row of full-height blind arches',()=>{
 const scene=new T.Scene();buildFrontWindows(scene);scene.updateMatrixWorld(true);const windows:T.Object3D[]=[];scene.traverse(o=>{if(o.userData.landmark==='front-window')windows.push(o);});
 assert.equal(windows.length,8);let previous:T.Box3|undefined;
 for(const [i,w]of windows.entries()){
  const bounds=new T.Box3().setFromObject(w);assert.equal(w.position.x,FRONT_WINDOW_AXES[i]);assert.ok(bounds.min.y<WALL_LEVELS.window&&bounds.max.y>WALL_LEVELS.window+6);
  if(previous){assert.ok(bounds.min.x>previous.max.x);assert.ok(Math.abs(bounds.min.y-previous.min.y)<1e-8);assert.ok(Math.abs(bounds.max.y-previous.max.y)<1e-8);}previous=bounds;
  assert.ok(Math.abs(FRONT_WINDOW_AXES[i]+FRONT_WINDOW_AXES[7-i])<1e-8);
 }
});
test('organ pipes sit inside deep chambers behind projecting case columns and a solid pediment',()=>{
 const scene=new T.Scene(),organ=buildOrgan(scene,new T.MeshLambertMaterial());scene.updateMatrixWorld(true);const chambers:T.Object3D[]=[],pipes:T.Mesh[]=[];let pediment:T.Object3D|undefined;
 organ.traverse(o=>{if(o.userData.landmark==='organ-pipe-chamber')chambers.push(o);if(o.userData.organPipe)pipes.push(o as T.Mesh);if(o.userData.landmark==='organ-pediment')pediment=o;});
 assert.equal(chambers.length,3);assert.equal(pipes.length,63);
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
 const bounds=new T.Box3().setFromObject(floor);assert.ok(bounds.getSize(new T.Vector3()).z>5);assert.ok(Math.abs(bounds.min.y-(H.balconyHeight-.32))<1e-6);
});
