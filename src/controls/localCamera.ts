import * as T from 'three';
/** Walking/seated camera: a plain orbit around the visitor, always looking at them. */
export function localCameraFrame(point:{x:number;y:number;z:number},sitting:boolean,yaw:number,pitch:number,distance:number){
 const origin=new T.Vector3(point.x,point.y+(sitting?2.05:1.05),point.z);
 // Keep the camera just above the floor when the orbit dips low.
 const lowest=Math.asin(T.MathUtils.clamp((point.y+.25-origin.y)/distance,-1,1)),p=Math.max(pitch,lowest);
 const position=new T.Vector3(origin.x+Math.sin(yaw)*Math.cos(p)*distance,origin.y+Math.sin(p)*distance,origin.z+Math.cos(yaw)*Math.cos(p)*distance);
 return {look:origin.clone(),position,origin};
}
