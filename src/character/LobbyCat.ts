import {visitorBlocksStep} from '../../shared/visitorCollision';
import type {Point,Zone} from '../../shared/venue';
import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {sphere,line,material} from '../scene/primitives';
import {segmentClear} from '../navigation/path';
import {PET_VISITOR_GAP,PettableAnimal} from './PettableAnimal';
import {petEyeDisk,petEyeHighlight} from './petEyes';

const HOME={x:2,y:0,z:26.7};
const cream=0xf2ddbb,ginger=0xc88a50;
const LEG_RADIUS=.074,LEG_REACH=.356;
const eyeInk=new T.MeshBasicMaterial({color:0x2c2624});
const eyeLight=new T.MeshBasicMaterial({color:0xfff8e9});
/** One continuous coat, with a rounder silhouette as the cat settles onto its haunches. */
function catBodyGeometry(){
 const sphere=new T.BufferGeometry().copy(new T.SphereGeometry(1,48,32));
 sphere.deleteAttribute('uv');
 sphere.deleteAttribute('normal');
 const geometry=mergeVertices(sphere);
 sphere.dispose();
 const standing=geometry.getAttribute('position');
 const sitting=standing.clone(),coat=standing.clone();
 const baseColor=new T.Color(cream),patchColor=new T.Color(ginger),color=new T.Color();
 for(let i=0;i<standing.count;i++){
  const x=standing.getX(i),y=standing.getY(i),z=standing.getZ(i);
  standing.setXYZ(i,x*(.27+.024*Math.max(0,z)),.44+.26*y+.03*Math.max(0,z),.07+.48*z);
  // Fuller at the hips, narrower at the chest. The lowest point rests on the table.
  sitting.setXYZ(i,x*(.30-.07*y),.37+.37*y,.105-.18*y+z*(.37-.095*y));
  const patch=T.MathUtils.smoothstep(z-.30*y,.39,.48);
  color.copy(baseColor).lerp(patchColor,patch);
  coat.setXYZ(i,color.r,color.g,color.b);
 }
 geometry.computeVertexNormals();
 const seatedGeometry=new T.BufferGeometry().setIndex(geometry.index).setAttribute('position',sitting);
 seatedGeometry.computeVertexNormals();
 geometry.morphAttributes.position=[sitting];
 geometry.morphAttributes.normal=[seatedGeometry.getAttribute('normal')];
 geometry.setAttribute('color',coat);
 return geometry;
}
const catBody=catBodyGeometry();
const catCoat=new T.MeshStandardMaterial({vertexColors:true,roughness:.72});

function catTailGeometry(){
 const tip=new T.Vector3(.33,.56,.12);
 const shaft=new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(.22,.08,.17),new T.Vector3(.4,.35,.18),tip]);
 const shaftLength=shaft.getLength(),tipRadius=.075;
 const path=new T.CurvePath<T.Vector3>();
 path.add(shaft);
 path.add(new T.LineCurve3(tip,tip.clone().addScaledVector(shaft.getTangentAt(1),tipRadius)));

 const length=shaftLength+tipRadius,rings=36,sides=12;
 const tube=new T.TubeGeometry(path,rings,1,sides,false);
 const vertices=tube.getAttribute('position'),colors=new Float32Array(vertices.count*3);
 const baseColor=new T.Color(ginger),tipColor=new T.Color(cream),color=new T.Color(),vertex=new T.Vector3();
 for(let ring=0;ring<=rings;ring++){
  const t=ring/rings,along=length*t,center=path.getPointAt(t);
  const cap=T.MathUtils.clamp((along-shaftLength)/tipRadius,0,1);
  const width=T.MathUtils.lerp(.07,tipRadius,T.MathUtils.smoothstep(along,shaftLength-.16,shaftLength));
  const radius=ring===rings?0:width*Math.sqrt(1-cap*cap);
  color.copy(baseColor).lerp(tipColor,T.MathUtils.smoothstep(along,shaftLength-.11,shaftLength-.055));
  for(let side=0;side<=sides;side++){
   const i=ring*(sides+1)+side;
   vertex.fromBufferAttribute(vertices,i).lerp(center,1-radius);
   vertices.setXYZ(i,vertex.x,vertex.y,vertex.z);
   color.toArray(colors,i*3);
  }
 }
 // Weld the end cap and the seam before calculating the smooth normals.
 tube.deleteAttribute('uv');
 tube.deleteAttribute('normal');
 tube.setAttribute('color',new T.BufferAttribute(colors,3));
 const geometry=mergeVertices(tube);
 geometry.computeVertexNormals();
 tube.dispose();
 return geometry;
}
const catTail=catTailGeometry();

