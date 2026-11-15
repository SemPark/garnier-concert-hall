import {DINNER_SIT_BACK} from './dinnerTables';
import {BOUNDS,SEATS,distance,surfaceHeight,walkable,type Point,type Visitor} from './venue';

export const SOLO_DANCES=[
 {id:'step',label:'꼬마 선장 춤'}, // Keep the first move's existing network id.
 {id:'sweep',label:'손 들고 좌우 흔들기'},
 {id:'bad',label:'ATEEZ BAD 포인트 춤'},
 {id:'clap',label:'플로스 춤'},
 {id:'shimmy',label:'어깨 흔들기'},
 {id:'hop',label:'가볍게 뛰기'},
] as const;
const SHARED_ROUTINES=[SOLO_DANCES[0],SOLO_DANCES[2],SOLO_DANCES[3],SOLO_DANCES[4]] as const;
export const PARTNER_DANCES=[...SHARED_ROUTINES,{id:'spin',label:'가까워졌다가 한 바퀴 돌기'},{id:'hop',label:'손잡고 돌며 점프'}] as const;
export type DanceStyle=typeof SOLO_DANCES[number]['id']|typeof PARTNER_DANCES[number]['id'];

type DanceMove={style:DanceStyle;moveStartedAt:number;moveLeader?:0|1};
export type DanceState=Partial<DanceMove>&{startedAt:number;chair?:true;previousMove?:DanceMove;joinSpot?:{x:number;y:number;z:number};partnerId?:string;npcSpot?:{x:number;y:number;z:number};role?:0|1;center?:{x:number;y:number;z:number};angle?:number;endingAt?:number;stop?:{x:number;z:number;yaw:number;faceYaw?:number;back?:{x:number;z:number}}};
export type DanceCommand=
 |{type:'danceStart';style?:DanceStyle}|{type:'danceStop'}
 |{type:'danceJoin';targetId:string}|{type:'danceJoinNpc'};
export function isDanceCommand(message:{type:string}):message is DanceCommand{
 return message.type==='danceStart'||message.type==='danceStop'||message.type==='danceJoin'||message.type==='danceJoinNpc';
}
export const DANCE_JOIN_RADIUS=.43;
const ORIGINAL_MOVE_MS=2200;
const PARTNER_TEMPO=2;
const PARTNER_MOVE_MS=ORIGINAL_MOVE_MS/PARTNER_TEMPO;
const SPIN_PREP_BEAT=.30;
const SPIN_PREP_MS=580;
const PARTNER_JUMP_MS=1450;
export const CAPTAIN_MOVE_MS=8655;
const BAD_HIT_COUNT=4;
const BAD_BEAT_MS=600;
export function danceMoveDuration(dance?:Pick<DanceState,'style'|'partnerId'>){
 if(dance?.style==='bad')return BAD_HIT_COUNT*BAD_BEAT_MS;
 if(dance?.style==='step')return CAPTAIN_MOVE_MS;
 if(dance?.style==='sweep'||dance?.style==='shimmy'||dance?.style==='clap')return ORIGINAL_MOVE_MS;
 if(dance?.partnerId){
  if(dance.style==='spin')return SPIN_PREP_MS+PARTNER_MOVE_MS*(1-SPIN_PREP_BEAT);
  if(dance.style==='hop')return PARTNER_JUMP_MS;
  return PARTNER_MOVE_MS;
 }
 if(dance?.style==='hop')return ORIGINAL_MOVE_MS*2/3; // Two jumps, each in a third of the original time.
 return ORIGINAL_MOVE_MS/2;
}
export const DANCE_END_MS=1600;
const CHAIR_STAND_MS=340;
const CHAIR_CUSHION_Y=.625;
export const DANCE_RADIUS=.4;
const FLOSS_SIDE=[1,1,1,-1,-1,-1];
const FLOSS_CROSS=[0,1,0,0,-1,0];
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const activeMove=(dance:DanceState,now:number)=>dance.previousMove&&now<(dance.moveStartedAt??0)?dance.previousMove:dance;

