import * as T from 'three';
import {FLOOR_SEATS, type Visitor} from '../../shared/venue';
import {gestureSeconds} from '../../shared/gestures';
import {TRAIN_PLATFORM} from '../../shared/encoreTrain';
import type {SeatClaim} from '../../shared/protocol';
import type {GhostSpot} from './Ghosts';
import type {GhostCostume} from './GhostCostumes';
import {TEA_TABLE,SEATED_STORY_CAST} from '../../shared/storyGuestSeats';
import {whiteRabbitSpot} from './WhiteRabbit';

export type NpcState = 'idle' | 'signature' | 'reaction';
export type NpcPose = {
 state: NpcState;
 action: string;
 age: number;
 headYaw: number;
 headPitch: number;
 lean: number;
 roll: number;
 hands: number;
 light: number;
 flame: number;
 flameTilt: number;
 watch: number;
};

type Reaction = {action:string; start:number; duration:number; targetYaw:number};
type Memory = {
 reaction?:Reaction;
 cooldown:number;
 event:string;
 lastClap:number;
 lastClapEvent?:string;
 headYaw:number;
 headPitch:number;
 lean:number;
 roll:number;
 hands:number;
};
export {QUEEN_SEAT} from '../../shared/storyGuestSeats';
const SEATED=SEATED_STORY_CAST.map(guest=>({
 role:guest.role,
 seat:FLOOR_SEATS.find(seat=>seat.row===guest.row&&seat.column===guest.column)!,
}));
const TEA_SEATS=FLOOR_SEATS.filter(seat=>seat.row===TEA_TABLE&&seat.column<=2);
const mod = T.MathUtils.euclideanModulo;
const smooth = T.MathUtils.smoothstep;
const envelope = (age:number, duration:number) => smooth(age,0,.5)*(1-smooth(age,duration-.6,duration));
const relativeYaw = (spot:GhostSpot,x:number,z:number) => {
 const angle=mod(Math.atan2(x-spot.x,z-spot.z)-spot.yaw+Math.PI,Math.PI*2)-Math.PI;
 const limit=spot.teaGuest?Math.PI*.65:1.05;
 return T.MathUtils.clamp(angle,-limit,limit);
};

/** Shared-clock routines plus bounded audience reactions. Reaction > signature > idle. */
export class NpcBehavior {
 private readonly memory = new Map<GhostCostume|'hatter'|'hare',Memory>();
 private queenGame?:{won:boolean;at:number;x?:number;z?:number};
 private wishFlower?:{time:number;x:number;z:number};
 offerWishFlower(time:number,{x,z}:{x:number;z:number}){this.wishFlower={time,x,z};}
 cancelWishFlower(){this.wishFlower=undefined;}
 queenCardResult(won:boolean,time:number,recipient?:{x:number;z:number}){
  this.queenGame={won,at:time,x:recipient?.x,z:recipient?.z};
 }

 private lastTime = -1;
 private rabbitPause = -Infinity;
 private phantomRetreat = 0;
 private rabbitCooldown = -Infinity;

