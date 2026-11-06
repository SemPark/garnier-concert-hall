import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {faceYaw,rightStroke,conductorTurn,conductorShift} from '../src/scene/conductPose';
test('conductor faces the orchestra and musicians face back toward the podium',()=>{
 const forward=new T.Vector3(0,0,-1).applyAxisAngle(new T.Vector3(0,1,0),faceYaw(0,-10));assert.ok(forward.z<-.99);
 const player=new T.Vector3(0,0,-1).applyAxisAngle(new T.Vector3(0,1,0),faceYaw(2,10));assert.ok(player.z>0&&player.x>0);
});
test('right hand follows screen-left and screen-right while the stroke moves downward',()=>{
 const hand=(x:number,s:number)=>new T.Vector3(0,-.4,0).applyEuler(rightStroke(x,s)).add(new T.Vector3(.16,.99,0)).applyAxisAngle(new T.Vector3(0,1,0),conductorTurn(x)).add(new T.Vector3(conductorShift(x),0,0));
 assert.ok(hand(-1,1).x>0);assert.ok(hand(1,1).x<0);assert.ok(hand(0,1).y<hand(0,0).y);assert.ok(hand(0,1).z<0);
});

test('right arm stays in front on its own side while the body handles the turn',()=>{for(const direction of [-1,0,1])for(const stroke of [0,.5,1]){const hand=new T.Vector3(0,-.4,0).applyEuler(rightStroke(direction,stroke)).add(new T.Vector3(.16,.99,0));assert.ok(hand.x>.16);assert.ok(hand.z<-.2);}});
