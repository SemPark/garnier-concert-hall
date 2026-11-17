import * as T from 'three';
import {surfaceHeight,walkable,type Point,type Visitor} from '../../shared/venue';
import {findPath,segmentClear} from '../navigation/path';
import {material,sphere} from '../scene/primitives';

const HOME={x:2.1,y:0,z:47.15};
const NOTICE_RADIUS=4.5;
const FOLLOW_RADIUS=6;
const STOP_DISTANCE=1.1;
const cream=0xf6ecd9,fur=0xfff7e8,ink=0x30251f;

export class HallDog{
 readonly root=new T.Group();
 private readonly head=new T.Group();
 private readonly tail=new T.Group();
 private readonly legs:T.Group[]=[];
 private readonly next=new T.Vector3();
 private readonly destination=new T.Vector3();
 private route:Point[]=[];
 private leaderId:string|null=null;
 private repathAt=0;
 private gait=0;
 private stride=0;

 constructor(scene:T.Scene){
  this.root.name='hall-dog';
  this.root.position.set(HOME.x,HOME.y,HOME.z);
  this.root.scale.setScalar(.68);
  scene.add(this.root);

  sphere(this.root,.26,[0,.38,.07],cream).scale.set(.245,.235,.375);
  sphere(this.root,.2,[0,.43,-.19],fur).scale.set(.235,.24,.22);
  this.head.position.set(0,.64,-.29);this.root.add(this.head);
  sphere(this.head,.32,[0,0,0],fur).scale.set(.315,.285,.285);
  for(const side of [-1,1]){
   const ear=sphere(this.head,.17,[side*.247,-.055,.025],cream);
   ear.scale.set(.119,.229,.138);
   ear.rotation.z=-side*.23;
   sphere(this.head,.044,[side*.121,.002,-.265],ink).scale.set(.041,.047,.019);
   sphere(this.head,.011,[side*.12-.009,.018,-.282],0xfff6e8);
   sphere(this.head,.092,[side*.067,-.101,-.236],0xfffaef).scale.set(.095,.078,.083);
  }
  sphere(this.head,.048,[0,-.067,-.313],ink).scale.set(.049,.032,.024);
  sphere(this.head,.027,[0,-.159,-.28],0xd89086).scale.set(.03,.034,.016);

  const collar=new T.Mesh(new T.TorusGeometry(.185,.022,6,20),material(0x506fa7));
  collar.rotation.x=Math.PI/2;collar.position.set(0,.49,-.25);this.root.add(collar);
  sphere(this.root,.033,[0,.434,-.435],0xe5bd65);
  const legGeometry=new T.CapsuleGeometry(.066,.20,4,8);
  for(const z of [-.175,.257])for(const x of [-.135,.135]){
   const leg=new T.Group();leg.position.set(x,.328,z);this.root.add(leg);
   const foot=new T.Mesh(legGeometry,material(cream));foot.position.y=-.162;leg.add(foot);
   this.legs.push(leg);
  }
  this.tail.position.set(0,.455,.328);this.root.add(this.tail);
  const curve=new T.CatmullRomCurve3([
   new T.Vector3(),new T.Vector3(.06,.12,.16),new T.Vector3(.08,.29,.15),new T.Vector3(.07,.31,-.034),
  ]);
  this.tail.add(new T.Mesh(new T.TubeGeometry(curve,12,.067,8,false),material(cream)));
  sphere(this.tail,.078,[.07,.31,-.034],fur);
  const shadow=new T.Mesh(new T.CircleGeometry(.4,18),new T.MeshBasicMaterial({color:0x3c2c20,transparent:true,opacity:.14,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;shadow.scale.y=1.4;this.root.add(shadow);
  this.root.userData.animated=true;
 }

 update(seconds:number,dt:number,visitors:readonly Visitor[],reduced:boolean){
  const p=this.root.position;
  if(seconds>=this.repathAt){
   this.repathAt=seconds+.55;
   let nearest:Visitor|undefined;
   let best=Infinity;
   for(const visitor of visitors){
    if(visitor.zone!=='auditorium'||visitor.pose==='sit'||visitor.trainSeat!==undefined||visitor.dance
      ||Math.abs((visitor.y??0)-p.y)>.65)continue;
    const distance=Math.hypot(visitor.x-p.x,visitor.z-p.z);
    const following=visitor.id===this.leaderId;
    if(distance>(following?FOLLOW_RADIUS:NOTICE_RADIUS)||distance>best)continue;
    if(distance===best&&nearest&&visitor.id>=nearest.id)continue;
    if(!following&&!segmentClear('auditorium',p,visitor))continue;
    nearest=visitor;best=distance;
   }
   this.leaderId=nearest?.id??null;
   this.route=[];
   if(nearest&&best>STOP_DISTANCE){
    const ratio=1-STOP_DISTANCE/best;
    const x=p.x+(nearest.x-p.x)*ratio,z=p.z+(nearest.z-p.z)*ratio;
    const y=surfaceHeight('auditorium',{x,z},p.y);
    if(y!==null)this.route=findPath('auditorium',p,this.destination.set(x,y,z))??[];
   }
  }
  const leader=this.leaderId===null?undefined:visitors.find(visitor=>visitor.id===this.leaderId&&visitor.zone==='auditorium');
  const gap=leader?Math.hypot(leader.x-p.x,leader.z-p.z):Infinity;

  let moved=0;
  const target=this.route[0];
  if(target&&leader&&gap>STOP_DISTANCE&&gap<=FOLLOW_RADIUS){
   const dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz);
   if(distance<.035)this.route.shift();
   else{
    const travel=Math.min(distance,(gap>2.4?1.75:1.10)*dt);
    const x=p.x+dx/distance*travel,z=p.z+dz/distance*travel;
    const y=surfaceHeight('auditorium',{x,z},p.y);
    if(y!==null&&walkable('auditorium',this.next.set(x,y,z))){
     p.copy(this.next);moved=travel;
     this.turn(Math.atan2(-dx,-dz),dt);
    }else this.route=[];
   }
  }else if(leader&&gap>.05&&gap<=FOLLOW_RADIUS){
   this.turn(Math.atan2(p.x-leader.x,p.z-leader.z),dt);
  }
  this.gait+=moved/.34;
  this.stride=T.MathUtils.damp(this.stride,moved>0?1:0,12,dt);
  for(const [index,leg] of this.legs.entries()){
   const phase=this.gait*Math.PI*2+(index===0||index===3?0:Math.PI);
   leg.rotation.x=Math.sin(phase)*.43*this.stride;
   leg.position.y=.328+Math.max(0,Math.cos(phase))*.045*this.stride;
  }
  this.head.position.y=.64+(reduced?0:Math.cos(this.gait*Math.PI*4)*.012*this.stride);
  this.tail.rotation.y=reduced?0:Math.sin(seconds*(leader?9:2.8))*(leader?.54:.22);
 }

 private turn(yaw:number,dt:number){
  const difference=T.MathUtils.euclideanModulo(yaw-this.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;
  this.root.rotation.y+=difference*(1-Math.exp(-12*dt));
 }
}