 update(time:number, visitors:readonly Visitor[], claims:Record<string,SeatClaim>,
        train:{x:number;y:number;z:number}|null, reduced=false):GhostSpot[] {
  const dt = this.lastTime<0 ? 0 : Math.min(.1,Math.max(0,time-this.lastTime));
  this.lastTime=time;
  const result:GhostSpot[]=[];
  let rabbitTime=time;
  // A short pause loses distance, then a bounded burst catches up without jumping.
  const pauseAge=time-this.rabbitPause;
  if(pauseAge<.7)rabbitTime-=Math.max(0,pauseAge);
  else if(pauseAge<2.1)rabbitTime-=.7*(1-(pauseAge-.7)/1.4);
  let rabbit=whiteRabbitSpot(rabbitTime);
  const nearRabbit=visitors.some(v=>v.zone==='auditorium'&&Math.abs((v.y??0)-rabbit.y)<1.5&&Math.hypot(v.x-rabbit.x,v.z-rabbit.z)<1.6);
  if(nearRabbit && time>this.rabbitCooldown && rabbit.walking){
   this.rabbitPause=time;this.rabbitCooldown=time+12;
   rabbit=whiteRabbitSpot(rabbitTime);
  }
  const rabbitAge=time-this.rabbitPause;
  if(rabbitAge<2.1){
   rabbit.walking=rabbitAge>=.7;
   rabbit.behavior={...this.base('reaction',rabbitAge<.7?'make-way':'hurry-past',rabbitAge),lean:rabbitAge<.7?-.1:.25};
  }
  result.push(this.pose(rabbit,time,dt,visitors,claims,reduced));
  for(const {role,seat} of SEATED){
   if(claims[seat.id])continue;
   const spot:GhostSpot={x:seat.x,y:seat.y,z:seat.z,yaw:seat.yaw+Math.PI,id:'npc-'+seat.id,sitting:true,npc:true,costume:role};
   result.push(this.pose(spot,time,dt,visitors,claims,reduced));
  }
  for(const [i,seat] of TEA_SEATS.entries()){
   if(claims[seat.id])continue;
   const spot:GhostSpot={x:seat.x,y:seat.y,z:seat.z,yaw:seat.yaw+Math.PI,
    id:'tea-party-'+i,sitting:true,npc:true,teaGuest:i===0?'hatter':'hare',age:mod(time+i*5,10)};
   result.push(this.pose(spot,time,dt,visitors,claims,reduced));
  }
  // Retreat along the rear gallery, behind the broad station column, then return.
  const cycle=mod(time,240);
  const close=visitors.some(v=>v.zone==='auditorium'&&Math.abs((v.y??0)-TRAIN_PLATFORM.y)<2&&Math.hypot(v.x+7.4,v.z-44)<5);
  let retreat=0;
  if(!close)retreat=smooth(cycle,205,212)*(1-smooth(cycle,231,238));
  this.phantomRetreat += T.MathUtils.clamp(retreat-this.phantomRetreat,-dt*.18,dt*.18);
  retreat=this.phantomRetreat;
  if(!(cycle>=214&&cycle<229&&!close&&retreat>.99)){
   const phantom:GhostSpot={x:-7.4+retreat*3.2,y:TRAIN_PLATFORM.y,z:44+retreat*3.4,
    yaw:Math.PI,id:'phantom-gallery',sitting:false,npc:true,costume:'phantom'};
   const pose=this.base(retreat>0?'signature':'idle',retreat>0?'behind-column':'watch-stage',cycle);
   if(train&&Math.hypot(train.x-phantom.x,train.z-phantom.z)<12&&Math.abs(train.y-phantom.y)<5){
    pose.state='reaction';pose.action='watch-train';pose.headYaw=relativeYaw(phantom,train.x,train.z);
   }
   phantom.behavior=pose;
   result.push(this.pose(phantom,time,dt,visitors,claims,reduced));
  }
  return result;
 }

 private base(state:NpcState,action:string,age:number):NpcPose {
  return {state,action,age,headYaw:0,headPitch:0,lean:0,roll:0,hands:0,light:1,flame:1,flameTilt:0,watch:0};
 }

