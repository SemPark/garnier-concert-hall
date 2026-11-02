import * as T from 'three';
import {box,cylinder,sphere,line,text,material,detailedMaterial,wallWithOpenings,C} from './primitives';
import {ATRIUM,GRAND_STAIR,LOBBY_BRANCH,AMPHITHEATRE_DOOR} from '../../shared/grandStair';
import {buildLobbyAmenities,type ProgramBoard} from './LobbyAmenities';
import {SEATS,BOUNDS,type Zone} from '../../shared/venue';
import type {Avatar} from '../character/Avatar';
import {buildOrchestra} from '../orchestra/buildOrchestra';
import {GOLDEN_HALL} from '../../shared/goldenHall';
import {buildStairs} from './Stairs';
import {buildStairArrows,type StairArrows} from './StairArrows';
import {buildSunlight,type Sunlight} from './Sunlight';
import {buildGoldenHall} from './GoldenHall';
import {woodMaterial,applyWoodSurface,hallImage,hallImageMaterial} from './HallTextures';
import {batchArchitecture,batchCharacters} from './batching';
import {EmoteLayer} from '../character/EmoteLayer';
export type Venue={programBoard?:ProgramBoard;scene:T.Scene;floor:T.Mesh;walkTargets:T.Object3D[];seatTargets:T.Object3D[];portal:T.Object3D;musicians:Avatar[];cameraWalls:T.Object3D[];overviewHidden:T.Object3D[];seatLights:Map<string,T.Mesh>;updateMusicians:(camera?:T.Camera)=>void;updateLOD:(camera:T.Camera)=>void;emotes:EmoteLayer;sunlight:Sunlight|null;stairArrows:StairArrows|null};

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
 const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:10}),material(color));mesh.position.set(position[0],position[1],position[2]);mesh.rotation.y=rotation;mesh.userData.fullDetail=true;parent.add(mesh);return mesh;
}
/** A simplified Garnier-inspired lobby with an open floor, a central stair, two balcony tiers,
 * marble wall panels and bronze lighting. Freestanding columns are omitted; the ground-floor arch crowns remain. */
