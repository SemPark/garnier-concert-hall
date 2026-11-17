import * as T from 'three';
import {DINNER_FRONT_LANE,DINNER_LANES_X,DINNER_LANES_Z,DINNER_REAR_LANE,DINNER_ROWS,DINNER_TABLES,DINNER_TABLE_HEIGHT,TABLE_RADIUS} from '../../shared/dinnerTables';
import {PARTERRE} from '../../shared/parterre';
import {SEATED_STORY_CAST,TEA_TABLE} from '../../shared/storyGuestSeats';
import {CatModel} from './LobbyCat';

const lanes=[DINNER_FRONT_LANE,...DINNER_LANES_Z,DINNER_REAR_LANE];
const rowGaps=DINNER_ROWS.map(z=>{
 const tables=DINNER_TABLES.filter(table=>table.z===z);
 return tables.slice(1).map((table,i)=>(table.x+tables[i].x)/2);
});
const storyTables=new Set([TEA_TABLE,...SEATED_STORY_CAST.map(guest=>guest.row)]);
const speed=.85;
const turnTime=.32,jumpTime=.68,tableTime=10;
const visitTime=2*(turnTime+jumpTime)+tableTime;
type Visit={start:number;distance:number;floor:T.Vector3;table:T.Vector3;walkYaw:number;jumpYaw:number};

function buildRoute(){
 // The same seeded choices and shared clock give all visitors the same cat.
 let seed=583;
 const random=()=>{
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/4294967296;
 };
 const corners:T.Vector3[]=[];
 let firstGap:number|undefined,lastGap:number|undefined;
 for(let pass=0;pass<8;pass++){
  const forward=pass%2===1;
  for(let i=0;i<rowGaps.length;i++){
   const row=forward?i:rowGaps.length-1-i;
   const closesLoop=pass===7&&i===rowGaps.length-1;
   const available=(x:number)=>x!==lastGap&&(!closesLoop||x!==firstGap);
   const inner=rowGaps[row].filter(available),outer=DINNER_LANES_X.filter(available);
   const choices=!inner.length||(outer.length&&random()<.1)?outer:inner;
   const x=choices[Math.floor(random()*choices.length)];
   firstGap??=x;lastGap=x;
   const from=forward?row:row+1,to=forward?row+1:row;
   corners.push(new T.Vector3(x,PARTERRE.floor,lanes[from]),new T.Vector3(x,PARTERRE.floor,lanes[to]));
  }
 }

 const turns=corners.map((corner,i)=>{
  const before=corners[(i+corners.length-1)%corners.length],after=corners[(i+1)%corners.length];
  return {
   entry:before.clone().sub(corner).normalize().multiplyScalar(.35).add(corner),
   exit:after.clone().sub(corner).normalize().multiplyScalar(.35).add(corner),
  };
 });
 const path=new T.CurvePath<T.Vector3>(),visits:Visit[]=[];
 let length=0,nextVisit=4;
 for(const [i,corner] of corners.entries()){
  const {entry,exit}=turns[i],next=turns[(i+1)%turns.length].entry;
  const turn=new T.QuadraticBezierCurve3(entry,corner,exit);
  path.add(turn);
  length+=turn.getLength();
  const line=new T.LineCurve3(exit,next);
  path.add(line);
  if(length/speed>=nextVisit){
   // Jump through the gap between the diagonal chairs, leaving room around the vase.
   const across=exit.z===next.z;
   const start=across?exit.x:exit.z,end=across?next.x:next.z;
   const axis=across?'x':'z';
   const tables=DINNER_TABLES.filter(table=>{
    const offset=across?exit.z-table.z:exit.x-table.x;
    const vaseAngle=table.id*2.4;
    const towardVase=across?Math.sin(vaseAngle):Math.cos(vaseAngle);
    const vaseBlocksLanding=Math.sign(offset)*towardVase>.75;
    return !storyTables.has(table.id)&&Math.abs(offset)<=3.01&&!vaseBlocksLanding
      &&table[axis]>Math.min(start,end)+.4&&table[axis]<Math.max(start,end)-.4;
   });
   if(tables.length){
    const table=tables[Math.floor(random()*tables.length)];
    const floor=new T.Vector3(across?table.x:exit.x,PARTERRE.floor,across?exit.z:table.z);
    const rim=new T.Vector3(table.x,PARTERRE.floor+DINNER_TABLE_HEIGHT,table.z);
    const edge=TABLE_RADIUS-.39;
    rim.x+=across?0:Math.sign(floor.x-table.x)*edge;
    rim.z+=across?Math.sign(floor.z-table.z)*edge:0;
    const distance=length+Math.abs(start-table[axis]);
    visits.push({
     start:distance/speed+visits.length*visitTime,distance,
     floor,table:rim,
     walkYaw:Math.atan2(exit.x-next.x,exit.z-next.z),
     jumpYaw:Math.atan2(floor.x-rim.x,floor.z-rim.z),
    });
    nextVisit=distance/speed+9+random()*8;
   }
  }
  length+=line.getLength();
 }
 return {path,visits,length,duration:length/speed+visits.length*visitTime};
}