function selectDanceMove(dance:DanceState,style:DanceStyle,now:number,moveLeader?:0|1){
 if(dance.style===style&&dance.moveLeader===moveLeader)return dance;
 if(!dance.partnerId)return {...dance,style,moveStartedAt:now,moveLeader,previousMove:undefined};
 const current=activeMove(dance,now);
 const {style:previousStyle,moveStartedAt,moveLeader:previousLeader}=current;
 const duration=danceMoveDuration({style:previousStyle,partnerId:dance.partnerId});
 // Finish the current cycle before switching, so spins and jumps land at their normal endpoint.
 const previousMove=previousStyle!==undefined&&moveStartedAt!==undefined&&moveStartedAt<=now
  ?{style:previousStyle,moveStartedAt,moveLeader:previousLeader}:undefined;
 const nextAt=previousMove?previousMove.moveStartedAt+Math.ceil((now-previousMove.moveStartedAt)/duration)*duration:now;
 return {...dance,style,moveStartedAt:nextAt,moveLeader,previousMove:nextAt>now?previousMove:undefined};
}

/** The facing for side-by-side routines, shared by both dancers and the opening camera. */
export function partnerRoutineYaw(angle:number){return angle+Math.PI/2;}

export function dancePose(v:Visitor,now:number,jazz=false){
 const d=v.dance!;
 const age=Math.max(0,(now-d.startedAt)/1000);
 const ending=d.endingAt===undefined?0:(now-d.endingAt)/DANCE_END_MS;
 const release=smooth(ending);
 const chair=!!d.chair;
 const startStanding=smooth(age*1000/CHAIR_STAND_MS);
 const sitBack=smooth((ending-.48)/.52);
 const chairStand=chair?startStanding*(1-sitBack):1;
 const chairMove=chair?smooth((age*1000-CHAIR_STAND_MS)/180)*(1-smooth((ending-.26)/.22)):1;
 const pairedFarewell=d.stop?.faceYaw!==undefined;
 const settle=pairedFarewell?smooth(ending/.28):release;
 const time=d.endingAt===undefined?age:Math.max(0,(d.endingAt-d.startedAt)/1000);
 const angle=d.angle??v.yaw;
 const stepRate=jazz?3.8:2.1;
 const phase=time*stepRate*(d.center?PARTNER_TEMPO:2);
 const join=smooth(age/1.15);
 const hold=smooth(age/.65)*(1-(pairedFarewell?smooth(ending/.18):release));
 const sign=d.role===1?-1:1;
 const center=d.center;
 const moveNow=d.endingAt??now;
 const move=activeMove(d,moveNow),style=move.style;
 const moveAge=moveNow-(move.moveStartedAt??Infinity);
 const duration=danceMoveDuration({style,partnerId:d.partnerId});
 const playing=style!==undefined&&moveAge>=0;
 const progress=playing?(moveAge%duration)/duration:0;
 const sweep=style==='sweep';
 const isFloss=style==='clap';
 const isBad=playing&&style==='bad';
 const isCaptain=playing&&style==='step';
 const fadeIn=sweep?.055:isFloss?.10:isBad?.08:isCaptain?180/duration:.15;
 const remaining=move===d?Infinity:(d.moveStartedAt??moveNow)-moveNow;
 const accent=playing?smooth(moveAge/(duration*fadeIn))*smooth(remaining/Math.min(220,duration*.22)):0;
 const sharedRoutine=!!center&&playing&&(isCaptain||isBad||isFloss||style==='shimmy');
 // Turn both dancers toward the same side and give each a clear space for arm swings.
 const formation=sharedRoutine?smooth(moveAge/320)*smooth(remaining/320):0;
 const spin=playing&&style==='spin';
 const jump=playing&&style==='hop';
 const leadsMove=!center||move.moveLeader===d.role;
 // Stretch the approach and retreat. The release, turn and return to grip keep their original timing.
 const elapsed=progress*duration;
 const spinBeat=spin&&center
  ? elapsed<SPIN_PREP_MS?elapsed/SPIN_PREP_MS*SPIN_PREP_BEAT:SPIN_PREP_BEAT+(elapsed-SPIN_PREP_MS)/PARTNER_MOVE_MS
  : progress;
 const spinProgress=center?(spinBeat-.40)/.38:progress;
 const spinAngle=spin&&leadsMove?Math.PI*2*smooth(spinProgress):0;
 const gripRelease=spin&&center?smooth((spinBeat-SPIN_PREP_BEAT)/.10)*(1-smooth((spinBeat-.78)/.22)):0;
 // Share the orbit, lift only the dancer who picked the jump, and rotate the grip points with them.
 const orbitAngle=jump&&center?angle+Math.PI*2*smooth(progress):angle;
 const jumpLift=jump&&center?Math.sin(Math.PI*progress)**2*.27*(1-settle):0;
 const lift=leadsMove?jumpLift:0;
 const normalNear=(1+Math.cos(time*(jazz?2.65:2.05)*PARTNER_TEMPO))/2;
 const prepWeight=spin&&center?smooth(spinBeat/.12)*(1-smooth((spinBeat-.78)/.22)):0;
 const prepNear=1-smooth((spinBeat-.12)/.20);
 const near=normalNear+(prepNear-normalNear)*prepWeight;
 const defaultRadius=DANCE_RADIUS+.04+(1-near)*.22;
 const radius=defaultRadius+(.77-defaultRadius)*formation;
 const x=center?center.x+Math.sin(orbitAngle)*radius*sign:v.x;
 const z=center?center.z+Math.cos(orbitAngle)*radius*sign:v.z;
 const spread=.12+near*.32;
 // After the greeting, open the stance and shift both grip points forward.
 const openStance=center?smooth((age-.65)/.50):0;
 const contact=(side:number)=>spread*side*(1-openStance*.52)-.31*openStance;
 const grip=(side:number)=>center?{
  x:center.x+Math.cos(orbitAngle)*contact(side),
  y:center.y+1.08+jumpLift*.5,
  z:center.z-Math.sin(orbitAngle)*contact(side)
 }:null;
 const motion=smooth(age/.35)*(1-settle)*chairMove;
 // Once selected, a move repeats on the shared clock.
 const isFullBodyMove=playing&&(isCaptain||isFloss||isBad||!center&&(style==='spin'||style==='hop'));
 const stepping=motion*(isFullBodyMove?1-accent:1);
 const stepBeat=style==='shimmy'&&playing
  ?Math.sin(phase)*(1-accent)+Math.sin(time*stepRate)*accent
  :Math.sin(phase);
 const retreatProgress=(ending-.06)/.31;
 const retreat=smooth(retreatProgress);
 const retreatStep=d.stop?.back&&retreatProgress>0&&retreatProgress<1
  ?.44*Math.sin(Math.PI*2*retreatProgress):0;
 const step=stepBeat*stepping+retreatStep;
 const handsUp=sweep?accent*motion:0;
 const handsSway=handsUp?Math.sin(progress*Math.PI*8):0;
 const reach=!center&&style==='spin'?accent*motion*.8:0;
 const floss=isFloss?accent*motion:0;
 // Out, behind the hip, out again, then mirror and sweep back to the first side.
 const flossBeat=floss?(progress*6+5.25)%6:0;
 const flossFrame=Math.floor(flossBeat);
 const nextFlossFrame=(flossFrame+1)%6;
 const flossMix=smooth(flossBeat-flossFrame);
 const flossSwing=floss?FLOSS_SIDE[flossFrame]*(1-flossMix)+FLOSS_SIDE[nextFlossFrame]*flossMix:0;
 const flossCross=FLOSS_CROSS[flossFrame]*(1-flossMix)+FLOSS_CROSS[nextFlossFrame]*flossMix;
 const flossHip=(flossCross*1.80-flossSwing)*floss;
 const badLean=isBad?accent*motion:0;
 const badBeat=(progress*BAD_HIT_COUNT)%1;
 // Reach waist height on the fourth hit and reset the bent arm within the same beat.
 const badLower=isBad?smooth(progress/.85)*(1-smooth((progress-.88)/.12)):0;
 const badPop=isBad?badLean*smooth((badBeat-.18)/.22)*smooth((.92-badBeat)/.52):0;
 // Follow the reference phrase: low sweep, bent-arm roll, outward reach and return.
 const captain=isCaptain?accent*motion:0;
 const captainSeconds=progress*CAPTAIN_MOVE_MS/1000;
 const captainSide=captain?Math.sin(captainSeconds*Math.PI/.4):0;
 const shimmy=style==='shimmy'?Math.sin(progress*Math.PI*8)*accent*motion:0;
 const hop=jump&&leadsMove?(center?Math.sin(Math.PI*progress)*accent:Math.sin(Math.PI*progress*2)**2)*motion:0;
 const greeting=Math.sin(Math.PI*smooth(age/(center?1.15:1.2)))*(1-settle);
 const farewell=Math.sin(Math.PI*(pairedFarewell?smooth((ending-.40)/.54):release));
 const bow=(center?.24:.18)*greeting+.19*farewell;
 const headPitch=-.36*greeting-.40*farewell;
 const soloYaw=d.joinSpot?Math.atan2(v.x-d.joinSpot.x,v.z-d.joinSpot.z):v.yaw;
 const swing=Math.sin(phase+.55)*stepping*(center?.18:jazz?.63:.49);
 const towardPartner=(Math.PI/2-(Math.PI/2-.69)*openStance)*(1-formation);
 const partnerYaw=partnerRoutineYaw(orbitAngle)-sign*towardPartner;
 const gripWeight=hold*(1-gripRelease)*(1-formation);
 const headYaw=-sign*(Math.PI/2-towardPartner)*gripWeight;
 let yaw=d.stop?.yaw??((center?partnerYaw:soloYaw)+spinAngle);
 if(d.stop?.faceYaw!==undefined){
  const delta=d.stop.faceYaw-yaw;
  yaw+=Math.atan2(Math.sin(delta),Math.cos(delta))*smooth((ending-.06)/.34);
 }
 const stop=d.stop;
 const chairCenter=chair&&v.seatId?.startsWith('parterre-')?-DINNER_SIT_BACK*chairStand:0;
 const stopX=stop?stop.x+((stop.back?.x??stop.x)-stop.x)*retreat:undefined;
 const stopZ=stop?stop.z+((stop.back?.z??stop.z)-stop.z)*retreat:undefined;
 return {x:stopX??(v.x+(x-v.x)*join+Math.sin(v.yaw)*chairCenter),
  y:(v.y??0)+(chair?CHAIR_CUSHION_Y*chairStand:0),
  z:stopZ??(v.z+(z-v.z)*join+Math.cos(v.yaw)*chairCenter),
  chair,chairStand,
  yaw,
  bob:center?lift:hop*.19,
  lean:step*(center?(jazz?.12:.085):(jazz?.23:.17)),
  step,swing,handsUp,handsSway,reach,floss,flossSwing,flossHip,flossCross,badLean,badLower,badPop,shimmy,hop,
  captain,captainSide,captainSeconds,
  bow,headPitch,headYaw,hold:gripWeight,
  hand:grip(-sign),rightHand:grip(sign)};
}
/** Each client derives the same ghost from its human partner's room state. */
export function danceNpc(host:Visitor):Visitor|undefined{
 const d=host.dance;
 if(!d?.npcSpot||!d.partnerId)return;
 const npc:Visitor={
  ...d.npcSpot,id:d.partnerId,name:'춤추는 유령',color:0,zone:host.zone,
  yaw:(d.angle??host.yaw)+Math.PI,pose:'idle',seatId:null,gesture:null,gestureAt:0,
  dance:{...d,npcSpot:undefined,partnerId:host.id,role:1,stop:undefined},
 };
 if(d.endingAt!==undefined){
  const {x,y,z,yaw}=dancePose(npc,d.endingAt);
  const faceYaw=d.stop?facingPartner({x,z},d.stop):undefined;
  const back=d.stop?retreatFromPartner({x,y,z},d.stop):undefined;
  npc.dance!.stop={x,z,yaw,faceYaw,back};
 }
 return npc;
}