/** A small, rounded resident, using the same dot eyes, blush and soft shapes as our visitors. */
export class CatModel extends PettableAnimal{
 private head=new T.Group();private eyes:T.Mesh[]=[];private tail=new T.Group();
 private shadow=new T.Mesh(new T.CircleGeometry(.46,20),new T.MeshBasicMaterial({color:0x3c2c20,transparent:true,opacity:.15,depthWrite:false}));
 private torso=new T.Mesh(catBody,catCoat);
 private collar=new T.Group();
 private legs:{root:T.Group;phase:number;rear:boolean;side:number}[]=[];
 constructor(scene:T.Scene,zone:Zone){
  super(scene,zone,'cat');
  this.root.scale.setScalar(.62);
  this.torso.userData.fullDetail=true;
  this.root.add(this.torso);
  // Four soft, straight legs with no separate joints or paws.
  const legGeometry=new T.CapsuleGeometry(LEG_RADIUS,.282,4,8);
  for(const rear of [false,true])for(const side of [-1,1]){
   // Bury the shoulder and hip ends inside the rounded torso throughout the stride.
   const leg=new T.Group();leg.position.set(side*(rear?.14:.11),.43,rear?.30:-.22);this.root.add(leg);
   const piece=new T.Mesh(legGeometry,material(cream));piece.position.y=-.215;leg.add(piece);
   // Four-beat lateral walk: rear left, front left, rear right, front right.
   const phase=side<0?(rear?0:.25):(rear?.5:.75);
   this.legs.push({root:leg,phase,rear,side});
  }
  this.head.position.set(0,.72,-.37);this.root.add(this.head);
  const headSize=new T.Vector3(.37,.32,.32);
  sphere(this.head,.35,[0,0,0],cream).scale.copy(headSize);
  const earShape=new T.Shape();earShape.moveTo(-.12,0);earShape.quadraticCurveTo(-.06,.2,0,.24);earShape.quadraticCurveTo(.06,.2,.12,0);earShape.closePath();
  const earGeometry=new T.ExtrudeGeometry(earShape,{depth:.09,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1,curveSegments:5});
  for(const side of [-1,1]){
   const ear=new T.Group();ear.position.set(side*.20,.165,-.065);ear.rotation.z=-side*.14;this.head.add(ear);
   ear.add(new T.Mesh(earGeometry,material(ginger)));
   const inner=new T.Mesh(new T.ShapeGeometry(earShape),material(0xdba29a));inner.scale.set(.56,.65,1);inner.position.set(0,.025,-.029);inner.rotation.y=Math.PI;ear.add(inner);
   const eye=new T.Group();
   const x=side*.13,y=.015,z=-headSize.z*Math.sqrt(1-(x/headSize.x)**2-(y/headSize.y)**2);
   const normal=new T.Vector3(x/headSize.x**2,y/headSize.y**2,z/headSize.z**2).normalize();
   eye.position.set(x,y,z).addScaledVector(normal,.0015);
   eye.lookAt(eye.position.clone().add(normal));
   const ink=new T.Mesh(petEyeDisk,eyeInk);ink.scale.set(.043,.052,1);eye.add(ink);
   const light=new T.Mesh(petEyeHighlight,eyeLight);light.scale.set(.011,.013,1);light.position.set(.010,.018,.0006);eye.add(light);
   this.head.add(eye);this.eyes.push(ink,light);
   sphere(this.head,.04,[side*.23,-.075,-.245],0xe8aaa0).scale.set(.05,.025,.018);
   sphere(this.head,.09,[side*.065,-.105,-.285],0xffedd0).scale.set(.09,.065,.05);
   for(const y of [-.065,-.12])line(this.head,new T.Vector3(side*.23,y,-.26),new T.Vector3(side*.4,y+.025,-.25),.006,0x8b6b54);
  }
  sphere(this.head,.03,[0,-.075,-.34],0xc78680).scale.set(.031,.022,.02);
  line(this.head,new T.Vector3(0,-.092,-.33),new T.Vector3(0,-.125,-.332),.007,0x8b6052);
  for(const side of [-1,1])line(this.head,new T.Vector3(0,-.125,-.332),new T.Vector3(side*.036,-.14,-.317),.006,0x8b6052);
  for(const x of [-.09,.09]){const stripe=sphere(this.head,.07,[x,.235,-.19],ginger);stripe.scale.set(.034,.08,.02);stripe.rotation.z=-x*2;}
  const collar=new T.Mesh(new T.TorusGeometry(.21,.025,6,20),material(0x548a80));collar.rotation.x=Math.PI/2;this.collar.add(collar);
  sphere(this.collar,.042,[0,-.06,-.21],0xd8b15d);
  this.collar.position.set(0,.54,-.35);this.root.add(this.collar);
  this.tail.position.set(0,.52,.47);this.root.add(this.tail);
  const tail=new T.Mesh(catTail,catCoat);
  tail.userData.fullDetail=true;
  this.tail.add(tail);
  this.shadow.rotation.x=-Math.PI/2;this.shadow.scale.set(.85,1.55,1);this.shadow.position.y=.012;this.root.add(this.shadow);
  // Keep the small moving groups alive when character meshes are instanced.
  this.root.traverse(o=>{if(o instanceof T.Group)o.userData.animated=true;});
 }
 petPoint(out:T.Vector3){return this.root.localToWorld(out.set(0,.99,-.37));}
 protected pose(now:number,gait:number,weight:number,walking:boolean,reduced:boolean,happy=false,airborne=0,sitting=0){
  const t=reduced?0:now;
  for(const leg of this.legs){
   const phase=T.MathUtils.euclideanModulo(gait+leg.phase,1),stance=.66,travel=.52*stance;
   // Planted paws move backwards relative to the body at the exact ground speed.
   // Only the returning paw lifts; the other three keep supporting the cat.
   let z:number,lift=0;
   if(phase<stance)z=-travel/2+travel*phase/stance;
   else{const u=(phase-stance)/(1-stance);z=travel/2-travel*(u*u*(3-2*u));lift=Math.sin(Math.PI*u)*.12;}
   const angle=-Math.atan2(z*weight,.43-lift*weight);
   const plantedAngle=angle+sitting*(leg.rear?1.30:.12);
   // Fan the paws out from the body while leaving the shoulder and hip ends buried.
   const outward=leg.side*sitting*(leg.rear?.34:.15);
   leg.root.rotation.set(plantedAngle+airborne*.52,0,outward);
   const pawHeight=LEG_RADIUS+LEG_REACH*Math.cos(plantedAngle)*Math.cos(outward);
   leg.root.position.x=leg.side*(leg.rear?.14+.04*sitting:.11+.02*sitting);
   leg.root.position.y=T.MathUtils.lerp(.43*Math.cos(angle),pawHeight,sitting)+lift*weight+airborne*.12;
   leg.root.position.z=leg.rear?.30+.05*sitting:-.22+.02*sitting;
  }
  this.head.rotation.z=happy?-.13+Math.sin(t*5)*.035:Math.sin(t*.8)*.035;
  this.torso.morphTargetInfluences![0]=sitting;
  this.collar.position.set(0,.54+.067*sitting,-.35+.19*sitting);
  this.tail.position.set(0,.52-.24*sitting,.47-.02*sitting);
  this.head.position.z=-.37+.065*sitting;
  this.head.position.y=.72+.055*sitting+(reduced?0:walking?Math.cos(gait*Math.PI*4)*.009:Math.sin(t*1.8)*.008);
  this.tail.rotation.y=Math.sin(t*(happy?5:1.4))*(happy?.28:.12);
  const closed=happy||now%5>4.85;
  for(const eye of this.eyes)eye.morphTargetInfluences![0]=closed?1:0;
  const shadowSize=1-airborne*.95;
  this.shadow.scale.set(.85*shadowSize,1.55*shadowSize,1);
 }
}

