import {visitorVariant} from '../../shared/venue';
import * as T from 'three';
import {finishBuild} from '../scene/buildBudget';
import {woodMaterial,applyWoodSurface,hallImage} from '../scene/HallTextures';
import {Avatar,musicianSits,PERCUSSION} from '../character/Avatar';
import {box,cylinder,material,detailedMaterial,C} from '../scene/primitives';
import {ORCHESTRA_LAYOUT,CONDUCTOR,STAGE,STAGE_FLOOR,STAGE_TERRACES,TERRACE_BACK,terraceOutline,stageRiseAt,MUSICIAN_SCALE,JAZZ_RISERS} from './layout';
import {JAZZ_HALL} from '../../shared/hallKind';
import {DINNER_SIT_DROP} from '../../shared/dinnerTables';
/** Five continuous curved terraces with broad ordinary keyboard wings. */
function terraces(scene:T.Scene){
 // Jazz hall: two straight bandstand tiers with a pale nosing along each front edge.
 if(JAZZ_HALL)for(const r of JAZZ_RISERS){
  const depth=r.front-r.back,width=r.x1-r.x0,mid=(r.x0+r.x1)/2,tier=box(scene,[width,r.rise,depth],[mid,STAGE_FLOOR+r.rise/2,r.back+depth/2],0x9b7049);tier.material=woodMaterial('stage-side');
  box(scene,[width,.035,.035],[mid,STAGE_FLOOR+r.rise-.025,r.front],0xc39967);
 }
 for(const tier of STAGE_TERRACES){
  const half=STAGE.width/2,outline=terraceOutline(tier),points=[[-half,TERRACE_BACK],[half,TERRACE_BACK],...[...outline].reverse().map(p=>[p.x,p.z])];
  const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:tier.rise,bevelEnabled:false,steps:1}),material(0x9b7049));mesh.rotation.x=-Math.PI/2;mesh.position.y=STAGE_FLOOR;mesh.receiveShadow=true;mesh.userData.terrace=tier.index;scene.add(mesh);mesh.material=woodMaterial('stage-side');applyWoodSurface(mesh,'stage-top',true);
  // Thin front nosing follows the same continuous contour, without gold blocks.
  for(let i=1;i<outline.length;i++){const p=outline[i-1],q=outline[i],a=new T.Vector3(p.x,STAGE_FLOOR+tier.rise-.025,p.z),b=new T.Vector3(q.x,a.y,q.z),edge=box(scene,[a.distanceTo(b),.035,.035],a.clone().add(b).multiplyScalar(.5).toArray(),0xc39967);edge.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);}

 }
}
function chair(parent:T.Object3D){box(parent,[.57,.11,.5],[0,.515,.015],0x392d29).material=woodMaterial('frame',true);box(parent,[.58,.42,.085],[0,.77,.29],0x45322c).material=woodMaterial('frame',true);for(const x of [-.22,.22])for(const z of [-.17,.22])cylinder(parent,.035,.48,[x,.24,z],0x292626);parent.traverse(o=>{if(o instanceof T.Mesh){o.userData.fullDetail=true;o.userData.orchestraFurniture=true;if(!Array.isArray(o.material))o.material=detailedMaterial(o.material);}});}
function stand(parent:T.Object3D){
 cylinder(parent,.018,.74,[0,.37,0],0x302d28);box(parent,[.57,.025,.33],[0,.81,0],0x242522).rotation.x=.55;
 box(parent,[.52,.008,.29],[0,.83,0],0xe2d9be).rotation.x=.55;
 box(parent,[.012,.01,.29],[0,.84,0],0x9c927f).rotation.x=.55;
 for(const angle of [0,2.094,4.189]){const leg=box(parent,[.035,.025,.29],[Math.sin(angle)*.11,.025,Math.cos(angle)*.11],0x302d28);leg.rotation.y=angle;}
}
/** A big band's boxy stand front, kept low (knee height) so instruments held in front of the player pass over it:
 * the hall's gilt side-box pattern faces the audience, with music on the sloped top. */
