import {gestureSeconds,type Gesture} from '../../shared/gestures';

/** Head-top icons, in atlas order. */
export const ICONS=['heart','bang','sparkle','zz','dots','note'] as const;
export type Icon=typeof ICONS[number];
export const GESTURE_ICON:Record<Gesture,Icon|null>={wave:null,clap:'note',bravo:'bang',ovation:null,bow:null,moved:'heart',shh:'dots',doze:'zz',drink:null,eat:null};

type Vec=[number,number,number];
/** Shared rigid-arm greeting, mirrored for the chosen hand. */
export function greetingTarget(age:number,side:number):Vec {return [side*(1.30+Math.sin(age*11)*.06),1.50+Math.cos(age*11)*.035,-.44];}
export type CameraFacing={turn:number;pitch:number};
export type PoseInput={time:number;speed:number;sit:number;music:boolean;musician:boolean;gesture:Gesture|null|undefined;age:number;cameraFacing?:CameraFacing};
export type VillagerPose={
 /** Effective sitting amount; turning gestures keep the visitor seated. */
 sit:number;
 /** Vertical bounce of the whole body. */
 lift:number;
 /** Forward bend around the hips, in radians. Positive bends toward the face. */
 lean:number;
 /** Side-to-side sway of the upper body while listening. */
 sway:number;
 turn:number;headPitch:number;headYaw:number;headRoll:number;
 /** Vertical eye scale: 1 open, small values closed. */
 blink:number;
 /** Walk cycle, -1..1. */
 swing:number;
 /** Gesture hand targets in body space; null leaves that arm to its default motion. */
 left:Vec|null;right:Vec|null;weight:number;
 icon:Icon|null;iconAlpha:number;
};

