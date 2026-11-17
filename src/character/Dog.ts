import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {DINNER_FRONT_LANE,DINNER_LANES_Z,DINNER_REAR_LANE} from '../../shared/dinnerTables';
import {PARTERRE} from '../../shared/parterre';
import {surfaceHeight,walkable,type Point,type Visitor,type Zone} from '../../shared/venue';
import {visitorBlocksStep} from '../../shared/visitorCollision';
import {findPath,segmentClear} from '../navigation/path';
import {material,sphere} from '../scene/primitives';
import {PET_VISITOR_GAP,PettableAnimal} from './PettableAnimal';
import {petEyeDisk,petEyeHighlight} from './petEyes';

const LOBBY_HOME={x:-2.25,y:0,z:27.2};
const HALL_HOME={x:2.1,y:0,z:47.15};
const NOTICE_RADIUS=4.5;
const RETURN_RADIUS=6;
const STAY_RADIUS=2.6;
const STOP_DISTANCE=1.1;
const HIP_HEIGHT=.386;
const cream=0xf6ecd9,fur=0xfff7e8,ink=0x30251f;
const eyeInk=new T.MeshBasicMaterial({color:ink});
const eyeLight=new T.MeshBasicMaterial({color:0xfff6e8});

const dinnerLanes=[DINNER_FRONT_LANE,...DINNER_LANES_Z,DINNER_REAR_LANE];
// Change gaps on the way back so the route covers both sides and the centre of the room.
const stagewardGaps=[0,-3,-6,3,6,-3,0,3,6];
const rearwardGaps=[-6,-3,6,-3,-6,3,6,3,0];
const dinnerLanePoint=(x:number,lane:number):Point=>({x,y:PARTERRE.floor,z:dinnerLanes[lane]});
const hallPatrol=[
 ...stagewardGaps.flatMap((x,i)=>[dinnerLanePoint(x,dinnerLanes.length-1-i),dinnerLanePoint(x,dinnerLanes.length-2-i)]),
 ...rearwardGaps.flatMap((x,i)=>[dinnerLanePoint(x,i),dinnerLanePoint(x,i+1)]),
];

function dogTailGeometry(){
 const spine=new T.CatmullRomCurve3([
  new T.Vector3(),new T.Vector3(.012,.095,.102),new T.Vector3(.025,.208,.092),
  new T.Vector3(.019,.263,.001),new T.Vector3(.010,.227,-.096),
 ]);
 const rings=28,sides=12;
 const tube=new T.TubeGeometry(spine,rings,1,sides,false);
 const points=tube.getAttribute('position'),point=new T.Vector3();
 const bendByVertex=new Float32Array(points.count);
 for(let ring=0;ring<=rings;ring++){
  const t=ring/rings,center=spine.getPointAt(t);
  const cap=Math.max(0,(t-.79)/.21);
  const thickness=.068+Math.sin(Math.PI*t)*.018;
  const radius=ring===rings?0:thickness*Math.sqrt(1-cap*cap);
  const bend=T.MathUtils.smoothstep(t,.32,1)*.16;
  for(let side=0;side<=sides;side++){
   const i=ring*(sides+1)+side;
   point.fromBufferAttribute(points,i).lerp(center,1-radius);
   points.setXYZ(i,point.x,point.y,point.z);
   bendByVertex[i]=bend;
  }
 }
 tube.deleteAttribute('uv');
 tube.deleteAttribute('normal');
 tube.setAttribute('bend',new T.BufferAttribute(bendByVertex,1));
 const geometry=mergeVertices(tube);
 geometry.computeVertexNormals();
 const bends=geometry.getAttribute('bend'),rest=geometry.getAttribute('position');
 geometry.deleteAttribute('bend');
 // Bend the upper rings sideways while keeping the lower rings attached to the back.
 for(const side of [-1,1]){
  const bent=rest.clone();
  for(let i=0;i<bent.count;i++)bent.setX(i,rest.getX(i)+side*bends.getX(i));
  const shape=new T.BufferGeometry().setIndex(geometry.index).setAttribute('position',bent);
  shape.computeVertexNormals();
  (geometry.morphAttributes.position??=[]).push(bent);
  (geometry.morphAttributes.normal??=[]).push(shape.getAttribute('normal'));
 }
 tube.dispose();
 return geometry;
}
const dogTail=dogTailGeometry();

