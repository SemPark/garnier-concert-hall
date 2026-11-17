import {visitorBlocksStep} from '../../shared/visitorCollision';
import type {Point,Zone} from '../../shared/venue';
import * as T from 'three';
import {sphere,line,material} from '../scene/primitives';
import {findPath,segmentClear} from '../navigation/path';
import {surfaceHeight,walkable} from '../../shared/venue';

export const CAT_VISITOR_GAP=.64;
const HOME={x:2,y:0,z:26.7};
const eyeDisk=new T.CircleGeometry(1,24);
const highlightDisk=eyeDisk.clone();
const closedEye=eyeDisk.getAttribute('position').clone();
// The flat oval closes into a straight stroke, and its catchlight disappears.
for(let i=0;i<closedEye.count;i++){
 const x=closedEye.getX(i),y=closedEye.getY(i);
 const edge=Math.max(Math.abs(x),Math.abs(y))||1;
 closedEye.setXY(i,x/edge,y/edge*.09);
}
eyeDisk.morphAttributes.position=[closedEye];
highlightDisk.morphAttributes.position=[new T.Float32BufferAttribute(new Float32Array(closedEye.count*3),3)];
const eyeInk=new T.MeshBasicMaterial({color:0x2c2624});
const eyeLight=new T.MeshBasicMaterial({color:0xfff8e9});
/** A small, rounded resident, using the same dot eyes, blush and soft shapes as our visitors. */
export class CatModel{
 readonly root=new T.Group();
 private head=new T.Group();private eyes:T.Mesh[]=[];private tail=new T.Group();
 private shadow=new T.Mesh(new T.CircleGeometry(.46,20),new T.MeshBasicMaterial({color:0x3c2c20,transparent:true,opacity:.15,depthWrite:false}));
 private body=new T.Group();
 private legs:{root:T.Group;phase:number;rear:boolean}[]=[];
 constructor(scene:T.Scene){
  this.root.scale.setScalar(.62);scene.add(this.root);
  const cream=0xf2ddbb,ginger=0xc88a50;
  // Four soft, straight legs with no separate joints or paws.
  this.root.add(this.body);
  sphere(this.body,.3,[0,.44,.07],cream).scale.set(.27,.26,.48);
  sphere(this.body,.22,[0,.5,.28],ginger).scale.set(.245,.21,.25);
  const legGeometry=new T.CapsuleGeometry(.074,.282,4,8);
  for(const rear of [false,true])for(const side of [-1,1]){
   // Bury the shoulder and hip ends inside the rounded torso throughout the stride.
   const leg=new T.Group();leg.position.set(side*(rear?.14:.11),.43,rear?.30:-.22);this.root.add(leg);
   const piece=new T.Mesh(legGeometry,material(cream));piece.position.y=-.215;leg.add(piece);
   // Four-beat lateral walk: rear left, front left, rear right, front right.
   const phase=side<0?(rear?0:.25):(rear?.5:.75);
   this.legs.push({root:leg,phase,rear});
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
   const ink=new T.Mesh(eyeDisk,eyeInk);ink.scale.set(.043,.052,1);eye.add(ink);
   const light=new T.Mesh(highlightDisk,eyeLight);light.scale.set(.011,.013,1);light.position.set(.010,.018,.0006);eye.add(light);
   this.head.add(eye);this.eyes.push(ink,light);
   sphere(this.head,.04,[side*.23,-.075,-.245],0xe8aaa0).scale.set(.05,.025,.018);
   sphere(this.head,.09,[side*.065,-.105,-.285],0xffedd0).scale.set(.09,.065,.05);
   for(const y of [-.065,-.12])line(this.head,new T.Vector3(side*.23,y,-.26),new T.Vector3(side*.4,y+.025,-.25),.006,0x8b6b54);
  }
  sphere(this.head,.03,[0,-.075,-.34],0xc78680).scale.set(.031,.022,.02);
  line(this.head,new T.Vector3(0,-.092,-.33),new T.Vector3(0,-.125,-.332),.007,0x8b6052);
  for(const side of [-1,1])line(this.head,new T.Vector3(0,-.125,-.332),new T.Vector3(side*.036,-.14,-.317),.006,0x8b6052);
  for(const x of [-.09,.09]){const stripe=sphere(this.head,.07,[x,.235,-.19],ginger);stripe.scale.set(.034,.08,.02);stripe.rotation.z=-x*2;}
  const collar=new T.Mesh(new T.TorusGeometry(.21,.025,6,20),material(0x548a80));collar.rotation.x=Math.PI/2;collar.position.set(0,.54,-.35);this.body.add(collar);
  sphere(this.body,.042,[0,.48,-.56],0xd8b15d);
  this.tail.position.set(0,.52,.47);this.body.add(this.tail);
  const curve=new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(.22,.08,.17),new T.Vector3(.4,.35,.18),new T.Vector3(.33,.56,.12)]);
  this.tail.add(new T.Mesh(new T.TubeGeometry(curve,14,.07,8,false),material(ginger)));sphere(this.tail,.075,[.33,.56,.12],cream);
  this.shadow.rotation.x=-Math.PI/2;this.shadow.scale.set(.85,1.55,1);this.shadow.position.y=.012;this.root.add(this.shadow);
  // Keep the small moving groups alive when character meshes are instanced.
  this.root.traverse(o=>{if(o instanceof T.Group)o.userData.animated=true;});
 }
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
   const fold=leg.rear?sitting*1.07:0;
   const length=1-sitting*(leg.rear?.38:.22);
   leg.root.scale.y=length;
   leg.root.rotation.x=angle+airborne*.52+fold;
   leg.root.position.y=.43*length*Math.cos(angle+fold)+lift*weight+airborne*.12;
  }
  this.head.rotation.z=happy?-.13+Math.sin(t*5)*.035:Math.sin(t*.8)*.035;
  this.body.position.y=-.12*sitting;
  this.body.rotation.x=.17*sitting;
  this.head.position.y=.72-.085*sitting+(reduced?0:walking?Math.cos(gait*Math.PI*4)*.009:Math.sin(t*1.8)*.008);
  this.tail.rotation.y=Math.sin(t*(happy?5:1.4))*(happy?.28:.12);
  const closed=happy||now%5>4.85;
  for(const eye of this.eyes)eye.morphTargetInfluences![0]=closed?1:0;
  const shadowSize=1-airborne*.95;
  this.shadow.scale.set(.85*shadowSize,1.55*shadowSize,1);
 }
}

