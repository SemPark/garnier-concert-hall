import type {Playback} from '../../shared/timeline';
import {CONDUCTOR,STAGE_FLOOR} from './layout';

/** What the conductor and the concertmaster are doing at this moment of the program. */
export type StageShow={
 conductor:{x:number;y:number;z:number;yaw:number;walking:boolean;bowAge:number|null};
 concertmasterStands:boolean;concertmasterPlays:boolean;orchestraPlays:boolean;
};
const PODIUM_TOP=STAGE_FLOOR+.24;
// Offstage behind the side wall, the stage door, the walkway in front of the podium, and the podium itself.
const PATH=[{x:-16.8,z:-10.6},{x:-14.4,z:-10.6},{x:-1.1,z:-10.6},{x:CONDUCTOR.x,z:CONDUCTOR.z}];
const TO_ORCHESTRA=0,TO_AUDIENCE=Math.PI;
const smooth=(v:number)=>{const t=Math.min(1,Math.max(0,v));return t*t*(3-2*t);};
const span=(t:number,a:number,b:number)=>Math.min(1,Math.max(0,(t-a)/(b-a)));

/** Position along the entrance path (0 offstage → 1 on the podium) with the heading of travel. */
function along(u:number){
 const lengths=PATH.slice(1).map((p,i)=>Math.hypot(p.x-PATH[i].x,p.z-PATH[i].z)),total=lengths.reduce((a,b)=>a+b,0);let d=Math.min(1,Math.max(0,u))*total;
 for(let i=0;i<lengths.length;i++){const a=PATH[i],b=PATH[i+1];if(d<=lengths[i]||i===lengths.length-1){const k=Math.min(1,d/lengths[i]);
  const onPodium=i===lengths.length-1?k:0;return {x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k,y:STAGE_FLOOR+(PODIUM_TOP-STAGE_FLOOR)*smooth(onPodium*2),yaw:Math.atan2(-(b.x-a.x),-(b.z-a.z))};}d-=lengths[i];}
 return {...PATH[PATH.length-1],y:PODIUM_TOP,yaw:TO_ORCHESTRA};
}
const turn=(from:number,to:number,k:number)=>from+((to-from+Math.PI*3)%(Math.PI*2)-Math.PI)*smooth(k);

export function stageShow(p:Playback):StageShow{
 const stage=p.track.stage,t=p.playing?p.offset/p.track.durationSeconds:1;
 const onPodium={...PATH[PATH.length-1],y:PODIUM_TOP,yaw:TO_ORCHESTRA,walking:false,bowAge:null as number|null};
 const offstage={...PATH[0],y:STAGE_FLOOR,yaw:-Math.PI/2,walking:false,bowAge:null};
 const show:StageShow={conductor:onPodium,concertmasterStands:false,concertmasterPlays:false,orchestraPlays:!stage&&p.playing};
 if(stage==='murmur'){show.conductor=offstage;}
 else if(stage==='tuning'){
  // The concertmaster rises, gives the A, and the orchestra tunes to it; the conductor waits in the wings.
  show.conductor=offstage;show.concertmasterStands=t>.04&&t<.94;show.concertmasterPlays=t>.1&&t<.9;show.orchestraPlays=t>.3&&t<.88;
 }else if(stage==='entrance'){
  // Walk on, step up, turn to the audience and bow, then turn back to the orchestra.
  const walk=span(t,0,.5),w=along(walk);
  let yaw=w.yaw;if(t>=.5)yaw=turn(TO_ORCHESTRA,TO_AUDIENCE,span(t,.5,.58));if(t>=.88)yaw=turn(TO_AUDIENCE,TO_ORCHESTRA,span(t,.88,.98));
  show.conductor={x:w.x,y:w.y,z:w.z,yaw,walking:t<.5,bowAge:t>=.58&&t<.88?(t-.58)*p.track.durationSeconds:null};
 }else if(stage==='applause'){
  const yaw=t<.15?turn(TO_ORCHESTRA,TO_AUDIENCE,span(t,0,.12)):t<.85?TO_AUDIENCE:turn(TO_AUDIENCE,TO_ORCHESTRA,span(t,.85,.97));
  show.conductor={...onPodium,yaw,bowAge:t>=.15&&t<.6?(t-.15)*p.track.durationSeconds:null};
 }else if(stage==='farewell'){
  // A last bow, then the conductor walks back off the way they came.
  const leaving=span(t,.45,1),w=along(1-leaving);
  const yaw=t<.12?turn(TO_ORCHESTRA,TO_AUDIENCE,span(t,0,.1)):t<.45?TO_AUDIENCE:w.yaw+Math.PI;
  show.conductor=t>=.45?{x:w.x,y:w.y,z:w.z,yaw,walking:t<1,bowAge:null}:{...onPodium,yaw,bowAge:t>=.12?(t-.12)*p.track.durationSeconds:null};
  if(!p.playing)show.conductor=offstage;
 }
 return show;
}
