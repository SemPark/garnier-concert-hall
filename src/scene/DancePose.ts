import {capturedMotion} from '../motion/library';
import {applyMotion} from '../motion/player';
import * as T from 'three';
import {AVATAR_HEAD_HEIGHT,DANCE_ARM_LENGTH,DANCE_SHOULDER_X,DANCE_SHOULDER_Y,type Avatar} from '../character/Avatar';
import {CAPTAIN_MOVE_MS,type dancePose} from '../../shared/dance';
export type DancePose=ReturnType<typeof dancePose>;
const down=new T.Vector3(0,-1,0),target=new T.Vector3(),shoulder=new T.Vector3(),direction=new T.Vector3(),reachRotation=new T.Quaternion();
const elbowGuide=new T.Vector3(),nextHand=new T.Vector3();
const CAPTAIN_REACH=.419;
const PHRASE_BLEND=.18;
const ROLL_PERIOD=.275;
const PHRASES=[0,1.65,2.2,3.8,4.35,6.75,8.2,CAPTAIN_MOVE_MS/1000];
const TAU=Math.PI*2;

function captainPhrase(out:T.Vector3,phrase:number,seconds:number,side:-1|1){
 const age=seconds-PHRASES[phrase];
 if(phrase===0||phrase===2){
  const heldSide=phrase===0?-1:1;
  if(side===heldSide)return out.set(side*.10,.985,-.35);
  const sweep=(1-Math.cos(age*TAU/.8))*.5;
  return out.set(side*T.MathUtils.lerp(.245,-.12,sweep),.785,-.29);
 }
 if(phrase===4){
  const half=(PHRASES[5]-PHRASES[4])/2;
  // Keep the front/back roles for two complete bounces before trading places.
  const swap=T.MathUtils.smoothstep(age,half-.10,half+.10);
  const turn=swap*Math.PI;
  const depth=(side<0?-1:1)*Math.cos(turn);
  const elapsed=age<half?age:age-half;
  const beat=Math.min(1,Math.max(0,elapsed)/(half-PHRASE_BLEND));
  const lift=depth*.14*(1-Math.cos(beat*TAU*2))*.5;
  // Sweep outward only while trading places; the held poses point straight ahead and back.
  return out.set(side*Math.sin(turn),lift,depth)
   .normalize().multiplyScalar(CAPTAIN_REACH).add(shoulder.set(side*DANCE_SHOULDER_X,DANCE_SHOULDER_Y,0));
 }
 if(phrase===5){
  const angle=-T.MathUtils.clamp(age/(PHRASES[6]-PHRASES[5]-PHRASE_BLEND),0,1)*TAU+(side<0?Math.PI:0);
  // Keep the front/back pairing from the previous phrase and alternate throughout one lap.
  return out.set(side*1.85,-1.2+.85*Math.sin(angle),-Math.cos(angle))
   .normalize().multiplyScalar(CAPTAIN_REACH).add(shoulder.set(side*DANCE_SHOULDER_X,DANCE_SHOULDER_Y,0));
 }
 // Stack the fists on the chest centerline and roll in the vertical/depth plane.
 const angle=-age*TAU/ROLL_PERIOD+(side<0?0:Math.PI);
 return out.set(0,.875+.093*Math.cos(angle),-.275+.086*Math.sin(angle));
}

function captainHand(out:T.Vector3,seconds:number,side:-1|1,elbow?:T.Vector3){
 let phrase=0;
 while(phrase<PHRASES.length-2&&seconds>=PHRASES[phrase+1])phrase++;
 captainPhrase(out,phrase,seconds,side);

 const next=(phrase+1)%(PHRASES.length-1);
 const end=PHRASES[phrase+1];
 const blend=T.MathUtils.smoothstep(seconds,end-PHRASE_BLEND,end);
 if(blend>0){
  captainPhrase(nextHand,next,next===0?seconds-end:seconds,side);
  if(phrase===4||phrase===5){
   shoulder.set(side*DANCE_SHOULDER_X,DANCE_SHOULDER_Y,0);
   out.sub(shoulder);
   nextHand.sub(shoulder);
   // Blend the direction and reach separately. Crossing from back to front must
   // not collapse the arm toward the shoulder before the elbow starts the roll.
   const reach=T.MathUtils.lerp(out.length(),nextHand.length(),blend);
   out.normalize().lerp(nextHand.normalize(),blend);
   if(phrase===5)out.y-=Math.sin(blend*Math.PI)*.34;
   out.normalize().multiplyScalar(reach).add(shoulder);
  }else out.lerp(nextHand,blend);
 }
 if(phrase===3)out.y-=Math.sin(blend*Math.PI)*.14;
 if(elbow)elbow.set(side*.65,-1,0);
 return out;
}

