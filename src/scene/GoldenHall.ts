import * as T from 'three';
import {box,cylinder,sphere,line,text,material} from './primitives';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {STAGE} from '../orchestra/layout';
import {crystalChandelier,paintedCeiling,friezeMaterial} from './HallDetails';
import {WALL_DATUM,WALL_LEVELS,buildPerimeterCornices,buildPerimeterFriezes} from './HallWallBands';
import {GALLERY_BRIDGE,GALLERY_RAIL_HEIGHT,REAR_COLUMNS,STAIR,galleryRailSpans} from '../../shared/gallery';
import {ORGAN_LOFT_BACK,ORGAN_LOFT_CONTOUR,ORGAN_RAIL_JOIN_X,ORGAN_RAIL_JOIN_Z,ORGAN_RAIL_POST_HALF,organBalconyFront} from '../../shared/organLoft';
import {buildGalleryFloors} from './GalleryFloors';
import {hallImage,hallImageMaterial,woodMaterial,applyWoodSurface} from './HallTextures';
export {organBalconyFront} from '../../shared/organLoft';
const P={ivory:0xe8d6ac,gold:0xc69b49,light:0xe7c77a,deep:0x8e622a,wood:0x945d30,red:0x6f2830,shadow:0x49351e,glass:0xc5d4ce};
const cylinderCache=new Map<string,T.BufferGeometry>();
function profile(top:number,bottom:number,height:number){const key=`${top}/${bottom}/${height}`;let g=cylinderCache.get(key);if(!g){g=new T.CylinderGeometry(top,bottom,height,12);cylinderCache.set(key,g);}return g;}
function frustum(parent:T.Object3D,top:number,bottom:number,h:number,pos:number[],color:number){const mesh=new T.Mesh(profile(top,bottom,h),material(color,.35));mesh.position.set(...pos as [number,number,number]);parent.add(mesh);return mesh;}
function cornice(g:T.Object3D,width:number,y:number,z:number){for(const [dy,depth,h]of [[0,.38,.13],[.18,.54,.18],[.38,.72,.12]])box(g,[width,h,depth],[0,y+dy,z],P.light);for(let x=-width/2+.12;x<width/2;x+=.36)box(g,[.13,.18,.25],[x,y-.16,z+.16],P.gold);}
function rosette(g:T.Object3D,x:number,y:number,z:number,size=.12){const center=sphere(g,size,[x,y,z],P.light);center.scale.z*=.45;for(let i=0;i<6;i++){const a=i/6*Math.PI*2;sphere(g,size*.62,[x+Math.cos(a)*size,y+Math.sin(a)*size,z],P.gold).scale.z*=.35;}}
function gildedColumn(g:T.Object3D,x:number,y:number,h:number,r=.27){
 cylinder(g,r*1.7,.18,[x,y+.09,.1],P.deep);cylinder(g,r*1.45,.17,[x,y+.25,.1],P.light);cylinder(g,r,h-.9,[x,y+h/2,.1],P.gold);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;cylinder(g,.012,h-1.1,[x+Math.cos(a)*r*1.01,y+h/2,.1+Math.sin(a)*r*1.01],P.light);}
 frustum(g,r*1.65,r*.95,.4,[x,y+h-.48,.1],P.light);box(g,[r*3.6,.18,r*3.6],[x,y+h-.16,.1],P.gold);
 for(const side of [-1,1])sphere(g,r*.45,[x+side*r*1.35,y+h-.35,.2],P.light);
}
function caryatid(g:T.Object3D){
 // Repeated gilded figures supporting the first gallery, with draped robes.
 box(g,[1.05,.2,.8],[0,.1,.45],P.deep);box(g,[.82,.18,.67],[0,.29,.45],P.light);
 frustum(g,.24,.43,2.45,[0,1.7,.46],P.gold);frustum(g,.42,.26,1.05,[0,3.4,.45],P.gold);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;line(g,new T.Vector3(Math.cos(a)*.22,2.8,.46+Math.sin(a)*.22),new T.Vector3(Math.cos(a)*.38,.5,.46+Math.sin(a)*.38),.025,P.light);}
 sphere(g,.3,[0,4.24,.45],P.gold).scale.y*=1.3;sphere(g,.32,[0,4.38,.5],P.deep).scale.y*=.75;sphere(g,.075,[0,4.2,.74],P.light);
 for(const s of [-1,1]){line(g,new T.Vector3(s*.3,3.8,.45),new T.Vector3(s*.56,4.6,.4),.11,P.gold);line(g,new T.Vector3(s*.56,4.6,.4),new T.Vector3(s*.35,5.45,.3),.09,P.light);sphere(g,.11,[s*.35,5.45,.3],P.gold);}
 box(g,[1.15,.17,.85],[0,5.67,.4],P.gold);box(g,[1.4,.18,1],[0,5.86,.4],P.light);
}
const paneShape=new T.Shape();paneShape.moveTo(-1.1,0);paneShape.lineTo(1.1,0);paneShape.lineTo(1.1,4.45);paneShape.absarc(0,4.45,1.1,0,Math.PI,false);paneShape.lineTo(-1.1,0);
const paneGeometry=new T.ShapeGeometry(paneShape,20),archGeometry=new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return new T.Vector3(Math.cos(a)*1.23,Math.sin(a)*1.23,0);})),24,.09,6,false);
// Side and rear panes glow with daylight; the front row is blind and stays dark.
const glassMaterial=new T.MeshLambertMaterial({color:0xfff4dc,emissive:0xffe2b0,emissiveIntensity:.55});
const friezePlane=new T.PlaneGeometry(1,1);
function archedWindow(g:T.Object3D,y:number,blind=false){
 const parent=g;g=new T.Group();parent.add(g);
 const pane=new T.Mesh(paneGeometry,blind?material(0xcebc98):glassMaterial);pane.position.set(0,y,.14);g.add(pane);
 for(const x of [-1.23,1.23])box(g,[.14,4.55,.18],[x,y+2.225,.24],P.ivory);
 const arch=new T.Mesh(archGeometry,material(P.ivory,.3));arch.position.set(0,y+4.45,.25);g.add(arch);
 box(g,[2.8,.22,.4],[0,y,.2],P.gold);
 if(!blind){box(g,[.07,5.05,.06],[0,y+2.525,.19],0x303334);for(const yy of [1.65,3.3,4.4])box(g,[2.2,.07,.06],[0,y+yy,.2],0x303334);}
 else{for(const x of [-1.38,1.38])box(g,[.09,4.6,.1],[x,y+2.225,.18],0x874537);const rim=new T.Mesh(archGeometry,material(0x874537));rim.position.set(0,y+4.45,.14);rim.scale.set(1.12,1.12,1);g.add(rim);}
 g.traverse(o=>{if(o instanceof T.Mesh)o.userData.fullDetail=true;});
}
export function balustrade(g:T.Object3D,width:number,ornament:T.Material|null=friezeMaterial(),posts=true){
 g.scale.y=GALLERY_RAIL_HEIGHT/1.58;
 box(g,[width,1.4,.22],[0,.78,.4],P.deep);box(g,[width,.12,.5],[0,.08,.43],P.light);box(g,[width,.17,.42],[0,1.48,.45],P.light);
 if(ornament){const count=Math.max(1,Math.ceil(width/2.1));for(let i=0;i<count;i++){const face=new T.Mesh(friezePlane,ornament);face.scale.set(width/count,1.14,1);face.position.set(-width/2+(i+.5)*width/count,.79,.525);g.add(face);}}
 if(posts)for(let x=-width/2;x<=width/2+.01;x+=2.4)box(g,[.075,1.25,.1],[x,.78,.55],P.light);
}
export const FRONT_WINDOW_AXES=[-13.3,-9.5,-5.7,-1.9,1.9,5.7,9.5,13.3] as const;
export function buildFrontWindows(scene:T.Scene){
 const row=new T.Group();row.position.z=WALL_DATUM.front;row.userData.landmark='front-window-row';scene.add(row);
 for(const x of FRONT_WINDOW_AXES){const bay=new T.Group();bay.position.x=x;bay.userData.landmark='front-window';row.add(bay);archedWindow(bay,WALL_LEVELS.window,true);}
}
export const ORGAN_CASE={width:23,back:ORGAN_LOFT_BACK,bankDepth:[1.3,1.85,1.3],frameDepth:3.3,loftHeight:H.balconyHeight} as const;
function loftSlab(g:T.Group,thickness:number,y:number,inset=0){
 const outline=new T.Shape();outline.moveTo(-15.35,.05);outline.lineTo(15.35,.05);
 for(const p of [...ORGAN_LOFT_CONTOUR].reverse())outline.lineTo(p.x,p.z-inset);outline.closePath();
 const mesh=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:thickness,bevelEnabled:false,curveSegments:1}),material(P.light));mesh.rotation.x=Math.PI/2;mesh.position.y=y;mesh.userData.fullDetail=true;g.add(mesh);return mesh;
}
/** Deep, freestanding casework over a real projecting organ loft. */
export function buildOrgan(scene:T.Scene,ornament:T.Material=friezeMaterial()){
 const g=new T.Group();g.position.z=ORGAN_CASE.back;g.userData.landmark='pipe-organ';scene.add(g);
 const back=box(g,[ORGAN_CASE.width,13.3,.42],[0,16.1,.28],0xb39b72);back.userData.landmark='organ-case-back';
 const banks=[{x:-8.05,w:4.55,count:19},{x:0,w:4.7,count:25},{x:8.05,w:4.55,count:19}];
 banks.forEach(({x,w,count},bank)=>{
  const chamber=new T.Group();chamber.userData.landmark='organ-pipe-chamber';g.add(chamber);
  box(chamber,[w,11.2,.16],[x,15.85,.58],0x222722);
  // Recess floors and side returns remain visible from oblique views.
  box(chamber,[w,.22,2.25],[x,10.24,1.66],P.deep);box(chamber,[w,.25,2.4],[x,21.65,1.72],P.deep);
  for(const side of [-1,1])box(chamber,[.18,11.6,2.25],[x+side*w/2,15.95,1.66],0x90703e);
  for(let i=0;i<count;i++){
   const u=i/(count-1)*2-1,xx=x+u*(w/2-.19),bottom=10.75+1.5*Math.abs(u)**1.8,top=21.5,r=Math.min(.12,w/count*.4),z=ORGAN_CASE.bankDepth[bank]+.3*(1-u*u);
   const pipe=cylinder(chamber,r,top-bottom-.45,[xx,(top+bottom+.45)/2,z],0xbec6c5);pipe.material=material(0xbec8cb,.68,.34);pipe.userData.fullDetail=true;pipe.userData.organPipe=true;
   frustum(chamber,r,r*.32,.45,[xx,bottom+.225,z],0xaeb8b7).userData.fullDetail=true;
   cylinder(chamber,r*1.08,.065,[xx,top,z],0xe0e3d9).userData.fullDetail=true;
   box(chamber,[r*1.6,.13,.045],[xx,bottom+.6,z+r],0x283131).userData.fullDetail=true;
   box(chamber,[r*1.8,.045,.06],[xx,bottom+.5,z+r+.015],0xe3e5d9).userData.fullDetail=true;
  }
 });
 for(const x of [-4.125,4.125]){box(g,[1.8,12.5,3.05],[x,16.1,1.72],P.ivory);const panel=new T.Group();panel.position.set(x,0,2.85);g.add(panel);wallPanel(panel,0,16.1,1.4,10.7);}
 for(const x of [-10.85,-5.25,-3,3,5.25,10.85]){
  const pier=box(g,[.72,12.5,3.05],[x,16.1,1.72],P.ivory);pier.userData.landmark='organ-case-pier';
  for(const side of [-1,1])box(g,[.07,12.35,.15],[x+side*.34,16.1,3.29],0x874537);
  const column=new T.Group();column.position.z=ORGAN_CASE.frameDepth;g.add(column);gildedColumn(column,x,9.8,12.7,.23);
  const figure=new T.Group();figure.position.set(x,15.4,3.45);figure.scale.set(.50,.85,.5);g.add(figure);caryatid(figure);
 }
 // The overhanging cornice and pediment have deep side faces, not a flat signboard.
 box(g,[23.8,.45,3.9],[0,22.05,1.95],P.gold);box(g,[23.3,.2,3.7],[0,21.72,1.9],P.light);cornice(g,24,22.2,3.92);
 box(g,[23.3,.44,3.7],[0,9.74,1.9],P.light);
 const triangle=new T.Shape();triangle.moveTo(-9.5,0);triangle.lineTo(0,2.25);triangle.lineTo(9.5,0);triangle.closePath();
 const pediment=new T.Mesh(new T.ExtrudeGeometry(triangle,{depth:3.35,bevelEnabled:false}),material(P.gold));pediment.position.set(0,22.85,.45);pediment.userData.landmark='organ-pediment';g.add(pediment);
 const tympanum=new T.Shape();tympanum.moveTo(-7.9,.25);tympanum.lineTo(0,1.88);tympanum.lineTo(7.9,.25);tympanum.closePath();const inset=new T.Mesh(new T.ExtrudeGeometry(tympanum,{depth:.08,bevelEnabled:false}),material(0xb79050));inset.position.set(0,22.85,3.84);g.add(inset);
 for(const side of [-1,1]){line(g,new T.Vector3(side*9.65,22.86,3.98),new T.Vector3(0,25.18,3.98),.095,P.light);line(g,new T.Vector3(side*8.0,23.1,4),new T.Vector3(0,24.78,4),.04,P.light);}
 rosette(g,0,23.72,4.04,.3);
 for(const x of [-8,-5,0,5,8]){const y=23.15+(x===0?2.15:.28),figure=new T.Group();figure.position.set(x,y,3.45);g.add(figure);sphere(figure,.2,[0,.45,0],P.ivory);frustum(figure,.16,.34,.65,[0,0,0],P.ivory);for(const side of [-1,1])line(figure,new T.Vector3(side*.15,.15,0),new T.Vector3(side*.48,-.05,.04),.065,P.ivory);}
 // The loft has its own slab, rounded apron and supporting brackets. Its wings
 // meet the existing galleries at the same 8.3-unit floor elevation.
 const floor=loftSlab(g,.48,H.balconyHeight);floor.userData.landmark='organ-loft-floor';floor.material=material(0xc39a59);applyWoodSurface(floor,'oak',true);
 const apron=loftSlab(g,.28,H.balconyHeight-.48,-.14);apron.userData.landmark='organ-loft-apron';apron.material=material(P.gold);
 const lip=loftSlab(g,.16,H.balconyHeight-.76,-.23);lip.userData.landmark='organ-loft-lower-cornice';lip.material=material(P.light);
 const railPath=ORGAN_LOFT_CONTOUR.filter(p=>Math.abs(p.x)<=ORGAN_RAIL_JOIN_X-ORGAN_RAIL_POST_HALF);
 for(let i=0;i<railPath.length-1;i++){
  const p=railPath[i],q=railPath[i+1],a=new T.Vector3(p.x,H.balconyHeight,p.z),b=new T.Vector3(q.x,H.balconyHeight,q.z),segment=new T.Group();
  const angle=-Math.atan2(b.z-a.z,b.x-a.x);segment.rotation.y=angle;segment.position.copy(a).add(b).multiplyScalar(.5).add(new T.Vector3(-Math.sin(angle)*.525,0,-Math.cos(angle)*.525));segment.userData.landmark='organ-loft-rail';g.add(segment);balustrade(segment,a.distanceTo(b),null,false);
 }
 // One continuous UV strip preserves the scroll pattern around the curved
 // balcony; repeating a complete motif on every little segment compressed it.
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];let arc=0,previous:T.Vector2|undefined;
 const railScale=GALLERY_RAIL_HEIGHT/1.58;
 for(let i=0;i<railPath.length;i++){const {x}=railPath[i],z=railPath[i].z+.012,p=new T.Vector2(x,z);if(previous)arc+=p.distanceTo(previous);previous=p;for(const y of [H.balconyHeight+.22*railScale,H.balconyHeight+1.36*railScale])positions.push(x,y,z);uv.push(arc/2.1,0,arc/2.1,1);if(i<railPath.length-1){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
 const strip=new T.BufferGeometry();strip.setAttribute('position',new T.Float32BufferAttribute(positions,3));strip.setAttribute('uv',new T.Float32BufferAttribute(uv,2));strip.setIndex(indices);strip.computeVertexNormals();const frieze=new T.Mesh(strip,ornament);frieze.userData.fullDetail=true;g.add(frieze);
 for(const x of [-8.3,-4.3,0,4.3,8.3])box(g,[.1,1.25*railScale,.09],[x,H.balconyHeight+.78*railScale,organBalconyFront(x)+.03],P.light);
 const railTop=1.565*railScale;
 for(const side of [-1,1]){const post=box(g,[ORGAN_RAIL_POST_HALF*2,railTop,ORGAN_RAIL_POST_HALF*2],[side*ORGAN_RAIL_JOIN_X,H.balconyHeight+railTop/2,ORGAN_RAIL_JOIN_Z-ORGAN_LOFT_BACK],P.light);post.userData.landmark='organ-rail-join';}
 for(const x of [-13,-8.3,-4.3,4.3,8.3,13]){const z=organBalconyFront(x)-.55;box(g,[.42,.9,1.05],[x,H.balconyHeight-.97,z-.3],P.deep);box(g,[.68,.2,1.15],[x,H.balconyHeight-.82,z-.3],P.light);}
 buildOrganConsole(g);
 for(const x of [-12,-6,0,6,12]){const panel=new T.Group();panel.position.set(x,0,.15);g.add(panel);wallPanel(panel,0,3.65,5.5,6.8);for(const xx of [-2.8,2.8])gildedColumn(panel,xx,.1,7.6,.18);box(panel,[2.4,.65,.1],[0,5.6,.4],P.gold);rosette(panel,0,5.6,.5,.2);}
 g.traverse(o=>{if(o instanceof T.Mesh)o.userData.fullDetail=true;});return g;
}

function buildOrganConsole(parent:T.Group){
 const g=new T.Group();g.position.set(0,H.balconyHeight,4.7);g.userData.landmark='organ-console';parent.add(g);
 const wood=0x583a24,trim=0x9d6c36;
 box(g,[3.6,.16,1.25],[0,.08,0],wood);box(g,[3.3,1.75,.15],[0,1.03,-.48],wood);
 for(const side of [-1,1]){box(g,[.22,1.85,1.18],[side*1.72,1,.05],wood);box(g,[.48,1.05,.14],[side*1.42,1.45,.42],trim);}
 box(g,[3.7,.17,1.25],[0,2,0],trim);box(g,[2.5,.65,.15],[0,.5,.4],wood);
 for(let level=0;level<3;level++){
  const manual=new T.Group();manual.position.set(0,1+level*.24,.47-level*.19);manual.userData.landmark='organ-manual';g.add(manual);
  box(manual,[2.35,.1,.44],[0,-.04,0],0x251e18);
  for(let i=0;i<36;i++){const x=(i-17.5)*.061;box(manual,[.058,.035,.35],[x,.025,.035],0xf2e5c9);if([0,1,3,4,5].includes(i%7)&&i<35)box(manual,[.035,.065,.22],[x+.0305,.063,-.03],0x191714);}
 }
 for(const side of [-1,1])for(let row=0;row<4;row++)for(let column=0;column<3;column++){
  const knob=sphere(g,.044,[side*(1.29+column*.115),1.15+row*.19,.55],0xe8dcc6);knob.userData.landmark='organ-stop';
 }
 const pedals=new T.Group();pedals.userData.landmark='organ-pedalboard';g.add(pedals);box(pedals,[2.45,.07,1.13],[0,.12,.72],0x302217);
 for(let i=0;i<25;i++){box(pedals,[.076,.05,1],[(i-12)*.092,.175,.72],0xbd8c4d);if([0,1,3,4,5].includes(i%7))box(pedals,[.055,.09,.42],[(i-11.5)*.092,.215,.43],0x49301d);}
 const bench=new T.Group();bench.userData.landmark='organ-bench';bench.position.z=1;g.add(bench);box(bench,[2.7,.13,.42],[0,.67,0],wood);for(const x of [-1.1,1.1])box(bench,[.12,.6,.3],[x,.3,0],wood);
 g.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){const c=(o.material as T.MeshLambertMaterial).color?.getHex();if([wood,trim,0xbd8c4d,0x49301d].includes(c))o.material=woodMaterial(c===wood||c===0x49301d?'walnut':'frame');}});
}

