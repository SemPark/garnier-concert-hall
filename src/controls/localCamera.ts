import * as T from 'three';
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
