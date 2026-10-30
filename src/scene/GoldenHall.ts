import * as T from 'three';
import {box,cylinder,sphere,line,text,material} from './primitives';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {STAGE} from '../orchestra/layout';
import {GALLERY_FLOORS,galleryRailSpans} from '../../shared/gallery';
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
const glassMaterial=new T.MeshLambertMaterial({color:P.glass,emissive:0xb4c8c0,emissiveIntensity:.3});
function archedWindow(g:T.Object3D,y:number,blind=false){
 const pane=new T.Mesh(paneGeometry,blind?material(0xcebc98):glassMaterial);pane.position.set(0,y,.14);g.add(pane);
 for(const x of [-1.23,1.23])box(g,[.14,5.3,.18],[x,y+2.6,.24],P.light);
 const arch=new T.Mesh(archGeometry,material(P.light,.3));arch.position.set(0,y+5.2,.25);g.add(arch);
 box(g,[2.8,.22,.4],[0,y,.2],P.gold);box(g,[.07,5.9,.06],[0,y+2.95,.19],P.gold);
 for(const yy of [1.9,3.8,5.1])box(g,[2.2,.07,.06],[0,y+yy,.2],P.gold);
}
function balustrade(g:T.Object3D,width:number){
 box(g,[width,.28,.4],[0,0,.32],P.gold);box(g,[width,.11,.5],[0,.25,.32],P.light);box(g,[width,.2,.32],[0,1.48,.55],P.light);box(g,[width,1.05,.14],[0,.85,.46],P.ivory);
 for(let x=-width/2+.22;x<width/2;x+=.46){const ring=new T.Mesh(geometryRing,material(P.gold,.35));ring.position.set(x,.85,.57);ring.scale.set(.14,.36,1);g.add(ring);box(g,[.035,1,.09],[x+.2,.84,.56],P.light);}
 for(const x of [-width/2+.08,width/2-.08]){box(g,[.19,1.4,.5],[x,.8,.5],P.gold);rosette(g,x,.9,.78,.1);}
}
const geometryRing=new T.TorusGeometry(1,.11,5,16);
function crystalChandelier(scene:T.Scene,x:number,z:number){
 const g=new T.Group();g.position.set(x,19,z);scene.add(g);cylinder(g,.025,H.height-22,[0,(H.height-22)/2+3,0],P.deep);
 const crystal=material(0xffedbf,.12,.2);crystal.emissive.setHex(0xffe2a3);crystal.emissiveIntensity=.45;
 for(const [r,y]of [[1.05,2.4],[.95,.5],[.6,0]]){const ring=new T.Mesh(chandelierRing,material(P.light,.55));ring.position.y=y;ring.scale.set(r,1,r);g.add(ring);}
 for(let i=0;i<32;i++){const a=i/32*Math.PI*2,xx=Math.cos(a),zz=Math.sin(a);const strand=line(g,new T.Vector3(xx*.55,0,zz*.55),new T.Vector3(xx*1.05,2.4,zz*1.05),.025,0xffedca);strand.material=crystal;for(const y of [.05,.48,1.05,1.64,2.3]){const r=.55+y/2.4*.5;const bead=sphere(g,.048,[xx*r,y,zz*r],0xfff0cd);bead.material=crystal;bead.scale.y*=1.7;}}
 g.traverse(o=>{if(o instanceof T.Mesh)o.userData.lodMax=26;});
 const shell=new T.Mesh(farChandelierGeometry,farChandelierMaterial);shell.userData.lodMin=24;g.add(shell);
 sphere(g,.19,[0,-.27,0],P.light);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const candle=cylinder(g,.045,.33,[Math.cos(a)*.83,.7,Math.sin(a)*.83],0xffefc7);candle.material=crystal;}
}
const chandelierRing=new T.TorusGeometry(1,.025,5,32);
const farChandelierGeometry=new T.LatheGeometry([new T.Vector2(.15,-.2),new T.Vector2(.58,0),new T.Vector2(.96,1.9),new T.Vector2(1.05,2.4),new T.Vector2(.83,2.55)],10),farChandelierMaterial=new T.MeshLambertMaterial({color:0xf6dfac,emissive:0x3e2e16});
function organ(scene:T.Scene){
 const g=new T.Group();g.position.z=-29.1;scene.add(g);g.userData.landmark='pipe-organ';
 box(g,[23.5,1.4,1.25],[0,8.6,.25],P.gold);box(g,[22.6,.18,1.5],[0,9.4,.4],P.light);
 box(g,[18,11.8,.6],[0,15.5,0],P.ivory);
 for(const [cx,w,maxH,count]of [[-6.2,4.6,7.1,13],[0,6.2,9.3,17],[6.2,4.6,7.1,13]]){
  box(g,[w,10,.12],[cx,15.2,.36],P.shadow);
  for(let i=0;i<count;i++){const u=(i/(count-1)-.5)*2,h=maxH-1.8*Math.abs(u),xx=cx+u*(w/2-.18);const p=cylinder(g,.10,h,[xx,10.6+h/2,.62],0xc4c7bc);p.material=material(0xbec2b6,.8,.25);const lip=box(g,[.13,.07,.045],[xx,11.15,.735],0x484a41);lip.rotation.x=-.2;cylinder(g,.12,.06,[xx,10.65+h,.62],P.light);}
 }
 for(const x of [-9.2,-3.45,3.45,9.2])gildedColumn(g,x,9.5,12,.28);
 for(const [cx,w]of [[-6.2,5.2],[0,7],[6.2,5.2]]){const head=new T.Group();head.position.x=cx;g.add(head);cornice(head,w,21.2,.4);box(head,[w,.18,.9],[0,9.7,.4],P.light);}
 // Triangular central pediment and small gilded sculpture silhouettes.
 const triangle=new T.Shape();triangle.moveTo(-5.1,0);triangle.lineTo(0,2.1);triangle.lineTo(5.1,0);triangle.closePath();const pediment=new T.Mesh(new T.ExtrudeGeometry(triangle,{depth:.45,bevelEnabled:false}),material(P.gold,.35));pediment.position.set(0,22,.1);g.add(pediment);
 line(g,new T.Vector3(-5.3,22,.65),new T.Vector3(0,24.2,.65),.095,P.light);line(g,new T.Vector3(0,24.2,.65),new T.Vector3(5.3,22,.65),.095,P.light);
 for(const x of [-6.6,-3,0,3,6.6]){sphere(g,.22,[x,22.7+(x===0?1.6:0),.45],P.light);frustum(g,.13,.3,.65,[x,22.15+(x===0?1.6:0),.45],P.gold);}
 text(g,'MUSIKVEREIN',5.3,[0,21.9,.95],'#f5ddb0');
 // The choir gallery and its framed doors below the organ are visible behind the band.
 for(const x of [-12.1,12.1]){const wing=new T.Group();wing.position.set(x,0,.1);g.add(wing);archedWindow(wing,14.1,true);gildedColumn(wing,-1.6,9.4,15.5,.23);gildedColumn(wing,1.6,9.4,15.5,.23);}
 for(const x of [-10,-5,0,5,10]){box(g,[3.7,5.4,.18],[x,3,.3],P.ivory);for(const xx of [-1.75,1.75])box(g,[.12,5.2,.2],[x+xx,3,.5],P.gold);rosette(g,x,4.65,.55,.25);box(g,[2.5,3.5,.15],[x,2.3,.53],x===0?P.red:0xd1bb8c);}
}
function paintedCeiling(scene:T.Scene){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const c=canvas.getContext('2d')!;
 const bg=c.createLinearGradient(0,0,512,384);bg.addColorStop(0,'#4b696e');bg.addColorStop(.55,'#8fa69b');bg.addColorStop(1,'#b7b292');c.fillStyle=bg;c.fillRect(0,0,512,384);
 for(let i=0;i<18;i++){const x=(i*173)%512,y=(i*91)%384;c.fillStyle=i%2?'#d3c6a580':'#e1d6b260';c.beginPath();c.ellipse(x,y,75,27,-.25,0,Math.PI*2);c.fill();}
 // Original stylized allegorical figures, not a reproduction of the photographed mural.
 for(let i=0;i<3;i++){c.save();c.translate(125+i*120,160+(i%2)*75);c.rotate((i-1)*.4);c.fillStyle=['#a96f59','#d8bb82','#596e79'][i];c.beginPath();c.moveTo(-17,-15);c.bezierCurveTo(-55,45,-48,65,-78,100);c.bezierCurveTo(-15,80,35,130,55,80);c.bezierCurveTo(20,50,35,15,17,-15);c.closePath();c.fill();c.fillStyle='#d4b18a';c.beginPath();c.ellipse(0,-38,17,23,0,0,Math.PI*2);c.fill();c.strokeStyle='#c8a780';c.lineWidth=13;c.lineCap='round';c.beginPath();c.moveTo(-20,-5);c.quadraticCurveTo(-55,-40,-63,-65);c.moveTo(20,-5);c.quadraticCurveTo(55,-35,69,-26);c.stroke();c.restore();}
 const paintingGeometry=new T.PlaneGeometry(4.85,5.45);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const paintingMat=new T.MeshLambertMaterial({map:texture});
 box(scene,[H.width,.35,H.rear-H.front],[0,H.height,(H.front+H.rear)/2],P.deep);
 for(let iz=0;iz<12;iz++)for(let ix=0;ix<5;ix++){const x=(ix-2)*5.8,z=-25.8+iz*6.5,g=new T.Group();g.position.set(x,H.height-.25,z);scene.add(g);
  box(g,[5.65,.18,6.3],[0,0,0],P.gold);box(g,[5.15,.16,5.8],[0,-.12,0],P.shadow);const image=new T.Mesh(paintingGeometry,paintingMat);image.rotation.x=Math.PI/2;image.position.y=-.22;g.add(image);
  for(const xx of [-2.59,2.59])box(g,[.12,.16,5.9],[xx,-.24,0],P.light);for(const zz of [-2.94,2.94])box(g,[5.3,.16,.12],[0,-.24,zz],P.light);
  for(const xx of [-2.25,2.25])for(const zz of [-2.6,2.6])sphere(g,.11,[xx,-.32,zz],P.gold).scale.y*=.4;
 }
}
export function buildGoldenHall(scene:T.Scene){
 scene.userData.venue='musikverein-golden-hall';
 const cameraWalls:T.Object3D[]=[];
 const stage=box(scene,[STAGE.width,.75,STAGE.front-STAGE.back],[0,.3,(STAGE.front+STAGE.back)/2],0xa77343);stage.receiveShadow=true;
 // Fine lengthwise wood boards unify the stage and audience floor.
 for(let x=-15.5;x<16;x+=.5)box(scene,[.013,.008,H.rear-H.front],[x,.005,(H.rear+H.front)/2],0x8e683e);
 for(const side of [-1,1]){
  const wall=box(scene,[.4,H.height,H.rear-H.front],[side*16,H.height/2,(H.rear+H.front)/2],P.ivory);cameraWalls.push(wall);
  for(const z of H.bayCenters){const g=new T.Group();g.position.set(side*15.72,0,z);g.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(g);
   box(g,[5.9,6.9,.16],[0,3.5,.08],P.ivory);box(g,[4.1,4.8,.12],[0,3.1,.2],0xc5a875);box(g,[3.7,4.4,.14],[0,3.1,.3],0xf0dfbb);
   for(const x of [-2.55,2.55]){const figure=new T.Group();figure.position.set(x,.45,.3);figure.scale.set(1,1.21,1);g.add(figure);caryatid(figure);}
   rosette(g,0,5.8,.38,.27);box(g,[5.9,.23,1.4],[0,7.8,.6],P.deep);
   for(const span of galleryRailSpans(z)){const rail=new T.Group();rail.position.set(side*((span.start+span.end)/2-z),H.balconyHeight,2.8);g.add(rail);balustrade(rail,span.end-span.start);}
   for(const x of [-2.65,2.65])gildedColumn(g,x,10.1,17,.22);archedWindow(g,15.4);
   cornice(g,6,26.5,.16);box(g,[5.7,.28,.15],[0,12.4,.18],P.gold);rosette(g,0,11.1,.32,.22);
  }

 }
 for(const r of GALLERY_FLOORS)box(scene,[r.maxX-r.minX,.3,r.maxZ-r.minZ],[(r.minX+r.maxX)/2,H.balconyHeight-.15,(r.minZ+r.maxZ)/2],P.deep);
 const rear=box(scene,[32,H.height,.4],[0,H.height/2,H.rear],P.ivory),front=box(scene,[32,H.height,.4],[0,H.height/2,H.front],P.ivory);cameraWalls.push(rear,front);
 for(const z of [-28.15,50.7]){const rail=new T.Group();rail.position.set(0,H.balconyHeight,z);if(z>0)rail.rotation.y=Math.PI;scene.add(rail);balustrade(rail,29.5);}
 organ(scene);paintedCeiling(scene);
 for(const x of [-7.4,7.4])for(const z of [-20,-7,6,19,32,45])crystalChandelier(scene,x,z);
 for(const z of [-22,4,30]){const light=new T.PointLight(0xffe3af,95,42,2);light.position.set(0,16,z);scene.add(light);}
 const stageLight=new T.SpotLight(0xffe4bd,300,42,1.05,.8,1.5);stageLight.position.set(0,18,-8);stageLight.target.position.set(0,1,-20);scene.add(stageLight,stageLight.target);
 // Rear wall doors and classical panels close the rectangular gallery.
 for(const x of [-12,-6,0,6,12]){box(scene,[4.8,6.6,.12],[x,3.5,51.7],P.gold);box(scene,[4.4,6.1,.13],[x,3.5,51.6],P.ivory);if(x!==0)box(scene,[2.6,3.8,.14],[x,2.3,51.5],P.red);}
 return {cameraWalls};
}
