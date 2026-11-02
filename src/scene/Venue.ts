import {LobbyCat} from '../character/LobbyCat';
import {buildTicketGuide} from './TicketGuide';
import * as T from 'three';
import {box,cylinder,sphere,line,text,material,detailedMaterial,wallWithOpenings,C} from './primitives';
import {ATRIUM,GRAND_STAIR,LOBBY_BRANCH,LOBBY_ARCADE,AMPHITHEATRE_DOOR} from '../../shared/grandStair';
import {buildGarnierCeiling} from './GarnierCeiling';
import {buildLobbyEntrance} from './LobbyEntrance';
import {buildLobbyDetails,lobbyStatue,lobbyWoodWall,LOBBY_PALETTE} from './LobbyDetails';
import {buildLobbyAmenities,type ProgramBoard} from './LobbyAmenities';
import {SEATS,BOUNDS,type Zone} from '../../shared/venue';
import type {Avatar} from '../character/Avatar';
import {buildOrchestraSteps} from '../orchestra/buildOrchestra';
import {finishBuild,buildOverFrames} from './buildBudget';
import {GOLDEN_HALL} from '../../shared/goldenHall';
import {buildStairs} from './Stairs';
import {buildStairArrows,type StairArrows} from './StairArrows';
import {buildSunlight,type Sunlight} from './Sunlight';
import {buildGoldenHallSteps,timberDoor} from './GoldenHall';
import {woodMaterial,applyWoodSurface,hallImage,hallImageMaterial} from './HallTextures';
import {batchArchitectureSteps,batchCharactersSteps} from './batching';
import {EmoteLayer} from '../character/EmoteLayer';
export type Venue={cat:LobbyCat|null;programBoard?:ProgramBoard;scene:T.Scene;floor:T.Mesh;walkTargets:T.Object3D[];seatTargets:T.Object3D[];portal:T.Object3D;musicians:Avatar[];cameraWalls:T.Object3D[];overviewHidden:T.Object3D[];seatLights:Map<string,T.Mesh>;updateMusicians:(camera?:T.Camera)=>void;updateLOD:(camera:T.Camera)=>void;emotes:EmoteLayer;sunlight:Sunlight|null;stairArrows:StairArrows|null};

function chandelier(parent:T.Object3D,x:number,y:number,z:number,r=1){
 const g=new T.Group();g.position.set(x,y,z);g.userData.landmark='lobby-chandelier';parent.add(g);
 cylinder(g,.035,3.7,[0,2.7,0],C.gold);cylinder(g,.2,.2,[0,4.6,0],C.gold);
 // A tiered crystal basket: the silhouette comes from its ribs and translucent body, with only six lamps.
 const crystal=new T.MeshLambertMaterial({color:0xf4eedb,transparent:true,opacity:.35,depthWrite:false});
 for(const [radius,height] of [[r,0],[r*.7,1.15],[r*.35,2.6]] as const){
  const ring=new T.Mesh(new T.TorusGeometry(radius,.055,8,40),material(C.gold));ring.rotation.x=Math.PI/2;ring.position.y=height;g.add(ring);
 }
 const basket=new T.Mesh(new T.CylinderGeometry(r*.35,r,2.6,32,1,true),crystal);basket.position.y=1.3;g.add(basket);
 const bowl=new T.Mesh(new T.SphereGeometry(r,32,12,0,Math.PI*2,0,Math.PI/2),crystal);bowl.rotation.x=Math.PI;bowl.scale.y=.48;g.add(bowl);
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2,xx=Math.cos(a),zz=Math.sin(a);line(g,new T.Vector3(xx*r,0,zz*r),new T.Vector3(xx*r*.35,2.6,zz*r*.35),.022,0xeee5cf);
  line(g,new T.Vector3(xx*r,0,zz*r),new T.Vector3(0,-r*.48,0),.018,0xeee5cf);
  const drop=sphere(g,.055,[xx*r,-.12,zz*r],0xf5edda);drop.scale.y*=2.4;
 }
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const lamp=sphere(g,.11,[Math.cos(a)*r*.55,.45,Math.sin(a)*r*.55],0xffefd1);lamp.material=new T.MeshLambertMaterial({color:0xffefd1,emissive:0xffdba2,emissiveIntensity:.7});}
 sphere(g,.14,[0,-r*.48,0],C.goldLight);g.traverse(o=>{o.userData.fullDetail=true;});
}
function tileFloor(scene:T.Scene,width:number,length:number,centerZ=0){
 const nX=Math.round(width),nZ=Math.round(length),geo=new T.PlaneGeometry(1,1),inst=new T.InstancedMesh(geo,material(C.marble),nX*nZ),dummy=new T.Object3D();let n=0;
 for(let x=0;x<nX;x++)for(let z=0;z<nZ;z++){dummy.position.set(x-width/2+.5,.003,centerZ+z-length/2+.5);dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();inst.setMatrixAt(n,dummy.matrix);inst.setColorAt(n,new T.Color((x+z)%2?0xbfb49e:0xe0d4ba));n++;}
 inst.receiveShadow=true;scene.add(inst);
}
/** A polished marble floor drawn once on a canvas: veined lozenge slabs, a red marble border with gilt lines,
 * and optionally a star medallion. One textured plane, so it costs a single draw. */
