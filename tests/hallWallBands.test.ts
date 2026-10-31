import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildPerimeterCornices,WALL_DATUM,WALL_LEVELS} from '../src/scene/HallWallBands';

test('side, rear and mitred corner mouldings share one elevation without overlapping caps',()=>{
 const scene=new T.Scene();buildPerimeterCornices(scene);scene.updateMatrixWorld(true);
 const cornices=scene.children.filter(o=>o.userData.landmark==='perimeter-cornice');assert.equal(cornices.length,12);
 for(const y of WALL_LEVELS.cornices){
  const band=cornices.filter(o=>o.userData.elevation===y),x=WALL_DATUM.halfWidth-.32,front=WALL_DATUM.front+.32,rear=WALL_DATUM.rear-.32;
  const heights=[[-x,0],[x,0],[0,rear],[0,front],[-x,rear],[x,rear],[-x,front],[x,front]].map(([xx,z])=>{
   const hits=new T.Raycaster(new T.Vector3(xx,y+1,z),new T.Vector3(0,-1,0)).intersectObjects(band,false);
   assert.ok(hits.length,`missing cornice at ${xx}, ${y}, ${z}`);return hits[0].point.y;
  });
  assert.ok(heights.every(h=>Math.abs(h-heights[0])<1e-6));
  assert.equal(new T.Raycaster(new T.Vector3(0,y+1,0),new T.Vector3(0,-1,0)).intersectObjects(band,false).length,0,'the perimeter must leave the hall interior open');
 }
});
