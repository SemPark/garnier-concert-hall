import assert from 'node:assert/strict';
import test from 'node:test';
import {DanceControls,DanceStart} from '../src/DanceControls';
import type {World} from '../src/World';
import {dancePose,handleDance} from '../shared/dance';
import {surfaceHeight,walkable,type Visitor} from '../shared/venue';

test('dance button starts here directly and no chooser is rendered while idle',()=>{
 const calls:string[]=[];
 const world={zone:'auditorium',startDanceHere:()=>calls.push('startDanceHere')} as unknown as World;
 const button=DanceStart({world,disabled:false,children:null});
 assert.equal(button.props['aria-label'],'춤추기');
 button.props.onClick();
 assert.deepEqual(calls,['startDanceHere']);
 assert.equal(DanceControls({world,exitIcon:null}),null);
});

test('a standing solo starts at the current position without any walk or position change',()=>{
 const solo:Visitor={id:'solo',name:'solo',color:0,zone:'auditorium',x:.4,y:0,z:47.7,yaw:.2,pose:'idle',seatId:null,gesture:null,gestureAt:0};
 const anchor=[solo.x,solo.y,solo.z];
 assert.equal(handleDance(solo,[solo],{type:'danceStart'},10000),null);
 assert.ok(solo.dance);
 for(const time of [10000,10500,13200]){
  const pose=dancePose(solo,time);
  assert.deepEqual([pose.x,pose.y,pose.z],anchor);
 }
 for(const point of [{x:0,y:0,z:43},{x:14.7,y:8.3,z:10}]){
  const guest:Visitor={...solo,...point,y:surfaceHeight('auditorium',point)!,dance:undefined};
  assert.ok(walkable('auditorium',guest));
  assert.equal(handleDance(guest,[guest],{type:'danceStart'},14000),null);
  assert.equal(guest.dance?.joinSpot,undefined,'no room for a partner is not a solo restriction');
  const pose=dancePose(guest,14500);
  assert.deepEqual([pose.x,pose.y,pose.z],[guest.x,guest.y,guest.z]);
 }
 const lobby:Visitor={...solo,id:'lobby',zone:'lobby',dance:undefined};
 assert.ok(handleDance(lobby,[lobby],{type:'danceStart'},14000));
 assert.equal(lobby.dance,undefined);
});
