import * as T from 'three';
import {sphere,line,material} from '../scene/primitives';
import {segmentClear} from '../navigation/path';
import {walkable} from '../../shared/venue';

const HOME={x:6.4,y:0,z:27};
/** A small, rounded resident, using the same dot eyes, blush and soft shapes as our visitors. */
export class LobbyCat{
 readonly root=new T.Group();readonly targets:T.Object3D[]=[];
 readonly approach={x:HOME.x+.7,y:0,z:HOME.z+.2};
 private head=new T.Group();private eyes=new T.Group();private tail=new T.Group();
 private heart:T.Sprite;private hint:T.Sprite;private happyUntil=0;
 private heldUntil=0;private lastTime=0;private wanderAt=0;private destination:T.Vector3|null=null;
 private legs:{root:T.Group;phase:number}[]=[];
 private gait=0;private gaitWeight=0;
 constructor(scene:T.Scene){
  this.root.name='lobby-cat';this.root.position.set(HOME.x,0,HOME.z);this.root.scale.setScalar(.62);scene.add(this.root);
  const cream=0xf2ddbb,ginger=0xc88a50;
  // Four soft, straight legs with no separate joints or paws.
  sphere(this.root,.3,[0,.47,.07],cream).scale.set(.255,.225,.48);
  sphere(this.root,.22,[0,.5,.28],ginger).scale.set(.245,.21,.25);
  const legGeometry=new T.CapsuleGeometry(.065,.30,4,8);
  for(const rear of [false,true])for(const side of [-1,1]){
   const leg=new T.Group();leg.position.set(side*.175,.43,rear?.31:-.27);this.root.add(leg);
   const piece=new T.Mesh(legGeometry,material(cream));piece.position.y=-.215;leg.add(piece);
   // Four-beat lateral walk: rear left, front left, rear right, front right.
   const phase=side<0?(rear?0:.25):(rear?.5:.75);
   this.legs.push({root:leg,phase});
  }
  this.head.position.set(0,.72,-.37);this.root.add(this.head);this.head.add(this.eyes);
  sphere(this.head,.35,[0,0,0],cream).scale.set(.37,.32,.32);
  const earShape=new T.Shape();earShape.moveTo(-.12,0);earShape.quadraticCurveTo(-.06,.2,0,.24);earShape.quadraticCurveTo(.06,.2,.12,0);earShape.closePath();
  const earGeometry=new T.ExtrudeGeometry(earShape,{depth:.09,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1,curveSegments:5});
  for(const side of [-1,1]){
   const ear=new T.Group();ear.position.set(side*.24,.22,-.04);ear.rotation.z=-side*.16;this.head.add(ear);
   ear.add(new T.Mesh(earGeometry,material(ginger)));
   const inner=new T.Mesh(new T.ShapeGeometry(earShape),material(0xdba29a));inner.scale.set(.56,.65,1);inner.position.set(0,.025,-.029);inner.rotation.y=Math.PI;ear.add(inner);
   sphere(this.eyes,.045,[side*.13,.015,-.3],0x2c2624).scale.set(.043,.052,.026);
   sphere(this.eyes,.012,[side*.13-.009,.033,-.324],0xffffff);
   sphere(this.head,.04,[side*.23,-.075,-.245],0xe8aaa0).scale.set(.05,.025,.018);
   sphere(this.head,.09,[side*.065,-.105,-.285],0xffedd0).scale.set(.09,.065,.05);
   for(const y of [-.065,-.12])line(this.head,new T.Vector3(side*.23,y,-.26),new T.Vector3(side*.4,y+.025,-.25),.006,0x8b6b54);
  }
  sphere(this.head,.03,[0,-.075,-.34],0xc78680).scale.set(.031,.022,.02);
  line(this.head,new T.Vector3(0,-.092,-.33),new T.Vector3(0,-.125,-.332),.007,0x8b6052);
  for(const side of [-1,1])line(this.head,new T.Vector3(0,-.125,-.332),new T.Vector3(side*.036,-.14,-.317),.006,0x8b6052);
  for(const x of [-.09,.09]){const stripe=sphere(this.head,.07,[x,.235,-.19],ginger);stripe.scale.set(.034,.08,.02);stripe.rotation.z=-x*2;}
  const collar=new T.Mesh(new T.TorusGeometry(.21,.025,6,20),material(0x548a80));collar.rotation.x=Math.PI/2;collar.position.set(0,.54,-.35);this.root.add(collar);
  sphere(this.root,.042,[0,.48,-.56],0xd8b15d);
  this.tail.position.set(0,.52,.47);this.root.add(this.tail);
  const curve=new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(.22,.08,.17),new T.Vector3(.4,.35,.18),new T.Vector3(.33,.56,.12)]);
  this.tail.add(new T.Mesh(new T.TubeGeometry(curve,14,.07,8,false),material(ginger)));sphere(this.tail,.075,[.33,.56,.12],cream);
  const shadow=new T.Mesh(new T.CircleGeometry(.46,20),new T.MeshBasicMaterial({color:0x3c2c20,transparent:true,opacity:.15,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(.85,1.55,1);shadow.position.y=.012;this.root.add(shadow);
  const hit=new T.Mesh(new T.BoxGeometry(.7,.85,1.1),new T.MeshBasicMaterial({visible:false}));hit.position.set(HOME.x,.42,HOME.z);hit.userData.lobbyCat=true;scene.add(hit);this.targets.push(hit);
  this.heart=this.sprite('♥','#ed7189',1.8);this.heart.position.y=1.4;this.heart.visible=false;
  this.heart.material.depthTest=false;this.heart.renderOrder=30;
  this.hint=this.sprite('쓰다듬기','#fff4da',1.05);this.hint.position.set(0,1.48,0);
  // Sprites stay in the scene while character geometry is rendered in shared instance batches.
  scene.add(this.heart,this.hint);
  // Keep the small moving groups alive when character meshes are instanced.
  this.root.traverse(o=>{if(o instanceof T.Group)o.userData.animated=true;});
 }
 private sprite(value:string,color:string,width:number){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=128;const c=canvas.getContext('2d')!;
  c.textAlign='center';c.textBaseline='middle';c.font='700 65px sans-serif';c.lineJoin='round';c.lineWidth=8;c.strokeStyle='#594737';c.strokeText(value,192,64);c.fillStyle=color;c.fillText(value,192,64);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true,depthWrite:false,toneMapped:false}));sprite.scale.set(width,width/3,1);this.root.add(sprite);return sprite;
 }
 /** Pause for the visitor and offer a side clear of the camera, rather than standing in front of the cat. */
 invite(camera:T.Vector3,now:number){
  this.destination=null;this.heldUntil=Infinity;const p=this.root.position,side=camera.x>p.x?-1:1;
  for(const [dx,dz] of [[side*.75,.18],[-side*.75,.18],[side*.65,-.35],[-side*.65,-.35]]){
   const point={x:p.x+dx,y:0,z:p.z+dz};if(walkable('lobby',point)){Object.assign(this.approach,point);return true;}
  }
  this.heldUntil=0;return false;
 }
 release(){this.heldUntil=0;}
 pet(now:number){this.happyUntil=now+3;this.heldUntil=now+4;}
 update(now:number,visitor:T.Vector3,reduced=false){
  const dt=this.lastTime?Math.min(.1,Math.max(0,now-this.lastTime)):0;this.lastTime=now;
  const happy=now<this.happyUntil,t=reduced?0:now,p=this.root.position;
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
    p.x+=dx/d*step;p.z+=dz/d*step;this.gait+=step/(this.root.scale.x*.52);
   }
  }
  this.gaitWeight=T.MathUtils.damp(this.gaitWeight,walking?1:0,12,dt);
  for(const leg of this.legs){
   const phase=T.MathUtils.euclideanModulo(this.gait+leg.phase,1),stance=.66,travel=.52*stance;
   // Planted paws move backwards relative to the body at the exact ground speed.
   // Only the returning paw lifts; the other three keep supporting the cat.
   let z:number,lift=0;
   if(phase<stance)z=-travel/2+travel*phase/stance;
   else{const u=(phase-stance)/(1-stance);z=travel/2-travel*(u*u*(3-2*u));lift=Math.sin(Math.PI*u)*.12;}
   const angle=-Math.atan2(z*this.gaitWeight,.43-lift*this.gaitWeight);
   leg.root.rotation.x=angle;
   leg.root.position.y=.43*Math.cos(angle)+lift*this.gaitWeight;
  }
  this.targets[0].position.set(p.x,.42,p.z);this.targets[0].rotation.y=this.root.rotation.y;this.targets[0].updateMatrixWorld(true);
  this.head.rotation.z=happy?-.13+Math.sin(t*5)*.035:Math.sin(t*.8)*.035;
  this.head.position.y=.72+(reduced?0:walking?Math.cos(this.gait*Math.PI*4)*.009:Math.sin(t*1.8)*.008);
  this.tail.rotation.y=Math.sin(t*(happy?5:1.4))*(happy?.28:.12);
  this.eyes.scale.y=happy?.18:now%5>4.85?.12:1;
  const affectionAge=3-this.happyUntil+now;
  this.heart.visible=happy;this.heart.position.set(p.x,1.05+(reduced?0:Math.max(0,affectionAge)*.12),p.z);
  this.heart.material.opacity=happy?Math.min(1,affectionAge/.15,(this.happyUntil-now)/.5):0;
  this.hint.position.set(p.x,1.03,p.z);
  this.hint.visible=!happy&&visitor.distanceTo(this.root.position)<4;
  // Architecture batching freezes standalone sprite matrices; refresh their moving positions explicitly.
  for(const sprite of [this.heart,this.hint]){sprite.updateMatrix();sprite.updateMatrixWorld(true);}
 }
}
