import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {projectedHeight,musicianInterval} from '../src/scene/projectedDetail';
import {removeDuplicates} from '../src/scene/removeDuplicates';
test('zoom preserves readable musician motion even at a large distance',()=>{
 assert.equal(musicianInterval(projectedHeight(1.4,90,1)),50);
 assert.equal(musicianInterval(projectedHeight(1.4,90,5)),1000/30);
 assert.equal(musicianInterval(projectedHeight(1.4,15,1.5)),1000/30);
});
test('deduplication preserves different finishes, openings and interactive meshes',()=>{
 const scene=new T.Scene(),g=new T.BoxGeometry(2,3,.1),mat=new T.MeshLambertMaterial();
 const a=new T.Mesh(g,mat),duplicate=new T.Mesh(g,mat),offset=new T.Mesh(g,mat),finish=new T.Mesh(g,mat.clone()),target=new T.Mesh(g,mat);
 offset.position.x=1;scene.add(a,duplicate,offset,finish,target);scene.updateMatrixWorld(true);
 assert.equal(removeDuplicates(scene,new Set([target])),1);assert.equal(duplicate.parent,null);assert.equal(offset.parent,scene);assert.equal(finish.parent,scene);assert.equal(target.parent,scene);
});

test('buried faces are removed while exposed faces and cutaway blockers remain',async()=>{
 const {removeBuriedFaces}=await import('../src/scene/hiddenFaces');
 const scene=new T.Scene(),wall=new T.Mesh(new T.BoxGeometry(8,8,.4),new T.MeshLambertMaterial()),panel=new T.Mesh(new T.BoxGeometry(3,3,.2),new T.MeshLambertMaterial());panel.position.z=.2;scene.add(wall,panel);scene.updateMatrixWorld(true);
 assert.equal(removeBuriedFaces(scene,new Set()),2);assert.equal(panel.geometry.index!.count,30);
 const other=new T.Scene(),cut=wall.clone(),behind=new T.Mesh(new T.BoxGeometry(1,1,.1),new T.MeshLambertMaterial());cut.userData.cameraOccluder=true;other.add(cut,behind);other.updateMatrixWorld(true);assert.equal(removeBuriedFaces(other,new Set()),0);
});