 private pose(spot:GhostSpot,time:number,dt:number,visitors:readonly Visitor[],claims:Record<string,SeatClaim>,reduced:boolean):GhostSpot {
  const role=spot.costume??spot.teaGuest!;
  let m=this.memory.get(role);
  if(!m){m={cooldown:0,event:'',lastClap:-Infinity,headYaw:0,headPitch:0,lean:0,roll:0,hands:0};this.memory.set(role,m);}
  const pose=spot.behavior??this.base('idle','watch-performance',0);
  const candleAge=mod(time+9,38);
  const weak=envelope(candleAge,5.5);
  if(role==='queen'){
   pose.headYaw=Math.sin(time*.17)*.28;
   const age=mod(time,29);
   if(age<4){pose.state='signature';pose.action='survey-hall';pose.headYaw=Math.sin(age/4*Math.PI*2)*.55;}
  }
  if(role==='candra'){
   pose.headPitch=.035*Math.sin(time*1.2);
   pose.flame=1+.055*Math.sin(time*5);
   pose.flameTilt=.055*Math.sin(time*3);
   if(candleAge<5.5){
    pose.state='signature';pose.action='protect-flame';pose.age=candleAge;
    pose.flame=1-.82*weak;pose.hands=weak;pose.headPitch=.12*weak;
    pose.flameTilt+=Math.sin(time*12)*.13*weak;
   }
  }
  if(role==='vesper'){
   pose.light=.82+.16*Math.sin(time*.8);
   if(weak>0 && !claims[SEATED[2].seat.id]){
    const candle=SEATED[2].seat;
    pose.state='signature';pose.action='light-neighbour';pose.age=candleAge;
    pose.headYaw=relativeYaw(spot,candle.x,candle.z)*weak;
    pose.roll=-.2*Math.sin(pose.headYaw)*weak;
    pose.lean=.12*Math.cos(pose.headYaw)*weak;pose.light+=.5*weak;
   }
  }
  this.react(spot,time,visitors,m);
  const reaction=m.reaction;
  if(reaction && time-reaction.start<reaction.duration){
   const age=time-reaction.start,w=envelope(age,reaction.duration);
   pose.state='reaction';pose.action=reaction.action;pose.age=age;
   pose.headYaw=reaction.targetYaw*w;
   if(reaction.action==='greet'||reaction.action==='approach'){
    const nod=Math.sin(Math.PI*smooth(age,.35,reaction.duration-.5))*w;
    pose.headPitch=(role==='phantom'?.2:.1)*nod;
    if(role==='phantom')pose.lean=.12*nod;
    if(role==='vesper'){pose.lean=.07*nod;pose.roll=0;pose.light+=.8*w;}
    if(role==='candra'){pose.hands=0;pose.flame=1+.25*nod;pose.flameTilt=.08*Math.sin(age*7)*w;}
    if(role==='white-rabbit'){pose.hands=0;pose.headPitch=.22*nod;pose.lean=.12*nod;}
   }
   if(reaction.action==='disapprove'){pose.headPitch=-.09*w;}
   if(reaction.action==='applause-flicker'){pose.flameTilt+=.18*Math.sin(age*13)*w;pose.flame*=1-.2*w;}
  }
  if(role==='queen'&&this.queenGame){
   const age=time-this.queenGame.at;
   if(age>=0&&age<2.4){
    const weight=envelope(age,2.4);
    pose.state='reaction';
    pose.action=this.queenGame.won?'give-wand':'shake-head';
    pose.age=age;
    const {x,z}=this.queenGame;
    pose.headYaw=this.queenGame.won
     ? (x!==undefined&&z!==undefined?relativeYaw(spot,x,z):0)*weight
     : Math.sin(age*13)*.43*weight;
    pose.headPitch=this.queenGame.won?.13*weight:0;
    pose.hands=this.queenGame.won?weight:0;
   }
  }
  if((role==='vesper'||role==='candra')&&this.wishFlower){
   const age=time-this.wishFlower.time;
   if(age>=0&&age<1.9){
    const weight=envelope(age,1.9);
    pose.state='reaction';pose.action='offer-wish-flower';pose.age=age;
    pose.headYaw=relativeYaw(spot,this.wishFlower.x,this.wishFlower.z)*weight;
    pose.headPitch=.12*weight;
    pose.hands=weight;
    pose.light=1+.5*weight;
    pose.flame=1+.35*weight;
   }
  }
  const blend=1-Math.exp(-dt*5);
  for(const key of ['headYaw','headPitch','lean','roll','hands'] as const){
   m[key]+= (pose[key]-m[key])*blend;
   pose[key]=m[key];
  }
  if(reduced){pose.headPitch=pose.lean=pose.roll=pose.hands=pose.flameTilt=0;pose.light=pose.flame=1;}
  spot.behavior=pose;
  return spot;
 }

 private react(spot:GhostSpot,time:number,visitors:readonly Visitor[],m:Memory) {
  let nearest:Visitor|undefined;
  let waving:Visitor|undefined;
  let clapping:Visitor|undefined;
  let claps=0;
  let distance=5;
  for(const v of visitors){
   if(v.zone!=='auditorium'||Math.abs((v.y??0)-spot.y)>2)continue;
   const d=Math.hypot(v.x-spot.x,v.z-spot.z);
   if(d<distance){nearest=v;distance=d;}
   if(d>7||!v.gesture)continue;
   const age=time-v.gestureAt/1000;
   if(age<0||age>gestureSeconds(v.gesture))continue;
   if((v.gesture==='wave'||v.gesture==='bow')&&d<(spot.costume==='white-rabbit'?3:5)
      &&(!waving||d<Math.hypot(waving.x-spot.x,waving.z-spot.z)))waving=v;
   if(v.gesture==='clap'||v.gesture==='bravo'){clapping=v;claps++;}
  }
  if(!nearest&&m.event.startsWith('near:'))m.event='';
  if(time<m.cooldown&&!(waving&&m.reaction?.action==='approach'))return;
  let visitor=waving,action='greet';
  if(!visitor&&clapping){
   const event=clapping.id+':'+clapping.gestureAt;
   const repeat=time-m.lastClap<8 && event!==m.lastClapEvent;
   if(spot.costume==='queen'&&(claps>=2||repeat||clapping.gesture==='bravo')){visitor=clapping;action='disapprove';}
   if(spot.costume==='candra'){visitor=clapping;action='applause-flicker';}
   if(event!==m.lastClapEvent){m.lastClap=time;m.lastClapEvent=event;}
  }
  if(!visitor&&nearest&&spot.costume==='phantom'){visitor=nearest;action='approach';}
  if(!visitor)return;
  const event=action==='approach'?'near:'+visitor.id:visitor.id+':'+visitor.gestureAt+':'+action;
  if(event===m.event)return;
  m.event=event;
  const duration=spot.costume==='white-rabbit'?1.45:3;
  m.reaction={action,start:time,duration,targetYaw:relativeYaw(spot,visitor.x,visitor.z)};
  m.cooldown=time+(action==='approach'?12:3.5);
 }
}
