import {rearWallPanel,rearWallInfill,rearPanelDecoration} from './RearWallPanels';
import {HALL_CELL_WIDTH} from '../../shared/lowerHall';
import {UPPER_CELLS,UPPER_DOOR_AXES,UPPER_PANEL_AXES,UPPER_WINDOW_AXES,UPPER_PILASTER_AXES} from '../../shared/upperHall';
import {buildLowerHallFacade} from './LowerHallFacade';
import {PARTERRE} from '../../shared/parterre';
import {buildParterreWell} from './ParterreWell';
import * as T from 'three';
import {buildHallPracticalLights,hallPanelSconce,hallDoorHeaderLight,hallFlatCeilingLight} from './HallLighting';
import {finishBuild} from './buildBudget';
import {wallWithOpenings,box,cylinder,sphere,line,text,material} from './primitives';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {STAGE,STAGE_FLOOR} from '../orchestra/layout';
import {crystalChandelier,paintedCeiling,friezeMaterial} from './HallDetails';
import {WALL_DATUM,WALL_LEVELS,buildPerimeterCornices,buildPerimeterFriezes} from './HallWallBands';
import {GALLERY_BRIDGE,GALLERY_RAIL_HEIGHT,REAR_COLUMNS,REAR_SCREENS,STAIR_DOORS,galleryRailSpans} from '../../shared/gallery';
import {ORGAN_LOFT_BACK,ORGAN_LOFT_CONTOUR,ORGAN_RAIL_JOIN_X,ORGAN_RAIL_JOIN_Z,ORGAN_RAIL_POST_HALF,organBalconyFront} from '../../shared/organLoft';
import {buildGalleryFloors} from './GalleryFloors';
import {hallImage,hallImageMaterial,woodMaterial,applyWoodSurface,entranceWoodMaterial} from './HallTextures';
export {organBalconyFront} from '../../shared/organLoft';
const P={ivory:0xe8d6ac,gold:0xc69b49,light:0xe7c77a,deep:0x8e622a,wood:0x945d30,red:0x6f2830,shadow:0x49351e,glass:0xc5d4ce};
const cylinderCache=new Map<string,T.BufferGeometry>();
function profile(top:number,bottom:number,height:number){const key=`${top}/${bottom}/${height}`;let g=cylinderCache.get(key);if(!g){g=new T.CylinderGeometry(top,bottom,height,12);cylinderCache.set(key,g);}return g;}
function frustum(parent:T.Object3D,top:number,bottom:number,h:number,pos:number[],color:number){const mesh=new T.Mesh(profile(top,bottom,h),material(color,.35));mesh.position.set(...pos as [number,number,number]);parent.add(mesh);return mesh;}
function cornice(g:T.Object3D,width:number,y:number,z:number,color:number=P.light){for(const [dy,depth,h]of [[0,.38,.13],[.18,.54,.18],[.38,.72,.12]])box(g,[width,h,depth],[0,y+dy,z],color);for(let x=-width/2+.12;x<width/2;x+=.36)box(g,[.13,.18,.25],[x,y-.16,z+.16],P.gold);}
function rosette(g:T.Object3D,x:number,y:number,z:number,size=.12){const center=sphere(g,size,[x,y,z],P.light);center.scale.z*=.45;for(let i=0;i<6;i++){const a=i/6*Math.PI*2;sphere(g,size*.62,[x+Math.cos(a)*size,y+Math.sin(a)*size,z],P.gold).scale.z*=.35;}}
function gildedColumn(g:T.Object3D,x:number,y:number,h:number,r=.27){
 cylinder(g,r*1.7,.18,[x,y+.09,.1],P.deep);cylinder(g,r*1.45,.17,[x,y+.25,.1],P.light);cylinder(g,r,h-.9,[x,y+h/2,.1],P.gold);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;cylinder(g,.012,h-1.1,[x+Math.cos(a)*r*1.01,y+h/2,.1+Math.sin(a)*r*1.01],P.light);}
 frustum(g,r*1.65,r*.95,.4,[x,y+h-.48,.1],P.light);box(g,[r*3.6,.18,r*3.6],[x,y+h-.16,.1],P.gold);
 for(const side of [-1,1])sphere(g,r*.45,[x+side*r*1.35,y+h-.35,.2],P.light);
}
function caryatid(g:T.Object3D,capital=true){
 // Repeated gilded figures supporting the first gallery, with draped robes.
 box(g,[1.05,.2,.8],[0,.1,.45],P.deep);box(g,[.82,.18,.67],[0,.29,.45],P.light);
 frustum(g,.24,.43,2.45,[0,1.7,.46],P.gold);frustum(g,.42,.26,1.05,[0,3.4,.45],P.gold);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;line(g,new T.Vector3(Math.cos(a)*.22,2.8,.46+Math.sin(a)*.22),new T.Vector3(Math.cos(a)*.38,.5,.46+Math.sin(a)*.38),.025,P.light);}
 sphere(g,.3,[0,4.24,.45],P.gold).scale.y*=1.3;sphere(g,.32,[0,4.38,.5],P.deep).scale.y*=.75;sphere(g,.075,[0,4.2,.74],P.light);
 for(const s of [-1,1]){line(g,new T.Vector3(s*.3,3.8,.45),new T.Vector3(s*.56,4.6,.4),.11,P.gold);line(g,new T.Vector3(s*.56,4.6,.4),new T.Vector3(s*.35,5.45,.3),.09,P.light);sphere(g,.11,[s*.35,5.45,.3],P.gold);}
 if(capital){box(g,[1.15,.17,.85],[0,5.67,.4],P.gold);box(g,[1.4,.18,1],[0,5.86,.4],P.light);}
}
const paneShape=new T.Shape();paneShape.moveTo(-1.1,0);paneShape.lineTo(1.1,0);paneShape.lineTo(1.1,4.45);paneShape.absarc(0,4.45,1.1,0,Math.PI,false);paneShape.lineTo(-1.1,0);
const paneGeometry=new T.ShapeGeometry(paneShape,20),archGeometry=new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return new T.Vector3(Math.cos(a)*1.23,Math.sin(a)*1.23,0);})),24,.09,6,false);
// Side and rear panes glow with daylight; the front row is blind and stays dark.
const glassMaterial=new T.MeshLambertMaterial({color:0xfff4dc,emissive:0xffe2b0,emissiveIntensity:.18});
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
let gildedFrieze:T.Material|null=null;
// Gallery fronts are gilded relief, as in the hall: the scroll frieze is tinted gold and framed in gold.
export function balustrade(g:T.Object3D,width:number,ornament:T.Material|null=(gildedFrieze??=(()=>{const m=friezeMaterial().clone() as T.MeshLambertMaterial;m.color.set(0xe2b866);return m;})()),posts=true){
 g.scale.y=GALLERY_RAIL_HEIGHT/1.58;
 box(g,[width,1.4,.22],[0,.78,.4],P.gold);box(g,[width,.12,.5],[0,.08,.43],P.gold);box(g,[width,.17,.42],[0,1.48,.45],P.gold);
 if(ornament){const count=Math.max(1,Math.ceil(width/2.1));for(let i=0;i<count;i++){const face=new T.Mesh(friezePlane,ornament);face.scale.set(width/count,1.14,1);face.position.set(-width/2+(i+.5)*width/count,.79,.525);g.add(face);}}
 if(posts)for(let x=-width/2;x<=width/2+.01;x+=2.4)box(g,[.075,1.25,.1],[x,.78,.55],P.light);
}
export const FRONT_WINDOW_AXES=[-13.3,-9.5,-5.7,-1.9,1.9,5.7,9.5,13.3] as const;
export function buildFrontWindows(scene:T.Scene){
 const row=new T.Group();row.position.z=WALL_DATUM.front;row.userData.landmark='front-window-row';scene.add(row);
 for(const x of FRONT_WINDOW_AXES){const bay=new T.Group();bay.position.x=x;bay.userData.landmark='front-window';row.add(bay);archedWindow(bay,WALL_LEVELS.window,true);}
}
export const ORGAN_CASE={width:23,back:ORGAN_LOFT_BACK,bankDepth:[.4,.44,.4],frameDepth:1.4,loftHeight:H.balconyHeight} as const;
function loftSlab(g:T.Group,thickness:number,y:number,inset=0){
 const outline=new T.Shape();outline.moveTo(-15.35,.05);outline.lineTo(15.35,.05);
 for(const p of [...ORGAN_LOFT_CONTOUR].reverse())outline.lineTo(p.x,p.z-inset);outline.closePath();
 const mesh=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:thickness,bevelEnabled:false,curveSegments:1}),material(P.light));mesh.rotation.x=Math.PI/2;mesh.position.y=y;mesh.userData.fullDetail=true;g.add(mesh);return mesh;
}
/** Shallow casework laid flat against the front wall, as in the hall; only the loft projects. */
export function buildOrgan(scene:T.Scene,ornament:T.Material=friezeMaterial()){
 const g=new T.Group();g.position.z=ORGAN_CASE.back;g.userData.landmark='pipe-organ';scene.add(g);
 const back=box(g,[ORGAN_CASE.width,13.3,.42],[0,16.1,-.05],P.gold);back.userData.landmark='organ-case-back';
 // Thirteen broad pipes in each field, as in the hall.
 const banks=[{x:-8.05,w:4.55,count:13},{x:0,w:4.7,count:13},{x:8.05,w:4.55,count:13}];
 banks.forEach(({x,w,count},bank)=>{
  const chamber=new T.Group();chamber.userData.landmark='organ-pipe-chamber';g.add(chamber);
  box(chamber,[w,8.55,.06],[x,17.22,.22],0x222722);
  // Recess floors and side returns remain visible from oblique views.
  box(chamber,[w,.22,.9],[x,12.95,.65],P.deep);box(chamber,[w,.25,.95],[x,21.65,.68],P.deep);
  for(const side of [-1,1])box(chamber,[.18,8.7,.9],[x+side*w/2,17.25,.65],P.gold);
  for(let i=0;i<count;i++){
   // The mouths form a V across the field (low in the middle); below them every pipe narrows into a long
   // conical foot that runs down to the common sill, so the feet gather in a fan, as in the hall.
   const u=i/(count-1)*2-1,xx=x+u*(w/2-.19),sill=13.06,bottom=13.75+1.7*Math.abs(u),top=21.5,r=Math.min(.16,w/count*.46),z=ORGAN_CASE.bankDepth[bank]+.1*(1-u*u),foot=bottom-sill;
   const pipe=cylinder(chamber,r,top-bottom,[xx,(top+bottom)/2,z],0xbec6c5);pipe.material=material(0x8f989c,.75,.38);pipe.userData.fullDetail=true;pipe.userData.organPipe=true;
   frustum(chamber,r,r*.28,foot,[xx,sill+foot/2,z],0x7f878a).userData.fullDetail=true;
   cylinder(chamber,r*1.08,.065,[xx,top,z],0xa9b0b2).userData.fullDetail=true;
   box(chamber,[r*1.6,.13,.045],[xx,bottom+.15,z+r],0x283131).userData.fullDetail=true;
   box(chamber,[r*1.8,.045,.06],[xx,bottom+.05,z+r+.015],0xe3e5d9).userData.fullDetail=true;
  }
 });
 // Between each pair of herms: a narrow cream panel in a red-brown frame, set in gilded casework.
 for(const x of [-4.125,4.125]){box(g,[1.8,12.5,1.2],[x,16.1,.7],P.gold);const panel=new T.Group();panel.position.set(x,0,1.32);g.add(panel);wallPanel(panel,0,16.5,1.15,9.6,false);}
 for(const x of [-10.85,-5.25,-3,3,5.25,10.85]){
  // Gilded herm pilasters between the pipe fields, as in the hall.
  const pier=box(g,[.72,12.5,1.2],[x,16.1,.7],P.gold);pier.userData.landmark='organ-case-pier';
  // A full-height gilded herm figure stands on each pedestal and carries the entablature, as in the photos.
  // Herm: a gilded half-figure on a shaft that tapers toward its carved pedestal.
  frustum(g,.36,.2,3.3,[x,14.65,1.75],P.gold);box(g,[.9,.3,.5],[x,13.05,1.75],P.gold);
  const figure=new T.Group();figure.position.set(x,16.3,1.45);figure.scale.set(.9,.93,.9);figure.userData.landmark='organ-herm';g.add(figure);caryatid(figure);
 }
 // The overhanging cornice and pediment have deep side faces, not a flat signboard.
 box(g,[23.8,.45,1.7],[0,22.05,.85],P.gold);box(g,[23.3,.2,1.5],[0,21.72,.75],P.gold);cornice(g,24,22.2,1.7,P.gold);
 // The frieze carries the society's name in gilt letters.
 if(typeof document!=='undefined')text(g,'GESELLSCHAFT DER MUSIKFREUNDE',7.6,[0,22.05,1.715],'#f3dc9c');
 // Below the pipes, as in the hall: a row of framed cream panels behind the console, leaving room above it,
 // then a projecting gilded ledge; the herm pedestals and the pipes stand on that ledge.
 box(g,[23.3,3.3,1.2],[0,9.95,.6],P.gold);
 {const herms=[-11.65,-10.85,-5.25,-3,3,5.25,10.85,11.65],low=new T.Group();low.position.set(0,0,1.04);g.add(low);
  for(let i=1;i<herms.length-2;i++){const a=herms[i],b=herms[i+1];wallPanel(low,(a+b)/2,9.95,b-a-.95,2.6,false);}
  // A gilded pilaster under every herm, so each upper column carries down to the loft floor.
  for(const x of herms.slice(1,-1)){box(g,[.75,3.3,1.45],[x,9.95,.72],P.gold);box(g,[.5,2.7,.06],[x,9.95,1.47],0xb0863e);box(g,[.95,.22,1.55],[x,8.42,.78],P.gold);}}
 box(g,[24,.32,2.3],[0,11.75,1.15],P.gold);box(g,[23.6,.16,2.1],[0,11.53,1.05],0xb0863e);box(g,[23.3,.5,1.5],[0,12.1,.75],P.gold);
 for(const x of [-10.85,-5.25,-3,3,5.25,10.85]){box(g,[1.05,1.1,1.6],[x,12.4,.8],P.gold);box(g,[.8,.75,.06],[x,12.4,1.62],0xb0863e);}
 const triangle=new T.Shape();triangle.moveTo(-9.5,0);triangle.lineTo(0,2.25);triangle.lineTo(9.5,0);triangle.closePath();
 const pediment=new T.Mesh(new T.ExtrudeGeometry(triangle,{depth:3.35,bevelEnabled:false}),material(P.gold));pediment.position.set(0,22.85,.45);pediment.scale.z=1.25/3.35;pediment.userData.landmark='organ-pediment';g.add(pediment);
 const tympanum=new T.Shape();tympanum.moveTo(-7.9,.25);tympanum.lineTo(0,1.88);tympanum.lineTo(7.9,.25);tympanum.closePath();const inset=new T.Mesh(new T.ExtrudeGeometry(tympanum,{depth:.08,bevelEnabled:false}),material(0xb79050));inset.position.set(0,22.85,1.72);g.add(inset);
 for(const side of [-1,1]){line(g,new T.Vector3(side*9.65,22.86,1.86),new T.Vector3(0,25.18,1.86),.12,P.gold);line(g,new T.Vector3(side*8.0,23.1,1.88),new T.Vector3(0,24.78,1.88),.05,0xb0863e);}
 rosette(g,0,23.72,1.92,.3);
 for(const x of [-8,-5,0,5,8]){const y=23.15+(x===0?2.15:.28),figure=new T.Group();figure.position.set(x,y,1.3);figure.scale.setScalar(1.7);g.add(figure);sphere(figure,.2,[0,.45,0],P.ivory);frustum(figure,.16,.34,.65,[0,0,0],P.ivory);for(const side of [-1,1])line(figure,new T.Vector3(side*.15,.15,0),new T.Vector3(side*.48,-.05,.04),.065,P.ivory);}
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
 const g=new T.Group();g.position.set(0,H.balconyHeight,2.25);g.userData.landmark='organ-console';parent.add(g);
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
/** Independent layers interlock: a pair of windows spans each door, with one pier per gap. */
function buildUpperSideFacade(scene:T.Scene,side:number){
 const root=new T.Group();root.position.x=side*WALL_DATUM.halfWidth;root.rotation.y=side<0?Math.PI/2:-Math.PI/2;root.userData.landmark='upper-side-facade';scene.add(root);
 const bay=(z:number,kind:string)=>{const g=new T.Group();g.position.x=side*z;g.userData.landmark=kind;g.userData.axisZ=z;root.add(g);return g;};
 // The second storey has pale wall fields and fine mouldings, without the old dark ornamental pilasters.
 const plaster=box(root,[78.8,9.95,.10],[side*12.4,13.425,.09],0xe8dfc8);plaster.userData.smoothStone=true;
 for(const z of UPPER_DOOR_AXES)upperDoor(bay(z,'second-floor-door-axis'),WALL_LEVELS.vent);
 for(const z of UPPER_PANEL_AXES)upperDecoratedPanel(bay(z,'second-floor-wall-axis'),WALL_LEVELS.vent);
 for(const z of UPPER_WINDOW_AXES)archedWindow(bay(z,'third-floor-window-axis'),WALL_LEVELS.window);
 for(const z of UPPER_PILASTER_AXES){
  const g=bay(z,'third-floor-single-pilaster');
  box(g,[.50,6.9,.18],[0,23.2,.28],0x7a3a2c);
  hallImage(g,'pilaster',.38,6.5,0,23.2,.405);
  for(const y of [19.82,26.58])box(g,[.58,.18,.36],[0,y,.3],P.gold);
 }
 root.traverse(o=>{if(o instanceof T.Mesh){o.userData.cameraOccluder=true;o.userData.fullDetail=true;}});
}
/** The shell is always present. Only protruding decoration may be cut away near the camera. */
export function buildHallShell(scene:T.Scene){
 const walls:T.Mesh[]=[];
 for(const side of [-1,1])walls.push(box(scene,[.4,H.height,H.rear-H.front],[side*16,H.height/2,(H.rear+H.front)/2],P.ivory));
 walls.push(box(scene,[32,H.height,.4],[0,H.height/2,H.front],P.ivory));
 // The rear wall is open at the four stair doors, so the corridor stairs can be seen through them.
 walls.push(...wallWithOpenings(scene,-16,16,0,H.height,H.rear,.4,P.ivory,[]));// Stair doors are closed: the rear wall stays solid.
 for(const wall of walls){wall.userData.landmark='hall-shell';wall.userData.fullDetail=true;}
 return walls;
}
function whiteFigure(g:T.Object3D,x:number,y:number){
 sphere(g,.18,[x,y+.38,.4],P.ivory);frustum(g,.16,.28,.63,[x,y-.04,.4],P.ivory);for(const sign of [-1,1]){line(g,new T.Vector3(x+sign*.16,y+.12,.4),new T.Vector3(x+sign*.52,y-.13,.4),.07,P.ivory);line(g,new T.Vector3(x,y-.3,.4),new T.Vector3(x+sign*.42,y-.42,.4),.1,P.ivory);}
}
/** Stair doors stand open: both leaves swing into the hall and the doorway glows with the lamplit corridor beyond. */
const corridorGlow=new T.MeshLambertMaterial({color:0x3a2918,emissive:0x8a6232,emissiveIntensity:.45});
function openLeaves(frame:T.Object3D,width:number,height:number,z:number){
 for(const side of [-1,1]){const hinge=new T.Group();hinge.position.set(side*width/2,0,z);hinge.rotation.y=side*1.62;hinge.userData.landmark='open-door-leaf';frame.add(hinge);
  const leaf=box(hinge,[width/2-.03,height,.1],[-side*width/4,height/2,0],P.wood);leaf.material=entranceWoodMaterial();
  for(const row of [.25,.62])box(hinge,[width*.3,height*.3,.04],[-side*width/4,height*row,.07],0x32261d);
 }
}
/** Ivory surround with reveals through the wall, leaving the doorway itself open. */
function doorFrame(frame:T.Object3D,width:number,height:number,z:number,depth:number){
 for(const side of [-1,1]){box(frame,[.18,height+.35,depth],[side*(width/2+.09),(height+.35)/2,z],P.ivory);box(frame,[.06,height,.7],[side*(width/2-.03),height/2,z-.3],P.ivory);}
 box(frame,[width+.36,.35,depth],[0,height+.175,z],P.ivory);box(frame,[width,.06,.7],[0,height-.03,z-.3],P.ivory);
 box(frame,[width,.04,.8],[0,-.13,z-.3],0x5a3d28);
}
export function openDoor(g:T.Object3D,x:number,bottom:number,width:number,height:number,z=.57){
 const frame=new T.Group();frame.position.set(x,bottom,z);frame.userData.landmark='timber-door';frame.userData.doorBottom=bottom;frame.userData.open=true;g.add(frame);
 doorFrame(frame,width,height,.02,.18);
 openLeaves(frame,width,height,.16);return frame;
}
export function timberDoor(g:T.Object3D,x:number,bottom:number,width:number,height:number,z=.57,panels=3){
 const frame=new T.Group();frame.position.set(x,bottom,z);frame.userData.landmark='timber-door';frame.userData.doorBottom=bottom;g.add(frame);
 box(frame,[width+.36,height+.35,.18],[0,height/2,.02],P.ivory);
 const leaf=box(frame,[width,height,.18],[0,height/2,.15],P.wood);leaf.material=entranceWoodMaterial();
 for(const side of [-1,1])for(const row of panels===2?[.25,.75]:[.18,.5,.82]){
  const px=side*width*.245,py=height*row,w=width*.39,h=height*(panels===2?.43:.25);
  box(frame,[w,h,.06],[px,py,.27],0x32261d);
  const inset=box(frame,[w-.12,h-.12,.045],[px,py,.32],P.wood);inset.material=entranceWoodMaterial();
 }
 hallDoorHeaderLight(frame,height+.18);
 for(const side of [-1,1]){const handle=cylinder(frame,.032,.30,[side*.10,height*.43,.40],P.light);handle.userData.essentialDetail=true;handle.userData.fullDetail=true;handle.userData.landmark='door-handle';}
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
 root.traverse(o=>{o.userData.fullDetail=true;});return root;
}
/** Narrow inter-door field rebuilt at its final width; fixtures and portraits retain natural proportions. */
export function upperDecoratedPanel(g:T.Object3D,y:number){
 const root=new T.Group();root.position.y=y;root.userData.landmark='upper-decorated-panel';g.add(root);
 const width=2.10,edge=.12,spine=.12,fieldWidth=(width-2*edge-spine)/2;
 box(root,[width,7.1,.12],[0,3.55,.48],0x874537);
 for(const side of [-1,1]){
  const x=side*(spine+fieldWidth)/2,field=box(root,[fieldWidth,6.66,.06],[x,3.55,.58],0xe8dfc8);field.userData.landmark='ivory-panel-field';field.userData.smoothStone=true;
  for(const xx of [x-fieldWidth/2+.035,x+fieldWidth/2-.035])box(root,[.025,6.60,.03],[xx,3.55,.64],P.gold);
  for(const yy of [.25,6.85])box(root,[fieldWidth-.07,.025,.03],[x,yy,.64],P.gold);
 }
 box(root,[spine,6.96,.10],[0,3.55,.61],P.gold);
 // The brass lamp keeps its circular body and its original depth.
 hallPanelSconce(root,0,3.65,.72,width-.12);
 for(const [w,yy,depth]of [[width+.08,7.12,.26],[width+.18,7.28,.32],[width+.06,7.40,.23]])box(root,[w,.13,depth],[0,yy,.54],P.gold);
 const cameo=new T.Group();cameo.position.set(0,8.0,.56);cameo.userData.landmark='panel-portrait-medallion';root.add(cameo);
 for(const [radius,depth,color,z]of [[.43,.10,0x874537,0],[.37,.06,0xc69b49,.08],[.325,.045,0xd7c9aa,.13]]){const disc=cylinder(cameo,radius,depth,[0,0,z],color);disc.rotation.x=Math.PI/2;}
 sphere(cameo,.17,[0,.075,.23],P.ivory).scale.set(.12,.16,.075);sphere(cameo,.03,[.11,.08,.28],P.ivory);
 cylinder(cameo,.055,.11,[0,-.10,.24],P.ivory);sphere(cameo,.20,[0,-.20,.21],P.ivory).scale.set(.20,.09,.065);
 // Short garlands fit the available shoulders instead of compressing a broad ornament.
 for(const side of [-1,1]){
  const points=[new T.Vector3(side*.40,7.82,.68),new T.Vector3(side*.67,7.56,.68),new T.Vector3(side*.99,7.51,.68)];
  root.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.030,6,false),material(P.gold,.6)));
  for(let i=0;i<3;i++){const x=side*(.53+i*.17);const leaf=sphere(root,.07,[x,7.64-i*.045,.72],P.light);leaf.scale.set(.075,.035,.025);leaf.rotation.z=side*.45;}
 }
 root.traverse(o=>{o.userData.fullDetail=true;});return root;
}
export function rearFacade(scene:T.Scene){
 const g=new T.Group();g.position.z=WALL_DATUM.rear;g.rotation.y=Math.PI;scene.add(g);g.userData.landmark='rear-facade';
 // Six glazed arches and plain framed fields; the original rear has no row of pedimented doors.
 for(const x of [-10,-6,-2,2,6,10]){const bay=new T.Group();bay.position.x=x;g.add(bay);archedWindow(bay,WALL_LEVELS.window);wallPanel(bay,0,WALL_LEVELS.panelY,3.75,WALL_LEVELS.panelHeight,false);rearPanelDecoration(bay,3.75,WALL_LEVELS.panelHeight,WALL_LEVELS.panelY-WALL_LEVELS.panelHeight/2,.46);}
 // The same red-brown pilaster strips as the side bays, at the same heights, so both walls share one rhythm.
 for(const x of [-12,-8,-4,0,4,8,12]){box(g,[.2,17,.2],[x,18.1,.2],0x9a5646);box(g,[.065,17,.1],[x,18.1,.34],P.light);}
 for(const x of [-14,14]){
  const wing=new T.Group();wing.position.x=x;g.add(wing);archedWindow(wing,WALL_LEVELS.window,true);
  timberDoor(wing,0,H.balconyHeight,2.15,5.25,.5,2);// Closed: the galleries are reached from the floor menu.
  for(const side of [-1,1])box(wing,[.12,5.5,.2],[side*1.25,H.balconyHeight+2.75,.55],P.light);
 }
 // Fill the two rear blank fields with the same cream panels and red piers as the rear screens.
 const doorX=STAIR_DOORS.lower.x;
 for(const side of [-1,1]){
  const bay=new T.Group();bay.position.x=side*6.45;bay.userData.landmark='rear-panelled-infill';g.add(bay);rearWallPanel(bay,6.6);
 }
 for(const side of [-1,1])for(const x of [side*2.45,side*10.15]){
  box(g,[.62,7.25,.15],[x,3.7,.22],P.wood).material=woodMaterial('wall-panel');
  for(const xx of [x-.25,x+.25])box(g,[.035,7.05,.06],[xx,3.7,.33],P.gold);
 }
 box(g,[31.2,.12,.14],[0,7.65,.15],P.gold);
 // Dark timber Ionic columns carry the deep rear gallery front, as in the original.
 const front=WALL_DATUM.rear-REAR_COLUMNS.z;
 for(const x of REAR_COLUMNS.xs){
  const column=new T.Group();column.position.set(x,0,front);column.userData.landmark='rear-portico-column';g.add(column);
  cylinder(column,.49,.23,[0,.12,0],0x3e3025);cylinder(column,.40,.17,[0,.32,0],P.light);
  const shaft=cylinder(column,.30,6.55,[0,3.75,0],0x6e4029);shaft.material=woodMaterial('walnut');
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;cylinder(column,.014,6.45,[Math.cos(a)*.304,3.75,Math.sin(a)*.304],0x9a6a3f);}
  box(column,[1.05,.25,.8],[0,7.25,0],P.gold);
  for(const side of [-1,1]){const volute=cylinder(column,.16,.2,[side*.38,7.04,.28],P.gold);volute.rotation.x=Math.PI/2;}
  // Hidden only while it stands between the camera and the visitor.
  column.userData.occluderGroup=true;
 }
 // Gilded beam under the gallery front, and warm lamps in the shadowed standing area beneath.
 for(const [z,xs]of [[2.2,[-10.5,-5.25,0,5.25,10.5]],[WALL_DATUM.rear-46,[-5.25,0,5.25]]] as const)for(const x of xs)hallFlatCeilingLight(g,x,7.86,z);
 // The two side doors are closed; the centre door is the foyer entrance.
 for(const x of [-doorX,doorX]){timberDoor(g,x,.15,3.8,6.4,.35);hallImage(g,'relief',3.8,.7,x,7.1,.65);}
 for(const x of [0]){
  const door=timberDoor(g,x,.15,3.8,6.4,.35);
  door.userData.rearMainDoor=true;door.traverse(o=>{o.userData.fullDetail=true;});
  box(g,[3.9,.72,.08],[x,7.1,.65],P.light);box(g,[3.72,.55,.05],[x,7.1,.71],0x32261d);if(typeof document!=='undefined')text(g,'pleee lobby',3.2,[x,7.1,.75],'#e7c77a');
 }
 const rail=new T.Group();rail.position.set(0,H.balconyHeight,GALLERY_BRIDGE.minZ+.4);rail.rotation.y=Math.PI;scene.add(rail);balustrade(rail,25);
 // Only near-camera decoration cuts away; the structural hall shell remains solid.
 g.traverse(o=>{if(o instanceof T.Mesh){if(!Array.isArray(o.material)&&(o.material.userData.woodTone&&o.material.userData.woodTone!=='door'||o.material instanceof T.MeshLambertMaterial&&[0x3a281c,0x7a5634,0x2c1f16,0x9a6a3f,0x3e3025].includes(o.material.color.getHex())))o.material=woodMaterial('wall-panel');o.userData.cameraOccluder=true;o.userData.fullDetail=true;}});return g;
}
/** The parterre-level bay of the side walls: panelled field between two caryatids, with a door or a low box front. */
/** Short walls closing the outer rear bays, as in the original: pale panelled faces with a marble pilaster at the inner end. */
function rearScreens(scene:T.Scene){
 const r=REAR_SCREENS,walls:T.Mesh[]=[],width=r.outerX-r.innerX,top=r.height-.5;
 for(const side of [-1,1]){
  const g=new T.Group();g.userData.landmark='rear-screen';scene.add(g);const X=(x:number)=>side*x,mid=X((r.innerX+r.outerX)/2),face=r.z-r.thickness/2;
  // As in the original: a plain cream field framed by red-brown marble pilasters, under a dark entablature.
  walls.push(box(g,[width,r.height,r.thickness],[mid,r.height/2,r.z],0xeadfc4));
  const pilaster=(x:number,w:number)=>{
   box(g,[w,top-.35,.12],[X(x),.35+(top-.35)/2,face-.06],0x6e3326);
   box(g,[w-.28,top-.75,.05],[X(x),.35+(top-.35)/2,face-.14],0xb3705d).userData.landmark='rear-screen-marble';
   box(g,[w+.12,.35,.2],[X(x),.175,face-.1],0x3e3025);box(g,[w+.14,.16,.18],[X(x),top-.08,face-.09],P.gold);
  };
  pilaster(r.innerX+.45,.9);pilaster(r.outerX-.45,.9);
  const ornament=new T.Group();ornament.position.set(mid,0,face-.015);ornament.rotation.y=Math.PI;g.add(ornament);rearPanelDecoration(ornament,width-1.8);
  // The return is visible from the rear landing too; decorate the existing wall's back face only.
  const back=new T.Group();back.position.set(mid,0,r.z+r.thickness/2+.015);g.add(back);rearWallInfill(back,width);
  // Existing side-wall faces on either side of the screen; no new blocking volumes.
  for(const [a,b]of [[PARTERRE.stairFront,r.z-r.thickness/2],[r.z+r.thickness/2,WALL_DATUM.rear]]){
   const end=new T.Group();end.position.set(side*WALL_DATUM.halfWidth,0,(a+b)/2);end.rotation.y=side<0?Math.PI/2:-Math.PI/2;g.add(end);rearWallInfill(end,b-a-.10);
  }
  // Plain moulded wall fields replace the wall-mounted red hangings.
  for(const xx of [mid-(width-1.8)/2,mid+(width-1.8)/2])box(g,[.06,5.8,.08],[xx,3.4,face-.12],P.gold);
  for(const yy of [.5,6.3])box(g,[width-1.8,.06,.08],[mid,yy,face-.12],P.gold);


 }
 return walls;
}
/**
 * The side walls' gilded cornice (same three profiles and dentils, at the same height) continues across the rear,
 * along the face of the corner screens and the beam over the colonnade, so it meets the side cornice in each corner.
 */