const smooth=(x:number,a:number,b:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

/** Blend weight of a gesture: quick ease in, hold, ease out before it ends. */
export function gestureWeight(gesture:Gesture|null|undefined,age:number){
 if(!gesture||!(age>=0))return 0;const end=gestureSeconds(gesture);
 return smooth(age,0,.25)*(1-smooth(age,end-.5,end));
}

export function gestureTurnWeight(gesture:'ovation'|'shh',age:number){
 const end=gestureSeconds(gesture);
 return smooth(age,.05,gesture==='ovation'?.7:.65)*(1-smooth(age,end-.65,end));
}

function turnTowardCamera(pose:VillagerPose,angle:number,weight:number){
 const torso=Math.max(-1.15,Math.min(1.15,angle*.62));
 const head=Math.max(-.78,Math.min(.78,angle-torso));
 pose.turn=torso*weight;
 pose.headYaw=head*weight;
}

/** Pure pose calculation shared by every character. Keeps all motion data testable without WebGL. */
export function poseVillager(input:PoseInput,phase=0):VillagerPose{
 const t=input.time+phase,w=gestureWeight(input.gesture,input.age),age=input.age,gesture=w>0?input.gesture:null;
 const swing=Math.sin(t*8)*Math.min(input.speed/2.8,1);
 const pose:VillagerPose={sit:input.sit,lift:Math.abs(swing)*.07*(1-input.sit),lean:0,sway:0,turn:0,headPitch:0,headYaw:0,headRoll:0,blink:1,swing,left:null,right:null,weight:w,icon:gesture?GESTURE_ICON[gesture]:null,iconAlpha:w};
 // Round eyes close briefly every few seconds, at a different moment for each character.
 const cycle=((t*1+phase*1.7)%3.7+3.7)%3.7;if(!input.musician&&cycle<.13)pose.blink=0;
 if(input.musician){
  // Players keep their eyes on the conductor but move with the music: a clear nod and sway, readable from the back of the hall.
  pose.headPitch=input.music?.05+Math.sin(t*1.7)*.1:0;pose.headRoll=input.music?Math.sin(t*1.3)*.09:Math.sin(t*1.3)*.02;pose.headYaw=input.music?Math.sin(t*.6)*.07:0;
  // The whole upper body sways and leans into the phrases as well.
  if(input.music){pose.sway=Math.sin(t*1.4)*.07;pose.lean=.03+Math.sin(t*1.7+.6)*.05;}
 }else if(input.sit>.5){
  // Seated listeners sway gently while the music plays.
  if(input.music){pose.sway=Math.sin(t*1.6)*.05;pose.headRoll=Math.sin(t*1.6+.4)*.07;pose.headPitch=.04+Math.sin(t*.8)*.03;}
  else pose.headYaw=Math.sin(t*.45)*.25;
 }else{
  // Standing visitors look around; walking adds a bouncy head bob.
  pose.headYaw=Math.sin(t*.55)*.32*(1-Math.min(1,input.speed));pose.headPitch=Math.abs(swing)*.06;
 }
 if(!gesture)return pose;
 const mix=(value:number,target:number)=>value+(target-value)*w;
 pose.headYaw=mix(pose.headYaw,0);
 switch(gesture){
  // The hand swings outward before it rises past the cheek.
  case 'wave':pose.left=greetingTarget(age,-1);pose.sway=mix(pose.sway,-.14);pose.headRoll=mix(pose.headRoll,-.12-Math.sin(age*11)*.03);break;
  case 'clap':{const d=.105+.155*(.5+.5*Math.cos(age*13.5));pose.left=[-d,.94,-.3];pose.right=[d,.94,-.3];pose.headPitch=mix(pose.headPitch,-.05);break;}
  case 'bravo':{const pump=Math.sin(age*9)*.05;pose.left=[-1.02,1.39+pump,-.56];pose.right=[1.02,1.39+pump,-.56];pose.headPitch=mix(pose.headPitch,-.18);break;}
  // Remote visitors and NPCs keep the default pose when no camera target is supplied.
  case 'ovation':{
   const turn=gestureTurnWeight('ovation',age);
   if(input.cameraFacing){
    if(input.sit>.5)turnTowardCamera(pose,input.cameraFacing.turn,turn);
   }else{
    pose.turn=-(input.sit>.5?1.55:2.4)*turn;pose.headYaw=-(input.sit>.5?.95:.3)*turn;
   }
   pose.right=greetingTarget(age,1);pose.sway=mix(pose.sway,0);pose.headPitch=mix(pose.headPitch,-.05);break;
  }
  case 'bow':pose.lean=.55*w;pose.headPitch=mix(pose.headPitch,.2);break;
  case 'moved':pose.left=[-.12,.86,-.32];pose.right=[.12,.86,-.32];pose.headRoll=mix(pose.headRoll,.18);pose.headPitch=mix(pose.headPitch,-.1);break;
  // The mitten rests just under the chin so the raised index finger lies across the lips.
  case 'shh':pose.right=[.03,1.07,-.37];// The hand comes up to the lips, the finger in front of the mouth.
  if(input.sit>.5){
   const turn=gestureTurnWeight('shh',age);
   if(input.cameraFacing)turnTowardCamera(pose,input.cameraFacing.turn,turn);
   else{pose.turn=-1.55*turn;pose.headYaw=-.95*turn;}
   const [x,y,z]=pose.right;pose.right=[x*Math.cos(pose.headYaw)+z*Math.sin(pose.headYaw),y,-x*Math.sin(pose.headYaw)+z*Math.cos(pose.headYaw)];
  }
  pose.headPitch=mix(pose.headPitch,-.05);pose.headRoll=mix(pose.headRoll,0);pose.sway=mix(pose.sway,0);break;
  case 'eat':case 'drink':pose.headPitch=mix(pose.headPitch,.08);pose.sway=mix(pose.sway,0);break;
  case 'doze':pose.headPitch=mix(pose.headPitch,.38+Math.sin(age*2.2)*.06);pose.lean=.08*w;if(!input.musician)pose.blink=Math.min(pose.blink,1-w);break;
 }
 if(input.cameraFacing){
  // Steep angles swing the long hair into the sleeves during a turn.
  const pitch=Math.max(-.23,Math.min(.22,input.cameraFacing.pitch));
  pose.headPitch=mix(pose.headPitch,pitch);
 }
 return pose;
}
