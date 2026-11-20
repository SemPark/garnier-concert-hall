import * as T from 'three';
import {DINNER_TABLES,NPC_SEATS,SEATS,type Seat} from '../../shared/venue';
import {PARTERRE} from '../../shared/parterre';
import {TAROT_HOST_SEAT,TEA_TABLE} from '../../shared/storyGuestSeats';

/** Start closing in on the rear landing and ease back out on the parterre. */
export function rearStairCameraBlend(point:{x:number;y:number;z:number}){
 if(point.y>.3)return 0;
 const side=1-T.MathUtils.smoothstep(Math.abs(point.x),PARTERRE.stairHalfWidth-.5,PARTERRE.stairHalfWidth);
 const fromLanding=1-T.MathUtils.smoothstep(point.z,PARTERRE.stairBack,PARTERRE.stairBack+2.4);
 return side*fromLanding*T.MathUtils.smoothstep(point.z,PARTERRE.stairFront-3,PARTERRE.stairFront);
}


export const DINNER_CAMERA_DISTANCE=3.8;
const DINNER_LOOK_OFFSET=.7;
const DINNER_PITCH_OFFSET=.25;
// Preferred composition for the rear-right tea chair, before checking the sightline.
const teaTableCamera={row:TEA_TABLE,column:3,yaw:-1.42,pitchOffset:.34,lookOffset:1,headroom:.03};
function teaTableFraming(seat:Seat){
 return seat.row===teaTableCamera.row&&seat.column===teaTableCamera.column?teaTableCamera:null;
}
const DINNER_FRAME_WIDTH=3.7;
const STORY_CAMERA_SIDE_LIMIT=PARTERRE.sideFront-.36;
const PORTRAIT_CHECK_RADIUS=DINNER_FRAME_WIDTH/(2*.4*Math.tan(T.MathUtils.degToRad(61/2)));

function preferredDinnerAngle(facing:number,tableX:number){
 const sideAngle=Math.PI*.29,left=facing-sideAngle,right=facing+sideAngle;
 // At the outside tables, shoot towards the wall from the aisle instead of placing the camera against it.
 return Math.abs(tableX)>=6
  ? (Math.sign(tableX)*Math.sin(left)<Math.sign(tableX)*Math.sin(right)?left:right)
  : (Math.cos(left)>Math.cos(right)?left:right);
}

function distanceToSideBox(x:number,direction:number){
 return Math.abs(direction)>1e-6?Math.max(0,(Math.sign(direction)*STORY_CAMERA_SIDE_LIMIT-x)/direction):Infinity;
}

function dinnerViewClear(seat:Seat,guests:Seat[],dx:number,dz:number,angle:number,radius:number,focusOffset:number){
 // Check the horizontal camera-to-visitor sightline against the ghosts' seated silhouettes, including hats.
 const side=Math.sin(angle),lookOffset=dx*focusOffset;
 const distance=Math.min(radius,distanceToSideBox(seat.x+lookOffset,side));
 const x=lookOffset+side*distance;
 const z=dz*focusOffset+Math.cos(angle)*distance;
 // A ghost-free view is still unsuitable if it looks at the back of the visitor.
 const sightLength=Math.hypot(x,z);
 if(distance<radius*.8||(dx*x+dz*z)<.6*Math.hypot(dx,dz)*sightLength)return false;
 return guests.every(guest=>{
  const gx=guest.x-seat.x,gz=guest.z-seat.z;
  const along=T.MathUtils.clamp((gx*x+gz*z)/(sightLength*sightLength),0,1);
  return Math.hypot(gx-along*x,gz-along*z)>=.86;
 });
}

// Fix the starting shoulder once from the hall layout so dragging or zooming never triggers a side change.
const storySeatYaw=new Map<string,number>();
for(const seat of SEATS){
 if(seat.level!=='parterre')continue;
 const guests=NPC_SEATS.filter(guest=>guest.row===seat.row);
 if(!guests.length)continue;
 const table=DINNER_TABLES[seat.row-1],dx=table.x-seat.x,dz=table.z-seat.z;
 const preferred=preferredDinnerAngle(Math.atan2(dx,dz),table.x);
 // Compose the two-guest tables from the aisle side so all three faces fit.
 const teaFrame=teaTableFraming(seat);
 const storyAngle=teaFrame?.yaw??(seat.row===TEA_TABLE?.8:seat.row===TAROT_HOST_SEAT.row&&seat.column===2?-.39:preferred);
 const focusOffset=teaFrame?.lookOffset??DINNER_LOOK_OFFSET;
 const horizontalFactor=Math.cos(.13+(teaFrame?.pitchOffset??DINNER_PITCH_OFFSET));
 // Check both default viewing distances. An angle clear in landscape may put a portrait camera behind the side box.
 const offsets=[0,.24,-.24,.48,-.48,.72,-.72,.96,-.96,1.2,-1.2,1.44,-1.44,1.68,-1.68];
 const clear=[...offsets.map(offset=>storyAngle+offset),preferred].find(angle=>
  dinnerViewClear(seat,guests,dx,dz,angle,DINNER_CAMERA_DISTANCE*horizontalFactor,focusOffset)
  &&dinnerViewClear(seat,guests,dx,dz,angle,PORTRAIT_CHECK_RADIUS*horizontalFactor,focusOffset));
 storySeatYaw.set(seat.id,clear??preferred);
}

/** A three-quarter view puts the seated visitor beside the table in the frame. */
export function dinnerCameraFrame(point:T.Vector3,seat:Seat,table:{x:number;z:number},yaw:number,pitch:number,distance:number,aspect:number,fov:number){
 const dx=table.x-seat.x,dz=table.z-seat.z;
 const angle=(storySeatYaw.get(seat.id)??preferredDinnerAngle(Math.atan2(dx,dz),table.x))+yaw;
 const teaFrame=teaTableFraming(seat);
 const tilt=T.MathUtils.clamp(pitch+(teaFrame?.pitchOffset??DINNER_PITCH_OFFSET),.04,1.18);
 const focusOffset=teaFrame?.lookOffset??DINNER_LOOK_OFFSET;
 const halfFov=T.MathUtils.degToRad(fov/2);
 const portraitDistance=DINNER_FRAME_WIDTH/(2*aspect*Math.tan(halfFov));
 const radius=distance*Math.max(1,portraitDistance/DINNER_CAMERA_DISTANCE);
 const origin=point.clone().add(new T.Vector3(0,1.15,0));
 const look=point.clone().add(new T.Vector3(dx*focusOffset,.89,dz*focusOffset));
 const side=Math.sin(angle);
 // Keep the selected orbit angle while shortening the view before the raised side-box front.
 const wallDistance=storySeatYaw.has(seat.id)?distanceToSideBox(look.x,side):Infinity;
 const horizontal=Math.min(radius*Math.cos(tilt),wallDistance);
 const position=new T.Vector3(
  look.x+side*horizontal,
  look.y+Math.tan(tilt)*horizontal,
  look.z+Math.cos(angle)*horizontal,
 );
 // Leave room for faces while tilting down enough to show the place setting.
 const headroom=Math.atan(Math.tan(halfFov)*(teaFrame?.headroom??.13));
 look.y=position.y+horizontal*Math.tan(headroom-tilt);
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