function rearCornice(scene:T.Scene){
 const g=new T.Group();g.userData.landmark='rear-cornice';scene.add(g);
 const y=WALL_LEVELS.cornices[0],face=REAR_SCREENS.z-REAR_SCREENS.thickness/2,width=2*WALL_DATUM.halfWidth;
 // A plain beam carries the cornice over the open colonnade, flush with the screens' face.
 box(g,[2*REAR_SCREENS.innerX,.75,REAR_SCREENS.thickness],[0,y+.25,REAR_SCREENS.z],0xeadfc4);
 for(const [dy,h,d]of [[0,.13,.44],[.18,.18,.52],[.38,.12,.61]])box(g,[width,h,d],[0,y+dy+h/2,face-d/2],0xe7c77a).userData.fullDetail=true;
 for(let x=-width/2+.41+.18;x<width/2-.41;x+=.36)box(g,[.13,.18,.25],[x,y-.16,face-.41+.125],0xc69b49);
 // The side galleries' stepped white edge continues across the rear: the railing's light base line stays visible,
 // then the white slab band, then a thin light lip, with the gold cornice below.
 // Its top stays just under the gallery floor so the two never share a plane (that flickered).
 const edge=box(g,[width,.32,.57],[0,8.125,43.235],0xe8d6ac);edge.userData.landmark='rear-gallery-edge';
 box(g,[width,.09,.64],[0,7.925,43.2],P.light);
}
export function buildGoldenHall(scene:T.Scene){return finishBuild(buildGoldenHallSteps(scene));}
export function* buildGoldenHallSteps(scene:T.Scene){
 scene.userData.venue='musikverein-golden-hall';
 const cameraWalls:T.Object3D[]=buildHallShell(scene);
 const stage=box(scene,[STAGE.width,STAGE_FLOOR-PARTERRE.floor+.075,STAGE.front-STAGE.back],[0,(STAGE_FLOOR+PARTERRE.floor-.075)/2,(STAGE.front+STAGE.back)/2],0xa77343);stage.material=woodMaterial('stage-side');applyWoodSurface(stage,'stage-top',true);stage.receiveShadow=true;
 buildParterreWell(scene);
 // Straight oak boards on stage contrast with the audience's herringbone parquet.
 // Floor board joints are part of the shared timber texture; no coplanar strips.
 for(const side of [-1,1]){
  buildLowerHallFacade(scene,side,timberDoor);
  buildUpperSideFacade(scene,side);
  for(const {center:z} of UPPER_CELLS){const g=new T.Group();g.position.set(side*WALL_DATUM.halfWidth,0,z);g.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(g);
   for(const span of galleryRailSpans(z,HALL_CELL_WIDTH)){const rail=new T.Group();rail.position.set(side*((span.start+span.end)/2-z),H.balconyHeight,WALL_DATUM.halfWidth-12.5-.4);rail.userData.landmark='gallery-rail';g.add(rail);balustrade(rail,span.end-span.start);}
   // Keep the continuous gallery rail and soffit independent of the facade rhythm.
   const coffer=hallImage(g,'soffit',HALL_CELL_WIDTH-.02,2.4,0,7.90,1.45);coffer.rotation.x=Math.PI/2;
   for(const x of [-HALL_CELL_WIDTH/4,HALL_CELL_WIDTH/4])hallFlatCeilingLight(g,x,7.86,1.45);
   g.traverse(o=>{if(o instanceof T.Mesh)o.userData.cameraOccluder=true;});yield;
  }
  // Corner infill keeps the guardrail connected to the organ without stretching a full cell.
  for(const [a,b]of [[-27,UPPER_CELLS[0].start],[UPPER_CELLS.at(-1)!.end,51.8]]){
   for(const span of galleryRailSpans((a+b)/2,b-a)){
    const rail=new T.Group();rail.position.set(side*(12.5+.4),H.balconyHeight,(span.start+span.end)/2);rail.rotation.y=side<0?Math.PI/2:-Math.PI/2;rail.userData.landmark='gallery-rail-corner-infill';scene.add(rail);balustrade(rail,span.end-span.start);
   }
  }
  // The repeated bays stop short of both corners; finish those returns too.
  for(const [a,b]of [[WALL_DATUM.front,-27],[51,WALL_DATUM.rear]]){const end=new T.Group();end.position.set(side*WALL_DATUM.halfWidth,0,(a+b)/2);end.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(end);wallPanel(end,0,WALL_LEVELS.panelY,b-a,WALL_LEVELS.panelHeight);}
 }
 cameraWalls.push(...buildGalleryFloors(scene).filter(slab=>slab.userData.rearGallery));
 cameraWalls.push(...rearScreens(scene));rearCornice(scene);
 buildPerimeterCornices(scene);buildPerimeterFriezes(scene,friezeMaterial());
 buildFrontWindows(scene);yield;buildOrgan(scene);yield;paintedCeiling(scene);yield;
 for(const x of [-7.4,7.4])for(const z of [-20,-7,6,19,32,45]){crystalChandelier(scene,x,z);yield;}
 buildHallPracticalLights(scene);
 const stageLight=new T.SpotLight(0xffd5a4,185,42,1.05,.8,1.5);stageLight.position.set(0,18,-8);stageLight.target.position.set(0,1,-20);scene.add(stageLight,stageLight.target);
 rearFacade(scene);
 // Finish even the small rear-wall mouldings and timber returns with the shared grain.
 const timberColors=new Set([0x945d30,0x49351e,0x4a3324,0x3a281c,0x7a5634,0x2c1f16,0x6e4029,0x9a6a3f,0x3e3025]);
 scene.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material instanceof T.MeshLambertMaterial&&!o.material.map&&timberColors.has(o.material.color.getHex()))o.material=woodMaterial('walnut');});
 return {cameraWalls};
}
