import * as T from 'three';
import {PARTERRE} from '../../shared/parterre';
import {GALLERY_BRIDGE} from '../../shared/gallery';
import {NPC_SEATS,type Seat} from '../../shared/venue';
import {STAGE,STAGE_FLOOR} from '../orchestra/layout';

const NEAR=4.6,FAR=9.8,EYE_HEIGHT=4.2;
const STAGE_TARGET_Z=STAGE.front-6;
const GUEST_HEAD_CLEARANCE=.75;

export type SeatedStageRail={seat:Seat;x:number;y:number;near:number;far:number};

export function seatedStageRail(seat:Seat):SeatedStageRail{
 // Keep the camera in front of the colonnade and the solid screens behind the last row.
 const far=Math.min(FAR,GALLERY_BRIDGE.minZ-.25-seat.z),near=Math.min(NEAR,far*.78);
 const y=Math.min(EYE_HEIGHT,seat.y+near*1.25);
 const side=Math.sign(seat.x)||1,limit=PARTERRE.sideFront-.55;
 const offsets=[.95,-.95,1.65,-1.65];
 const candidates=offsets.map(offset=>T.MathUtils.clamp(seat.x+offset*side,-limit,limit));
 // At the back of the rail, the guest's silhouette is tallest against the line to the avatar's head.
 const clearsGuests=(x:number)=>NPC_SEATS.every(guest=>{
  const ratio=(guest.z-seat.z)/far;
  if(ratio<=0||ratio>=1)return true;
  const sightX=T.MathUtils.lerp(seat.x,x,ratio);
  const sightY=T.MathUtils.lerp(seat.y+1.35,y,ratio);
  return Math.abs(guest.x-sightX)>=GUEST_HEAD_CLEARANCE||guest.y+2.15<sightY;
 });
 return {seat,x:candidates.find(clearsGuests)??candidates[0],y,near,far};
}

export function seatedStageFrame({seat,x,y,near,far}:SeatedStageRail,dolly:number,aspect:number){
 const distance=T.MathUtils.lerp(near,far,T.MathUtils.clamp(dolly,0,1));
 const position=new T.Vector3(x,y,seat.z+distance);
 const origin=new T.Vector3(seat.x,seat.y+1.35,seat.z);
 const avatarX=seat.x-x,stageX=-x,stageZ=position.z-STAGE_TARGET_Z;
 // Keep the viewer near the bottom of the shot and the stage above them as the camera moves.
 const stageWidth=T.MathUtils.lerp(2.2,4.5,T.MathUtils.smoothstep(aspect,.5,1.3));
 const left=Math.min(Math.atan2(avatarX-.45,distance),Math.atan2(stageX-stageWidth,stageZ));
 const right=Math.max(Math.atan2(avatarX+.45,distance),Math.atan2(stageX+stageWidth,stageZ));
 const yaw=(left+right)/2;
 const avatarPitch=Math.atan2(seat.y+.16-y,Math.hypot(avatarX,distance));
 const stagePitch=Math.atan2(STAGE_FLOOR+4.2-y,Math.hypot(stageX,stageZ));
 const pitch=(avatarPitch+stagePitch)/2;
 const horizontal=Math.cos(pitch);
 const look=position.clone().add(new T.Vector3(Math.sin(yaw)*horizontal,Math.sin(pitch),-Math.cos(yaw)*horizontal));
 return {position,look,origin};
}