/** Shared click target, approach and feedback for the two cats. */
export class PettableCat extends CatModel{
 readonly targets:T.Mesh<T.BoxGeometry,T.MeshBasicMaterial>[];
 readonly approach={x:0,y:0,z:0};
 protected happyUntil=0;
 protected heldUntil=0;
 private heart?:T.Sprite;
 constructor(private readonly scene:T.Scene,private readonly zone:Zone){
  super(scene);
  const hit=new T.Mesh(new T.BoxGeometry(.7,.85,1.1),new T.MeshBasicMaterial({visible:false}));
  hit.userData.pettableCat=true;
  scene.add(hit);
  this.targets=[hit];
 }
 get canPet(){return true;}
 petPoint(out:T.Vector3){return this.root.localToWorld(out.set(0,.99,-.37));}

 invite(visitor:T.Vector3):Point[]|null{
  if(!this.canPet)return null;
  const center=this.root.position;
  const head=this.petPoint(new T.Vector3());
  const startDistance=Math.hypot(visitor.x-head.x,visitor.z-head.z);
  const angle=Math.atan2(visitor.x-head.x,visitor.z-head.z);
  const candidates=[0,.4,-.4,.8,-.8,1.6,-1.6,2.4,-2.4,Math.PI].map(offset=>({
   x:head.x+Math.sin(angle+offset)*.72,y:center.y,z:head.z+Math.cos(angle+offset)*.72,
  }));
  if(Math.abs(visitor.y-center.y)<.2&&startDistance>=.45&&startDistance<=.6)
   candidates.unshift({x:visitor.x,y:center.y,z:visitor.z});
  for(const point of candidates){
   const floor=surfaceHeight(this.zone,point,center.y);
   if(floor===null||Math.abs(floor-center.y)>.2)continue;
   point.y=floor;
   if(!walkable(this.zone,point)||visitorBlocksStep(point,point,center,CAT_VISITOR_GAP+.02))continue;
   const path=findPath(this.zone,visitor,point);
   if(!path||path.some((step,i)=>visitorBlocksStep(path[i-1]??visitor,step,center,CAT_VISITOR_GAP)))continue;
   Object.assign(this.approach,point);
   this.heldUntil=Infinity;
   return path;
  }
  return null;
 }

 release(){this.heldUntil=0;}
 pet(now:number){
  this.happyUntil=now+3;this.heldUntil=now+4;
  if(this.heart)return;
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=128;
  const ctx=canvas.getContext('2d')!;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 65px sans-serif';ctx.lineJoin='round';
  ctx.lineWidth=8;ctx.strokeStyle='#594737';ctx.strokeText('♥',192,64);ctx.fillStyle='#ed7189';ctx.fillText('♥',192,64);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  this.heart=new T.Sprite(new T.SpriteMaterial({map,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));
  this.heart.scale.set(1.8,.6,1);this.heart.renderOrder=30;
  this.scene.add(this.heart);
 }
 protected updateInteraction(now:number,reduced:boolean){
  const {x,y,z}=this.root.position;
  const hit=this.targets[0];
  hit.position.set(x,y+.42,z);hit.rotation.y=this.root.rotation.y;hit.updateMatrixWorld(true);
  if(!this.heart)return;
  const age=3-this.happyUntil+now;
  this.heart.visible=now<this.happyUntil;
  this.heart.position.set(x,y+1.05+(reduced?0:Math.max(0,age)*.12),z);
  this.heart.material.opacity=this.heart.visible?Math.min(1,age/.15,(this.happyUntil-now)/.5):0;
  this.heart.updateMatrixWorld(true);
 }
 dispose(){
  this.heart?.material.map?.dispose();
  this.heart?.material.dispose();
  this.heart?.removeFromParent();
  this.targets[0].material.dispose();
 }
}

export class LobbyCat extends PettableCat{
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
    if((Number.isFinite(visitor.x)&&visitorBlocksStep(p,next,visitor,CAT_VISITOR_GAP))||others.some(other=>visitorBlocksStep(p,next,other,CAT_VISITOR_GAP))){walking=false;this.destination=null;this.wanderAt=now+1;}
    else{p.x=next.x;p.z=next.z;this.gait+=step/(this.root.scale.x*.52);}
   }
  }
  this.gaitWeight=T.MathUtils.damp(this.gaitWeight,walking?1:0,12,dt);
  this.pose(now,this.gait,this.gaitWeight,walking,reduced,happy);
  this.updateInteraction(now,reduced);
 }
}
