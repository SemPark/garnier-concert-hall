import * as T from 'three';
import {partnerRoutineYaw} from '../../shared/dance';
import {constrainCamera} from './cameraCollision';

type GroundPoint={x:number;z:number};
type Point=GroundPoint&{y:number};

/** Look across the line between partners, favoring the current and unblocked side. */
export function duetSideYaw(pairAxis:number,currentYaw:number,clearDistance:(yaw:number)=>number){
 const left=pairAxis+Math.PI/2,right=pairAxis-Math.PI/2;
 const [near,far]=Math.cos(currentYaw-left)>=Math.cos(currentYaw-right)?[left,right]:[right,left];
 return clearDistance(far)>clearDistance(near)+.35?far:near;
}

/** Both dancers look along local -Z; prefer their front, then a clear front diagonal. */
export function duetFrontYaw(pairAxis:number,currentYaw:number,clearDistance:(yaw:number)=>number,minClearance:number){
 const front=partnerRoutineYaw(pairAxis)+Math.PI;
 if(clearDistance(front)>=minClearance)return front;
 for(const angle of [Math.PI/6,Math.PI/3]){
  const left=front-angle,right=front+angle;
  const [near,far]=Math.cos(currentYaw-left)>=Math.cos(currentYaw-right)?[left,right]:[right,left];
  if(clearDistance(near)>=minClearance)return near;
  if(clearDistance(far)>=minClearance)return far;
 }
 return duetSideYaw(pairAxis,currentYaw,clearDistance);
}

/** Orbit along the shorter arc; never take a straight path through the dancers. */
export function stepDuetCameraYaw(yaw:number,target:number,dt:number){
 const offset=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw));
 if(Math.abs(offset)<.012)return {yaw:target,done:true};
 return {yaw:yaw+T.MathUtils.clamp(offset*(1-Math.exp(-dt*5)),-dt*3.6,dt*3.6),done:false};
}

/** A dancer looks along local -Z. Change the base heading, not the move's turns. */
export function soloCameraFacing(poseYaw:number,baseYaw:number,dancer:GroundPoint,eye:GroundPoint){
 const x=dancer.x-eye.x,z=dancer.z-eye.z;
 return x*x+z*z<.04**2?poseYaw:Math.atan2(x,z)+(poseYaw-baseYaw);
}

export function danceCameraFrame(center:Point,yaw:number,pitch:number,distance:number,duet:boolean,walls:readonly T.Object3D[]){
 const look=new T.Vector3(center.x,center.y+(duet?.95:.75),center.z);
 const horizontal=distance*Math.cos(pitch);
 const desired=new T.Vector3(
  look.x+Math.sin(yaw)*horizontal,
  Math.max(center.y+.35,look.y+distance*Math.sin(pitch)),
  look.z+Math.cos(yaw)*horizontal,
 );
 return {look,position:constrainCamera(look,desired,walls)};
}
