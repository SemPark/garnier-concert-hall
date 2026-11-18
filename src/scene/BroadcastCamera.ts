import {MathUtils,Vector3,type Object3D} from 'three';
import {constrainCamera} from '../controls/cameraCollision';
import {CONDUCTOR,ORCHESTRA_LAYOUT,STAGE,STAGE_FLOOR,type MusicianPlacement} from '../orchestra/layout';
import {GOLDEN_HALL,HALL_CHANDELIERS} from '../../shared/goldenHall';
import {JAZZ_HALL} from '../../shared/hallKind';
import {TREE_SPOTS} from './ChristmasTrees';

export type BroadcastTarget={
 id:string;x:number;y:number;z:number;azimuth:number;distance:number;lift:number;
 fixed?:true|(()=>BroadcastTarget);reaction?:boolean;
};
type ShotFrame={look:Vector3;position:Vector3};
type BroadcastView={
 aspect:number;reduced:boolean;space:boolean;walls:readonly Object3D[];
 visitor:BroadcastTarget;podium:BroadcastTarget;ghosts:readonly BroadcastTarget[];
 details:readonly BroadcastTarget[];events:readonly BroadcastTarget[];
 planets?:readonly {id:string;position:Vector3}[];
};

const STAGE_SECONDS=18;
const MIN_STAGE_SECONDS=12;
const CUTAWAYS=['instrument','reaction','b-roll','instrument','podium','instrument','reaction','instrument','b-roll','instrument'] as const;

function instrumentGroups(layout:readonly MusicianPlacement[]){
 const groups=new Map<string,MusicianPlacement[]>();
 for(const player of layout){
  const id=player.section+'/'+player.instrument;
  const group=groups.get(id);
  if(group)group.push(player);
  else groups.set(id,[player]);
 }
 return groups;
}

const PARTS=instrumentGroups(ORCHESTRA_LAYOUT);
const HALL_WIDES=['hall','organ','fireworks','chandelier'] as const;
const SPACE_WIDES=['hall','sky'] as const;
type Wide=typeof HALL_WIDES[number]|typeof SPACE_WIDES[number];
const STAGE_ANGLES=['front','left','high','right'] as const;
type StageAngle=typeof STAGE_ANGLES[number];
type Shot={
 kind:'stage'|'instrument'|'ghost'|'detail'|'wide'|'planet'|'event'|'reaction'|'podium'|'visitor';
 id:string;seconds:number;azimuth?:number;side:number;fixedFrame?:ShotFrame;treeBlocked?:true;
};
const stageShot=(angle:StageAngle):Shot=>({kind:'stage',id:angle,seconds:STAGE_SECONDS,side:1});

class Rotation{
 private seen=new Set<string>();
 private last?:string;

 next(ids:readonly string[],random:()=>number){
  if(!ids.length)return undefined;
  let choices=ids.filter(id=>!this.seen.has(id));
  if(!choices.length){
   this.seen.clear();
   choices=ids.length>1?ids.filter(id=>id!==this.last):[...ids];
  }
  const id=choices[Math.floor(random()*choices.length)];
  this.seen.add(id);
  this.last=id;
  return id;
 }
}

function instrumentTarget(id:string,player:MusicianPlacement):BroadcastTarget{
 if(player.instrument==='drum-kit'){
  const towardsKit=.58;
  return {id,x:player.x-Math.sin(player.yaw)*towardsKit,y:STAGE_FLOOR+player.rise+.72,
   z:player.z-Math.cos(player.yaw)*towardsKit,azimuth:-1.27,distance:2.95,lift:1.65};
 }
 const rear=player.row>=2;
 const close=player.section==='keyboards'||player.section==='harps';
 // Start from the player's face, then look across the desk from above neighbouring players.
 const across=player.x<0?-1:1;
 return {id,x:player.x,y:STAGE_FLOOR+player.rise+.88,z:player.z,
  azimuth:player.yaw+Math.PI+across*(rear?.97:.58),distance:close?3.25:2.55,lift:rear?1.8:1.15};
}

function stageFrame(angle:StageAngle,t:number,view:BroadcastView):ShotFrame{
 const stageZ=JAZZ_HALL?-14.25:CONDUCTOR.z-6;
 const portrait=MathUtils.clamp(1.05/view.aspect,1,1.65)-1;
 if(view.space&&angle==='high'){
  // From just in front of the organ, frame the players against the open rear of the hall.
  return {
   look:new Vector3(1.5,7.2,5),
   position:new Vector3(MathUtils.lerp(-6.8,-5.8,t),MathUtils.lerp(12.8,13.4,t),-26),
  };
 }
 if(angle==='high')return {
  look:new Vector3(0,1.2,stageZ),
  position:new Vector3(MathUtils.lerp(-1.6,.2,t),17.2,(JAZZ_HALL?-2:1)+portrait*30),
 };
 if(angle==='left'||angle==='right'){
  const left=angle==='left';
  const side=left?-1:1;
  const height=view.space?(left?8.8:12):(left?4.4:9.6);
  return {
   look:new Vector3(-side*.7,view.space?4.7:1.8,stageZ),
   position:new Vector3(side*MathUtils.lerp(12.1,10.8,t),height,
    (JAZZ_HALL?(left?-5:-1):(left?-2:2))+portrait*40+MathUtils.lerp(.6,-.6,t)),
  };
 }
 return {
  look:new Vector3(0,view.space?5.7:JAZZ_HALL?1.25:2.4,stageZ),
  position:new Vector3(MathUtils.lerp(1.5,.2,t),view.space?8.7:JAZZ_HALL?5.7:6.7,
   (JAZZ_HALL?-1:5.8)+portrait*27+(view.space?3:0)-t),
 };
}

