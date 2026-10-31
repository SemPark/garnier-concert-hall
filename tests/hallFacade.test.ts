import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {rearFacade,buildGoldenHall,upperDoor,UPPER_DOOR} from '../src/scene/GoldenHall';
import {buildStairs} from '../src/scene/Stairs';
import {hallImageMaterial} from '../src/scene/HallTextures';
import {STAIR,GALLERY_RAIL_HEIGHT,GALLERY_BRIDGE,REAR_COLUMNS} from '../shared/gallery';
import {FLOOR_AISLES,walkable} from '../shared/venue';
import {GOLDEN_HALL as H} from '../shared/goldenHall';

test('the repeatable architectural images stay below 192 KB and reuse one material per image',()=>{
 const dir=new URL('../src/assets/hall/',import.meta.url),files=readdirSync(dir).filter(f=>/\.(svg|webp)$/.test(f));
 assert.equal(files.length,9);assert.ok(files.reduce((sum,f)=>sum+statSync(new URL(f,dir)).size,0)<192*1024);
 for(const kind of ['scroll','relief','pilaster','soffit','ceiling1','ceiling2','walnut','damask','fresco'] as const)assert.equal(hallImageMaterial(kind),hallImageMaterial(kind));
 for(const file of files.filter(f=>f.endsWith('.svg'))){const svg=readFileSync(new URL(file,dir),'utf8');assert.ok(!/<image\b|<script\b|https?:\/\/(?!www.w3.org)/.test(svg),'no photo, script or remote dependency belongs in the reusable art');}
});

test('six timber columns carry the rear gallery front, in front of the stairs and clear of the aisles',()=>{
 const scene=new T.Scene(),facade=rearFacade(scene);scene.updateMatrixWorld(true);
 const columns=facade.children.filter(o=>o.userData.landmark==='rear-portico-column');assert.equal(columns.length,REAR_COLUMNS.xs.length);
 for(const column of columns){const b=new T.Box3().setFromObject(column);assert.ok(b.max.y<=H.balconyHeight-.3+1e-6,'below the gallery slab');assert.ok(b.max.z<STAIR.z-STAIR.width/2,'in front of the stairs');assert.ok(b.min.z>=GALLERY_BRIDGE.minZ-.01);
  const x=(b.min.x+b.max.x)/2;for(const aisle of FLOOR_AISLES)assert.ok(Math.abs(x-aisle)>REAR_COLUMNS.radius+.6,'aisles stay open');}
 for(const x of REAR_COLUMNS.xs)assert.equal(walkable('auditorium',{x,y:0,z:REAR_COLUMNS.z}),false,'visitors walk around columns');
 const doors:T.Object3D[]=[];facade.traverse(o=>{if(o.userData.landmark==='timber-door')doors.push(o);});assert.equal(doors.length,3,'the rear upper wall has no repeated row of invented pedimented doors');
});

test('upper doors start at balcony level and the repeated painted details are shared',()=>{
 const scene=new T.Scene();buildGoldenHall(scene);const upper:T.Object3D[]=[],images=new Set<T.Material>();scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(o.userData.landmark==='timber-door'&&o.userData.doorBottom>H.balconyHeight)upper.push(o);if(o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material.userData.hallImage)images.add(o.material);});
 assert.equal(upper.length,26);for(const door of upper){const b=new T.Box3().setFromObject(door);assert.ok(b.min.y>=H.balconyHeight&&b.min.y<H.balconyHeight+.5);assert.ok(b.max.y>H.balconyHeight+7&&b.max.y<H.balconyHeight+7.4);}
 assert.equal(new Set([...images].map(m=>m.userData.hallImage)).size,9);
});

