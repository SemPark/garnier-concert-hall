import * as T from 'three';
import {ATRIUM as A,LOBBY_ARCADE} from '../../shared/grandStair';
import {box,cylinder,sphere,line,material} from './primitives';
import {hallImage} from './HallTextures';

/** The hall's ivory, gilt frames and shared image motifs continue into the foyer. */
export const LOBBY_PALETTE={ivory:0xe8d6ac,gold:0xc69b49,light:0xe7c77a,deep:0x8e622a,red:0x6f2830,glass:0xc5d4ce};
const P=LOBBY_PALETTE;
export function lobbyStatue(parent:T.Object3D,x:number,y:number,z:number,scale=1,yaw=0){
 const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);g.rotation.y=yaw;g.userData.landmark='lobby-classical-statue';parent.add(g);
 cylinder(g,.52,.16,[0,.08,0],P.deep);cylinder(g,.43,.15,[0,.23,0],P.light);
 const robe=new T.Mesh(new T.CylinderGeometry(.23,.4,1.45,12),material(P.ivory));robe.position.y=1.05;g.add(robe);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;line(g,new T.Vector3(Math.cos(a)*.21,1.7,Math.sin(a)*.21),new T.Vector3(Math.cos(a)*.37,.38,Math.sin(a)*.37),.022,P.light);}
 sphere(g,.32,[0,1.94,0],P.ivory).scale.multiply(new T.Vector3(1,1.25,.7));cylinder(g,.105,.22,[0,2.3,0],P.ivory);
 sphere(g,.23,[0,2.59,0],P.ivory).scale.y*=1.2;sphere(g,.24,[0,2.72,-.035],P.deep).scale.y*=.6;sphere(g,.055,[0,2.57,.22],P.ivory);
 line(g,new T.Vector3(-.25,2.14,0),new T.Vector3(-.4,1.55,.04),.09,P.ivory);
 line(g,new T.Vector3(.25,2.14,0),new T.Vector3(.48,1.94,.12),.09,P.ivory);line(g,new T.Vector3(.48,1.94,.12),new T.Vector3(.3,1.68,.26),.075,P.ivory);
 // A folded score gives the figure a clear musical identity.
 box(g,[.36,.44,.09],[.18,1.72,.31],P.gold);
 g.traverse(o=>{o.userData.fullDetail=true;});
}
function panel(parent:T.Object3D,width:number,height:number,y:number){
 box(parent,[width,height,.07],[0,y,0],P.deep);
 box(parent,[width-.16,height-.16,.09],[0,y,.055],P.gold);
 box(parent,[width-.32,height-.32,.07],[0,y,.12],P.ivory);
 for(const x of [-width/2+.22,width/2-.22])box(parent,[.045,height-.43,.06],[x,y,.18],P.light);
 for(const dy of [-height/2+.22,height/2-.22])box(parent,[width-.43,.045,.06],[0,y+dy,.18],P.light);
 hallImage(parent,'relief',width*.72,Math.min(.9,height*.35),0,y,.225);
}
function wallFrame(scene:T.Scene,x:number,z:number,angle:number){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;scene.add(g);return g;}
function windowBay(parent:T.Object3D,width:number){
 const h=4.6,bottom=14.15,r=width/2,spring=h-r;
 const shape=new T.Shape();shape.moveTo(-r,0);shape.lineTo(r,0);shape.lineTo(r,spring);shape.absarc(0,spring,r,0,Math.PI,false);shape.closePath();
 const glass=new T.Mesh(new T.ShapeGeometry(shape,18),new T.MeshLambertMaterial({color:P.glass,emissive:0x5b737b,emissiveIntensity:.2}));glass.position.set(0,bottom,.04);glass.userData.fullDetail=true;parent.add(glass);
 for(const x of [-r,r])box(parent,[.14,spring,.2],[x,bottom+spring/2,.12],P.gold);
 for(let i=0;i<20;i++){const a=i/20*Math.PI,b=(i+1)/20*Math.PI;line(parent,new T.Vector3(Math.cos(a)*r,bottom+spring+Math.sin(a)*r,.12),new T.Vector3(Math.cos(b)*r,bottom+spring+Math.sin(b)*r,.12),.07,P.gold);}
 for(const x of [-r*.5,0,r*.5])box(parent,[.055,spring+.45,.1],[x,bottom+(spring+.45)/2,.15],P.light);
 for(const y of [bottom,bottom+1.6,bottom+spring])box(parent,[width,.09,.18],[0,y,.15],P.gold);
 box(parent,[width+.4,.19,.44],[0,bottom-.16,.12],P.light);
}
export function buildLobbyDetails(scene:T.Scene){
 const inner=A.halfWidth-A.balconyDepth;
 // Single round shafts at the joints shared by adjacent arches; no doubled piers.
 for(const side of [-1,1])for(const z of LOBBY_ARCADE.columns)for(const [base,h] of [[0,3.6],[A.balconyY,2.6]]){
  const x=side*LOBBY_ARCADE.x;
  cylinder(scene,.34,.16,[x,base+.08,z],P.deep);cylinder(scene,.29,.14,[x,base+.23,z],P.light);
  cylinder(scene,.235,h-.55,[x,base+h/2,z],P.ivory);cylinder(scene,.3,.14,[x,base+h-.22,z],P.gold);box(scene,[.72,.16,.72],[x,base+h-.07,z],P.light);
 }
 for(const side of [-1,1]){
  for(const z of LOBBY_ARCADE.bays){const frame=wallFrame(scene,side*(A.halfWidth-.2),z,-side*Math.PI/2);if(!(side===-1&&z<36)&&!(side===1&&z===23.1))panel(frame,3.7,4.3,3.05);panel(frame,3.7,4.5,10.25);windowBay(frame,3.3);}
  // Narrow inlays and sconces fill the gaps on the outer wall rather than cluttering the aisles.
  for(const z of LOBBY_ARCADE.columns){const frame=wallFrame(scene,side*(A.halfWidth-.22),z,-side*Math.PI/2);for(const y of [3.1,10.2]){
   box(frame,[.5,4.6,.12],[0,y,0],P.gold);hallImage(frame,'pilaster',.38,4.3,0,y,.08);
  }}
 }
 for(const z of [A.front+.22,A.back-.22])for(const x of [-10.2,-3.4,3.4,10.2]){
  const frame=wallFrame(scene,x,z,z>A.front+1?Math.PI:0);panel(frame,2.25,4.3,10.25);windowBay(frame,2.5);
 }
 // Rear ground wall bays, beside the stair, receive the same framed ivory panels.
 for(const x of [-11.9,-7.7,7.7,11.9])panel(wallFrame(scene,x,A.back-.24,Math.PI),2.6,4.3,3);
 // One UV-repeated strip per straight run: exact ends, no overlapping little image tiles at corners.
 const strip=(width:number,x:number,y:number,z:number,angle:number)=>{
  const f=hallImage(scene,'scroll',width,.46,x,y,z);f.rotation.y=angle;f.geometry=f.geometry.clone();const uv=f.geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*width/2.6);uv.needsUpdate=true;
 };
 for(const y of [A.balconyY-.36,13.4-.36]){
  for(const side of [-1,1])strip(A.back-A.front-2*A.balconyDepth,side*(inner-.035),y,(A.front+A.back)/2,-side*Math.PI/2);
  strip(inner*2,0,y,A.front+A.balconyDepth+.035,0);strip(inner*2,0,y,A.back-A.balconyDepth-.035,Math.PI);
  for(const side of [-1,1])for(const dy of [-.34,.31])box(scene,[.24,.12,A.back-A.front-2*A.balconyDepth],[side*inner,y+dy,(A.front+A.back)/2],P.light);
  for(const z of [A.front+A.balconyDepth,A.back-A.balconyDepth])for(const dy of [-.34,.31])box(scene,[inner*2,.12,.24],[0,y+dy,z],P.light);
  for(const x of [-inner,inner])for(const z of [A.front+A.balconyDepth,A.back-A.balconyDepth])box(scene,[.28,.8,.28],[x,y,z],P.gold);
 }
 // Continuous layered cornices use the same proportions and colours as the hall.
 for(const y of [.35,13.75,19.2])for(const [dy,h,depth,color] of [[0,.14,.25,P.deep],[.18,.15,.4,P.gold],[.36,.12,.55,P.light]]){
  for(const side of [-1,1])box(scene,[depth,h,A.back-A.front],[side*(A.halfWidth-depth/2),y+dy,(A.front+A.back)/2],color);
  for(const z of [A.front+depth/2,A.back-depth/2])box(scene,[A.halfWidth*2-depth*2,h,depth],[0,y+dy,z],color);
 }
}
