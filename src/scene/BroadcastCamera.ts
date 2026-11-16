import {MathUtils,Vector3,type Object3D} from 'three';
import {constrainCamera} from '../controls/cameraCollision';
import {CONDUCTOR,JAZZ_VOCALIST,ORCHESTRA_LAYOUT,STAGE_FLOOR} from '../orchestra/layout';
import {GOLDEN_HALL} from '../../shared/goldenHall';
import {JAZZ_HALL} from '../../shared/hallKind';

const SHOTS=[
 {kind:'stage',seconds:12},
 {kind:'lead',seconds:9},
 {kind:'hall',seconds:10},
 {kind:'high',seconds:12},
 {kind:'visitor',seconds:8},
 {kind:'section',seconds:10},
 {kind:'npc',seconds:8},
 {kind:'podium',seconds:9},
] as const;
const PERIOD=SHOTS.reduce((total,shot)=>total+shot.seconds,0);
const lead=ORCHESTRA_LAYOUT.find(p=>p.instrument===(JAZZ_HALL?'piano':'violin'))!;
const section=ORCHESTRA_LAYOUT.find(p=>p.instrument===(JAZZ_HALL?'trumpet':'cello'))!;

type Subject={x:number;y:number;z:number;yaw:number;sitting?:boolean};
type BroadcastView={
 aspect:number;reduced:boolean;space:boolean;visitor:Subject;
 usher?:Subject;storyGuest?:Subject;walls:readonly Object3D[];
};

export function broadcastShotAt(elapsed:number){
 const seconds=Math.max(0,elapsed);
 const loop=Math.floor(seconds/PERIOD);
 let offset=seconds%PERIOD;
 for(const shot of SHOTS){
  if(offset<shot.seconds)return {kind:shot.kind,progress:offset/shot.seconds,loop};
  offset-=shot.seconds;
 }
 return {kind:SHOTS[0].kind,progress:0,loop};
}

function subjectFrame(subject:Subject,progress:number,view:BroadcastView){
 const distance=view.aspect<.8?4.1:3.45;
 const look=new Vector3(subject.x,subject.y+(subject.sitting?.74:.98),subject.z);
 const front=subject.yaw+Math.PI+.06;
 let position=look.clone();
 const atAngle=(yaw:number)=>{
  const desired=look.clone().add(new Vector3(Math.sin(yaw)*distance,.54,Math.cos(yaw)*distance));
  desired.z=Math.min(GOLDEN_HALL.rear-.8,desired.z);
  return constrainCamera(look,desired,view.walls);
 };
 // Pick the angle at the midpoint so nearby walls cannot trigger a sudden change mid-shot.
 for(const yaw of [front,front+Math.PI/2,front-Math.PI/2,front+Math.PI]){
  const clear=atAngle(yaw);
  if(clear.distanceToSquared(look)>position.distanceToSquared(look))position=clear;
  if(clear.distanceToSquared(look)>2.5**2){
   position=atAngle(yaw+MathUtils.lerp(.15,-.15,progress));
   break;
  }
 }
 return {look,position};
}

/** A continuous move within each shot, with a cut at the edit point. */
export function broadcastFrame(elapsed:number,view:BroadcastView){
 const shot=broadcastShotAt(elapsed);
 const t=view.reduced?.5:MathUtils.smoothstep(shot.progress,0,1);
 const side=shot.loop%2===0?1:-1;
 const portrait=MathUtils.clamp(1.05/view.aspect,1,1.65);
 if(shot.kind==='visitor')return subjectFrame(view.visitor,t,view);
 if(shot.kind==='npc'){
  const subject=(side===1?view.usher:view.storyGuest)??view.usher;
  if(subject)return subjectFrame(subject,t,view);
 }
 if(shot.kind==='lead'||shot.kind==='section'){
  const player=shot.kind==='lead'?lead:section;
  const look=new Vector3(player.x,STAGE_FLOOR+player.rise+.86,player.z);
  const approach=shot.kind==='lead'?-1:1;
  const position=look.clone().add(new Vector3(approach*MathUtils.lerp(2.8,2.1,t),MathUtils.lerp(1.45,1.2,t),MathUtils.lerp(4.8,4,t)*portrait));
  return {look,position};
 }
 if(shot.kind==='hall'){
  const look=new Vector3(0,view.space?9.5:7.2,-19);
  const position=new Vector3(side*MathUtils.lerp(7.2,4.8,t),MathUtils.lerp(13.8,15.2,t),MathUtils.lerp(43,41,t));
  return {look,position};
 }
 if(shot.kind==='high'){
  const look=new Vector3(side*MathUtils.lerp(-.8,.2,t),2.2,CONDUCTOR.z-6);
  const position=look.clone().add(new Vector3(side*MathUtils.lerp(8.8,6.2,t),MathUtils.lerp(12.3,13.7,t),16*portrait));
  return {look,position};
 }
 if(shot.kind==='podium'){
  if(JAZZ_HALL){
   const look=new Vector3(JAZZ_VOCALIST.x,STAGE_FLOOR+1.02,JAZZ_VOCALIST.z);
   const position=look.clone().add(new Vector3(MathUtils.lerp(-1.55,-1,t),MathUtils.lerp(.35,.24,t),MathUtils.lerp(3.8,3.35,t)*portrait));
   return {look,position};
  }
  const look=new Vector3(0,1.05,CONDUCTOR.z);
  const position=look.clone().add(new Vector3(side*MathUtils.lerp(7,6,t)*portrait,MathUtils.lerp(2.35,2.05,t),MathUtils.lerp(4,3.1,t)*portrait));
  return {look,position};
 }
 const look=new Vector3(side*MathUtils.lerp(-.9,-.15,t),2,CONDUCTOR.z-6);
 const position=look.clone().add(new Vector3(side*MathUtils.lerp(-4.2,1.2,t),MathUtils.lerp(5.9,5.1,t),MathUtils.lerp(23.6,22.4,t)*portrait));
 return {look,position};
}