/** Directions in avatar space, shared by the human and ghost rigs. */
export function danceArmDirection(out:T.Vector3,pose:DancePose,side:-1|1){
 if(pose.captain>0){
  captainHand(out,pose.captainSeconds,side);
  return out.sub(shoulder.set(side*DANCE_SHOULDER_X,DANCE_SHOULDER_Y,0)).divideScalar(DANCE_ARM_LENGTH);
 }
 if(pose.hop>0&&!pose.hand)return out.set(side,.26,-.70);
 if(pose.handsUp>0){
  // Keep arms pointing away from the head even on the inner side of the sway.
  return out.set(side*1.25+pose.handsSway*.16,.27-side*pose.handsSway*.10,-.82);
 }
 const inner=(1-side*pose.flossSwing)/2;
 const behind=Math.max(0,side*pose.flossCross);
 const front=Math.max(0,-side*pose.flossCross);
 // Let the inner hand pass the centreline in front of the waist, then sweep it back for the tuck.
 const sweep=T.MathUtils.degToRad(T.MathUtils.lerp(8,117,inner)-93*behind-59*front);
 const drop=T.MathUtils.lerp(.59,.18,inner)+.12*behind+.23*front;
 const reach=Math.sqrt(1-drop*drop);
 return out.set(side*Math.cos(sweep)*reach,-drop,-Math.sin(sweep)*reach);
}