function wallPanel(g:T.Object3D,x:number,y:number,w:number,h:number,relief=true){
 const frame=new T.Group();frame.userData.landmark='wall-panel';g.add(frame);
 box(frame,[w,h,.12],[x,y,.16],0x874537);box(frame,[w-.16,h-.16,.14],[x,y,.24],P.gold);box(frame,[w-.32,h-.32,.15],[x,y,.33],0xe8dfc8);
 for(const side of [-1,1]){box(frame,[.035,h-.55,.04],[x+side*(w/2-.24),y,.43],P.light);box(frame,[w-.48,.035,.04],[x,y+side*(h/2-.24),.43],P.light);}
 if(relief&&w>=2.5&&h>=4.5)hallImage(frame,'relief',Math.min(w-.8,2.7),Math.min((w-.8)/2,1.35),x,y+h*.3,.435);
 frame.traverse(o=>{if(o instanceof T.Mesh)o.userData.fullDetail=true;});
}
function sideBayDetails(g:T.Object3D){
 // Narrow marble-red pilasters carry chased gold inlays, as in the 360 reference.
 for(const side of [-1,1]){
  const x=side*2.74;box(g,[.30,8.7,.18],[x,13.65,.28],0x9d6450);
  hallImage(g,'pilaster',.22,7.8,x,13.6,.405);
  hallImage(g,'pilaster',.32,6.5,x,23.2,.405);
  box(g,[.55,.23,.36],[x,18.05,.3],P.light);
  box(g,[.58,.18,.32],[x,9.15,.3],P.light);
 }
 // Door-top sculpture and circular portrait medallions replace the empty upper panel.
 for(const side of [-1,1]){const x=side*2.65;const medallion=cylinder(g,.43,.1,[x,16.55,.42],0xb17843);medallion.rotation.x=Math.PI/2;whiteFigure(g,x,16.45);}
 box(g,[5.85,.07,2.65],[0,7.98,1.45],P.deep);
 for(const x of [-2.78,0,2.78])box(g,[.12,.09,2.8],[x,7.91,1.46],P.gold);
 for(const z of [.12,2.8])box(g,[5.85,.09,.12],[0,7.91,z],P.light);
 const coffer=hallImage(g,'soffit',5.45,2.4,0,7.925,1.45);coffer.rotation.x=Math.PI/2;
 const lamp=sphere(g,.15,[0,7.73,2.2],0xffefd4);lamp.scale.y=.45;lamp.userData.fullDetail=true;
}
/** The shell is always present. Only protruding decoration may be cut away near the camera. */
export function buildHallShell(scene:T.Scene){
 const walls:T.Mesh[]=[];
 for(const side of [-1,1])walls.push(box(scene,[.4,H.height,H.rear-H.front],[side*16,H.height/2,(H.rear+H.front)/2],P.ivory));
 for(const z of [H.front,H.rear])walls.push(box(scene,[32,H.height,.4],[0,H.height/2,z],P.ivory));
 for(const wall of walls){wall.userData.landmark='hall-shell';wall.userData.fullDetail=true;}
 return walls;
}
function whiteFigure(g:T.Object3D,x:number,y:number){
 sphere(g,.18,[x,y+.38,.4],P.ivory);frustum(g,.16,.28,.63,[x,y-.04,.4],P.ivory);for(const sign of [-1,1]){line(g,new T.Vector3(x+sign*.16,y+.12,.4),new T.Vector3(x+sign*.52,y-.13,.4),.07,P.ivory);line(g,new T.Vector3(x,y-.3,.4),new T.Vector3(x+sign*.42,y-.42,.4),.1,P.ivory);}
}
function timberDoor(g:T.Object3D,x:number,bottom:number,width:number,height:number,z=.57,panels=3){
 const frame=new T.Group();frame.position.set(x,bottom,z);frame.userData.landmark='timber-door';frame.userData.doorBottom=bottom;g.add(frame);
 box(frame,[width+.36,height+.35,.18],[0,height/2,.02],P.ivory);
 const leaf=box(frame,[width,height,.18],[0,height/2,.15],P.wood);leaf.material=hallImageMaterial('walnut');
 for(const side of [-1,1])for(const row of panels===2?[.25,.75]:[.18,.5,.82]){
  const px=side*width*.245,py=height*row,w=width*.39,h=height*(panels===2?.43:.25);
  box(frame,[w,h,.06],[px,py,.27],0x32261d);
  const inset=box(frame,[w-.12,h-.12,.045],[px,py,.32],P.wood);inset.material=hallImageMaterial('walnut');
 }
 for(const side of [-1,1])cylinder(frame,.022,.26,[side*.10,height*.43,.40],P.light);
 return frame;
}
export const UPPER_DOOR={width:2.85,height:6.85,stoneWidth:3.65,header:7.25,pediment:7.85,apex:8.95} as const;
export function upperDoor(g:T.Object3D,y:number){
 // Balcony-level photography reveals the full tall door; the floor panorama hides its lower half.
 const root=new T.Group();root.userData.landmark='upper-door-surround';g.add(root);
 timberDoor(root,0,y,UPPER_DOOR.width,UPPER_DOOR.height,.46,2);
 // Stepped white architrave, with the outer ears turning around the top corners.
 for(const [x,width,height,yy,z]of [
  [-1.66,.16,7.25,3.50,.64],[1.66,.16,7.25,3.50,.64],
  [-1.80,.12,6.82,3.26,.66],[1.80,.12,6.82,3.26,.66],
  [0,3.65,.16,7.07,.67],[0,3.38,.12,6.83,.70],
  [-1.73,.30,.14,6.66,.69],[1.73,.30,.14,6.66,.69],
 ])box(root,[width,height,.12],[x,y+yy,z],P.ivory);
 box(root,[3.95,.40,.22],[0,y+UPPER_DOOR.header,.53],P.deep);
 hallImage(root,'scroll',3.74,.27,0,y+UPPER_DOOR.header,.66);
 cornice(root,4.15,y+7.56,.49);
 const triangle=new T.Shape();triangle.moveTo(-2.18,0);triangle.lineTo(0,1.10);triangle.lineTo(2.18,0);triangle.closePath();
 const pediment=new T.Mesh(new T.ExtrudeGeometry(triangle,{depth:.30,bevelEnabled:false}),material(0x70502c));pediment.position.set(0,y+UPPER_DOOR.pediment,.4);root.add(pediment);
 for(const side of [-1,1]){line(root,new T.Vector3(side*2.20,y+UPPER_DOOR.pediment,.76),new T.Vector3(0,y+UPPER_DOOR.apex,.76),.075,P.light);line(root,new T.Vector3(side*1.86,y+UPPER_DOOR.pediment+.13,.77),new T.Vector3(0,y+UPPER_DOOR.apex-.18,.77),.028,P.gold);}
 hallImage(root,'scroll',2.55,.30,0,y+8.15,.72);
 // Reclining architectural figures rest along the pediment, rather than hovering on the wall.
 for(const side of [-1,1]){
  const statue=new T.Group();statue.position.set(side*.83,y+8.82,.53);root.add(statue);
  const robe=frustum(statue,.18,.34,.68,[side*.14,.14,0],P.ivory);robe.rotation.z=side*.90;
  sphere(statue,.17,[-side*.10,.69,.03],P.ivory);
  line(statue,new T.Vector3(side*.1,.10,.04),new T.Vector3(side*.86,-.26,.06),.13,P.ivory);
  line(statue,new T.Vector3(-side*.04,.4,.06),new T.Vector3(-side*.36,.14,.15),.065,P.ivory);
 }
 return root;
}
const soffitLamp=new T.MeshLambertMaterial({color:0xffe7bd,emissive:0xffd9a0,emissiveIntensity:.9});
export function rearFacade(scene:T.Scene){
 const g=new T.Group();g.position.z=WALL_DATUM.rear;g.rotation.y=Math.PI;scene.add(g);g.userData.landmark='rear-facade';
 // Six glazed arches and plain framed fields; the original rear has no row of pedimented doors.
 for(const x of [-10,-6,-2,2,6,10]){const bay=new T.Group();bay.position.x=x;g.add(bay);archedWindow(bay,WALL_LEVELS.window);wallPanel(bay,0,14.1,3.75,8.1,false);}
 for(const x of [-14,14]){
  const wing=new T.Group();wing.position.x=x;g.add(wing);archedWindow(wing,WALL_LEVELS.window,true);
  box(wing,[2.7,5.7,.2],[0,H.balconyHeight+2.85,.28],P.ivory);box(wing,[2.15,5.25,.2],[0,H.balconyHeight+2.625,.4],0x39362e);
  for(const side of [-1,1])box(wing,[.12,5.5,.2],[side*1.25,H.balconyHeight+2.75,.55],P.light);
 }
 for(const x of [-13.5,13.5])wallPanel(g,x,3.65,3.3,6.9);
 // Dark timber Ionic columns carry the deep rear gallery front, as in the original; the stairs sit behind them.
 const front=WALL_DATUM.rear-REAR_COLUMNS.z;
 for(const x of REAR_COLUMNS.xs){
  const column=new T.Group();column.position.set(x,0,front);column.userData.landmark='rear-portico-column';g.add(column);
  cylinder(column,.49,.23,[0,.12,0],0x3e3025);cylinder(column,.40,.17,[0,.32,0],P.light);
  const shaft=cylinder(column,.30,6.55,[0,3.75,0],0x6e4029);shaft.material=hallImageMaterial('walnut');
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;cylinder(column,.014,6.45,[Math.cos(a)*.304,3.75,Math.sin(a)*.304],0x9a6a3f);}
  box(column,[1.05,.25,.8],[0,7.25,0],P.gold);
  for(const side of [-1,1]){const volute=cylinder(column,.16,.2,[side*.38,7.04,.28],P.gold);volute.rotation.x=Math.PI/2;}
 }
 // Gilded beam under the gallery front, and warm lamps in the shadowed standing area beneath.
 box(g,[25.4,.36,.9],[0,7.68,front],P.deep);box(g,[25.8,.14,1.05],[0,7.93,front+.05],P.light);
 hallImage(g,'scroll',24.5,.27,0,7.66,front+.47);
 for(const [z,xs]of [[2.2,[-10.5,-5.25,0,5.25,10.5]],[WALL_DATUM.rear-STAIR.z,[-5.25,0,5.25]]] as const)for(const x of xs){const lamp=sphere(g,.17,[x,7.82,z],0xffefd4);lamp.scale.y=.45;lamp.material=soffitLamp;}
 for(const x of [-7.4,0,7.4]){
  const door=timberDoor(g,x,.15,3.8,6.4,.35);
  const glass=new T.MeshLambertMaterial({color:0xb7a98a,emissive:0x756440,emissiveIntensity:.16});
  for(const side of [-1,1]){const pane=box(door,[1.28,4.7,.04],[side*.93,3.65,.375],0xb7a98a);pane.material=glass;box(door,[.055,4.8,.05],[side*.93,3.65,.405],P.wood).material=woodMaterial('walnut');box(door,[1.3,.075,.05],[side*.93,3.2,.405],P.wood).material=woodMaterial('walnut');}
  hallImage(g,'relief',3.8,.7,x,7.1,.65);
 }
 const rail=new T.Group();rail.position.set(0,H.balconyHeight,GALLERY_BRIDGE.minZ+.4);rail.rotation.y=Math.PI;scene.add(rail);balustrade(rail,25);
 // Only near-camera decoration cuts away; the structural hall shell remains solid.
 g.traverse(o=>{if(o instanceof T.Mesh){o.userData.cameraOccluder=true;o.userData.fullDetail=true;}});return g;
}
export function buildGoldenHall(scene:T.Scene){
 scene.userData.venue='musikverein-golden-hall';
 const cameraWalls:T.Object3D[]=buildHallShell(scene);
 const stage=box(scene,[STAGE.width,.75,STAGE.front-STAGE.back],[0,.3,(STAGE.front+STAGE.back)/2],0xa77343);applyWoodSurface(stage);stage.receiveShadow=true;
 // Fine lengthwise wood boards unify the stage and audience floor.
 for(let x=-15.5;x<16;x+=.5)box(scene,[.013,.008,H.rear-H.front],[x,.005,(H.rear+H.front)/2],0x8e683e);
 for(const side of [-1,1]){
  for(const z of H.bayCenters){const g=new T.Group();g.position.set(side*WALL_DATUM.halfWidth,0,z);g.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(g);
   box(g,[5.9,6.9,.16],[0,3.5,.08],P.ivory);box(g,[4.1,4.8,.12],[0,3.1,.2],0xc5a875);box(g,[3.7,4.4,.14],[0,3.1,.3],0xf0dfbb);
   for(const x of [-2.55,2.55]){const figure=new T.Group();figure.position.set(x,.45,.3);figure.scale.set(1,1.21,1);g.add(figure);caryatid(figure);}
   wallPanel(g,0,WALL_LEVELS.lowerPanelY,4.2,WALL_LEVELS.lowerPanelHeight,false);if([-18,6,30].includes(z))timberDoor(g,0,.12,3.35,5.85,.56);
   else {
    // Low timber box fronts and red woven hangings are visible in the original side-wall photograph.
    const front=box(g,[4.45,1.02,.15],[0,.95,.74],P.wood);front.material=woodMaterial('walnut');
    hallImage(g,'damask',4.22,.84,0,.95,.83);
    for(const yy of [.40,1.50])box(g,[4.65,.10,.25],[0,yy,.77],P.deep).material=woodMaterial('frame');
    for(const xx of [-2.3,2.3])box(g,[.10,1.1,.25],[xx,.95,.77],P.deep).material=woodMaterial('frame');
   }
   for(const span of galleryRailSpans(z)){const rail=new T.Group();rail.position.set(side*((span.start+span.end)/2-z),H.balconyHeight,WALL_DATUM.halfWidth-12.5-.4);rail.userData.landmark='gallery-rail';g.add(rail);balustrade(rail,span.end-span.start);}
   for(const x of [-2.85,2.85]){box(g,[.2,17,.2],[x,18.1,.2],0x9a5646);box(g,[.065,17,.1],[x,18.1,.34],P.light);}
   wallPanel(g,0,WALL_LEVELS.panelY,5.4,WALL_LEVELS.panelHeight,false);archedWindow(g,WALL_LEVELS.window);upperDoor(g,WALL_LEVELS.vent);sideBayDetails(g);
   g.traverse(o=>{if(o instanceof T.Mesh)o.userData.cameraOccluder=true;});
  }
  // The repeated bays stop short of both corners; finish those returns too.
  for(const [a,b]of [[WALL_DATUM.front,-27],[51,WALL_DATUM.rear]]){const end=new T.Group();end.position.set(side*WALL_DATUM.halfWidth,0,(a+b)/2);end.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(end);wallPanel(end,0,WALL_LEVELS.lowerPanelY,b-a,WALL_LEVELS.lowerPanelHeight);wallPanel(end,0,WALL_LEVELS.panelY,b-a,WALL_LEVELS.panelHeight);}
 }
 cameraWalls.push(...buildGalleryFloors(scene).filter(slab=>slab.userData.rearGallery));
 buildPerimeterCornices(scene);buildPerimeterFriezes(scene,friezeMaterial());
 buildFrontWindows(scene);buildOrgan(scene);paintedCeiling(scene);
 for(const x of [-7.4,7.4])for(const z of [-20,-7,6,19,32,45])crystalChandelier(scene,x,z);
 for(const z of [-22,4,30]){const light=new T.PointLight(0xffe3af,95,42,2);light.position.set(0,16,z);scene.add(light);}
 const stageLight=new T.SpotLight(0xffe4bd,300,42,1.05,.8,1.5);stageLight.position.set(0,18,-8);stageLight.target.position.set(0,1,-20);scene.add(stageLight,stageLight.target);
 rearFacade(scene);
 return {cameraWalls};
}