export function clearDanceSpace(a:Point&Partial<Pick<Visitor,'id'|'zone'>>,b:Point&Partial<Pick<Visitor,'id'>>,visitors:readonly Visitor[]){
 const center={x:(a.x+b.x)/2,y:a.y??0,z:(a.z+b.z)/2};
 // Validate the swept disk against shared furniture and floors.
 for(let ring=0;ring<=4;ring++)for(let i=0;i<24;i++){
  const angle=i*Math.PI/12,r=ring*.3;
  const p={x:center.x+Math.sin(angle)*r,y:center.y,z:center.z+Math.cos(angle)*r};
  if(!walkable('auditorium',p)||Math.abs((surfaceHeight('auditorium',p)??Infinity)-center.y)>.08)return null;
 }
 for(const v of [a,b])for(let i=0;i<=12;i++){
  const t=i/12,p={x:v.x+(center.x-v.x)*t,y:center.y,z:v.z+(center.z-v.z)*t};
  if(!walkable('auditorium',p)||Math.abs((surfaceHeight('auditorium',p)??Infinity)-center.y)>.08)return null;
 }
 for(const v of visitors)if(v.id!==a.id&&v.id!==b.id&&v.zone===a.zone&&Math.abs((v.y??0)-center.y)<1&&distance(v,center)<1.7)return null;
 return center;
}
const eligible=(v:Visitor)=>v.zone==='auditorium'&&v.pose!=='sit'&&!v.seatId&&v.trainSeat===undefined;
// Avatars face local -Z.
function facingPartner(from:Point,to:Point){return Math.atan2(from.x-to.x,from.z-to.z);}
function retreatFromPartner(from:Point,to:Point){
 const gap=Math.hypot(from.x-to.x,from.z-to.z);
 if(gap<.001||gap>=1.72)return;
 const amount=Math.min(.24,Math.max(.08,(1.38-gap)/2));
 const point={x:from.x+(from.x-to.x)*amount/gap,y:from.y??0,z:from.z+(from.z-to.z)*amount/gap};
 if(!walkable('auditorium',point)||Math.abs((surfaceHeight('auditorium',point)??Infinity)-point.y)>.08)return;
 return {x:point.x,z:point.z};
}
export function finishDance(v:Visitor,visitors:Visitor[],now:number,immediate=false){
 const partnerId=v.dance?.partnerId;
 const partner=partnerId?visitors.find(p=>p.id===partnerId&&p.dance?.partnerId===v.id&&p.zone===v.zone):undefined;
 const npc=partner?undefined:danceNpc(v);
 // Read both positions before either visitor is changed.
 const poses=[v,partner].flatMap(p=>p?.dance?[{visitor:p,pose:dancePose(p,now)}]:[]);
 const npcPose=npc?dancePose(npc,now):undefined;
 for(const [index,{visitor,pose}] of poses.entries()){
  if(!immediate&&visitor.dance!.endingAt!==undefined)continue;
  if(visitor.dance!.chair){
   // The seated world position and claim remain authoritative during the dance.
   if(immediate)delete visitor.dance;
   else visitor.dance={...visitor.dance!,endingAt:now};
   continue;
  }
  const other=poses[1-index]?.pose??npcPose;
  const faceYaw=other?facingPartner(pose,other):undefined;
  const back=!immediate&&other?retreatFromPartner(pose,other):undefined;
  visitor.x=back?.x??pose.x;visitor.z=back?.z??pose.z;visitor.yaw=immediate?pose.yaw:faceYaw??pose.yaw;
  if(immediate)delete visitor.dance;
  else visitor.dance={...visitor.dance!,endingAt:now,stop:{x:pose.x,z:pose.z,yaw:pose.yaw,faceYaw,back}};
 }
}
export function expireDance(visitors:Visitor[],now:number){
 for(const v of visitors){
  if(v.dance?.endingAt!==undefined&&now>=v.dance.endingAt+DANCE_END_MS)delete v.dance;
  if(v.dance?.partnerId&&!v.dance.npcSpot&&!visitors.some(p=>p.id===v.dance!.partnerId&&p.zone===v.zone&&p.dance?.partnerId===v.id))finishDance(v,visitors,now);
 }
}
/** Prefer the current heading, then turn toward the nearest usable direction. */
export function findDanceJoinSpot(host:Point&{yaw:number}){
 for(const degrees of [0,30,-30,60,-60,90,-90,120,-120,150,-150,180]){
  const yaw=host.yaw+degrees*Math.PI/180;
  const spot={x:host.x-Math.sin(yaw)*1.2,y:host.y??0,z:host.z-Math.cos(yaw)*1.2};
  if(clearDanceSpace(host,spot,[]))return spot;
 }
}
/** Search outward on the same floor for a place that can fit both dancers. */
export function findNearbyDanceSpace(host:Point&{yaw:number},reachable:(position:{x:number;y:number;z:number})=>boolean){
 const bounds=BOUNDS.auditorium;
 const originY=host.y??0;
 const candidates=[];
 for(let x=Math.ceil(bounds.minX);x<=bounds.maxX;x++){
  for(let z=Math.ceil(bounds.minZ);z<=bounds.maxZ;z++){
   const y=surfaceHeight('auditorium',{x,z},originY);
   if(y===null||(y>=4)!==(originY>=4))continue;
   candidates.push({x,y,z,distance:Math.hypot(x-host.x,z-host.z)});
  }
 }
 candidates.sort((a,b)=>a.distance-b.distance);
 for(const {x,y,z} of candidates){
  const position={x,y,z};
  if(!walkable('auditorium',position))continue;
  const joinSpot=findDanceJoinSpot({...host,...position});
  if(joinSpot&&reachable(position))return position;
 }
}