/** Reach for the shared hand targets with the avatar's straight arms. */
export function poseDancingAvatar(avatar:Avatar,pose:DancePose){
 avatar.root.position.set(pose.x,pose.y+pose.bob,pose.z);
 avatar.root.rotation.y=pose.yaw;
 if(pose.chair&&pose.chairStand<1)return;
 const captured=pose.captain>0?capturedMotion('captain'):undefined;
 if(captured){
  avatar.root.position.y=pose.y+pose.bob*(1-pose.captain);
  // The server's existing captain period remains authoritative for every observer.
  applyMotion(avatar,captured,pose.captainSeconds/(CAPTAIN_MOVE_MS/1000)*captured.duration,pose.captain);
  return;
 }
 const handsShift=pose.handsSway*pose.handsUp;
 avatar.body.rotation.set(-pose.bow,pose.shimmy*.34,pose.lean+pose.shimmy*.13-handsShift*.23);
 avatar.head.rotation.x=pose.headPitch;
 avatar.head.position.y=AVATAR_HEAD_HEIGHT+.025*pose.handsUp;
 avatar.head.rotation.z=-pose.lean*.45;
 avatar.head.rotation.y+=pose.headYaw-pose.shimmy*.22;
 if(!pose.hand){
  // Shift weight over the planted foot and lift the other one without moving the navigation anchor.
  avatar.body.position.x-=pose.step*.08+handsShift*.075;
  avatar.body.position.x+=Math.sin(-handsShift*.23)*.55;
  avatar.leftLeg.position.y+=Math.max(0,-pose.step)*.07;
  avatar.rightLeg.position.y+=Math.max(0,pose.step)*.07;
 }
 avatar.leftLeg.rotation.set(pose.step*.27+pose.hop*.24,0,-pose.lean);
 avatar.rightLeg.rotation.set(-pose.step*.27+pose.hop*.24,0,-pose.lean);
 if(pose.floss>0)avatar.poseFlossHips(pose.flossHip,pose.floss);
 if(pose.captain>0){
  const seconds=pose.captainSeconds;
  const reachIn=T.MathUtils.smoothstep(seconds,PHRASES[4]-PHRASE_BLEND,PHRASES[4]);
  const reachOut=1-T.MathUtils.smoothstep(seconds,PHRASES[5]-PHRASE_BLEND,PHRASES[5]);
  // Keep the chin clear of the sleeves as the arms pitch around shoulder height.
  avatar.head.position.y+=.035*reachIn*reachOut*pose.captain;
  avatar.poseCaptain(pose.captainSide,pose.captain);
 }
 const partnerHop=pose.hand?pose.hop:0;
 avatar.leftArm.rotation.set(-.25+pose.swing-pose.reach-partnerHop*.65,0,-.4-pose.lean);
 avatar.rightArm.rotation.set(-.25-pose.swing-pose.reach-partnerHop*.65,0,.4-pose.lean);
 if(pose.badLean>0)avatar.poseBad(pose.badLean,pose.badLower,pose.badPop);
 avatar.leftArm.scale.setScalar(1);
 avatar.rightArm.scale.setScalar(1);
 if(pose.captain>0){
  const seconds=pose.captainSeconds;
  const rollStart=seconds<PHRASES[2]?PHRASES[1]:seconds<PHRASES[4]?PHRASES[3]:seconds>=PHRASES[6]?PHRASES[6]:Infinity;
  const wristRoll=Number.isFinite(rollStart)?(rollStart-seconds)*TAU/ROLL_PERIOD:0;
  const rollLength=seconds>=PHRASES[6]?PHRASES[7]-PHRASES[6]:2*ROLL_PERIOD;
  const wristWeight=T.MathUtils.smoothstep(seconds,rollStart,rollStart+.18)*
   (1-T.MathUtils.smoothstep(seconds,rollStart+rollLength-.18,rollStart+rollLength));
  avatar.poseJointedArm(-1,captainHand(target,seconds,-1,elbowGuide),elbowGuide,wristRoll,wristWeight,pose.captain);
  avatar.poseJointedArm(1,captainHand(target,seconds,1,elbowGuide),elbowGuide,wristRoll+Math.PI,wristWeight,pose.captain);
 }else if(pose.hop>0&&!pose.hand){
  for(const [arm,side] of [[avatar.leftArm,-1],[avatar.rightArm,1]] as const){
   // Lift outward from the shoulder so the mitten stays beside the face.
   danceArmDirection(direction,pose,side).normalize();
   target.copy(down).applyQuaternion(arm.quaternion).lerp(direction,Math.sqrt(pose.hop)).normalize();
   arm.quaternion.setFromUnitVectors(down,target);
  }
 }else if(pose.handsUp>0||pose.floss>0){
  for(const [arm,side] of [[avatar.leftArm,-1],[avatar.rightArm,1]] as const){
   danceArmDirection(direction,pose,side).normalize();
   const blend=pose.handsUp||pose.floss;
   if(pose.handsUp>0){
    // Lead outward and forward while lifting so the sleeve clears the jaw at a fixed shoulder.
    target.set(side*.29,-1,-.20).normalize().lerp(direction,blend).normalize();
   }else{
    // Swing out from the shoulder before crossing the front or back of the waist.
    target.set(side*.60,-.88,-.38).normalize().lerp(direction,blend);
    if(side*pose.flossSwing<0)target.z-=blend*(1-blend)*1.4;
    target.normalize();
   }
   arm.quaternion.setFromUnitVectors(down,target);
  }
 }
 if(pose.hand&&pose.rightHand&&pose.hold>0){
  avatar.root.updateMatrixWorld(true);
  for(const [arm,point] of [[avatar.leftArm,pose.hand],[avatar.rightArm,pose.rightHand]] as const){
   target.set(point.x,point.y,point.z);
   avatar.body.worldToLocal(target);
   direction.copy(target).sub(arm.position).normalize();
   reachRotation.setFromUnitVectors(down,direction);
   arm.quaternion.slerp(reachRotation,pose.hold);
  }
 }
}
