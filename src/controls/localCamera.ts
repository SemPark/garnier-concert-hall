import * as T from 'three';
/** The original floor-seat/walking camera: orbit the visitor, never the stage. */
export function localCameraFrame(point:{x:number;y:number;z:number},sitting:boolean,yaw:number,pitch:number,distance:number){
 const baseY=point.y+(sitting?2.05:1.05);
 const look=new T.Vector3(point.x-Math.sin(yaw)*2,baseY,point.z-Math.cos(yaw)*2);
 const position=new T.Vector3(point.x+Math.sin(yaw)*distance,baseY+.6+pitch*4,point.z+Math.cos(yaw)*distance);
 return {look,position,origin:new T.Vector3(point.x,baseY,point.z)};
}
