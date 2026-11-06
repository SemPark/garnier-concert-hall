import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {attachedPanel} from '../src/scene/attachedPanel';
test('attached panels meet exactly and preserve front depth, silhouette and side faces',()=>{
 const root=new T.Group(),m=new T.MeshLambertMaterial();const border=attachedPanel(root,2,3,.24,.30,0,2,m),inset=attachedPanel(root,1.88,2.88,.30,.3425,0,2,m);
 root.updateMatrixWorld(true);const a=new T.Box3().setFromObject(border),b=new T.Box3().setFromObject(inset);
 assert.ok(Math.abs(a.max.z-b.min.z)<1e-6);assert.ok(Math.abs(b.max.z-.3425)<1e-6);
 assert.equal(border.geometry.index!.count/3,10);
 const n=border.geometry.getAttribute('normal'),idx=border.geometry.index!;for(let i=0;i<idx.count;i++)assert.ok(n.getZ(idx.getX(i))>-.5);
 assert.equal(a.min.x,-1);assert.equal(a.max.x,1);
});