const route=buildRoute();

function turnBetween(from:number,to:number,progress:number){
 const delta=T.MathUtils.euclideanModulo(to-from+Math.PI,Math.PI*2)-Math.PI;
 return from+delta*T.MathUtils.smoothstep(progress,0,1);
}

/** One cat wanders between the tables and occasionally hops onto their rim. */
export class HallCat extends CatModel{
 private readonly ahead=new T.Vector3();
 private readonly strides=Math.round(route.length/(this.root.scale.x*.52));
 private onTableVisit=false;
 private routeTime?:number;
 private lastSharedTime?:number;
 override get canPet(){return !this.onTableVisit;}
 constructor(scene:T.Scene){
  super(scene,'auditorium');
  this.root.name='hall-cat';
  this.walk(0,0,false);
  this.updateInteraction(0,false);
 }

 update(seconds:number,reduced:boolean,now=seconds){
  const elapsed=Math.max(0,seconds-(this.lastSharedTime??seconds));
  this.lastSharedTime=seconds;
  const happy=now<this.happyUntil;
  if(now<this.heldUntil||happy){
   this.pose(now,0,0,false,reduced,happy);
  }else{
   // Stay on the route after a local pause, then ease back toward the shared clock.
   this.routeTime=this.routeTime===undefined?seconds:Math.min(seconds,this.routeTime+elapsed*1.5);
   this.walk(this.routeTime,seconds,reduced);
  }
  this.updateInteraction(now,reduced);
 }

 private walk(seconds:number,animationTime:number,reduced:boolean){
  const time=T.MathUtils.euclideanModulo(seconds,route.duration);
  this.onTableVisit=false;
  let walkingTime=time;
  for(const visit of route.visits){
   const age=time-visit.start;
   if(age<0)break;
   if(age<visitTime){
    this.onTableVisit=true;
    this.visitTable(visit,age,animationTime,reduced);
    return;
   }
   walkingTime-=visitTime;
  }
  const progress=walkingTime*speed/route.length;
  const position=this.root.position;
  route.path.getPoint(progress,position);
  route.path.getPoint((progress+.025/route.length)%1,this.ahead);
  this.root.rotation.y=Math.atan2(position.x-this.ahead.x,position.z-this.ahead.z);
  this.pose(animationTime,progress*this.strides,1,true,reduced);
 }

 private visitTable(visit:Visit,age:number,seconds:number,reduced:boolean){
  const {floor,table,jumpYaw,walkYaw}=visit;
  const {position,rotation}=this.root;
  const landing=turnTime+jumpTime,leaving=landing+tableTime,grounded=leaving+jumpTime;
  let airborne=0,sitting=0;
  if(age<turnTime){
   position.copy(floor);
   rotation.y=turnBetween(walkYaw,jumpYaw,age/turnTime);
  }else if(age<landing||age>=leaving&&age<grounded){
   const jumpingUp=age<landing;
   const progress=jumpingUp?(age-turnTime)/jumpTime:1-(age-leaving)/jumpTime;
   airborne=Math.sin(Math.PI*progress);
   position.lerpVectors(floor,table,progress);
   position.y+=1.92*progress*(1-progress);
   rotation.y=jumpYaw+(jumpingUp?0:Math.PI);
  }else if(age<leaving){
   position.copy(table);
   const rest=age-landing;
   sitting=T.MathUtils.smoothstep(rest,.08,.38)*(1-T.MathUtils.smoothstep(rest,tableTime-.92,tableTime-.57));
   rotation.y=jumpYaw+Math.PI*T.MathUtils.smoothstep(rest,tableTime-.54,tableTime-.06);
  }else{
   position.copy(floor);
   rotation.y=turnBetween(jumpYaw+Math.PI,walkYaw,(age-grounded)/turnTime);
  }
  this.pose(seconds,visit.distance/route.length*this.strides,0,false,reduced,false,airborne,sitting);
 }
}
