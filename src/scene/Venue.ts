import * as T from 'three';
import {box,cylinder,sphere,line,text,material,detailedMaterial,C} from './primitives';
import {SEATS,BOUNDS,type Zone} from '../../shared/venue';
import type {Avatar} from '../character/Avatar';
import {buildOrchestra} from '../orchestra/buildOrchestra';
import {GOLDEN_HALL} from '../../shared/goldenHall';
import {buildStairs} from './Stairs';
import {buildGoldenHall} from './GoldenHall';
import {batchArchitecture,batchCharacters} from './batching';
import {EmoteLayer} from '../character/EmoteLayer';
export type Venue={scene:T.Scene;floor:T.Mesh;walkTargets:T.Object3D[];seatTargets:T.Object3D[];portal:T.Object3D;musicians:Avatar[];cameraWalls:T.Object3D[];overviewHidden:T.Object3D[];seatLights:Map<string,T.Mesh>;updateMusicians:(camera?:T.Camera)=>void;updateLOD:(camera:T.Camera)=>void;emotes:EmoteLayer};

function chandelier(parent:T.Object3D,x:number,y:number,z:number,r=1){
 const g=new T.Group();g.position.set(x,y,z);parent.add(g);cylinder(g,.035,2,[0,1.1,0],C.gold);sphere(g,.18,[0,.35,0],C.goldLight);
 for(const [radius,height,count] of [[r,0,10],[r*.65,.65,7],[r*.3,1.1,5]]){
  const ring=new T.Mesh(new T.TorusGeometry(radius,.035,6,32),material(C.gold,.55));ring.rotation.x=Math.PI/2;ring.position.y=height;g.add(ring);
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,xx=Math.cos(a)*radius,zz=Math.sin(a)*radius;
   line(g,new T.Vector3(0,.45,0),new T.Vector3(xx,height,zz),.022,C.gold);cylinder(g,.035,.24,[xx,height+.11,zz],C.goldLight);
   const flame=sphere(g,.068,[xx,height+.28,zz],0xffedba);flame.material=new T.MeshStandardMaterial({color:0xffe7a2,emissive:0xffc773,emissiveIntensity:2});
   const crystal=sphere(g,.055,[xx,height-.22,zz],0xe7ddbe);crystal.scale.y*=2.3;
  }
 }
 const light=new T.PointLight(0xffdca6,22,16,2);light.position.set(0,.4,0);g.add(light);
}
function column(parent:T.Object3D,x:number,z:number,height=10){
 cylinder(parent,.52,.28,[x,.14,z],C.gold);cylinder(parent,.4,.2,[x,.38,z],C.cream);cylinder(parent,.28,height-.9,[x,height/2,z],C.marble);
 cylinder(parent,.43,.22,[x,height-.48,z],C.gold);box(parent,[.95,.25,.95],[x,height-.22,z],C.goldLight);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;cylinder(parent,.012,height-1.2,[x+Math.cos(a)*.285,height/2,z+Math.sin(a)*.285],0xb9aa89);}
}
function tileFloor(scene:T.Scene,width:number,length:number){
 const nX=Math.round(width),nZ=Math.round(length),geo=new T.PlaneGeometry(1,1),inst=new T.InstancedMesh(geo,material(C.marble),nX*nZ),dummy=new T.Object3D();let n=0;
 for(let x=0;x<nX;x++)for(let z=0;z<nZ;z++){dummy.position.set(x-width/2+.5,.003,z-length/2+.5);dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();inst.setMatrixAt(n,dummy.matrix);inst.setColorAt(n,new T.Color((x+z)%2?0xbfb49e:0xe0d4ba));n++;}
 inst.receiveShadow=true;scene.add(inst);
}
function arch(parent:T.Object3D,width:number,height:number,position:number[],rotation=0){
 const g=new T.Group();g.position.set(position[0],position[1],position[2]);g.rotation.y=rotation;parent.add(g);
 for(const x of [-width/2,width/2])box(g,[.12,height,.12],[x,height/2,0],C.goldLight,.3);
 const curve=new T.EllipseCurve(0,height,width/2,width/2,0,Math.PI,false,0),pts=curve.getPoints(20).map(p=>new T.Vector3(p.x,p.y,0));
 g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,.09,6,false),material(C.goldLight,.3)));return g;
}
// Shared curved timber and upholstered geometry: one set for every audience seat.
const chairShape=new T.Shape();chairShape.moveTo(-.51,-.28);chairShape.lineTo(.51,-.28);chairShape.lineTo(.51,.22);chairShape.quadraticCurveTo(.51,.3,.43,.3);chairShape.lineTo(-.43,.3);chairShape.quadraticCurveTo(-.51,.3,-.51,.22);chairShape.closePath();
const chairBack=new T.ExtrudeGeometry(chairShape,{depth:.075,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:1,curveSegments:6});
const cushionGeometry=new T.BoxGeometry(1,1,1);
function seat(parent:T.Object3D,x:number,z:number){
 const g=new T.Group();g.position.set(x,0,z);g.userData.audienceChair=true;parent.add(g);
 const timber=new T.Mesh(chairBack,material(0x9c622d,.05,.55));timber.position.set(0,.96,.37);timber.rotation.x=-.07;g.add(timber);
 box(g,[.86,.44,.025],[0,.96,.345],0xb17b40);box(g,[1.04,.09,.86],[0,.42,0],0x8a542a);
 const cushion=new T.Mesh(cushionGeometry,material(0x74342c,.02,.9));cushion.scale.set(.96,.13,.78);cushion.position.set(0,.50,-.035);g.add(cushion);
 for(const side of [-1,1]){for(const zz of [-.3,.3])box(g,[.065,.45,.065],[side*.43,.225,zz],0x664326);box(g,[.075,.31,.075],[side*.53,.67,.31],0x8e5c2d);box(g,[.11,.075,.78],[side*.53,.82,-.01],0xad783b);}
 g.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){o.material=detailedMaterial(o.material);o.userData.fullDetail=true;}});return g;
}
function ceilingPainting(parent:T.Object3D,x:number,z:number,w:number,h:number,y:number){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d')!;
 const gr=ctx.createRadialGradient(260,120,10,260,120,280);gr.addColorStop(0,'#d9c9a9');gr.addColorStop(.6,'#9e9d87');gr.addColorStop(1,'#746f5b');ctx.fillStyle=gr;ctx.fillRect(0,0,512,256);
 for(let i=0;i<18;i++){const xx=256+Math.cos(i*2.4)*i*11,yy=128+Math.sin(i*1.8)*i*5;ctx.fillStyle=i%2?'#bdab83':'#c7bb9b';ctx.beginPath();ctx.ellipse(xx,yy,35,14,i*.3,0,Math.PI*2);ctx.fill();}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshLambertMaterial({map:texture}));p.rotation.x=Math.PI/2;p.position.set(x,y,z);parent.add(p);
}
export function createVenue(zone:Zone):Venue{
 const scene=new T.Scene();scene.background=new T.Color(0x24201b);scene.fog=new T.FogExp2(zone==='lobby'?0x292119:0xc2a372,zone==='lobby'?.009:.002);
 scene.add(new T.HemisphereLight(0xffe6bf,0x7c6c5b,1.7));const ambient=new T.AmbientLight(0xffe5c4,.45);scene.add(ambient);
 const sun=new T.DirectionalLight(0xffe4b8,2.2);sun.position.set(-7,13,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-17,right:17,top:20,bottom:-20,near:1,far:55});sun.shadow.normalBias=.04;scene.add(sun);
 const b=BOUNDS[zone],floor=box(scene,[zone==='lobby'?b.maxX-b.minX+2:GOLDEN_HALL.width,.15,zone==='lobby'?38:GOLDEN_HALL.rear-GOLDEN_HALL.front],[0,-.09,zone==='lobby'?0:(GOLDEN_HALL.front+GOLDEN_HALL.rear)/2],zone==='lobby'?C.marble:0x44352b);
 floor.userData.floor=true;
 const walkTargets:T.Object3D[]=[floor];
 const cameraWalls:T.Object3D[]=[],overviewHidden:T.Object3D[]=[],seatTargets:T.Object3D[]=[],musicians:Avatar[]=[],seatLights=new Map<string,T.Mesh>();
 let portal:T.Object3D;
 if(zone==='lobby'){
  tileFloor(scene,14,36);
  for(const x of [-7.1,7.1]){const wall=box(scene,[.4,12.5,37],[x,6.1,0],C.cream);cameraWalls.push(wall);
   box(scene,[.23,1,36],[x*.98,.5,0],C.gold);box(scene,[.28,.26,36],[x*.98,10.8,0],C.goldLight);
   for(const z of [-13.5,-6.5,.5,7.5,14.5]){
    const panel=box(scene,[.06,5.4,3.8],[x*.978,5.2,z],0x828477,.2);arch(scene,3.85,5.3,[x*.97,2.5,z],Math.PI/2);
    for(const h of [2.45,8])box(scene,[.1,.12,4],[x*.965,h,z],C.goldLight);
    box(scene,[.08,4.9,.06],[x*.965,5.3,z],C.goldLight);panel.receiveShadow=true;
   }
  }
  for(const z of [-10,-3,4,11])for(const x of [-5.4,5.4])column(scene,x,z,10.5);
  box(scene,[14.3,.3,37],[0,12,0],C.cream);
  for(const z of [-13,-5,3,11]){ceilingPainting(scene,0,z,9,6,11.82);for(const x of [-4.8,4.8])box(scene,[.16,.15,6.4],[x,11.7,z],C.gold);for(const zz of [-3.2,3.2])box(scene,[9.6,.15,.16],[0,11.7,z+zz],C.gold);}
  for(const z of [-9,3,13])chandelier(scene,0,8,z,1.2);
  for(const z of [-18,18]){const end=box(scene,[14,12,.3],[0,6,z],C.cream);cameraWalls.push(end);}
  portal=box(scene,[3.3,4.7,.3],[0,2.35,-17.7],0x30251e);portal.userData.portal=true;
  arch(scene,3.8,4.8,[0,0,-17.45]);text(scene,'SALLE DE SPECTACLE',5,[0,6.2,-17.42]);text(scene,'PALAIS GARNIER',6,[0,9.7,-17.42]);
  for(const x of [-.78,.78]){box(scene,[1.45,4.3,.08],[x,2.2,-17.45],C.wood);box(scene,[1.15,3.7,.1],[x,2.2,-17.39],0x6e5635);sphere(scene,.06,[x>0?.13:-.13,1.9,-17.26],C.goldLight);}
  text(scene,'LE GRAND FOYER',5,[0,4.5,17.7]).rotation.y=Math.PI;
  const rug=box(scene,[3.4,.012,9],[0,.025,-11.8],C.red);rug.receiveShadow=true;
 }else{
  cameraWalls.push(...buildGoldenHall(scene).cameraWalls);
  walkTargets.push(...buildStairs(scene).surfaces);
  const hitGeometry=new T.BoxGeometry(1.2,1.5,1.15),hitMaterial=new T.MeshBasicMaterial({visible:false});
  for(const s of SEATS){const g=seat(scene,s.x,s.z);g.position.y=s.y;g.rotation.y=s.yaw;
   const target=new T.Mesh(hitGeometry,hitMaterial);target.position.set(s.x,s.y+.7,s.z);target.rotation.y=s.yaw;target.userData.seatId=s.id;scene.add(target);seatTargets.push(target);
  }
  portal=box(scene,[6.75,6.4,.3],[0,3.2,GOLDEN_HALL.rear-.18],C.wood);portal.userData.portal=true;text(scene,'GRAND FOYER',4,[0,7.2,GOLDEN_HALL.rear-1]).rotation.y=Math.PI;
  musicians.push(...buildOrchestra(scene));
 }
 cameraWalls.push(portal);
 const updateLOD=batchArchitecture(scene,[floor,portal,...walkTargets.filter(o=>o instanceof T.Mesh&&!Array.isArray(o.material)&&!o.material.visible),...overviewHidden,...seatTargets,...seatLights.values(),...musicians.map(a=>a.root)]);
 const updateMusicians=batchCharacters(scene,musicians.map(a=>a.root));updateMusicians();
 // Visitor reaction icons share one draw call per hall.
 const emotes=new EmoteLayer(64);scene.add(emotes.points);
 return {scene,floor,walkTargets,updateLOD,seatTargets,portal,musicians,cameraWalls,overviewHidden,seatLights,updateMusicians,emotes};
}
