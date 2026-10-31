import * as T from 'three';
import {box,cylinder,sphere,line,text,material} from './primitives';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {STAGE} from '../orchestra/layout';
import {crystalChandelier,paintedCeiling,friezeMaterial} from './HallDetails';
import {WALL_DATUM,WALL_LEVELS,buildPerimeterCornices,buildPerimeterFriezes} from './HallWallBands';
import {GALLERY_BRIDGE,GALLERY_FLOORS,GALLERY_RAIL_HEIGHT,galleryRailSpans} from '../../shared/gallery';
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
const paneShape=new T.Shape();paneShape.moveTo(-1.1,0);paneShape.lineTo(1.1,0);paneShape.lineTo(1.1,5.2);paneShape.absarc(0,5.2,1.1,0,Math.PI,false);paneShape.lineTo(-1.1,0);
const paneGeometry=new T.ShapeGeometry(paneShape,20),archGeometry=new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return new T.Vector3(Math.cos(a)*1.23,Math.sin(a)*1.23,0);})),24,.09,6,false);
const glassMaterial=new T.MeshLambertMaterial({color:0x9bafb8,emissive:0x344953,emissiveIntensity:.08});
const friezePlane=new T.PlaneGeometry(1,1);
function archedWindow(g:T.Object3D,y:number,blind=false){
 const parent=g;g=new T.Group();parent.add(g);
 const pane=new T.Mesh(paneGeometry,blind?material(0xcebc98):glassMaterial);pane.position.set(0,y,.14);g.add(pane);
 for(const x of [-1.23,1.23])box(g,[.14,5.3,.18],[x,y+2.6,.24],P.ivory);
 const arch=new T.Mesh(archGeometry,material(P.ivory,.3));arch.position.set(0,y+5.2,.25);g.add(arch);
 box(g,[2.8,.22,.4],[0,y,.2],P.gold);
 if(!blind){box(g,[.07,5.9,.06],[0,y+2.95,.19],0x303334);for(const yy of [1.9,3.8,5.1])box(g,[2.2,.07,.06],[0,y+yy,.2],0x303334);}
 else{for(const x of [-1.38,1.38])box(g,[.09,5.35,.1],[x,y+2.6,.18],0x874537);const rim=new T.Mesh(archGeometry,material(0x874537));rim.position.set(0,y+5.2,.14);rim.scale.set(1.12,1.12,1);g.add(rim);}
 g.traverse(o=>{if(o instanceof T.Mesh)o.userData.fullDetail=true;});
}
function balustrade(g:T.Object3D,width:number,ornament:T.Material|null=friezeMaterial(),posts=true){
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
export const ORGAN_CASE={width:23,back:WALL_DATUM.front+.12,bankDepth:[1.3,1.85,1.3],frameDepth:3.3,loftHeight:H.balconyHeight} as const;
export function organBalconyFront(x:number){return 3.1+1.65*(1-(x/15.35)**2)+.65*Math.exp(-((x/5.5)**2));}
function loftSlab(g:T.Group,thickness:number,y:number,inset=0){
 const outline=new T.Shape();outline.moveTo(-15.35,.05);outline.lineTo(15.35,.05);
 for(let i=0;i<=64;i++){const x=15.35-i/64*30.7;outline.lineTo(x,organBalconyFront(x)-inset);}outline.closePath();
 const mesh=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:thickness,bevelEnabled:false,curveSegments:1}),material(P.light));mesh.rotation.x=Math.PI/2;mesh.position.y=y;mesh.userData.fullDetail=true;g.add(mesh);return mesh;
}
/** Deep, freestanding casework over a real projecting organ loft. */
export function buildOrgan(scene:T.Scene,ornament:T.Material=friezeMaterial()){
 const g=new T.Group();g.position.z=ORGAN_CASE.back;g.userData.landmark='pipe-organ';scene.add(g);
 const back=box(g,[ORGAN_CASE.width,13.3,.42],[0,16.1,.28],0xb39b72);back.userData.landmark='organ-case-back';
 const banks=[{x:-7.15,w:5.9,count:19},{x:0,w:5.4,count:25},{x:7.15,w:5.9,count:19}];
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
 for(const x of [-10.85,-3.55,3.55,10.85]){
  box(g,[1.14,12.5,3.05],[x,16.1,1.72],P.ivory);
  for(const side of [-1,1])box(g,[.09,12.35,.15],[x+side*.53,16.1,3.29],0x874537);
  const column=new T.Group();column.position.z=ORGAN_CASE.frameDepth;g.add(column);gildedColumn(column,x,9.8,12.7,.28);
  const figure=new T.Group();figure.position.set(x,15.4,3.45);figure.scale.set(.62,.85,.5);g.add(figure);caryatid(figure);
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
 const floor=loftSlab(g,.32,H.balconyHeight);floor.userData.landmark='organ-loft-floor';floor.material=material(0xc39a59);
 const apron=loftSlab(g,.18,H.balconyHeight-.32,-.10);apron.userData.landmark='organ-loft-apron';apron.material=material(P.gold);
 for(let i=0;i<40;i++){
  const x0=-15.35+i/40*30.7,x1=-15.35+(i+1)/40*30.7,a=new T.Vector3(x0,H.balconyHeight,organBalconyFront(x0)),b=new T.Vector3(x1,H.balconyHeight,organBalconyFront(x1)),segment=new T.Group();
  const angle=-Math.atan2(b.z-a.z,b.x-a.x);segment.rotation.y=angle;segment.position.copy(a).add(b).multiplyScalar(.5).add(new T.Vector3(-Math.sin(angle)*.525,0,-Math.cos(angle)*.525));segment.userData.landmark='organ-loft-rail';g.add(segment);balustrade(segment,a.distanceTo(b)+.015,null,false);segment.scale.y=1.35/1.58;
 }
 // One continuous UV strip preserves the scroll pattern around the curved
 // balcony; repeating a complete motif on every little segment compressed it.
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];let arc=0,previous:T.Vector2|undefined;
 for(let i=0;i<=80;i++){const x=-15.35+i/80*30.7,z=organBalconyFront(x)+.012,p=new T.Vector2(x,z);if(previous)arc+=p.distanceTo(previous);previous=p;for(const y of [H.balconyHeight+.17,H.balconyHeight+1.15])positions.push(x,y,z);uv.push(arc/3.6,0,arc/3.6,1);if(i<80){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
 const strip=new T.BufferGeometry();strip.setAttribute('position',new T.Float32BufferAttribute(positions,3));strip.setAttribute('uv',new T.Float32BufferAttribute(uv,2));strip.setIndex(indices);strip.computeVertexNormals();const frieze=new T.Mesh(strip,ornament);frieze.userData.fullDetail=true;g.add(frieze);
 for(const x of [-15.35,-12,-8,-4,0,4,8,12,15.35])box(g,[.1,1.12,.09],[x,H.balconyHeight+.66,organBalconyFront(x)+.03],P.light);
 for(const x of [-13,-7,0,7,13]){const z=organBalconyFront(x)-.55;box(g,[.42,.75,1.05],[x,H.balconyHeight-.75,z-.3],P.deep);box(g,[.68,.2,1.15],[x,H.balconyHeight-.48,z-.3],P.light);}
 // A real console sits on the open floor between the case and the bowed rail.
 box(g,[2.6,.85,.65],[0,H.balconyHeight+.43,3.95],0x513520);box(g,[2.35,.12,.55],[0,H.balconyHeight+.93,4.18],0x28231c);
 for(let i=0;i<22;i++)box(g,[.09,.035,.33],[-1.03+i*.098,H.balconyHeight+1.02,4.23],0xe8dfcd);
 for(const x of [-12,-6,0,6,12]){const panel=new T.Group();panel.position.set(x,0,.15);g.add(panel);wallPanel(panel,0,3.65,5.5,6.8);for(const xx of [-2.8,2.8])gildedColumn(panel,xx,.1,7.6,.18);box(panel,[2.4,.65,.1],[0,5.6,.4],P.gold);rosette(panel,0,5.6,.5,.2);}
 g.traverse(o=>{if(o instanceof T.Mesh)o.userData.fullDetail=true;});return g;
}

function wallPanel(g:T.Object3D,x:number,y:number,w:number,h:number){
 const frame=new T.Group();frame.userData.landmark='wall-panel';g.add(frame);
 box(frame,[w,h,.12],[x,y,.16],0x874537);box(frame,[w-.16,h-.16,.14],[x,y,.24],P.gold);box(frame,[w-.32,h-.32,.15],[x,y,.33],0xe8dfc8);
 for(const side of [-1,1]){box(frame,[.035,h-.55,.04],[x+side*(w/2-.24),y,.43],P.light);box(frame,[w-.48,.035,.04],[x,y+side*(h/2-.24),.43],P.light);}
 frame.traverse(o=>{if(o instanceof T.Mesh)o.userData.fullDetail=true;});
}
function sideBayDetails(g:T.Object3D){
 // Retain the ivory/red wall panels, with gilded reliefs and fluted pilasters.
 for(const side of [-1,1]){
  const x=side*2.74;box(g,[.25,6.1,.18],[x,15.3,.28],P.gold);
  for(const dx of [-.07,0,.07])box(g,[.022,5.5,.045],[x+dx,15.25,.4],P.light).userData.fullDetail=true;
  box(g,[.55,.23,.36],[x,18.18,.3],P.light);rosette(g,x,18.65,.42,.17);
 }
 rosette(g,0,16.85,.52,.22);
 for(const side of [-1,1])line(g,new T.Vector3(side*.25,16.7,.49),new T.Vector3(side*1.2,16.3,.49),.035,P.gold);
 // The photographed gallery has a coffered underside and small ceiling lamps.
 box(g,[5.85,.07,2.65],[0,7.98,1.45],P.deep);
 for(const x of [-2.78,0,2.78])box(g,[.12,.09,2.8],[x,7.91,1.46],P.gold);
 for(const z of [.12,2.8])box(g,[5.85,.09,.12],[0,7.91,z],P.light);
 const coffer=new T.Mesh(friezePlane,friezeMaterial());coffer.rotation.x=Math.PI/2;coffer.scale.set(4.9,2.1,1);coffer.position.set(0,7.925,1.45);g.add(coffer);
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
function upperDoor(g:T.Object3D,y:number){
 box(g,[3.3,2.15,.16],[0,y+1.15,.31],P.ivory);box(g,[2.95,1.65,.18],[0,y+1.12,.43],0x493122);
 for(const x of [-.8,0,.8])box(g,[.06,1.5,.08],[x,y+1.12,.55],0x704c30);
 const pediment=new T.Group();pediment.position.set(0,y+2.45,.2);g.add(pediment);cornice(pediment,3.8,0,.25);
 for(const side of [-1,1])line(g,new T.Vector3(side*1.95,y+2.8,.6),new T.Vector3(0,y+3.65,.6),.065,P.ivory);
 whiteFigure(g,-.85,y+3.5);whiteFigure(g,.85,y+3.5);
}
function rearFacade(scene:T.Scene){
 const g=new T.Group();g.position.z=WALL_DATUM.rear;g.rotation.y=Math.PI;scene.add(g);g.userData.landmark='rear-facade';
 // Six high arched windows over an enclosed, ornamented rear gallery.
 for(const x of [-10,-6,-2,2,6,10]){const bay=new T.Group();bay.position.x=x;g.add(bay);archedWindow(bay,WALL_LEVELS.window);wallPanel(bay,0,WALL_LEVELS.panelY,3.75,WALL_LEVELS.panelHeight);upperDoor(bay,WALL_LEVELS.vent);}
 for(const x of [-14,14]){const wing=new T.Group();wing.position.x=x;g.add(wing);archedWindow(wing,WALL_LEVELS.window,true);upperDoor(wing,WALL_LEVELS.vent);}
 for(const x of [-12,-8,-4,4,8,12])wallPanel(g,x,WALL_LEVELS.lowerPanelY,3.3,WALL_LEVELS.lowerPanelHeight);
 // Columns are against the rear wall; the floating stairs have no support pillars.
 for(const x of [-10.9,-3.9,3.9,10.9])gildedColumn(g,x,0,7.5,.27);
 const rail=new T.Group();rail.position.set(0,H.balconyHeight,GALLERY_BRIDGE.minZ+.4);rail.rotation.y=Math.PI;scene.add(rail);balustrade(rail,25);
 // A dark timber double entrance, recessed panels and a gilded classical surround.
 box(g,[7.3,6.8,.28],[0,3.4,.33],P.gold);box(g,[6.75,6.4,.3],[0,3.2,.52],P.wood);
 for(const side of [-1,1]){for(const y of [1.1,3.05,5.1]){box(g,[2.8,1.63,.14],[side*1.62,y,.73],P.deep);box(g,[2.53,1.38,.14],[side*1.62,y,.83],P.wood);}cylinder(g,.045,.45,[side*.18,2.65,.97],P.light);}
 cornice(g,8.1,6.65,.55);g.traverse(o=>{if(o instanceof T.Mesh)o.userData.cameraOccluder=true;});
}
export function buildGoldenHall(scene:T.Scene){
 scene.userData.venue='musikverein-golden-hall';
 const cameraWalls:T.Object3D[]=buildHallShell(scene);
 const stage=box(scene,[STAGE.width,.75,STAGE.front-STAGE.back],[0,.3,(STAGE.front+STAGE.back)/2],0xa77343);stage.receiveShadow=true;
 // Fine lengthwise wood boards unify the stage and audience floor.
 for(let x=-15.5;x<16;x+=.5)box(scene,[.013,.008,H.rear-H.front],[x,.005,(H.rear+H.front)/2],0x8e683e);
 for(const side of [-1,1]){
  for(const z of H.bayCenters){const g=new T.Group();g.position.set(side*WALL_DATUM.halfWidth,0,z);g.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(g);
   box(g,[5.9,6.9,.16],[0,3.5,.08],P.ivory);box(g,[4.1,4.8,.12],[0,3.1,.2],0xc5a875);box(g,[3.7,4.4,.14],[0,3.1,.3],0xf0dfbb);
   for(const x of [-2.55,2.55]){const figure=new T.Group();figure.position.set(x,.45,.3);figure.scale.set(1,1.21,1);g.add(figure);caryatid(figure);}
   wallPanel(g,0,WALL_LEVELS.lowerPanelY,4.2,WALL_LEVELS.lowerPanelHeight);rosette(g,0,5.8,.48,.27);
   for(const span of galleryRailSpans(z)){const rail=new T.Group();rail.position.set(side*((span.start+span.end)/2-z),H.balconyHeight,WALL_DATUM.halfWidth-12.5-.4);g.add(rail);balustrade(rail,span.end-span.start);}
   for(const x of [-2.85,2.85]){box(g,[.2,17,.2],[x,18.1,.2],0x9a5646);box(g,[.065,17,.1],[x,18.1,.34],P.light);}
   wallPanel(g,0,WALL_LEVELS.panelY,5.4,WALL_LEVELS.panelHeight);archedWindow(g,WALL_LEVELS.window);upperDoor(g,WALL_LEVELS.vent);sideBayDetails(g);whiteFigure(g,2.8,18.1);
   g.traverse(o=>{if(o instanceof T.Mesh)o.userData.cameraOccluder=true;});
  }
  // The repeated bays stop short of both corners; finish those returns too.
  for(const [a,b]of [[WALL_DATUM.front,-27],[51,WALL_DATUM.rear]]){const end=new T.Group();end.position.set(side*WALL_DATUM.halfWidth,0,(a+b)/2);end.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(end);wallPanel(end,0,WALL_LEVELS.lowerPanelY,b-a,WALL_LEVELS.lowerPanelHeight);wallPanel(end,0,WALL_LEVELS.panelY,b-a,WALL_LEVELS.panelHeight);}
 }
 for(const r of GALLERY_FLOORS)box(scene,[r.maxX-r.minX,.3,r.maxZ-r.minZ],[(r.minX+r.maxX)/2,H.balconyHeight-.15,(r.minZ+r.maxZ)/2],P.ivory);
 buildPerimeterCornices(scene);buildPerimeterFriezes(scene,friezeMaterial());
 buildFrontWindows(scene);buildOrgan(scene);paintedCeiling(scene);
 for(const x of [-7.4,7.4])for(const z of [-20,-7,6,19,32,45])crystalChandelier(scene,x,z);
 for(const z of [-22,4,30]){const light=new T.PointLight(0xffe3af,95,42,2);light.position.set(0,16,z);scene.add(light);}
 const stageLight=new T.SpotLight(0xffe4bd,300,42,1.05,.8,1.5);stageLight.position.set(0,18,-8);stageLight.target.position.set(0,1,-20);scene.add(stageLight,stageLight.target);
 rearFacade(scene);
 return {cameraWalls};
}