export class LobbyCat extends CatModel{
 private lastTime=0;private wanderAt=0;private destination:T.Vector3|null=null;
 private gait=0;private gaitWeight=0;
 constructor(scene:T.Scene){
  super(scene,'lobby');
  this.root.name='lobby-cat';this.root.position.set(HOME.x,0,HOME.z);
  this.updateInteraction(0,false);
 }
 override invite(visitor:T.Vector3){
  const path=super.invite(visitor);
  if(path)this.destination=null;
  return path;
 }
 update(now:number,visitor:T.Vector3,reduced=false,others:readonly Point[]=[]){
  const dt=this.lastTime?Math.min(.1,Math.max(0,now-this.lastTime)):0;this.lastTime=now;
  const happy=now<this.happyUntil,p=this.root.position;
  if(now>=this.heldUntil&&!happy&&now>=this.wanderAt&&!this.destination){
   this.wanderAt=now+4+Math.random()*4;
   for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2,d=1+Math.random()*2.2,target=new T.Vector3(T.MathUtils.clamp(p.x+Math.sin(a)*d,-10.8,11),0,T.MathUtils.clamp(p.z+Math.cos(a)*d,21,30));
    if(p.distanceTo(target)>.6&&segmentClear('lobby',p,target)){this.destination=target;break;}
   }
  }
  let walking=false;
  if(this.destination&&now>=this.heldUntil&&!happy){
   const d=p.distanceTo(this.destination);
   if(d<=.03){this.destination=null;this.wanderAt=now+2+Math.random()*3;}
   else{const dx=this.destination.x-p.x,dz=this.destination.z-p.z,targetYaw=Math.atan2(-dx,-dz),turn=T.MathUtils.euclideanModulo(targetYaw-this.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;
    this.root.rotation.y+=turn*Math.min(1,dt*6);
    // Turn toward the path before advancing, instead of sliding sideways or backwards.
    const step=Math.min(d,dt*.65*Math.max(0,Math.cos(turn))**2);walking=step>.0001;
    const next={x:p.x+dx/d*step,y:0,z:p.z+dz/d*step};
    if((Number.isFinite(visitor.x)&&visitorBlocksStep(p,next,visitor,PET_VISITOR_GAP))||others.some(other=>visitorBlocksStep(p,next,other,PET_VISITOR_GAP))){walking=false;this.destination=null;this.wanderAt=now+1;}
    else{p.x=next.x;p.z=next.z;this.gait+=step/(this.root.scale.x*.52);}
   }
  }
  this.gaitWeight=T.MathUtils.damp(this.gaitWeight,walking?1:0,12,dt);
  this.pose(now,this.gait,this.gaitWeight,walking,reduced,happy);
  this.updateInteraction(now,reduced);
 }
}
