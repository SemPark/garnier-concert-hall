import * as T from 'three';
/** Walking/seated camera: a plain orbit around the visitor, always looking at them. */
export function localCameraFrame(point:{x:number;y:number;z:number},sitting:boolean,yaw:number,pitch:number,distance:number){
 const origin=new T.Vector3(point.x,point.y+(sitting?2.05:1.05),point.z);
 // Keep the camera just above the floor when the orbit dips low.
 const lowest=Math.asin(T.MathUtils.clamp((point.y+.25-origin.y)/distance,-1,1)),p=Math.max(pitch,lowest);
 const position=new T.Vector3(origin.x+Math.sin(yaw)*Math.cos(p)*distance,origin.y+Math.sin(p)*distance,origin.z+Math.cos(yaw)*Math.cos(p)*distance);
 const look=origin.clone();
 // Continue tilting the gaze up once the orbit reaches the floor, without moving the camera underground.
 if(pitch<lowest){position.lerp(origin,Math.min(.8,(lowest-pitch)/1.3*.8));const view=origin.clone().sub(position),right=new T.Vector3().crossVectors(view,new T.Vector3(0,1,0)).normalize();view.applyAxisAngle(right,lowest-pitch);look.copy(position).add(view);}
 return {look,position,origin};
}
