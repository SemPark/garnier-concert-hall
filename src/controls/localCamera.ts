import * as T from 'three';
/** The original floor-seat/walking camera: orbit the visitor, never the stage. */
export function localCameraFrame(point:{x:number;y:number;z:number},sitting:boolean,yaw:number,pitch:number,distance:number){
 const baseY=point.y+(sitting?2.05:1.05);
 // Below the lowest orbit the camera stays at eye height and the gaze tilts up instead, toward the ceiling.
 // Above the highest orbit it stays put too and the gaze tilts down, toward the floor.
 const up=Math.max(0,-.15-pitch),down=Math.max(0,pitch-.5),look=new T.Vector3(point.x-Math.sin(yaw)*2,baseY+up*14-down*10,point.z-Math.cos(yaw)*2);
 const position=new T.Vector3(point.x+Math.sin(yaw)*distance,baseY+.6+T.MathUtils.clamp(pitch,-.15,.5)*4,point.z+Math.cos(yaw)*distance);
 return {look,position,origin:new T.Vector3(point.x,baseY,point.z)};
}
