import * as T from 'three';
import {box,cylinder,sphere,line,text,material} from './primitives';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {STAGE} from '../orchestra/layout';
import {crystalChandelier,paintedCeiling,friezeMaterial} from './HallDetails';
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
 box(g,[2.8,.22,.4],[0,y,.2],P.gold);box(g,[.07,5.9,.06],[0,y+2.95,.19],0x303334);
 for(const yy of [1.9,3.8,5.1])box(g,[2.2,.07,.06],[0,y+yy,.2],0x303334);g.traverse(o=>{if(o instanceof T.Mesh)o.userData.fullDetail=true;});
}
function balustrade(g:T.Object3D,width:number){
 g.scale.y=GALLERY_RAIL_HEIGHT/1.58;
 box(g,[width,1.4,.22],[0,.78,.4],P.deep);box(g,[width,.12,.5],[0,.08,.43],P.light);box(g,[width,.17,.42],[0,1.48,.45],P.light);
 const count=Math.max(1,Math.ceil(width/2.1));for(let i=0;i<count;i++){const face=new T.Mesh(friezePlane,friezeMaterial());face.scale.set(width/count,1.14,1);face.position.set(-width/2+(i+.5)*width/count,.79,.525);g.add(face);}
 for(let x=-width/2;x<=width/2+.01;x+=2.4)box(g,[.075,1.25,.1],[x,.78,.55],P.light);
}
function organ(scene:T.Scene){
 const g=new T.Group();g.position.z=-29.1;g.userData.landmark='pipe-organ';scene.add(g);
 box(g,[19.3,12.5,.7],[0,15.7,0],P.ivory);
 // All three banks share a horizontal top; the pipe feet form a deep U curve.
 for(const [cx,w,count]of [[-5.8,4.6,19],[0,5.8,25],[5.8,4.6,19]]){
  box(g,[w,9.7,.13],[cx,15.2,.42],0x262e31);
  for(let i=0;i<count;i++){const u=(i/(count-1)-.5)*2,bottom=10.7+2.05*Math.abs(u)**1.8,top=20.2,xx=cx+u*(w/2-.16),height=top-bottom;
   const pipe=cylinder(g,.087,height,[xx,bottom+height/2,.7],0xbec6c5);pipe.material=material(0xaebbbd,.68,.29);pipe.userData.fullDetail=true;pipe.userData.organPipe=true;
   cylinder(g,.096,.065,[xx,top,.7],0xdce1d8).userData.fullDetail=true;
   box(g,[.12,.13,.035],[xx,bottom+.47,.79],0x252d30).userData.fullDetail=true;
   box(g,[.145,.035,.05],[xx,bottom+.38,.80],0xdce1d8).userData.fullDetail=true;
  }
  box(g,[w,.2,.9],[cx,10.25,.5],P.light);
 }
 for(const x of [-8.7,-3.25,3.25,8.7]){const column=new T.Group();column.position.z=.6;g.add(column);gildedColumn(column,x,9.6,11.8,.25);const figure=new T.Group();figure.position.set(x,14.6,.7);figure.scale.set(.5,.75,.45);g.add(figure);caryatid(figure);}
 cornice(g,20.5,21.2,.45);cornice(g,19.8,9.6,.45);
 // The pediment spans most of the three-bank façade, with ivory sculptures.
 const shape=new T.Shape();shape.moveTo(-7.7,0);shape.lineTo(0,2.1);shape.lineTo(7.7,0);shape.closePath();const pediment=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.45,bevelEnabled:false}),material(P.gold,.3));pediment.position.set(0,21.9,.1);g.add(pediment);
 line(g,new T.Vector3(-7.9,21.95,.65),new T.Vector3(0,24.15,.65),.09,P.light);line(g,new T.Vector3(0,24.15,.65),new T.Vector3(7.9,21.95,.65),.09,P.light);
 for(const x of [-6.8,-4.4,0,4.4,6.8]){const y=22.4+(x===0?1.7:.2);sphere(g,.2,[x,y+.45,.45],P.ivory);frustum(g,.15,.32,.65,[x,y,.45],P.ivory);}
 // Continuous convex organ balcony, rather than three disconnected boxes.
 const curve=(x:number)=>1.1+1.15*Math.cos(x/10*Math.PI/2);
 for(let i=0;i<20;i++){const x=-9.5+i,x0=x-.5,x1=x+.5,a=new T.Vector3(x0,8.75,curve(x0)),b=new T.Vector3(x1,8.75,curve(x1)),segment=new T.Group();segment.position.copy(a).add(b).multiplyScalar(.5);segment.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);g.add(segment);balustrade(segment,a.distanceTo(b)+.025);}
 box(g,[3.2,.8,1.2],[0,9.1,1.45],0x513520);box(g,[2.6,.1,.65],[0,9.58,1.92],0x28231c);for(let i=0;i<22;i++)box(g,[.10,.035,.34],[-1.12+i*.106,9.66,2],0xe8dfcd);
 for(const x of [-12,-6,0,6,12]){const panel=new T.Group();panel.position.set(x,0,.15);g.add(panel);wallPanel(panel,0,3.65,5.5,6.8);for(const xx of [-2.8,2.8])gildedColumn(panel,xx,.1,7.6,.18);box(panel,[2.4,.65,.1],[0,5.6,.4],P.gold);rosette(panel,0,5.6,.5,.2);}
 for(const x of [-13,13]){const wing=new T.Group();wing.position.x=x;g.add(wing);archedWindow(wing,19.3,true);}
}
function wallPanel(g:T.Object3D,x:number,y:number,w:number,h:number){
 box(g,[w,h,.12],[x,y,.16],0x9a5646);box(g,[w-.2,h-.2,.14],[x,y,.24],P.gold);box(g,[w-.32,h-.32,.15],[x,y,.33],0xe8dfc8);
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
 const g=new T.Group();g.position.z=51.68;g.rotation.y=Math.PI;scene.add(g);g.userData.landmark='rear-facade';
 // Six high arched windows over an enclosed, ornamented rear gallery.
 for(const x of [-10,-6,-2,2,6,10]){const bay=new T.Group();bay.position.x=x;g.add(bay);archedWindow(bay,19.3);box(bay,[3.75,3.7,.12],[0,15.2,.1],P.gold);box(bay,[3.48,3.42,.15],[0,15.2,.2],P.ivory);}
 for(const x of [-14,14]){const wing=new T.Group();wing.position.x=x;g.add(wing);archedWindow(wing,20,true);upperDoor(wing,10.1);}
 for(const y of [7.65,12.1,17.7,26.8])cornice(g,31.4,y,.3);
 for(const x of [-12,-8,-4,4,8,12])wallPanel(g,x,3.25,3.3,5.9);
 // Columns are against the rear wall; the floating stairs have no support pillars.
 for(const x of [-10.9,-3.9,3.9,10.9])gildedColumn(g,x,0,7.5,.27);
 for(const r of GALLERY_FLOORS.filter(r=>r.minZ>=GALLERY_BRIDGE.minZ)){
  const w=r.maxX-r.minX;box(scene,[w,.15,r.maxZ-r.minZ],[(r.minX+r.maxX)/2,H.balconyHeight-.32,(r.minZ+r.maxZ)/2],P.light);
 }
 const rail=new T.Group();rail.position.set(0,H.balconyHeight,GALLERY_BRIDGE.minZ);rail.rotation.y=Math.PI;scene.add(rail);balustrade(rail,25);
 // A dark timber double entrance, recessed panels and a gilded classical surround.
 box(g,[7.3,6.8,.28],[0,3.4,.33],P.gold);box(g,[6.75,6.4,.3],[0,3.2,.52],P.wood);
 for(const side of [-1,1]){for(const y of [1.1,3.05,5.1]){box(g,[2.8,1.63,.14],[side*1.62,y,.73],P.deep);box(g,[2.53,1.38,.14],[side*1.62,y,.83],P.wood);}cylinder(g,.045,.45,[side*.18,2.65,.97],P.light);}
 cornice(g,8.1,6.65,.55);g.traverse(o=>{if(o instanceof T.Mesh)o.userData.cameraOccluder=true;});
}
export function buildGoldenHall(scene:T.Scene){
 scene.userData.venue='musikverein-golden-hall';
 const cameraWalls:T.Object3D[]=[];
 const stage=box(scene,[STAGE.width,.75,STAGE.front-STAGE.back],[0,.3,(STAGE.front+STAGE.back)/2],0xa77343);stage.receiveShadow=true;
 // Fine lengthwise wood boards unify the stage and audience floor.
 for(let x=-15.5;x<16;x+=.5)box(scene,[.013,.008,H.rear-H.front],[x,.005,(H.rear+H.front)/2],0x8e683e);
 for(const side of [-1,1]){
  const wall=box(scene,[.4,H.height,H.rear-H.front],[side*16,H.height/2,(H.rear+H.front)/2],P.ivory);wall.userData.cameraOccluder=true;cameraWalls.push(wall);
  for(const z of H.bayCenters){const g=new T.Group();g.position.set(side*15.72,0,z);g.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(g);
   box(g,[5.9,6.9,.16],[0,3.5,.08],P.ivory);box(g,[4.1,4.8,.12],[0,3.1,.2],0xc5a875);box(g,[3.7,4.4,.14],[0,3.1,.3],0xf0dfbb);
   for(const x of [-2.55,2.55]){const figure=new T.Group();figure.position.set(x,.45,.3);figure.scale.set(1,1.21,1);g.add(figure);caryatid(figure);}
   wallPanel(g,0,3.4,4.2,5.4);rosette(g,0,5.8,.48,.27);box(g,[5.9,.23,1.4],[0,7.8,.6],P.deep);
   for(const span of galleryRailSpans(z)){const rail=new T.Group();rail.position.set(side*((span.start+span.end)/2-z),H.balconyHeight,2.8);g.add(rail);balustrade(rail,span.end-span.start);}
   for(const x of [-2.85,2.85]){box(g,[.2,17,.2],[x,18.1,.2],0x9a5646);box(g,[.065,17,.1],[x,18.1,.34],P.light);}
   wallPanel(g,0,16.1,5.4,4.8);archedWindow(g,19.3);upperDoor(g,10.7);whiteFigure(g,2.8,18.1);
   cornice(g,6,26.5,.16);box(g,[5.7,.28,.15],[0,12.4,.18],P.gold);rosette(g,0,11.1,.32,.22);g.traverse(o=>{if(o instanceof T.Mesh)o.userData.cameraOccluder=true;});
  }

 }
 for(const r of GALLERY_FLOORS)box(scene,[r.maxX-r.minX,.3,r.maxZ-r.minZ],[(r.minX+r.maxX)/2,H.balconyHeight-.15,(r.minZ+r.maxZ)/2],P.ivory);
 const rear=box(scene,[32,H.height,.4],[0,H.height/2,H.rear],P.ivory),front=box(scene,[32,H.height,.4],[0,H.height/2,H.front],P.ivory);rear.userData.cameraOccluder=front.userData.cameraOccluder=true;cameraWalls.push(rear,front);
 for(const z of [-28.15]){const rail=new T.Group();rail.position.set(0,H.balconyHeight,z);if(z>0)rail.rotation.y=Math.PI;scene.add(rail);balustrade(rail,29.5);}
 organ(scene);paintedCeiling(scene);
 for(const x of [-7.4,7.4])for(const z of [-20,-7,6,19,32,45])crystalChandelier(scene,x,z);
 for(const z of [-22,4,30]){const light=new T.PointLight(0xffe3af,95,42,2);light.position.set(0,16,z);scene.add(light);}
 const stageLight=new T.SpotLight(0xffe4bd,300,42,1.05,.8,1.5);stageLight.position.set(0,18,-8);stageLight.target.position.set(0,1,-20);scene.add(stageLight,stageLight.target);
 rearFacade(scene);
 return {cameraWalls};
}