function patternedFloor(scene:T.Scene,width:number,length:number,centerZ:number,medallionZ?:number){
 const plane=new T.Mesh(new T.PlaneGeometry(width,length),new T.MeshLambertMaterial({color:0xfff7ea}));plane.rotation.x=-Math.PI/2;plane.position.set(0,.006,centerZ);plane.receiveShadow=true;plane.userData.fullDetail=true;scene.add(plane);
 if(typeof document==='undefined')return plane;
 const k=40,c=document.createElement('canvas');c.width=Math.round(width*k);c.height=Math.round(length*k);const g=c.getContext('2d')!;let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  // Pale marble slabs of uneven size, laid in staggered courses with fine joints.
 g.fillStyle='#e3d8c4';g.fillRect(0,0,c.width,c.height);for(let y=0;y<c.height;){const h=(1.4+rnd()*1.2)*k;for(let x=-rnd()*k;x<c.width;){const w=(1.6+rnd()*1.6)*k;const t=225+rnd()*16|0;g.fillStyle=`rgb(${t},${t-10|0},${t-26|0})`;g.fillRect(x,y,w,h);g.strokeStyle='rgba(120,100,75,.35)';g.lineWidth=1.5;g.strokeRect(x,y,w,h);x+=w;}y+=h;}
 for(let i=0;i<width*length/6;i++){g.strokeStyle=`rgba(90,65,45,${.05+rnd()*.12})`;g.lineWidth=.6+rnd()*1.4;g.beginPath();let x=rnd()*c.width,y=rnd()*c.height;g.moveTo(x,y);for(let j=0;j<5;j++){x+=(rnd()-.4)*60;y+=(rnd()-.5)*40;g.lineTo(x,y);}g.stroke();}
 const b=.9*k,bw=.75*k;g.fillStyle='#7c3a2d';g.fillRect(b,b,c.width-2*b,bw);g.fillRect(b,c.height-b-bw,c.width-2*b,bw);g.fillRect(b,b,bw,c.height-2*b);g.fillRect(c.width-b-bw,b,bw,c.height-2*b);
 g.strokeStyle='#c9a250';g.lineWidth=4;for(const o of [b-6,b+bw+6])g.strokeRect(o,o,c.width-2*o,c.height-2*o);
 if(medallionZ!==undefined){const cx=c.width/2,cy=(medallionZ-(centerZ-length/2))*k;
  for(const [r,col]of [[3.2,'#c9a250'],[3.0,'#7c3a2d'],[2.5,'#e9dcc0'],[2.35,'#c9a250'],[2.25,'#2f4a3e']] as const){g.fillStyle=col;g.beginPath();g.arc(cx,cy,r*k,0,Math.PI*2);g.fill();}
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r1=(i%2?1.4:2.2)*k;g.fillStyle=i%2?'#d8c39a':'#efe2c6';g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a-.2)*.55*k,cy+Math.sin(a-.2)*.55*k);g.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);g.lineTo(cx+Math.cos(a+.2)*.55*k,cy+Math.sin(a+.2)*.55*k);g.closePath();g.fill();}
  g.fillStyle='#c9a250';g.beginPath();g.arc(cx,cy,.3*k,0,Math.PI*2);g.fill();}
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;(plane.material as T.MeshLambertMaterial).map=map;return plane;
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
 g.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){o.material=(o.material as T.MeshLambertMaterial).color.getHex()===0x74342c?detailedMaterial(o.material):woodMaterial('frame',true);o.userData.fullDetail=true;}});return g;
}
function ceilingPainting(parent:T.Object3D,x:number,z:number,w:number,h:number,y:number){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d')!;
 const gr=ctx.createRadialGradient(260,120,10,260,120,280);gr.addColorStop(0,'#d9c9a9');gr.addColorStop(.6,'#9e9d87');gr.addColorStop(1,'#746f5b');ctx.fillStyle=gr;ctx.fillRect(0,0,512,256);
 for(let i=0;i<18;i++){const xx=256+Math.cos(i*2.4)*i*11,yy=128+Math.sin(i*1.8)*i*5;ctx.fillStyle=i%2?'#bdab83':'#c7bb9b';ctx.beginPath();ctx.ellipse(xx,yy,35,14,i*.3,0,Math.PI*2);ctx.fill();}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshLambertMaterial({map:texture}));p.rotation.x=Math.PI/2;p.position.set(x,y,z);parent.add(p);
}
/** Veined marble drawn once on a small canvas (no download) and shared by every marble surface; tinted per use. */
let marbleMap:T.Texture|null|undefined;
const veined=new Map<number,T.MeshLambertMaterial>();
function marble(color:number){
 let m=veined.get(color);if(m)return m;
 if(marbleMap===undefined){marbleMap=null;if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=256;c.height=512;const g=c.getContext('2d')!;
  g.fillStyle='#ece6dc';g.fillRect(0,0,256,512);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let i=0;i<60;i++){g.fillStyle=`rgba(${150+rnd()*60|0},${120+rnd()*50|0},${100+rnd()*40|0},.10)`;g.beginPath();g.ellipse(rnd()*256,rnd()*512,20+rnd()*60,10+rnd()*40,rnd()*3,0,Math.PI*2);g.fill();}
  for(let i=0;i<16;i++){g.strokeStyle=`rgba(60,35,25,${.25+rnd()*.45})`;g.lineWidth=.6+rnd()*2.2;g.beginPath();let x=rnd()*256,y=0;g.moveTo(x,y);while(y<512){x+=(rnd()-.5)*40;y+=20+rnd()*40;g.lineTo(x,y);}g.stroke();}
  marbleMap=new T.CanvasTexture(c);marbleMap.colorSpace=T.SRGBColorSpace;marbleMap.wrapS=marbleMap.wrapT=T.RepeatWrapping;}}
 m=new T.MeshLambertMaterial({map:marbleMap??undefined,color});veined.set(color,m);return m;
}
/** A stone wall pierced by one round-headed opening: two piers and a spandrel, extruded to a real depth. */
function stoneArch(parent:T.Object3D,width:number,height:number,depth:number,color:number,position:number[],rotation=0,pier=.45,crownOnly=false){
 const r=width/2-pier,spring=Math.max(0,height-1.1-r),shape=new T.Shape();
 const bottom=crownOnly?spring:0;
 shape.moveTo(-width/2,bottom);shape.lineTo(-width/2,height);shape.lineTo(width/2,height);shape.lineTo(width/2,bottom);shape.lineTo(r,bottom);shape.lineTo(r,spring);shape.absarc(0,spring,r,0,Math.PI,false);shape.lineTo(-r,bottom);shape.closePath();
 const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:10}).translate(0,0,-depth/2),material(color));mesh.position.set(position[0],position[1],position[2]);mesh.rotation.y=rotation;mesh.userData.fullDetail=true;parent.add(mesh);return mesh;
}
/** A simplified Garnier-inspired lobby with an open floor, a central stair, two balcony tiers,
 * marble wall panels and bronze lighting. Arcade crowns and round columns share the same centre lines. */