export class Dog extends PettableAnimal{
 private readonly head=new T.Group();
 private readonly eyes:T.Mesh[]=[];
 private readonly tail=new T.Mesh(dogTail,material(fur));
 private readonly legs:T.Group[]=[];
 private readonly next=new T.Vector3();
 private route:Point[]=[];
 private leaderId:string|null=null;
 private readonly departedVisitors=new Map<string,Point>();
 private repathAt=0;
 private wanderAt=0;
 private hallPatrolIndex=0;
 private gait=0;
 private stride=0;

 constructor(scene:T.Scene,private readonly location:Zone){
  super(scene,location,'dog');
  const home=location==='lobby'?LOBBY_HOME:HALL_HOME;
  this.root.name=location==='lobby'?'lobby-dog':'hall-dog';
  this.root.position.set(home.x,home.y,home.z);
  this.root.scale.setScalar(.68);

  sphere(this.root,.26,[0,.38,.07],cream).scale.set(.245,.235,.375);
  sphere(this.root,.2,[0,.43,-.19],fur).scale.set(.235,.24,.22);
  this.head.position.set(0,.64,-.29);this.root.add(this.head);
  const headSize=new T.Vector3(.315,.285,.285);
  sphere(this.head,.32,[0,0,0],fur).scale.copy(headSize);
  for(const side of [-1,1]){
   // Tuck the top into the head and angle the lower end away from the cheek.
   const ear=sphere(this.head,.17,[side*.273,-.048,.025],cream);
   ear.scale.set(.095,.216,.119);
   ear.rotation.z=side*.40;
   const eye=new T.Group();
   const x=side*.121,y=.002,z=-headSize.z*Math.sqrt(1-(x/headSize.x)**2-(y/headSize.y)**2);
   const normal=new T.Vector3(x/headSize.x**2,y/headSize.y**2,z/headSize.z**2).normalize();
   eye.position.set(x,y,z).addScaledVector(normal,.0015);
   eye.lookAt(eye.position.clone().add(normal));
   const mark=new T.Mesh(petEyeDisk,eyeInk);mark.scale.set(.041,.047,1);eye.add(mark);
   const catchlight=new T.Mesh(petEyeHighlight,eyeLight);catchlight.scale.set(.010,.012,1);catchlight.position.set(.010,.016,.0006);eye.add(catchlight);
   this.head.add(eye);this.eyes.push(mark,catchlight);
   sphere(this.head,.092,[side*.067,-.101,-.236],0xfffaef).scale.set(.095,.078,.083);
  }
  sphere(this.head,.048,[0,-.067,-.313],ink).scale.set(.049,.032,.024);
  sphere(this.head,.027,[0,-.159,-.28],0xd89086).scale.set(.03,.034,.016);

  const collar=new T.Mesh(new T.TorusGeometry(.185,.022,6,20),material(0x506fa7));
  collar.rotation.x=Math.PI/2;collar.position.set(0,.49,-.25);this.root.add(collar);
  sphere(this.root,.033,[0,.434,-.435],0xe5bd65);
  const legGeometry=new T.CapsuleGeometry(.074,.278,4,8).translate(0,.213-HIP_HEIGHT,0);
  for(const z of [-.182,.225])for(const side of [-1,1]){
   const leg=new T.Group();leg.position.set(side*.122,HIP_HEIGHT,z);this.root.add(leg);
   leg.add(new T.Mesh(legGeometry,material(cream)));
   this.legs.push(leg);
  }
  this.tail.position.set(0,.44,.326);this.root.add(this.tail);
  const shadow=new T.Mesh(new T.CircleGeometry(.4,18),new T.MeshBasicMaterial({color:0x3c2c20,transparent:true,opacity:.14,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;shadow.scale.y=1.4;this.root.add(shadow);
  this.root.userData.animated=true;
  this.updateInteraction(0,false);
 }

 petPoint(out:T.Vector3){return this.root.localToWorld(out.set(0,.90,-.29));}

 override invite(visitor:T.Vector3){
  const route=super.invite(visitor);
  if(route){this.route=[];this.leaderId=null;}
  return route;
 }

 update(seconds:number,dt:number,visitors:readonly Visitor[],reduced:boolean,cat?:Point){
  const happy=seconds<this.happyUntil;
  const moved=seconds>=this.heldUntil&&!happy?this.walk(seconds,dt,visitors,cat):0;
  this.gait+=moved/.34;
  this.stride=T.MathUtils.damp(this.stride,moved>0?1:0,12,dt);
  for(const [index,leg] of this.legs.entries()){
   const phase=this.gait*Math.PI*2+(index===0||index===3?0:Math.PI);
   leg.rotation.x=Math.sin(phase)*.35*this.stride;
   leg.position.y=HIP_HEIGHT+Math.max(0,Math.cos(phase))*.018*this.stride;
  }
  this.head.position.y=.64+(reduced?0:Math.cos(this.gait*Math.PI*4)*.012*this.stride);
  const time=reduced?0:seconds;
  this.head.rotation.z=happy?-.13+Math.sin(time*5)*.035:0;
  const wag=Math.sin(time*(happy?5:this.leaderId?9:3.5))*(happy?1:this.leaderId?.72:.40);
  const tailBend=this.tail.morphTargetInfluences!;
  tailBend[0]=Math.max(0,-wag);
  tailBend[1]=Math.max(0,wag);
  const closed=happy||seconds%5>4.85;
  for(const eye of this.eyes)eye.morphTargetInfluences![0]=closed?1:0;
  this.updateInteraction(seconds,reduced);
 }

 private walk(seconds:number,dt:number,visitors:readonly Visitor[],cat?:Point){
  const p=this.root.position,lobby=this.location==='lobby';
  let leader=visitors.find(visitor=>visitor.id===this.leaderId&&this.canApproach(visitor));
  if(this.leaderId&&(!leader||Math.hypot(leader.x-p.x,leader.z-p.z)>(this.route.length?NOTICE_RADIUS:STAY_RADIUS))){
   if(leader)this.departedVisitors.set(leader.id,{x:leader.x,z:leader.z});
   this.leaveVisitor();
   leader=undefined;
  }
  if(!leader&&seconds>=this.repathAt){
   this.repathAt=seconds+.3;
   for(const [id,departure] of this.departedVisitors){
    const visitor=visitors.find(candidate=>candidate.id===id);
    if(!visitor||visitor.zone!==this.location){
     this.departedVisitors.delete(id);
     continue;
    }
    const gap=Math.hypot(visitor.x-p.x,visitor.z-p.z);
    // Compare both visitor positions from the dog's current position. The visitor
    // can return on foot without having to leave the dog's entire search radius.
    if(gap>RETURN_RADIUS||gap+.3<Math.hypot(departure.x-p.x,departure.z-p.z))
     this.departedVisitors.delete(id);
   }
   let nearest:Visitor|undefined,best=NOTICE_RADIUS;
   for(const visitor of visitors){
    if(!this.canApproach(visitor)||this.departedVisitors.has(visitor.id))continue;
    const distance=Math.hypot(visitor.x-p.x,visitor.z-p.z);
    if(distance>best||(distance===best&&nearest&&visitor.id>=nearest.id))continue;
    if(distance>STAY_RADIUS&&!segmentClear(this.location,p,visitor))continue;
    nearest=visitor;best=distance;
   }
   if(nearest){
    const path=this.pathToFront(nearest,visitors,cat);
    if(path||best<=1.65&&segmentClear(this.location,p,nearest)){
     leader=nearest;this.leaderId=nearest.id;this.route=path??[];
    }
   }
   if(!leader&&!this.route.length&&seconds>=this.wanderAt){
    if(lobby)this.pickLobbyWanderSpot(seconds);
    else this.pickHallPatrolStop(seconds);
   }
  }

  const target=this.route[0];
  if(!target){
   if(leader)this.turn(Math.atan2(p.x-leader.x,p.z-leader.z),dt);
   return 0;
  }

  const dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz);
  if(distance<.035){
   this.route.shift();
   if(lobby&&!this.route.length&&!this.leaderId)this.wanderAt=seconds+1;
   return 0;
  }
  const yaw=Math.atan2(-dx,-dz);
  this.turn(yaw,dt);
  const speed=leader?1.45:lobby?.93:1.2;
  const travel=Math.min(distance,speed*dt*Math.max(0,Math.cos(yaw-this.root.rotation.y)));
  const x=p.x+dx/distance*travel,z=p.z+dz/distance*travel;
  const y=surfaceHeight(this.location,{x,z},p.y);
  if(y===null||(lobby&&Math.abs(y)>.25)||!walkable(this.location,this.next.set(x,y,z))){
   this.leaveVisitor();
   return 0;
  }
  if(this.petPathBlocked(p,this.next,visitors,cat)){
   const detour=this.pathDetour(target,yaw,visitors,cat);
   if(detour)this.route.unshift(detour);
   else if(leader&&Math.hypot(leader.x-p.x,leader.z-p.z)<=1.65&&segmentClear(this.location,p,leader))this.route=[];
   else this.leaveVisitor();
   return 0;
  }
  p.copy(this.next);
  return travel;
 }

 private canApproach(visitor:Visitor){
  return visitor.zone===this.location&&visitor.pose!=='sit'&&visitor.trainSeat===undefined&&!visitor.dance
   &&Math.abs((visitor.y??0)-this.root.position.y)<(this.location==='lobby'?.25:.65);
 }

 private leaveVisitor(){
  this.leaderId=null;
  this.route=[];
 }

 private pathToFront(visitor:Visitor,visitors:readonly Visitor[],cat?:Point){
  const p=this.root.position,front=visitor.yaw;
  const spot=(angle:number,distance:number)=>{
   const x=visitor.x-Math.sin(angle)*distance,z=visitor.z-Math.cos(angle)*distance;
   const y=surfaceHeight(this.location,{x,z},visitor.y??0);
   return y===null||Math.abs(y-(visitor.y??0))>.25?null:{x,y,z};
  };
  const clearPath=(from:Point,to:Point)=>{
   const path=findPath(this.location,from,to);
   return path?.every((step,i)=>!this.petPathBlocked(path[i-1]??from,step,visitors,cat))?path:null;
  };
  for(const offset of [0,.55,-.55,1.05,-1.05,Math.PI/2,-Math.PI/2]){
   const point=spot(front+offset,STOP_DISTANCE);
   if(!point)continue;
   const direct=clearPath(p,point);
   if(direct)return direct;
   if(offset!==0)continue;
   // If the dog starts behind the visitor, reach the front by way of either side.
   for(const side of [-1,1]){
    const flank=spot(front+side*Math.PI/2,1.4);
    if(!flank)continue;
    const first=clearPath(p,flank),last=first&&clearPath(flank,point);
    if(first&&last)return [...first,...last];
   }
  }
  return null;
 }

 private petPathBlocked(from:Point,to:Point,visitors:readonly Visitor[],cat?:Point){
  return (cat&&visitorBlocksStep(from,to,cat,PET_VISITOR_GAP))
   ||visitors.some(visitor=>visitor.zone===this.location&&visitorBlocksStep(from,to,visitor,PET_VISITOR_GAP));
 }

 private pathDetour(target:Point,yaw:number,visitors:readonly Visitor[],cat?:Point){
  const p=this.root.position;
  for(const angle of [1.4,-1.4,1.85,-1.85]){
   const x=p.x-Math.sin(yaw+angle)*1.1,z=p.z-Math.cos(yaw+angle)*1.1;
   const y=surfaceHeight(this.location,{x,z},p.y);
   if(y===null)continue;
   const point={x,y,z};
   if(segmentClear(this.location,p,point)&&segmentClear(this.location,point,target)
    &&!this.petPathBlocked(p,point,visitors,cat)&&!this.petPathBlocked(point,target,visitors,cat))
    return point;
  }
  return null;
 }

 private pickHallPatrolStop(seconds:number){
  const stop=hallPatrol[this.hallPatrolIndex];
  this.hallPatrolIndex=(this.hallPatrolIndex+1)%hallPatrol.length;
  this.route=findPath('auditorium',this.root.position,stop)??[];
  if(!this.route.length)this.wanderAt=seconds+.75;
 }

 private pickLobbyWanderSpot(seconds:number){
  this.wanderAt=seconds+.75;
  const p=this.root.position;
  const start=T.MathUtils.euclideanModulo(Math.floor(seconds*.9)*2.39996323,Math.PI*2);
  for(let i=0;i<12;i++){
   const angle=start+i*Math.PI/6;
   const x=T.MathUtils.clamp(p.x+Math.sin(angle)*3,-9.5,9.5);
   const z=T.MathUtils.clamp(p.z+Math.cos(angle)*3,21,29.8);
   const point={x,y:0,z};
   if(Math.hypot(x-p.x,z-p.z)>1.2&&segmentClear('lobby',p,point)){
    this.route=[point];
    return;
   }
  }
 }

 private turn(yaw:number,dt:number){
  const difference=T.MathUtils.euclideanModulo(yaw-this.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;
  this.root.rotation.y+=difference*(1-Math.exp(-12*dt));
 }
}
