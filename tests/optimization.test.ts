import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {solidOcclusion} from '../src/scene/solidOcclusion';
import {zoneUpdate} from '../shared/zoneUpdates';
import type {Visitor} from '../shared/venue';
test('solid wall culls fully hidden bounds but preserves edges and objects before it',()=>{
 const hidden=solidOcclusion([new T.Box3(new T.Vector3(-2,-2,-5),new T.Vector3(2,2,-4))]),eye=new T.Vector3();
 assert.equal(hidden(eye,new T.Vector3(0,0,-8),.5),true);
 assert.equal(hidden(eye,new T.Vector3(0,0,-2),.5),false);
 assert.equal(hidden(eye,new T.Vector3(4,0,-8),1),false);
 assert.equal(hidden(new T.Vector3(0,0,-4.5),new T.Vector3(0,0,-8),.5),false);
});
test('zone changes remove old neighbours and include stationary new neighbours',()=>{
 const a={id:'a',zone:'lobby'} as Visitor,b={id:'b',zone:'auditorium'} as Visitor;
 const first=zoneUpdate([a,b],[],new Set(['b']),'lobby');assert.deepEqual(first.visitors,[a]);assert.deepEqual(first.left,['b']);
 const next=zoneUpdate([a,b],[],first.ids,'auditorium');assert.deepEqual(next.visitors,[b]);assert.deepEqual(next.left,['a']);
 assert.deepEqual(zoneUpdate([a,b],[a],next.ids,'auditorium').visitors,[]);
});
