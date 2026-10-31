import * as T from 'three';
import {Avatar,musicianSits,PERCUSSION} from '../character/Avatar';
import {box,cylinder,material,C} from '../scene/primitives';
import {ORCHESTRA_LAYOUT,CONDUCTOR,STAGE,STAGE_FLOOR,STAGE_TERRACES,TERRACE_BACK,terraceOutline,stageRiseAt,MUSICIAN_SCALE} from './layout';
/** Five continuous curved terraces with broad ordinary keyboard wings. */
function terraces(scene:T.Scene){
 for(const tier of STAGE_TERRACES){
  const half=STAGE.width/2,outline=terraceOutline(tier),points=[[-half,TERRACE_BACK],[half,TERRACE_BACK],...[...outline].reverse().map(p=>[p.x,p.z])];
  const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:tier.rise,bevelEnabled:false,steps:1}),material(0x9b7049));mesh.rotation.x=-Math.PI/2;mesh.position.y=STAGE_FLOOR;mesh.receiveShadow=true;mesh.userData.terrace=tier.index;scene.add(mesh);
  // Thin front nosing follows the same continuous contour, without gold blocks.
  for(let i=1;i<outline.length;i++){const p=outline[i-1],q=outline[i],a=new T.Vector3(p.x,STAGE_FLOOR+tier.rise-.025,p.z),b=new T.Vector3(q.x,a.y,q.z),edge=box(scene,[a.distanceTo(b),.035,.035],a.clone().add(b).multiplyScalar(.5).toArray(),0xc39967);edge.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);}

 }
}
function chair(parent:T.Object3D){box(parent,[.57,.11,.5],[0,.515,.015],0x392d29);box(parent,[.58,.42,.085],[0,.77,.29],0x45322c);for(const x of [-.22,.22])for(const z of [-.17,.22])cylinder(parent,.025,.48,[x,.24,z],0x292626);}
function stand(parent:T.Object3D){
 cylinder(parent,.018,.74,[0,.37,0],0x302d28);box(parent,[.57,.025,.33],[0,.81,0],0x242522).rotation.x=.55;
 box(parent,[.52,.008,.29],[0,.83,0],0xe2d9be).rotation.x=.55;
 box(parent,[.012,.01,.29],[0,.84,0],0x9c927f).rotation.x=.55;
 for(const angle of [0,2.094,4.189]){const leg=box(parent,[.035,.025,.29],[Math.sin(angle)*.11,.025,Math.cos(angle)*.11],0x302d28);leg.rotation.y=angle;}
}
export function buildOrchestra(scene:T.Scene){
 terraces(scene);
 const musicians:Avatar[]=[],desks=new Map<string,{x:number;z:number;count:number}>();
 ORCHESTRA_LAYOUT.forEach((p,i)=>{
  const actor=new Avatar(0x2d3033,p.instrument,i);actor.root.userData.section=p.section;actor.root.userData.placement=i;actor.phase=i*.43;actor.root.position.set(p.x,STAGE_FLOOR+p.rise,p.z);actor.root.rotation.y=p.yaw;actor.root.scale.setScalar(MUSICIAN_SCALE);actor.settlePose(musicianSits(p.instrument));scene.add(actor.root);musicians.push(actor);
  if(musicianSits(p.instrument)){const furniture=new T.Group();furniture.position.copy(actor.root.position);furniture.rotation.y=p.yaw;furniture.scale.setScalar(MUSICIAN_SCALE);furniture.userData.chairFor=i;scene.add(furniture);chair(furniture);}
  if(!PERCUSSION.includes(p.instrument)&&!['piano','celesta','harp'].includes(p.instrument)){
   const id=p.deskId??`player-${i}`,d=desks.get(id)??{x:0,z:0,count:0};d.x+=p.x;d.z+=p.z;d.count++;desks.set(id,d);
  }
 });
 // String players share a desk in pairs. Desks have their own floor contact,
 // so the front of a terrace never leaves a music stand suspended in midair.
 for(const d of desks.values()){
  const x=d.x/d.count,z=d.z/d.count,yaw=Math.atan2(x-CONDUCTOR.x,z-CONDUCTOR.z),sx=x-Math.sin(yaw)*.7*MUSICIAN_SCALE,sz=z-Math.cos(yaw)*.7*MUSICIAN_SCALE;
  const g=new T.Group();g.position.set(sx,STAGE_FLOOR+stageRiseAt(sx,sz),sz);g.rotation.y=yaw;g.scale.setScalar(MUSICIAN_SCALE);g.userData.musicDesk=true;scene.add(g);stand(g);
 }
 const podium=.24;box(scene,[1.7,podium,1.25],[0,STAGE_FLOOR+podium/2,CONDUCTOR.z],0x67452f);box(scene,[1.5,.025,1.05],[0,STAGE_FLOOR+podium+.01,CONDUCTOR.z],C.red);
 const conductor=new Avatar(0x272b2b,'conductor');conductor.root.position.set(0,STAGE_FLOOR+podium,CONDUCTOR.z);conductor.root.scale.setScalar(MUSICIAN_SCALE);conductor.settlePose(false);scene.add(conductor.root);musicians.push(conductor);return musicians;
}