function grandEscalier(scene:T.Scene,cameraWalls:T.Object3D[],walkTargets:T.Object3D[]){
 const A=ATRIUM,S=GRAND_STAIR,W=A.halfWidth,D=A.balconyDepth,len=A.back-A.front,midZ=(A.front+A.back)/2,inner=W-D,tier2=13.4;
 // Warm grey-ochre stone and sand-coloured veined marble, as in the photos.
 const stone=0xbca98a,stoneDark=0x8f7c5e,marbleShaft=0xb59a74,stepStone=0xe6d6b4,redMarble=0x8f3f33,onyx=0xe2d3a6,bronze=0x4f3b27,flame=0xfff0c6;
 patternedFloor(scene,W*2,len,midZ);
 cameraWalls.push(box(scene,[.4,A.height,len+.4],[-W-.2,A.height/2,midZ],stone),box(scene,[.4,A.height,len+.4],[W+.2,A.height/2,midZ],stone),box(scene,[W*2+.8,A.height,.4],[0,A.height/2,A.back+.2],stone));
 cameraWalls.push(...wallWithOpenings(scene,-W-.4,W+.4,0,A.height,A.front-.2,.4,stone,[-6.8,0,6.8].map(x=>({minX:x-1.95,maxX:x+1.95,minY:0,maxY:5.2}))));
 // The entrance wall as seen from the head of the stair: three ground arches (the centre one the street door with
 // a blue fanlight and a mosaic vestibule beyond, the side ones grilled), carved panels on the piers between them;
 // on the top tier three great arches with painted vaults.
 {const h=A.balconyY-.95;for(const x of [-6.8,0,6.8]){stoneArch(scene,4.8,h,.6,stone,[x,0,A.front-.1],0);const spring=h-1.1-1.95,vz=A.front-3;
   box(scene,[4,.12,3],[x,.01,vz+1.5],0xb9a27c);for(let k=0;k<6;k++)box(scene,[.5,.02,.5],[x-1.25+k*.5,.08,vz+1.5],k%2?0x6b3a2a:0xd8c7a3);
   box(scene,[4.4,5.6,.2],[x,2.8,vz],stoneDark);for(const side of [-1,1])box(scene,[.2,5.6,3],[x+side*2.1,2.8,vz+1.5],stoneDark);
   if(x===0){box(scene,[2.4,3.2,.1],[0,1.6,vz+.12],0x3a2618);box(scene,[2.0,2.8,.06],[0,1.5,vz+.18],0x4d3220);const fan=new T.Mesh(new T.CircleGeometry(1.3,18,0,Math.PI),new T.MeshBasicMaterial({color:0x6f8fc8}));fan.position.set(0,3.25,vz+.12);scene.add(fan);for(let k=1;k<5;k++){const a=k/5*Math.PI;line(scene,new T.Vector3(0,3.25,vz+.15),new T.Vector3(Math.cos(a)*1.3,3.25+Math.sin(a)*1.3,vz+.15),.025,C.gold);}}
   else{for(let k=-6;k<=6;k++)line(scene,new T.Vector3(x+k*.3,0,A.front+.05),new T.Vector3(x+k*.3,spring,A.front+.05),.02,0x2c2620);line(scene,new T.Vector3(x-1.9,1.05,A.front+.06),new T.Vector3(x+1.9,1.05,A.front+.06),.04,C.gold);sphere(scene,.22,[x,3.4,vz+.4],0xfff0c6);}}
  for(const x of [-10.2,-3.4,3.4,10.2]){box(scene,[1.7,h,.5],[x,h/2,A.front+.25],stone);box(scene,[1.1,2.4,.08],[x,2.6,A.front+.53],0xb08a55);hallImage(scene,'relief',1,1.8,x,2.6,A.front+.58).rotation.z=Math.PI/2;box(scene,[1.9,.3,.6],[x,h-.15,A.front+.3],C.gold);}
  }
 cameraWalls.push(box(scene,[W*2+.4,.4,len+.4],[0,A.height+.2,midZ],stoneDark));
 for(const z of [24,31,38]){const fresco=new T.Mesh(new T.PlaneGeometry(15,5.4),hallImageMaterial('fresco'));fresco.rotation.x=Math.PI/2;fresco.position.set(0,A.height-.02,z);fresco.userData.fullDetail=true;scene.add(fresco);for(const x of [-7.6,7.6])box(scene,[.3,.35,5.8],[x,A.height-.18,z],C.gold);for(const dz of [-2.8,2.8])box(scene,[15.4,.35,.3],[0,A.height-.18,z+dz],C.gold);}
 // Heavy carved entablatures under each tier and the ceiling.
 for(const y of [A.balconyY-.55,A.height-.7]){for(const side of [-1,1])box(scene,[.9,.9,len],[side*(W-.45),y,midZ],stoneDark);box(scene,[W*2,.9,.9],[0,y,A.back-.45],stoneDark);box(scene,[W*2,.9,.9],[0,y,A.front+.45],stoneDark);for(const side of [-1,1])box(scene,[.2,.25,len],[side*(inner+.05),y-.35,midZ],C.gold);
  // Gilded scroll frieze in short repeats, sharing the hall's frieze image.
  for(const side of [-1,1])for(let z=A.front+1.3;z<A.back-.5;z+=2.6){const f=hallImage(scene,'scroll',2.6,.62,side*(W-.91),y+.05,z);f.rotation.y=-side*Math.PI/2;}
  for(let x=-W+1.3;x<W-.5;x+=2.6){hallImage(scene,'scroll',2.6,.62,x,y+.05,A.back-.91).rotation.y=Math.PI;hallImage(scene,'scroll',2.6,.62,x,y+.05,A.front+.91);}}
 // Keep the ground-floor arch crowns above the open floor without bringing back columns.
 for(const side of [-1,1])for(const z of [23.1,28.1,33.1,38.1])
  stoneArch(scene,5,A.balconyY-.45,.4,stone,[side*(inner+.1),0,z],Math.PI/2,.45,true);
 const portal=GRAND_STAIR.branchInner+.45;
 box(scene,[portal*2-.5,A.balconyY-.45,.8],[0,(A.balconyY-.45)/2,A.back-D+.2],stone).material=marble(0xc9a875);

 // Balcony floors for both tiers.
 for(const y of [A.balconyY,tier2]){for(const side of [-1,1])box(scene,[D,.45,len],[side*(W-D/2),y-.22,midZ],stone);box(scene,[inner*2,.45,D],[0,y-.22,A.back-D/2],stone);box(scene,[inner*2,.45,D],[0,y-.22,A.front+D/2],stone);}
 // Polychrome panels on the walls behind the arcades.
 for(const x of [-10.2,-6.3,-2.1,2.1,6.3,10.2]){box(scene,[3,3.8,.08],[x,10.2,A.front+.06],redMarble).material=marble(0xa4503e);hallImage(scene,'relief',2,1,x,11.1,A.front+.12);for(const dx of [-1.55,1.55])box(scene,[.14,4.1,.1],[x+dx,10.2,A.front+.08],C.gold);}
 for(const side of [-1,1])for(const z of [23.1,28.1,33.1,38.1])for(const y of [3.2,10.2]){box(scene,[.08,3.8,3],[side*(W-.06),y,z],redMarble).material=marble(0xa4503e);hallImage(scene,'relief',2,1,side*(W-.12),y+.9,z).rotation.y=-side*Math.PI/2;box(scene,[.1,4.1,.14],[side*(W-.08),y,z-1.55],C.gold);box(scene,[.1,4.1,.14],[side*(W-.08),y,z+1.55],C.gold);}
 const candelabrum=(x:number,y:number,z:number,size=1)=>{cylinder(scene,.06*size,1.1*size,[x,y+.55*size,z],bronze);
  for(const [r,h,n]of [[.42,1.05,8],[.24,1.35,5]] as const)for(let k=0;k<n;k++){const a=k/n*Math.PI*2;cylinder(scene,.025*size,.18*size,[x+Math.cos(a)*r*size,y+h*size,z+Math.sin(a)*r*size],0xf3ead2);sphere(scene,.07*size,[x+Math.cos(a)*r*size,y+(h+.13)*size,z+Math.sin(a)*r*size],flame);}
  sphere(scene,.09*size,[x,y+1.6*size,z],flame);};
 const rail=(x1:number,z1:number,y1:number,x2:number,z2:number,y2:number,lamps=false,bal=redMarble)=>{
  const n=Math.max(1,Math.round(Math.hypot(x2-x1,z2-z1)/.36));
  for(let i=0;i<=n;i++){const t=i/n;cylinder(scene,bal===redMarble?.06:.09,.78,[x1+(x2-x1)*t,y1+(y2-y1)*t+.47,z1+(z2-z1)*t],bal);}
  line(scene,new T.Vector3(x1,y1+.93,z1),new T.Vector3(x2,y2+.93,z2),.11,onyx);line(scene,new T.Vector3(x1,y1+.06,z1),new T.Vector3(x2,y2+.06,z2),.12,stone);
  if(lamps)for(const [x,y,z]of [[x1,y1,z1],[x2,y2,z2]]){box(scene,[.36,1.05,.36],[x,y+.52,z],stone);candelabrum(x,y+1.05,z,.8);}
 };
 const B=LOBBY_BRANCH;
 for(const y of [A.balconyY,tier2])for(const side of [-1,1]){
  if(y===A.balconyY){rail(side*inner,A.front+.2,y,side*inner,B.z-B.width/2,y,true);rail(side*inner,B.z+B.width/2,y,side*inner,A.back-D,y,true);}else rail(side*inner,A.front+.2,y,side*inner,A.back-D,y,false,0xe3d2ac);
 }
 for(const y of [A.balconyY,tier2]){const bal=y===tier2?0xe3d2ac:redMarble;rail(-inner,A.back-D,y,inner,A.back-D,y,false,bal);rail(-inner,A.front+D,y,inner,A.front+D,y,y===A.balconyY,bal);}
 // Central flight: broad and solid; its lowest steps flare out with rounded ends, as in the hall.
 const step=S.rise/S.steps,d=(S.flightEnd-S.flightStart)/S.steps,lh=S.branchInner;
 for(let i=0;i<S.steps;i++){const top=(i+1)*step,flare=Math.max(0,6-i)**1.5*.17,w=S.flightHalf*2+flare*2,z=S.flightStart+(i+.5)*d;
  box(scene,[w,top,d],[0,top/2,z],stepStone).userData.landmark='grand-stair-step';if(flare>0)for(const side of [-1,1])cylinder(scene,d/2,top,[side*w/2,top/2,z],stepStone);}
 box(scene,[lh*2,S.rise,S.landingEnd-S.flightEnd],[0,S.rise/2,(S.flightEnd+S.landingEnd)/2],stepStone).userData.landmark='grand-stair-landing';
 for(const side of [-1,1])box(scene,[lh-S.flightHalf,S.rise,.3],[side*(lh+S.flightHalf)/2,S.rise/2,S.flightEnd-.05],stone);
 // At the head of the flight, on the landing: the amphitheatre doorway, a marble aedicule with its name plaque,
 // guarded by two statues, as in the hall.
 {const z0=A.back-D-.45,y0=S.rise,door=new T.Group();door.position.set(0,y0,z0);door.userData.landmark='amphitheatre-door';scene.add(door);
  box(door,[2.5,3.5,.2],[0,1.75,.25],0x2c211a);box(door,[2.1,3.1,.06],[0,1.65,.12],0x5a3f2a);
  for(const side of [-1,1]){box(door,[.55,4.3,.7],[side*1.55,2.15,0],marbleShaft).material=marble(0xb98a5c);box(door,[.75,.35,.8],[side*1.55,.18,0],stoneDark);}
  box(door,[3.9,.7,.75],[0,4.55,0],marbleShaft).material=marble(0xb98a5c);box(door,[2.7,.62,.1],[0,3.9,-.33],0x7a3428);
  text(door,'AMPHITHÉÂTRE',2.5,[0,3.9,-.39],'#f0d9a0').rotation.y=Math.PI;
  box(door,[4.5,.35,.95],[0,5.05,0],C.gold);const top=new T.Shape();top.moveTo(-2.3,0);top.lineTo(0,1.2);top.lineTo(2.3,0);top.closePath();
  const pediment=new T.Mesh(new T.ExtrudeGeometry(top,{depth:.8,bevelEnabled:false}),material(stepStone));pediment.userData.fullDetail=true;pediment.position.set(0,5.22,-.4);door.add(pediment);
  line(door,new T.Vector3(-2.3,5.22,-.43),new T.Vector3(0,6.42,-.43),.055,C.gold);line(door,new T.Vector3(0,6.42,-.43),new T.Vector3(2.3,5.22,-.43),.055,C.gold);
  sphere(door,.18,[0,5.75,-.43],C.gold);
  for(const side of [-1,1]){const x=side*2.55;box(door,[.9,1,.9],[x,.5,-.2],marbleShaft).material=marble(0x9c5a3a);const f=new T.Group();f.position.set(x,1,-.2);door.add(f);
   cylinder(f,.34,1.6,[0,.8,0],0xd9c9a8);cylinder(f,.23,.85,[0,1.95,0],0xd9c9a8);sphere(f,.21,[0,2.58,0],0xd9c9a8);line(f,new T.Vector3(side*-.15,2.2,0),new T.Vector3(side*-.5,2.9,-.1),.08,0xd9c9a8);}}
 // Straight outward flights meet the first gallery flush, with one uninterrupted rail per edge.
 for(const side of [-1,1]){
  const tread=(B.endX-B.startX)/B.steps,rise=(A.balconyY-S.rise)/B.steps;
  for(let i=0;i<B.steps;i++){
   const top=S.rise+(i+1)*rise;
   box(scene,[tread,.32,B.width],[side*(B.startX+(i+.5)*tread),top-.16,B.z],stepStone);
  }
  for(const edge of [-1,1])rail(side*B.startX,B.z+edge*B.width/2,S.rise,side*B.endX,B.z+edge*B.width/2,A.balconyY);
  rail(side*(S.flightHalf+.06),S.flightStart,0,side*(S.flightHalf+.06),S.flightEnd,S.rise,true);
  // Bronze torch-bearers at the foot of the flight.
  const x=side*(S.flightHalf+3.6),z=S.flightStart-.9;box(scene,[1.1,1.2,1.1],[x,.6,z],marbleShaft).material=marble(0x8f4a35);const t=new T.Group();t.position.set(x,1.2,z);scene.add(t);
  cylinder(t,.36,1.5,[0,.75,0],0x6d5034);cylinder(t,.2,.85,[0,1.9,0],0x6d5034);sphere(t,.21,[0,2.5,0],0x6d5034);line(t,new T.Vector3(.2,2.3,0),new T.Vector3(.45,3.3,0),.08,bronze);
  candelabrum(x+.45,4.4,z,1.25);
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
 // Street doors under the far arcade, and the foyer named over its opening.
 for(const x of [-8.4,8.4]){box(scene,[2.6,4.4,.2],[x,2.2,A.back-.06],C.wood);arch(scene,2.9,4.5,[x,0,A.back-.2],Math.PI);}
 for(const x of [-10.2,-3.4,3.4,10.2]){box(scene,[.8,1,.8],[x,.5,A.front+1.2],0x8f4a35).material=marble(0x8f4a35);cylinder(scene,.09,2.6,[x,2.3,A.front+1.2],bronze);candelabrum(x,3.5,A.front+1.2,1.05);}
 text(scene,'PALAIS GARNIER',5,[0,A.height-1.5,A.front+.95],'#f0d9a0');
 chandelier(scene,0,15.5,24,2.2);for(const z of [23.1,38.1])for(const x of [-inner+1,inner-1])candelabrum(x,A.balconyY+.9,z,.9);
}
export function createVenue(zone:Zone):Venue{
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
  portal=new T.Mesh(new T.BoxGeometry(2.5,3.4,.5),new T.MeshBasicMaterial({visible:false}));portal.position.set(AMPHITHEATRE_DOOR.x,GRAND_STAIR.rise+1.7,ATRIUM.back-ATRIUM.balconyDepth-.55);portal.userData.portal=true;scene.add(portal);
  sun.position.set(-7,30,26);sun.target.position.set(0,0,31);scene.add(sun.target);
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
 for(const wall of cameraWalls)wall.traverse(o=>{o.userData.cameraWall=true;});
 const updateLOD=batchArchitecture(scene,[floor,portal,...walkTargets.filter(o=>o instanceof T.Mesh&&!Array.isArray(o.material)&&!o.material.visible),...overviewHidden,...seatTargets,...seatLights.values(),...musicians.map(a=>a.root)]);
 const updateMusicians=batchCharacters(scene,musicians.map(a=>a.root));updateMusicians();
 // Visitor reaction icons share one draw call per hall.
 const emotes=new EmoteLayer(64);scene.add(emotes.points);
 // Sun shafts use their own shaders, so they join after batching.
 const sunlight=zone==='lobby'?null:buildSunlight(scene);
 const stairArrows=zone==='lobby'?null:buildStairArrows(scene);
 return {programBoard,scene,floor,walkTargets,updateLOD,seatTargets,portal,musicians,cameraWalls,overviewHidden,seatLights,updateMusicians,emotes,sunlight,stairArrows};
}
