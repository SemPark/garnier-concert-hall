import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {rearFacade,buildGoldenHall,upperDoor,UPPER_DOOR} from '../src/scene/GoldenHall';
import {hallImageMaterial} from '../src/scene/HallTextures';
import {GALLERY_BRIDGE,REAR_COLUMNS,STAIR_DOORS} from '../shared/gallery';
import {FLOOR_AISLES,walkable} from '../shared/venue';
import {GOLDEN_HALL as H} from '../shared/goldenHall';

test('the repeatable architectural images stay below 192 KB and reuse one material per image',()=>{
 const dir=new URL('../src/assets/hall/',import.meta.url),files=readdirSync(dir).filter(f=>/\.(svg|webp)$/.test(f)&&!['conductor-programme.webp','garnier-stair-ceiling.webp'].includes(f));
 assert.equal(files.length,9);assert.ok(files.reduce((sum,f)=>sum+statSync(new URL(f,dir)).size,0)<192*1024);
 for(const kind of ['scroll','relief','pilaster','soffit','ceiling1','ceiling2','walnut','damask','fresco'] as const)assert.equal(hallImageMaterial(kind),hallImageMaterial(kind));
 for(const file of files.filter(f=>f.endsWith('.svg'))){const svg=readFileSync(new URL(file,dir),'utf8');assert.ok(!/<image\b|<script\b|https?:\/\/(?!www.w3.org)/.test(svg),'no photo, script or remote dependency belongs in the reusable art');}
});

test('six timber columns carry the rear gallery front, under the gallery front and clear of the aisles',()=>{
 const scene=new T.Scene(),facade=rearFacade(scene);scene.updateMatrixWorld(true);
 const columns=facade.children.filter(o=>o.userData.landmark==='rear-portico-column');assert.equal(columns.length,REAR_COLUMNS.xs.length);
 for(const column of columns){const b=new T.Box3().setFromObject(column);assert.ok(b.max.y<=H.balconyHeight-.3+1e-6,'below the gallery slab');assert.ok(b.max.z<GALLERY_BRIDGE.minZ+1.2,'under the gallery front');assert.ok(b.min.z>=GALLERY_BRIDGE.minZ-.01);
  const x=(b.min.x+b.max.x)/2;for(const aisle of FLOOR_AISLES)assert.ok(Math.abs(x-aisle)>REAR_COLUMNS.radius+.6,'aisles stay open');}
 for(const x of REAR_COLUMNS.xs)assert.equal(walkable('auditorium',{x,y:0,z:REAR_COLUMNS.z}),false,'visitors walk around columns');
 const doors:T.Object3D[]=[];facade.traverse(o=>{if(o.userData.landmark==='timber-door')doors.push(o);});assert.equal(doors.length,3,'the rear upper wall has no repeated row of invented pedimented doors');
});

test('upper doors start at balcony level and the repeated painted details are shared',()=>{
 const scene=new T.Scene();buildGoldenHall(scene);const upper:T.Object3D[]=[],images=new Set<T.Material>();scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(o.userData.landmark==='timber-door'&&o.userData.doorBottom>H.balconyHeight)upper.push(o);if(o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material.userData.hallImage)images.add(o.material);});
 assert.equal(upper.length,14);const decorative:T.Object3D[]=[];scene.traverse(o=>{if(o.userData.landmark==='upper-decorated-panel')decorative.push(o);});assert.equal(decorative.length,12);for(const door of upper){const b=new T.Box3().setFromObject(door);assert.ok(b.min.y>=H.balconyHeight&&b.min.y<H.balconyHeight+.5);assert.ok(b.max.y>H.balconyHeight+7&&b.max.y<H.balconyHeight+7.6);}
 assert.equal(new Set([...images].map(m=>m.userData.hallImage)).size,9);
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

test('stair doors are closed on both floors and no stair arrows remain',()=>{
 const scene=new T.Scene(),facade=rearFacade(scene);let open=0,leaves=0;facade.traverse(o=>{if(o.userData.open)open++;if(o.userData.landmark==='open-door-leaf')leaves++;});
 assert.equal(open,0,'no door stands open');assert.equal(leaves,0,'no swung door leaves');
});

test('short rear walls hide the stair doors from the front of the hall, as in the original',async()=>{
 const {REAR_SCREENS}=await import('../shared/gallery');const scene=new T.Scene();buildGoldenHall(scene);scene.updateMatrixWorld(true);
 const screens=scene.children.filter(o=>o.userData.landmark==='rear-screen');assert.equal(screens.length,2);
 const blockers:T.Object3D[]=[];for(const s of screens)s.traverse(o=>{if(o instanceof T.Mesh)blockers.push(o);});
 const ray=new T.Raycaster();
 // From the front and middle of the hall, the line of sight to each stair doorway runs into a screen.
 for(const side of [-1,1])for(const eye of [[0,1.6,0],[-side*6,1.6,0],[side*8,1.6,10],[0,1.6,20]]){
  const from=new T.Vector3(...eye),to=new T.Vector3(side*STAIR_DOORS.lower.x,2,H.rear),dir=to.clone().sub(from);const length=dir.length();ray.set(from,dir.normalize());ray.far=length;
  assert.ok(ray.intersectObjects(blockers,false).length>0,`stair door ${side} hidden from ${eye}`);}
 for(const side of [-1,1]){assert.equal(walkable('auditorium',{x:side*12.6,y:0,z:REAR_SCREENS.z}),false);assert.ok(walkable('auditorium',{x:side*12.6,y:0,z:48.6}),'the corner is open behind the colonnade');}
});

test('door handles remain visible details and gallery inlays clear the ivory field',()=>{
 const scene=new T.Scene();buildGoldenHall(scene);scene.updateMatrixWorld(true);
 let handles=0;scene.traverse(o=>{if(o.userData.landmark==='door-handle'){handles++;assert.equal(o.userData.fullDetail,true);assert.equal(o.userData.essentialDetail,true);}});assert.ok(handles>20);
 const panels:T.Object3D[]=[];scene.traverse(o=>{if(o.userData.landmark==='upper-decorated-panel')panels.push(o);});
 for(const panel of panels){assert.equal(panel.children.filter(o=>o.userData.landmark==='ivory-panel-field').length,2);assert.ok(panel.children.some(o=>o.userData.landmark==='panel-portrait-medallion'),'new portrait crest sits over the twin fields');assert.ok(panel.children.some(o=>o.userData.landmark==='panel-centre-sconce'),'light is centred on the gilded spine');}
});

test('gallery ceiling lights remain shallow discs and door lights clear the leaf',()=>{
 const scene=new T.Scene();buildGoldenHall(scene);scene.updateMatrixWorld(true);let flat=0,headers=0;
 scene.traverse(o=>{
  if(o.userData.landmark==='flat-ceiling-light'){flat++;const size=new T.Box3().setFromObject(o).getSize(new T.Vector3());assert.ok(size.y<.025&&size.x>.35&&size.z>.35,'light must not become a hanging capsule');}
  if(o.userData.landmark==='door-header-light'){headers++;const frame=o.parent!,height=frame.children.find(c=>c.userData.landmark==='door-handle')?.position.y;assert.ok(height!==undefined&&o.position.y>height+2,'header stays above the door leaf, clear of its panels');}
 });assert.ok(flat>40&&headers>15);
});
