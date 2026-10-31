import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildOrgan,balustrade} from '../src/scene/GoldenHall';
import {buildGalleryFloors} from '../src/scene/GalleryFloors';
import {GOLDEN_HALL as H} from '../shared/goldenHall';
import {galleryRailSpans} from '../shared/gallery';
import {ORGAN_LOFT_BACK,ORGAN_LOFT_CONTOUR,ORGAN_RAIL_JOIN_X,ORGAN_RAIL_JOIN_Z,ORGAN_RAIL_POST_HALF} from '../shared/organLoft';

test('organ and side guardrails share their top elevation and stop at one joint rather than crossing',()=>{
 const scene=new T.Scene(),organ=buildOrgan(scene,new T.MeshLambertMaterial()),reference=new T.Group();reference.position.y=H.balconyHeight;scene.add(reference);balustrade(reference,2,new T.MeshLambertMaterial());scene.updateMatrixWorld(true);
 const expected=new T.Box3().setFromObject(reference).max.y,rails=organ.children.filter(o=>o.userData.landmark==='organ-loft-rail'),posts=organ.children.filter(o=>o.userData.landmark==='organ-rail-join');assert.equal(posts.length,2);
 for(const rail of rails){const b=new T.Box3().setFromObject(rail);assert.ok(Math.abs(b.max.y-expected)<1e-6);assert.ok(b.min.x>=-ORGAN_RAIL_JOIN_X+.04&&b.max.x<=ORGAN_RAIL_JOIN_X-.04,'a curved rail must not continue through a side rail');}
 for(const post of posts)assert.ok(Math.abs(new T.Box3().setFromObject(post).max.y-expected)<1e-6);
 const spans=H.bayCenters.flatMap(galleryRailSpans);assert.ok(Math.abs(Math.min(...spans.map(s=>s.start))-(ORGAN_RAIL_JOIN_Z+ORGAN_RAIL_POST_HALF))<1e-8);
});

test('the organ loft and side gallery draw only one top surface across their shared contour',()=>{
 const scene=new T.Scene(),organ=buildOrgan(scene,new T.MeshLambertMaterial()),slabs=buildGalleryFloors(scene),floor=organ.children.find(o=>o.userData.landmark==='organ-loft-floor')!;scene.updateMatrixWorld(true);
 for(const side of [-1,1])for(const x of [12.7,13.2,14,14.8,15.2]){
  // Interpolate the actual shared polygon, not a different analytic approximation.
  const xx=side*x,i=ORGAN_LOFT_CONTOUR.findIndex(p=>p.x>=xx),a=ORGAN_LOFT_CONTOUR[i-1],b=ORGAN_LOFT_CONTOUR[i],front=ORGAN_LOFT_BACK+a.z+(b.z-a.z)*(xx-a.x)/(b.x-a.x);
  for(const offset of [-.08,.08]){const hits=new T.Raycaster(new T.Vector3(xx,H.balconyHeight+.1,front+offset),new T.Vector3(0,-1,0)).intersectObjects([floor,...slabs],false).filter(h=>Math.abs(h.point.y-H.balconyHeight)<1e-5);assert.equal(hits.length,1,`overlap or gap at ${xx}, ${front+offset}`);}
 }
});