function wideFrame(kind:Wide,side:number,t:number,view:BroadcastView):ShotFrame{
 const portrait=MathUtils.clamp(1.05/view.aspect,1,1.65);
 switch(kind){
  case 'hall':return {
   look:new Vector3(0,view.space?12:8,-19),
   position:new Vector3(side*MathUtils.lerp(6.7,5.6,t),view.space?16.8:14.5,43),
  };
  case 'organ':return {
   look:new Vector3(0,10.5,STAGE.back+1.4),
   position:new Vector3(side*MathUtils.lerp(4.6,3.3,t),9.4,-9+(portrait-1)*6),
  };
  case 'fireworks':return {
   look:new Vector3(0,12.6,-21),
   position:new Vector3(side*MathUtils.lerp(3.7,2.7,t),5.8,12+(portrait-1)*10),
  };
  case 'sky':return {
   look:new Vector3(side*MathUtils.lerp(9,12,t),23,-24),
   position:new Vector3(side*MathUtils.lerp(4,3,t),14.8,26),
  };
  case 'chandelier': {
   const chandelier=HALL_CHANDELIERS[1];
   return {
    look:new Vector3(chandelier.x,chandelier.y+.8,chandelier.z),
    position:new Vector3(side*MathUtils.lerp(2.8,1.9,t),13.2,chandelier.z+7*portrait),
   };
  }
 }
}

function targetFrame(target:BroadcastTarget,shot:Shot,t:number,view:BroadcastView){
 const look=new Vector3(target.x,target.y,target.z);
 const portrait=MathUtils.clamp(.95/view.aspect,1,1.45);
 const distance=target.distance*portrait;
 const atAngle=(yaw:number,progress:number)=>{
  const radius=distance*MathUtils.lerp(1.025,.975,progress);
  const desired=look.clone().add(new Vector3(Math.sin(yaw)*radius,target.lift,Math.cos(yaw)*radius));
  desired.x=MathUtils.clamp(desired.x,-GOLDEN_HALL.width/2+.45,GOLDEN_HALL.width/2-.45);
  desired.z=MathUtils.clamp(desired.z,STAGE.back+.6,GOLDEN_HALL.rear-.65);
  return constrainCamera(look,desired,view.walls);
 };
 // The stage trees are decorative rather than camera walls. Avoid placing the
 // camera in their foliage or looking through it at a close-up subject.
 const treeBlocked=(position:Vector3)=>TREE_SPOTS.some(tree=>{
  const dx=position.x-look.x,dz=position.z-look.z;
  const length=dx*dx+dz*dz;
  const along=length?MathUtils.clamp(((tree.x-look.x)*dx+(tree.z-look.z)*dz)/length,0,1):0;
  const y=MathUtils.lerp(look.y,position.y,along);
  return y<9&&y>0&&Math.hypot(look.x+dx*along-tree.x,look.z+dz*along-tree.z)<2.65;
 });
 if(shot.azimuth===undefined){
  // Pick a clear side at the cut and keep it through the move, including when the target turns.
  let best=0;
  shot.azimuth=target.azimuth;
  for(const angle of [0,.75,-.75,1.55,-1.55,Math.PI]){
   const yaw=target.azimuth+angle;
   const middle=atAngle(yaw,.5);
   if(treeBlocked(middle)||treeBlocked(atAngle(yaw+.055,0))||treeBlocked(atAngle(yaw-.055,1)))continue;
   const clear=middle.distanceToSquared(look);
   if(clear>best){best=clear;shot.azimuth=yaw;}
   if(clear>(distance*.85)**2)break;
  }
  if(best===0){
   shot.treeBlocked=true;
   return stageFrame('front',t,view);
  }
 }
 const position=atAngle(shot.azimuth+MathUtils.lerp(.055,-.055,t),t);
 if(treeBlocked(position)){
  shot.treeBlocked=true;
  return stageFrame('front',t,view);
 }
 return position.distanceToSquared(look)>.45**2?{look,position}:stageFrame('front',t,view);
}