test('dark timber stair treads retain the full walkable slope with no support pillars',()=>{
 const scene=new T.Scene(),stairs=buildStairs(scene);scene.updateMatrixWorld(true);
 const flights=scene.children.filter(o=>o.userData.landmark==='rear-stair');assert.equal(flights.length,2);
 for(const flight of flights){const treads=flight.children.filter(o=>o.userData.landmark==='stair-tread');assert.equal(treads.length,STAIR.steps);
  treads.forEach((tread,i)=>{const b=new T.Box3().setFromObject(tread);assert.ok(Math.abs(b.max.y-(i+1)*STAIR.height/STAIR.steps)<1e-6);assert.ok(b.max.y-b.min.y<=.101);assert.ok(stairs.surfaces.includes(tread as T.Mesh));});
  const rails=flight.children.filter(o=>o.userData.landmark==='stair-handrail');assert.equal(rails.length,2);for(const rail of rails)assert.ok(new T.Box3().setFromObject(rail).max.y<=STAIR.height+GALLERY_RAIL_HEIGHT+.05);
 }
});


test('the upper door keeps a tall two-leaf opening and its sculpted pediment fits below the next cornice',()=>{
 const scene=new T.Scene(),door=upperDoor(scene,8.6);scene.updateMatrixWorld(true);assert.ok(UPPER_DOOR.height/UPPER_DOOR.width>1.8);
 const bounds=new T.Box3().setFromObject(door);assert.ok(bounds.max.y>18.2&&bounds.max.y<18.45);
 const body=door.children.find(o=>o.userData.landmark==='timber-door')!;const b=new T.Box3().setFromObject(body);assert.ok(b.max.y>15.5&&b.max.y<15.8);assert.ok(b.min.y>=H.balconyHeight);
});


test('floor grain repeats at world scale while gallery undersides keep their original finish',async()=>{
 const {applyWoodSurface,woodMaterial}=await import('../src/scene/HallTextures');const {buildGalleryFloors}=await import('../src/scene/GalleryFloors');
 const slab=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial());slab.scale.set(32,.15,82);applyWoodSurface(slab);
 const uv=slab.geometry.getAttribute('uv');let max=0;for(let i=0;i<uv.count;i++)max=Math.max(max,Math.abs(uv.getX(i)),Math.abs(uv.getY(i)));assert.ok(max>15,'one image must not stretch over the whole room');
 assert.equal(woodMaterial('frame',true),woodMaterial('frame',true));assert.ok(woodMaterial('frame',true) instanceof T.MeshStandardMaterial);
 const gallery=buildGalleryFloors(new T.Scene());for(const floor of gallery){assert.ok(Array.isArray(floor.material));assert.equal(floor.material[1],woodMaterial('oak'));assert.ok(floor.geometry.groups.some(g=>g.materialIndex===0));assert.ok(floor.geometry.groups.some(g=>g.materialIndex===1));}
});


test('ceiling paintings use all four atlas quadrants and frame beams have no duplicate joins',async()=>{
 const {paintedCeiling}=await import('../src/scene/HallDetails');const scene=new T.Scene();paintedCeiling(scene);scene.updateMatrixWorld(true);
 const paintings:T.Mesh[]=[],beams:T.Object3D[]=[];scene.traverse(o=>{if(o.userData.landmark==='ceiling-fresco')paintings.push(o as T.Mesh);if(o.userData.landmark==='ceiling-timber-beam')beams.push(o);});
 assert.equal(paintings.length,25);assert.equal(new Set(paintings.map(p=>p.userData.variant)).size,4);assert.equal(new Set(paintings.map(p=>p.material)).size,1);
 for(const p of paintings){const uv=p.geometry.getAttribute('uv'),col=p.userData.variant%2,row=Math.floor(p.userData.variant/2);for(let i=0;i<uv.count;i++){assert.ok(uv.getX(i)>col*.5&&uv.getX(i)<(col+1)*.5);assert.ok(uv.getY(i)>(1-row)*.5&&uv.getY(i)<(2-row)*.5);}assert.ok(p.position.y<-.08,'the new painting must cover the old printed placeholder');}
 assert.equal(beams.length,16);assert.equal(new Set(beams.map(b=>b.position.toArray().join(','))).size,beams.length);
});