function grandEscalier(scene:T.Scene,cameraWalls:T.Object3D[],walkTargets:T.Object3D[]){
 const A=ATRIUM,S=GRAND_STAIR,W=A.halfWidth,D=A.balconyDepth,len=A.back-A.front,midZ=(A.front+A.back)/2,inner=W-D,tier2=13.4;
 // Match the auditorium ivory palette and keep the stair stone slightly lighter.
 const stone=LOBBY_PALETTE.ivory,stoneDark=LOBBY_PALETTE.deep,marbleShaft=0xe8d6ac,stepStone=0xe6d6b4,redMarble=LOBBY_PALETTE.red,onyx=0xe2d3a6;
 patternedFloor(scene,W*2,len,midZ);
 cameraWalls.push(box(scene,[.4,A.height,len+.4],[-W-.2,A.height/2,midZ],stone),box(scene,[.4,A.height,len+.4],[W+.2,A.height/2,midZ],stone),box(scene,[W*2+.8,A.height,.4],[0,A.height/2,A.back+.2],stone));
 cameraWalls.push(...wallWithOpenings(scene,-W-.4,W+.4,0,A.height,A.front-.2,.4,stone,[-6.8,0,6.8].map(x=>({minX:x-1.95,maxX:x+1.95,minY:0,maxY:5.2}))));
 // The entrance wall as seen from the head of the stair: three ground arches (the centre one the street door with
 // blue fanlights and mosaic vestibules beyond), carved panels on the piers between them;
 // on the top tier three great arches with painted vaults.
 {const h=A.balconyY-.95;
  for(const x of [-6.8,0,6.8]){
   stoneArch(scene,4.8,h,.6,stone,[x,0,A.front-.1]);
   const bay=new T.Group();bay.position.set(x,0,A.front-.5);scene.add(bay);
   // Keep one door face: a plain stone backing replaces the second framed timber panel.
   box(bay,[3.9,5.2,.12],[0,2.6,0],stone);timberDoor(bay,0,.03,3.3,4.85,.18);
  }
  for(const x of [-10.2,-3.4,3.4,10.2]){const g=new T.Group();g.position.set(x,0,A.front+.5);scene.add(g);lobbyWoodWall(g,1.7,h);hallImage(g,'relief',1.1,2.1,0,2.8,.2);}
 }
 cameraWalls.push(box(scene,[W*2+.4,.4,len+.4],[0,A.height+.2,midZ],stoneDark));
 buildGarnierCeiling(scene);
 // Heavy carved entablatures under each tier and the ceiling.
 for(const y of [A.balconyY-.55,A.height-.7]){for(const side of [-1,1])box(scene,[.9,.9,len],[side*(W-.45),y,midZ],stoneDark);box(scene,[W*2,.9,.9],[0,y,A.back-.45],stoneDark);box(scene,[W*2,.9,.9],[0,y,A.front+.45],stoneDark);for(const side of [-1,1])box(scene,[.2,.25,len],[side*(inner+.05),y-.35,midZ],C.gold);
 }
 // Both arcade levels share one shaft at each joint between adjacent arch crowns.
 for(const side of [-1,1])for(const z of [LOBBY_ARCADE.bays[0]-LOBBY_ARCADE.width,...LOBBY_ARCADE.bays,LOBBY_ARCADE.bays.at(-1)!+LOBBY_ARCADE.width]){
  stoneArch(scene,LOBBY_ARCADE.width,A.balconyY-.45,.4,stone,[side*LOBBY_ARCADE.x,0,z],Math.PI/2,.45,true);
  for(const base of [A.balconyY,tier2])stoneArch(scene,LOBBY_ARCADE.width,5.75,.4,stone,[side*LOBBY_ARCADE.x,base,z],Math.PI/2,.45,true);
 }
 for(const z of [A.front+D,A.back-D])for(const x of LOBBY_ARCADE.endBays)for(const base of [A.balconyY,tier2])
  stoneArch(scene,LOBBY_ARCADE.width,5.75,.35,stone,[x,base,z],0,.45,true);
 // Partial end arches continue to the front/rear walls instead of solid returns hiding artwork.
 buildLobbyDetails(scene);
 // Balcony floors for both tiers.
 for(const y of [A.balconyY,tier2]){for(const side of [-1,1])box(scene,[D,.45,len],[side*(W-D/2),y-.22,midZ],stone);box(scene,[inner*2,.45,D],[0,y-.22,A.back-D/2],stone);box(scene,[inner*2,.45,D],[0,y-.22,A.front+D/2],stone);}
 const rail=(x1:number,z1:number,y1:number,x2:number,z2:number,y2:number,lamps=false,bal=redMarble)=>{
  const n=Math.max(1,Math.round(Math.hypot(x2-x1,z2-z1)/.36));
  for(let i=0;i<=n;i++){const t=i/n;cylinder(scene,bal===redMarble?.06:.09,.78,[x1+(x2-x1)*t,y1+(y2-y1)*t+.47,z1+(z2-z1)*t],bal);}
  line(scene,new T.Vector3(x1,y1+.93,z1),new T.Vector3(x2,y2+.93,z2),.11,onyx);line(scene,new T.Vector3(x1,y1+.06,z1),new T.Vector3(x2,y2+.06,z2),.12,stone);
  if(lamps)for(const [x,y,z]of [[x1,y1,z1],[x2,y2,z2]]){box(scene,[.36,1.05,.36],[x,y+.52,z],stone);}
 };
 const B=LOBBY_BRANCH;
 for(const y of [A.balconyY,tier2])for(const side of [-1,1]){
  if(y===A.balconyY){rail(side*inner,A.front+.2,y,side*inner,B.z-B.width/2,y,true);rail(side*inner,B.z+B.width/2,y,side*inner,A.back-D,y,true);}else rail(side*inner,A.front+.2,y,side*inner,A.back-D,y,false,0xe3d2ac);
 }
 for(const y of [A.balconyY,tier2]){const bal=y===tier2?0xe3d2ac:redMarble;if(y===A.balconyY){rail(-inner,A.back-D,y,-S.branchInner,A.back-D,y,false,bal);rail(S.branchInner,A.back-D,y,inner,A.back-D,y,false,bal);}else rail(-inner,A.back-D,y,inner,A.back-D,y,false,bal);rail(-inner,A.front+D,y,inner,A.front+D,y,y===A.balconyY,bal);}
 // Central flight: broad and solid; its lowest steps flare out with rounded ends, as in the hall.
 const step=S.rise/S.steps,d=(S.flightEnd-S.flightStart)/S.steps,lh=S.branchInner;
 for(let i=0;i<S.steps;i++){const top=(i+1)*step,flare=Math.max(0,6-i)**1.5*.17,w=S.flightHalf*2+flare*2,z=S.flightStart+(i+.5)*d;
  box(scene,[w,top,d],[0,top/2,z],stepStone).userData.landmark='grand-stair-step';if(flare>0)for(const side of [-1,1])cylinder(scene,d/2,top,[side*w/2,top/2,z],stepStone);}
 box(scene,[lh*2,S.rise,S.landingEnd-S.flightEnd],[0,S.rise/2,(S.flightEnd+S.landingEnd)/2],stepStone).userData.landmark='grand-stair-landing';
 for(const side of [-1,1])box(scene,[lh-S.flightHalf,S.rise,.3],[side*(lh+S.flightHalf)/2,S.rise/2,S.flightEnd-.05],stone);
 buildLobbyEntrance(scene,cameraWalls);
 // Straight outward flights meet the first gallery flush, with one uninterrupted rail per edge.
 for(const side of [-1,1]){
  const tread=(B.endX-B.startX)/B.steps,rise=(A.balconyY-S.rise)/B.steps;
  for(let i=0;i<B.steps;i++){
   const top=S.rise+(i+1)*rise;
   box(scene,[tread,.32,B.width],[side*(B.startX+(i+.5)*tread),top-.16,B.z],stepStone);
  }
  for(const edge of [-1,1])rail(side*B.startX,B.z+edge*B.width/2,S.rise,side*B.endX,B.z+edge*B.width/2,A.balconyY);
  rail(side*(S.flightHalf+.06),S.flightStart,0,side*(S.flightHalf+.06),S.flightEnd,S.rise,true);
  const x=side*(S.flightHalf+3.6),z=S.flightStart-.9;box(scene,[1.1,.8,1.1],[x,.4,z],marbleShaft);lobbyStatue(scene,x,.8,z,1.1,Math.PI);
 }

 // Smooth click surfaces cover each flight and the complete first gallery ring.
 const hit=new T.MeshBasicMaterial({visible:false,side:T.DoubleSide});
 const surface=(corners:number[][])=>{
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(corners.flat(),3));geometry.setIndex([0,1,2,0,2,3]);
  const mesh=new T.Mesh(geometry,hit);scene.add(mesh);walkTargets.push(mesh);
 };
 surface([[-S.flightHalf,0,S.flightStart],[S.flightHalf,0,S.flightStart],[S.flightHalf,S.rise,S.flightEnd],[-S.flightHalf,S.rise,S.flightEnd]]);
 surface([[-lh,S.rise,S.flightEnd],[lh,S.rise,S.flightEnd],[lh,S.rise,S.landingEnd],[-lh,S.rise,S.landingEnd]]);
 for(const side of [-1,1]){
  surface([[side*B.startX,S.rise,B.z-B.width/2],[side*B.endX,A.balconyY,B.z-B.width/2],[side*B.endX,A.balconyY,B.z+B.width/2],[side*B.startX,S.rise,B.z+B.width/2]]);
  surface([[side*inner,A.balconyY,A.front],[side*W,A.balconyY,A.front],[side*W,A.balconyY,A.back],[side*inner,A.balconyY,A.back]]);
 }
 for(const z of [A.front,A.back-D])surface([[-inner,A.balconyY,z],[inner,A.balconyY,z],[inner,A.balconyY,z+D],[-inner,A.balconyY,z+D]]);
 surface([[-lh,A.balconyY,S.landingEnd+.5],[lh,A.balconyY,S.landingEnd+.5],[lh,A.balconyY,A.back],[-lh,A.balconyY,A.back]]);
 // Street doors under the far arcade, and the foyer named over its opening.
 for(const x of [-8.4,8.4]){const doorway=new T.Group();doorway.position.set(x,0,A.back-.2);doorway.rotation.y=Math.PI;doorway.userData.landmark='lobby-rear-door';scene.add(doorway);timberDoor(doorway,0,0,2.6,4.4,0);arch(scene,2.9,4.5,[x,0,A.back-.2],Math.PI);}
 for(const x of [-10.2,-3.4,3.4,10.2]){box(scene,[.8,.8,.8],[x,.4,A.front+1.2],stoneDark);lobbyStatue(scene,x,.8,A.front+1.2,.95);}
 text(scene,'AUREA CONCERT HALL',5,[0,A.height-1.5,A.front+.95],'#f0d9a0');
 chandelier(scene,0,15.5,24,2.2);
}
export function createVenue(zone:Zone):Venue{return finishBuild(createVenueSteps(zone));}
export function createVenueAsync(zone:Zone,cancelled:()=>boolean){return buildOverFrames(createVenueSteps(zone),cancelled);}
function* createVenueSteps(zone:Zone):Generator<void,Venue,void>{
 const scene=new T.Scene();scene.background=new T.Color(0x24201b);scene.fog=new T.FogExp2(zone==='lobby'?0x292119:0xc2a372,zone==='lobby'?.009:.002);
 scene.add(new T.HemisphereLight(0xffe6bf,0x7c6c5b,1.7));const ambient=new T.AmbientLight(0xffe5c4,.45);scene.add(ambient);
 const sun=new T.DirectionalLight(0xffe4b8,2.2);sun.position.set(-7,13,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-17,right:17,top:20,bottom:-20,near:1,far:55});sun.shadow.normalBias=.04;scene.add(sun);
 const b=BOUNDS[zone],floor=box(scene,[zone==='lobby'?ATRIUM.halfWidth*2:GOLDEN_HALL.width,.15,zone==='lobby'?ATRIUM.back-ATRIUM.front:GOLDEN_HALL.rear-GOLDEN_HALL.front],[0,-.09,zone==='lobby'?(ATRIUM.front+ATRIUM.back)/2:(GOLDEN_HALL.front+GOLDEN_HALL.rear)/2],zone==='lobby'?0x8f7a5c:0x44352b);
 floor.userData.floor=true;if(zone==='auditorium')applyWoodSurface(floor);
 const walkTargets:T.Object3D[]=[floor];
 const cameraWalls:T.Object3D[]=[],overviewHidden:T.Object3D[]=[],seatTargets:T.Object3D[]=[],musicians:Avatar[]=[],seatLights=new Map<string,T.Mesh>();
 let portal:T.Object3D,programBoard:ProgramBoard|undefined;
 if(zone==='lobby'){
  grandEscalier(scene,cameraWalls,walkTargets);
  programBoard=buildLobbyAmenities(scene,walkTargets).programBoard;
  // The amphitheatre door at the head of the flight is the way into the hall.
  portal=new T.Mesh(new T.BoxGeometry(2.5,3.4,.5),new T.MeshBasicMaterial({visible:false}));portal.position.set(AMPHITHEATRE_DOOR.x,GRAND_STAIR.rise+1.7,AMPHITHEATRE_DOOR.z);portal.userData.portal=true;scene.add(portal);
  sun.position.set(-7,30,26);sun.target.position.set(0,0,31);scene.add(sun.target);
 }else{
  cameraWalls.push(...(yield* buildGoldenHallSteps(scene)).cameraWalls);
  walkTargets.push(...buildStairs(scene).surfaces);
  const hitGeometry=new T.BoxGeometry(1.2,1.5,1.15),hitMaterial=new T.MeshBasicMaterial({visible:false});
  for(const [i,s] of SEATS.entries()){const g=seat(scene,s.x,s.z);g.position.y=s.y;g.rotation.y=s.yaw;
   const target=new T.Mesh(hitGeometry,hitMaterial);target.position.set(s.x,s.y+.7,s.z);target.rotation.y=s.yaw;target.userData.seatId=s.id;scene.add(target);seatTargets.push(target);if(i%12===11)yield;
  }
  portal=box(scene,[6.75,6.4,.3],[0,3.2,GOLDEN_HALL.rear-.18],C.wood);portal.userData.portal=true;text(scene,'AUREA FOYER',4,[0,7.2,GOLDEN_HALL.rear-1]).rotation.y=Math.PI;
  musicians.push(...(yield* buildOrchestraSteps(scene)));
 }
 const cat=zone==='lobby'?new LobbyCat(scene):null;
 cameraWalls.push(portal);
 for(const wall of cameraWalls)wall.traverse(o=>{o.userData.cameraWall=true;});
 const updateLOD=yield* batchArchitectureSteps(scene,[floor,portal,...(cat?[cat.root,...cat.targets]:[]),...walkTargets.filter(o=>o instanceof T.Mesh&&!Array.isArray(o.material)&&!o.material.visible),...overviewHidden,...seatTargets,...seatLights.values(),...musicians.map(a=>a.root)]);
 const updateMusicians=yield* batchCharactersSteps(scene,[...musicians.map(a=>a.root),...(cat?[cat.root]:[])]);updateMusicians();
 // Visitor reaction icons share one draw call per hall.
 const emotes=new EmoteLayer(64);scene.add(emotes.points);
 // Sun shafts use their own shaders, so they join after batching.
 const sunlight=zone==='lobby'?buildSunlight(scene,[23.1,33.1,38.1].map(z=>new T.Vector3(14.5,16.5,z))):buildSunlight(scene);
 const stairArrows=zone==='lobby'?buildTicketGuide(scene):buildStairArrows(scene);
 return {cat,programBoard,scene,floor,walkTargets,updateLOD,seatTargets,portal,musicians,cameraWalls,overviewHidden,seatLights,updateMusicians,emotes,sunlight,stairArrows};
}