/** Return to the orchestra between every audience, detail and featured player cutaway. */
export class BroadcastCamera{
 private readonly parts=new Rotation();
 private readonly cast=new Rotation();
 private readonly bRoll=new Rotation();
 private readonly spaceBroll=new Rotation();
 private readonly eventIds=new Set<string>();
 private current=stageShot('front');
 private stageIndex=0;
 private space?:boolean;
 private player?:BroadcastTarget;
 private since:number;
 private index=0;
 private lastWasEvent=false;

 constructor(now:number,private readonly random=Math.random){this.since=now;}

 get shotStartedAt(){return this.since;}

 private cutaway(view:BroadcastView,event:BroadcastTarget|undefined):Shot{
  const side=this.random()<.5?1:-1;
  this.lastWasEvent=!!event;
  if(event){
   this.eventIds.add(event.id);
   return {kind:event.reaction?'reaction':'event',id:event.id,seconds:event.reaction?3.5:5,side};
  }
  const kind=CUTAWAYS[this.index++%CUTAWAYS.length];
  switch(kind){
   case 'instrument': {
    const id=this.parts.next([...PARTS.keys()],this.random)!;
    const group=PARTS.get(id)!;
    this.player=instrumentTarget(id,group[Math.floor(this.random()*group.length)]);
    return {kind,id,seconds:6,side};
   }
   case 'reaction': {
    const id=this.cast.next(view.ghosts.map(target=>target.id),this.random);
    return id?{kind:'ghost',id,seconds:4,side}:{kind:'visitor',id:view.visitor.id,seconds:4,side};
   }
   case 'podium':return {kind,id:view.podium.id,seconds:5,side};
   case 'b-roll': {
    if(view.space){
     const planets=view.planets?.map(planet=>planet.id)??[];
     const id=this.spaceBroll.next([...planets,...SPACE_WIDES],this.random)!;
     return {kind:planets.includes(id)?'planet':'wide',id,seconds:8,side};
    }
    const details=view.details.map(target=>target.id);
    const id=this.bRoll.next([...details,...HALL_WIDES],this.random)!;
    return {kind:details.includes(id)?'detail':'wide',id,seconds:5,side};
   }
  }
 }

 private subject(shot:Shot,view:BroadcastView){
  switch(shot.kind){
   case 'instrument':return this.player;
   case 'ghost':return view.ghosts.find(target=>target.id===shot.id);
   case 'detail':return view.details.find(target=>target.id===shot.id);
   case 'event':
   case 'reaction':return view.events.find(target=>target.id===shot.id);
   case 'podium':return view.podium;
   case 'visitor':return view.visitor;
  }
 }

 frame(now:number,view:BroadcastView):ShotFrame{
  if(this.space!==undefined&&this.space!==view.space){
   this.stageIndex=0;
   this.current=stageShot('front');
   this.since=now;
  }
  this.space=view.space;
  for(const id of this.eventIds){
   if(!view.events.some(target=>target.id===id))this.eventIds.delete(id);
  }
  let shot=this.current;
  const elapsed=now-this.since;
  if(shot.kind==='stage'){
   const event=elapsed>=MIN_STAGE_SECONDS&&!this.lastWasEvent
    ?view.events.find(target=>!this.eventIds.has(target.id)):undefined;
   if(event||elapsed>=shot.seconds){
    shot=this.current=this.cutaway(view,event);
    this.since=now;
   }
  }else{
   const available=shot.kind==='wide'||(shot.kind==='planet'
    ?view.planets?.some(planet=>planet.id===shot.id)
    :!!this.subject(shot,view)||(shot.kind==='reaction'&&!!shot.fixedFrame));
   if(!available||elapsed>=shot.seconds){
    this.stageIndex=(this.stageIndex+1)%STAGE_ANGLES.length;
    shot=this.current=stageShot(STAGE_ANGLES[this.stageIndex]);
    this.since=now;
   }
  }
  const t=view.reduced?.5:MathUtils.smoothstep((now-this.since)/shot.seconds,0,1);
  if(shot.kind==='stage')return stageFrame(shot.id as StageAngle,t,view);
  if(shot.kind==='wide')return wideFrame(shot.id as Wide,shot.side,t,view);
  if(shot.kind==='planet'){
   const planet=view.planets?.find(planet=>planet.id===shot.id);
   if(planet)return {look:planet.position,position:new Vector3(shot.side*MathUtils.lerp(1.4,2.4,t),15.2,10)};
  }
  if(shot.treeBlocked)return stageFrame('front',t,view);
  if(shot.fixedFrame)return shot.fixedFrame;
  const target=this.subject(shot,view);
  if(!target)return stageFrame('front',t,view);
  if(target.fixed){
   // Compose once so the subject travels across the image without dragging the camera with it.
   const framedTarget=typeof target.fixed==='function'?target.fixed():target;
   shot.fixedFrame=targetFrame(framedTarget,shot,.5,view);
   return shot.fixedFrame;
  }
  return targetFrame(target,shot,t,view);
 }
}
