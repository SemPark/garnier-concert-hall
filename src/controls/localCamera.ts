import * as T from 'three';
import type {Seat} from '../../shared/venue';

/** A three-quarter view puts the seated visitor beside the table in the frame. */
export function dinnerCameraFrame(point:T.Vector3,seat:Seat,table:{x:number;z:number},yaw:number,pitch:number,distance:number,aspect:number,fov:number){
 const dx=table.x-seat.x,dz=table.z-seat.z;
 const facing=Math.atan2(dx,dz),sideAngle=Math.PI*.37;
 const left=facing-sideAngle,right=facing+sideAngle;
 // At the outside tables, shoot towards the wall from the aisle instead of placing the camera against it.
 const defaultYaw=Math.abs(table.x)>=6
  ? (Math.sign(table.x)*Math.sin(left)<Math.sign(table.x)*Math.sin(right)?left:right)
  : (Math.cos(left)>Math.cos(right)?left:right);
 const angle=defaultYaw+yaw;
 const tilt=T.MathUtils.clamp(pitch+.19,.04,1.18);
 const portraitDistance=3.7/(2*aspect*Math.tan(T.MathUtils.degToRad(fov/2)));
 const radius=distance*Math.max(1,portraitDistance/4.4);
 const origin=point.clone().add(new T.Vector3(0,1.15,0));
 const look=point.clone().add(new T.Vector3(dx*.62,.89,dz*.62));
 const position=look.clone().add(new T.Vector3(Math.sin(angle)*Math.cos(tilt),Math.sin(tilt),Math.cos(angle)*Math.cos(tilt)).multiplyScalar(radius));
 return {origin,look,position};
}

/** Walking/seated camera: a plain orbit around the visitor, always looking at them. */
export function localCameraFrame(point:{x:number;y:number;z:number},sitting:boolean|number,yaw:number,pitch:number,distance:number){
 const seated=typeof sitting==='number'?T.MathUtils.clamp(sitting,0,1):Number(sitting);
 const origin=new T.Vector3(point.x,point.y+1.05+.10*seated,point.z);
 // Keep the camera just above the floor when the orbit dips low.
 const lowest=Math.asin(T.MathUtils.clamp((point.y+.25-origin.y)/distance,-1,1)),p=Math.max(pitch,lowest);
 const position=new T.Vector3(origin.x+Math.sin(yaw)*Math.cos(p)*distance,origin.y+Math.sin(p)*distance,origin.z+Math.cos(yaw)*Math.cos(p)*distance);
 const look=origin.clone();
 // Continue tilting the gaze up once the orbit reaches the floor, without moving the camera underground.
 if(pitch<lowest){const up=Math.min(lowest-pitch,.05);position.lerp(origin,up/1.3*.8);const view=origin.clone().sub(position),right=new T.Vector3().crossVectors(view,new T.Vector3(0,1,0)).normalize();view.applyAxisAngle(right,up);look.copy(position).add(view);}
 return {look,position,origin};
}