export function handleDance(v:Visitor,visitors:Visitor[],msg:DanceCommand,now:number):string|null{
 expireDance(visitors,now);
 if(msg.type==='danceStop'){finishDance(v,visitors,now);return null;}
 const chair=v.zone==='auditorium'&&v.pose==='sit'&&v.trainSeat===undefined&&SEATS.some(seat=>seat.id===v.seatId);
 if(!eligible(v)&&!(chair&&msg.type==='danceStart'))return '공연장의 빈 공간이나 내 좌석에서 춤을 시작해 주세요.';
 if(msg.type==='danceStart'){
  if(msg.style!==undefined&&!(v.dance?.partnerId?PARTNER_DANCES:SOLO_DANCES).some(dance=>dance.id===msg.style))
   return v.dance?.partnerId?'둘이 함께 할 수 있는 동작을 골라 주세요.':'춤 동작을 다시 골라 주세요.';
  if(!v.dance&&chair){
   v.dance={startedAt:now,chair:true};
   if(msg.style)v.dance=selectDanceMove(v.dance,msg.style,now);
   v.gesture=null;
  }else if(!v.dance){
   const joinSpot=findDanceJoinSpot(v);
   if(!joinSpot)return '두 사람이 춤출 수 있는 빈 바닥으로 이동해 주세요.';
   v.dance={startedAt:now,joinSpot};
   v.pose='idle';v.gesture=null;
  }else if(msg.style&&v.dance.npcSpot){
   if(v.dance.endingAt===undefined)v.dance=selectDanceMove(v.dance,msg.style,now,v.dance.role);
  }else if(msg.style&&v.dance.partnerId){
   const partner=visitors.find(other=>other.id===v.dance?.partnerId);
   if(partner?.dance?.partnerId===v.id&&v.dance.endingAt===undefined&&partner.dance.endingAt===undefined){
    const next=selectDanceMove(v.dance,msg.style,now,v.dance.role);
    const {style,moveStartedAt,moveLeader,previousMove}=next;
    v.dance=next;
    partner.dance={...partner.dance,style,moveStartedAt,moveLeader,previousMove};
   }
  }else if(msg.style&&!v.dance.partnerId&&v.dance.endingAt===undefined){
   v.dance=selectDanceMove(v.dance,msg.style,now);
  }
  return null;
 }
 if(msg.type==='danceJoinNpc'){
  const spot=v.dance?.joinSpot;
  if(!spot||v.dance?.partnerId||v.dance?.endingAt!==undefined)return '혼자 춤추는 중에 유령을 부를 수 있어요.';
  const center=clearDanceSpace(v,spot,visitors);
  if(!center)return '함께 춤출 공간이 부족해요.';
  const angle=Math.atan2(v.x-center.x,v.z-center.z);
  v.dance={startedAt:now+150,partnerId:`dance-npc:${v.id}`,npcSpot:spot,role:0,center,angle};
  return null;
 }
 const host=visitors.find(p=>p.id===msg.targetId);
 const spot=host?.dance?.joinSpot;
 if(v.dance||!host||host===v||!eligible(host)||!spot||host.dance?.partnerId||host.dance?.endingAt!==undefined)
  return '이 춤자리는 이미 찼거나 닫혔어요.';
 if(Math.abs((v.y??0)-spot.y)>.15||distance(v,spot)>DANCE_JOIN_RADIUS)
  return '빈 원 안으로 들어와 주세요.';
 if(!clearDanceSpace(host,v,visitors))return '함께 춤출 공간이 부족해요.';
 const center={x:(host.x+spot.x)/2,y:spot.y,z:(host.z+spot.z)/2};
 const angle=Math.atan2(host.x-center.x,host.z-center.z);
 const startedAt=now+150;
 host.dance={startedAt,partnerId:v.id,role:0,center,angle};
 v.dance={startedAt,partnerId:host.id,role:1,center,angle};
 host.pose=v.pose='idle';host.gesture=v.gesture=null;
 return null;
}
