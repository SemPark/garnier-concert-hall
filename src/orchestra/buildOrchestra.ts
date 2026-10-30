import * as T from 'three';
import {Avatar,musicianSits,PERCUSSION} from '../character/Avatar';
import {box,cylinder,material,C} from '../scene/primitives';
import {ORCHESTRA_LAYOUT,CONDUCTOR,STAGE_FLOOR,STRING_TIERS,REAR_TIERS,SIDE_PLATFORMS,MUSICIAN_SCALE} from './layout';
function riser(scene:T.Scene,x:number,z:number,width:number,depth:number,rise:number){
 box(scene,[width,rise,depth],[x,STAGE_FLOOR+rise/2,z],0x805a3c);box(scene,[width,.055,.055],[x,STAGE_FLOOR+rise-.035,z+depth/2+.005],C.goldLight);box(scene,[width,.035,depth],[x,STAGE_FLOOR+rise+.012,z],0xa67a4f);
}
function stringRiser(scene:T.Scene,inner:number,outer:number,from:number,to:number,rise:number){
 const shape=new T.Shape(),point=(r:number,a:number)=>new T.Vector2(Math.sin(a)*r,-CONDUCTOR.z+Math.cos(a)*r),first=point(inner,from);shape.moveTo(first.x,first.y);
 for(let i=1;i<=32;i++){const p=point(inner,from+(to-from)*i/32);shape.lineTo(p.x,p.y);}for(let i=32;i>=0;i--){const p=point(outer,from+(to-from)*i/32);shape.lineTo(p.x,p.y);}shape.closePath();
 const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:rise,bevelEnabled:false,steps:1}),material(0x997048));mesh.rotation.x=-Math.PI/2;mesh.position.y=STAGE_FLOOR;mesh.receiveShadow=true;scene.add(mesh);
}
function chair(parent:T.Object3D){box(parent,[.57,.11,.5],[0,.515,.015],0x392d29);box(parent,[.58,.42,.085],[0,.77,.29],0x45322c);for(const x of [-.22,.22])for(const z of [-.17,.22])cylinder(parent,.025,.48,[x,.24,z],0x292626);}
function stand(parent:T.Object3D){
 const x=-.43,z=-.68;
 cylinder(parent,.018,.68,[x,.34,z],0x302d28);box(parent,[.45,.025,.29],[x,.76,z],0x242522).rotation.x=.55;
 box(parent,[.4,.008,.25],[x,.78,z],0xe2d9be).rotation.x=.55;for(const side of [-.14,.14])box(parent,[.025,.025,.22],[x+side,.025,z],0x302d28);
}
export function buildOrchestra(scene:T.Scene){
 for(const tier of STRING_TIERS)for(const side of [-1,1])stringRiser(scene,tier.r-.62,tier.r+.75,side<0?-1.42:.4,side<0?-.4:1.42,tier.rise);
 stringRiser(scene,10.8,12.3,.49,1.44,.95);
 for(const tier of REAR_TIERS)riser(scene,0,tier.z,tier.width,tier.depth,tier.rise);
 for(const p of SIDE_PLATFORMS)riser(scene,p.x,p.z,p.width,p.depth,p.rise);
 const musicians:Avatar[]=[];
 ORCHESTRA_LAYOUT.forEach((p,i)=>{
  const actor=new Avatar(0x2d3033,p.instrument,i);actor.root.userData.section=p.section;actor.phase=i*.43;actor.root.position.set(p.x,STAGE_FLOOR+p.rise,p.z);actor.root.rotation.y=p.yaw;actor.root.scale.setScalar(MUSICIAN_SCALE);actor.settlePose(musicianSits(p.instrument));scene.add(actor.root);musicians.push(actor);
  const furniture=new T.Group();furniture.position.copy(actor.root.position);furniture.rotation.y=p.yaw;furniture.scale.setScalar(MUSICIAN_SCALE);scene.add(furniture);if(musicianSits(p.instrument))chair(furniture);if(!PERCUSSION.includes(p.instrument)&&!['piano','celesta','harp'].includes(p.instrument))stand(furniture);
 });
 const podium=.24;box(scene,[1.7,podium,1.25],[0,STAGE_FLOOR+podium/2,CONDUCTOR.z],0x67452f);box(scene,[1.5,.025,1.05],[0,STAGE_FLOOR+podium+.01,CONDUCTOR.z],C.red);
 const conductor=new Avatar(0x272b2b,'conductor');conductor.root.position.set(0,STAGE_FLOOR+podium,CONDUCTOR.z);conductor.settlePose(false);scene.add(conductor.root);musicians.push(conductor);return musicians;
}
