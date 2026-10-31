import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {buildSunlight,SUN_WINDOWS,SUN_DIRECTION,sunFloorPoint} from '../src/scene/Sunlight';
import {GOLDEN_HALL as H} from '../shared/goldenHall';

test('sun shafts enter through right-hand windows and land on the parterre inside the hall',()=>{
 assert.ok(SUN_DIRECTION.x<0&&SUN_DIRECTION.y<0,'light comes from the right and falls downwards');
 for(const window of SUN_WINDOWS){
  assert.ok(window.x>H.width/2-1,'a right-side window, not the front row');
  const floor=sunFloorPoint(window);assert.ok(Math.abs(floor.y)<1e-9);
  assert.ok(Math.abs(floor.x)<H.width/2&&floor.z>H.front&&floor.z<H.rear,'the pool of light stays inside the hall');
 }
});

test('the sunlight layer is one shaft and floor pool per window plus a single dust batch',()=>{
 const scene=new T.Scene(),sun=buildSunlight(scene);const count=(name:string)=>sun.root.children.filter(o=>o.userData.landmark===name).length;
 assert.equal(count('sun-shaft'),SUN_WINDOWS.length);assert.equal(count('sun-pool'),SUN_WINDOWS.length);assert.equal(count('sun-dust'),1);
 sun.update(12.5);sun.setViewport(800,61);
});