function bandFront(parent:T.Object3D){
 const h=.56;
 const redPanel=0x853e3d,redTrim=0x6f2830;
 box(parent,[.74,h,.05],[0,h/2,0],redPanel);
 box(parent,[.78,.045,.07],[0,h,0],redTrim);
 box(parent,[.78,.045,.07],[0,.022,0],redTrim);
 for(const x of [-.37,.37])box(parent,[.04,h,.16],[x,h/2,.08],redTrim);
 box(parent,[.72,.32,.01],[0,h/2,-.026],0xc9a45c);
 const ornament=hallImage(parent,'damask',.70,.30,0,h/2,-.032);
 // The hall texture has two repeats. Crop to one motif inside its printed border.
 ornament.geometry=ornament.geometry.clone();
 const uv=ornament.geometry.getAttribute('uv');
 for(let i=0;i<uv.count;i++)uv.setXY(i,.03+uv.getX(i)*.44,.12+uv.getY(i)*.76);
 ornament.rotation.y=Math.PI;
 box(parent,[.74,.02,.2],[0,h+.03,.09],0x242522).rotation.x=-.3;box(parent,[.66,.008,.17],[0,h+.045,.09],0xe2d9be).rotation.x=-.3;
}
/** Trial: the players are drawn as ghosts (World adds them); their instruments stay where the players hold them. */
export const GHOST_ORCHESTRA=false;
const EMPTY=new T.BufferGeometry();EMPTY.setAttribute('position',new T.Float32BufferAttribute([],3));
/** Empty every body mesh but leave instruments and bows (held in the hands) in place; the pose tree is untouched. */
function hideBody(actor:Avatar){
 const keep=new Set<T.Object3D>();
 const keepAll=(o:T.Object3D)=>o.traverse(c=>keep.add(c));keepAll(actor.instrument);
 for(const hand of [actor.leftHand,actor.rightHand])for(const c of hand.children)if(c!==actor.finger)keepAll(c);
 actor.root.traverse(o=>{if(o instanceof T.Mesh&&!keep.has(o)){o.geometry=EMPTY;o.userData.lowDetail=EMPTY;}});
}
export function buildOrchestra(scene:T.Scene){return finishBuild(buildOrchestraSteps(scene));}
export function* buildOrchestraSteps(scene:T.Scene){
 terraces(scene);
 const musicians:Avatar[]=[],desks=new Map<string,{x:number;z:number;count:number}>();
 for(const [i,p] of ORCHESTRA_LAYOUT.entries()){
  const actor=new Avatar(0x2d3033,p.instrument,visitorVariant({id:`musician-${i}`}));actor.root.userData.section=p.section;actor.root.userData.placement=i;actor.root.userData.row=p.row;actor.phase=i*.43;actor.root.position.set(p.x,STAGE_FLOOR+p.rise-(musicianSits(p.instrument)?DINNER_SIT_DROP*MUSICIAN_SCALE:0),p.z);if(p.instrument==='drum-kit')actor.instrument.position.y+=DINNER_SIT_DROP;actor.root.rotation.y=p.yaw;actor.root.scale.setScalar(MUSICIAN_SCALE);actor.settlePose(musicianSits(p.instrument));actor.body.userData.animated=true;scene.add(actor.root);musicians.push(actor);
  if(GHOST_ORCHESTRA)hideBody(actor);
  if(musicianSits(p.instrument)){const furniture=new T.Group();furniture.position.copy(actor.root.position);furniture.rotation.y=p.yaw;furniture.scale.setScalar(MUSICIAN_SCALE);furniture.userData.chairFor=i;scene.add(furniture);chair(furniture);}
  if(JAZZ_HALL){
   // Every big-band player has their own stand straight in front of them; saxophones and trombones sit behind band fronts.
   if(!['piano','drum-kit'].includes(p.instrument)){
    const boxDesk=p.instrument==='guitar'||p.instrument==='trombone'||p.instrument==='trumpet'||p.instrument.endsWith('-sax'),reach=(boxDesk||p.instrument==='bass'?.95:.62)*MUSICIAN_SCALE,sx=p.x-Math.sin(p.yaw)*reach,sz=p.z-Math.cos(p.yaw)*reach,g=new T.Group();g.position.set(sx,STAGE_FLOOR+stageRiseAt(sx,sz),sz);g.rotation.y=p.yaw;g.scale.setScalar(MUSICIAN_SCALE);g.userData.musicDesk=true;scene.add(g);
    if(boxDesk)bandFront(g);else stand(g);
   }
  }else if(!PERCUSSION.includes(p.instrument)&&!['piano','celesta','harp','drum-kit'].includes(p.instrument)){
   const id=p.deskId??`player-${i}`,d=desks.get(id)??{x:0,z:0,count:0};d.x+=p.x;d.z+=p.z;d.count++;desks.set(id,d);
  }
  yield;
 }
 // String players share a desk in pairs. Desks have their own floor contact,
 // so the front of a terrace never leaves a music stand suspended in midair.
 for(const d of desks.values()){
  const x=d.x/d.count,z=d.z/d.count,yaw=Math.atan2(x-CONDUCTOR.x,z-CONDUCTOR.z),sx=x-Math.sin(yaw)*.5*MUSICIAN_SCALE,sz=z-Math.cos(yaw)*.5*MUSICIAN_SCALE;
  const g=new T.Group();g.position.set(sx,STAGE_FLOOR+stageRiseAt(sx,sz),sz);g.rotation.y=yaw;g.scale.setScalar(MUSICIAN_SCALE);g.userData.musicDesk=true;scene.add(g);stand(g);yield;
 }
 // A big band's leader stands on the stage floor; the orchestra's conductor has a podium.
 const podium=JAZZ_HALL?0:.24;if(podium){box(scene,[1.7,podium,1.25],[0,STAGE_FLOOR+podium/2,CONDUCTOR.z],0x67452f);box(scene,[1.5,.025,1.05],[0,STAGE_FLOOR+podium+.01,CONDUCTOR.z],C.red);}
 // The concertmaster leads the first violins from the chair nearest the conductor; they stand to tune the orchestra.
 const firsts=musicians.filter(a=>a.root.userData.section==='first-violins'&&a.root.userData.row===0&&a.root.position.x<0);
 const concertmaster=firsts.sort((a,b)=>a.root.position.distanceTo(new T.Vector3(CONDUCTOR.x,a.root.position.y,CONDUCTOR.z))-b.root.position.distanceTo(new T.Vector3(CONDUCTOR.x,b.root.position.y,CONDUCTOR.z)))[0];
 if(concertmaster){concertmaster.root.userData.concertmaster=true;concertmaster.root.userData.animated=true;}
 if(JAZZ_HALL)return musicians;// no conductor: the big band's leader plays the piano
 const conductor=new Avatar(0x272b2b,'conductor');conductor.root.userData.demoConductor=true;conductor.root.userData.animated=true;conductor.root.position.set(0,STAGE_FLOOR+podium,CONDUCTOR.z);conductor.root.scale.setScalar(MUSICIAN_SCALE);conductor.settlePose(false);scene.add(conductor.root);musicians.push(conductor);return musicians;
}
