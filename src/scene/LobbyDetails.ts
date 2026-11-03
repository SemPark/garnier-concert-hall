import * as T from 'three';
import {ATRIUM as A,GRAND_STAIR as S,LOBBY_ARCADE} from '../../shared/grandStair';
import {box,cylinder,sphere,line,material} from './primitives';
import {surfaceMaterial} from './SurfaceMaterials';
import {hallImage,woodMaterial} from './HallTextures';

/** The hall's ivory, gilt frames and shared image motifs continue into the foyer. */
export const LOBBY_PALETTE={ivory:0xe8d6ac,gold:0xc69b49,light:0xe7c77a,deep:0x8e622a,red:0x6f2830,glass:0xb9cfd8};
const P=LOBBY_PALETTE;
export function lobbyWoodWall(parent:T.Object3D,width:number,height:number,bottom=0,backingOnly=false){
 const body=box(parent,[width,height,.09],[0,bottom+height/2,0],0x4a3324);body.material=woodMaterial('walnut');body.userData.cameraOccluder=true;
 // The continuous backing is recessed behind the separately framed bays. Do not put another
 // grid of inset faces at the same depth as their timber fronts.
 if(backingOnly)return;
 const count=Math.max(1,Math.round(width/2.4)),step=width/count;
 for(let i=0;i<count;i++){const x=-width/2+(i+.5)*step;box(parent,[step-.3,height-1.1,.05],[x,bottom+height/2,.08],0x21170f);
  for(const y of [bottom+.55,bottom+height-.55])box(parent,[step-.18,.055,.07],[x,y,.11],0x7a5634);
 }
 for(const y of [bottom+.12,bottom+height-.12]){box(parent,[width,.13,.2],[0,y,.1],P.deep);box(parent,[width,.055,.22],[0,y+.1,.11],P.light);}
 for(const child of parent.children)if(child instanceof T.Mesh)child.userData.cameraOccluder=true;
}
function panel(parent:T.Object3D,width:number,height:number,y:number){
 lobbyWoodWall(parent,width,height,y-height/2);
 const art=hallImage(parent,'relief',Math.min(1.3,width*.58),Math.min(2.1,height*.65),0,y,.16);art.userData.landmark='lobby-upright-art';
}
function wallFrame(scene:T.Scene,x:number,z:number,angle:number){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;scene.add(g);return g;}
function windowBay(parent:T.Object3D,width:number){
 const reveal=new T.Group();reveal.position.z=.3;parent.add(reveal);parent=reveal;
 const h=4.6,bottom=14.15,r=width/2,spring=h-r;
 const shape=new T.Shape();shape.moveTo(-r,0);shape.lineTo(r,0);shape.lineTo(r,spring);shape.absarc(0,spring,r,0,Math.PI,false);shape.closePath();
 const glass=new T.Mesh(new T.ShapeGeometry(shape,18),new T.MeshBasicMaterial({color:P.glass,toneMapped:false}));glass.position.set(0,bottom,.04);glass.userData.fullDetail=true;parent.add(glass);
 for(const x of [-r,r])box(parent,[.14,spring,.2],[x,bottom+spring/2,.12],P.gold);
 for(let i=0;i<20;i++){const a=i/20*Math.PI,b=(i+1)/20*Math.PI;line(parent,new T.Vector3(Math.cos(a)*r,bottom+spring+Math.sin(a)*r,.12),new T.Vector3(Math.cos(b)*r,bottom+spring+Math.sin(b)*r,.12),.07,P.gold);}
 for(const x of [-r*.5,0,r*.5])box(parent,[.055,spring+.45,.1],[x,bottom+(spring+.45)/2,.15],P.light);
 for(const y of [bottom,bottom+1.6,bottom+spring])box(parent,[width,.09,.18],[0,y,.15],P.gold);
 box(parent,[width+.4,.19,.44],[0,bottom-.16,.12],P.light);
}
export function buildLobbyDetails(scene:T.Scene){
 const inner=A.halfWidth-A.balconyDepth;
 for(const side of [-1,1])lobbyWoodWall(wallFrame(scene,side*(A.halfWidth-.14),(A.front+A.back)/2,-side*Math.PI/2),A.back-A.front,19.1,0,true);
 for(const z of [A.front+.14,A.back-.14])lobbyWoodWall(wallFrame(scene,0,z,z>A.front+1?Math.PI:0),A.halfWidth*2,12,7.3,true);
 // End arcades continue the same spring heights and share the side cornice datum.
 for(const z of [A.front+A.balconyDepth,A.back-A.balconyDepth])for(const x of LOBBY_ARCADE.endColumns.slice(1,-1))for(const base of [A.balconyY,13.4]){
  cylinder(scene,.29,.16,[x,base+.08,z],P.deep);cylinder(scene,.235,1.95,[x,base+1.22,z],P.ivory).material=surfaceMaterial('marble',0xded6c8);cylinder(scene,.31,.15,[x,base+2.35,z],P.gold);box(scene,[.72,.16,.72],[x,base+2.48,z],P.light);
 }
 // Single round shafts at the joints shared by adjacent arches; no doubled piers.
 for(const side of [-1,1])for(const z of LOBBY_ARCADE.columns)for(const [base,h] of [[0,3.6],[A.balconyY,2.6],[13.4,2.6]]){
  const x=side*LOBBY_ARCADE.x;
  cylinder(scene,.34,.16,[x,base+.08,z],P.deep);cylinder(scene,.29,.14,[x,base+.23,z],P.light);
  cylinder(scene,.235,h-.55,[x,base+h/2,z],P.ivory).material=surfaceMaterial('marble',0xded6c8);cylinder(scene,.3,.14,[x,base+h-.22,z],P.gold);box(scene,[.72,.16,.72],[x,base+h-.07,z],P.light);
 }
 for(const side of [-1,1]){
  for(const z of LOBBY_ARCADE.bays){const frame=wallFrame(scene,side*(A.halfWidth-.2),z,-side*Math.PI/2);if(!(side===-1&&z<36)&&!(side===1&&z===LOBBY_ARCADE.bays[0]))panel(frame,3.7,4.3,3.05);panel(frame,3.7,4.5,10.25);windowBay(frame,3.3);}
  // Narrow inlays and sconces fill the gaps on the outer wall rather than cluttering the aisles.
  for(const z of LOBBY_ARCADE.columns){const frame=wallFrame(scene,side*(A.halfWidth-.22),z,-side*Math.PI/2);for(const y of [3.1,10.2]){
   box(frame,[.5,4.6,.12],[0,y,0],P.gold);hallImage(frame,'pilaster',.38,4.3,0,y,.08);
  }}
 }
 for(const z of [A.front+.22,A.back-.22])for(const x of LOBBY_ARCADE.endBays){
  const frame=wallFrame(scene,x,z,z>A.front+1?Math.PI:0);panel(frame,2.25,4.3,10.25);windowBay(frame,2.5);
 }
 // Rear ground wall bays, beside the stair, receive the same framed ivory panels.
 // Keep the two rear doors clear; their bays must not also contain framed artwork.
 for(const x of [-11.9,11.9])panel(wallFrame(scene,x,A.back-.24,Math.PI),2.6,4.3,3);
 // One UV-repeated strip per straight run: exact ends, no overlapping little image tiles at corners.
 const strip=(width:number,x:number,y:number,z:number,angle:number)=>{
  const f=hallImage(scene,'scroll',width,.46,x,y,z);f.rotation.y=angle;f.geometry=f.geometry.clone();const uv=f.geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*width/2.6);uv.needsUpdate=true;
 };
 for(const y of [A.balconyY-.36,13.4-.36]){
  for(const side of [-1,1])strip(A.back-A.front-2*A.balconyDepth,side*(inner-.035),y,(A.front+A.back)/2,-side*Math.PI/2);
  strip(inner*2,0,y,A.front+A.balconyDepth+.035,0);
  const spans=y<A.balconyY?[[-inner,-S.branchInner],[S.branchInner,inner]]:[[-inner,inner]];
  for(const [a,b]of spans)strip(b-a,(a+b)/2,y,A.back-A.balconyDepth-.035,Math.PI);
  for(const side of [-1,1])for(const dy of [-.34,.31])box(scene,[.24,.12,A.back-A.front-2*A.balconyDepth],[side*inner,y+dy,(A.front+A.back)/2],P.light);
  for(const z of [A.front+A.balconyDepth,A.back-A.balconyDepth])for(const dy of [-.34,.31]){const pieces=z>A.front+A.balconyDepth&&y<A.balconyY?spans:[[-inner,inner]];for(const[a,b]of pieces)box(scene,[b-a,.12,.24],[(a+b)/2,y+dy,z],P.light);}
  for(const x of [-inner,inner])for(const z of [A.front+A.balconyDepth,A.back-A.balconyDepth])box(scene,[.28,.8,.28],[x,y,z],P.gold);
 }
 // Continuous layered cornices use the same proportions and colours as the hall.
 for(const y of [13.75,19.2])for(const [dy,h,depth,color] of [[0,.14,.25,P.deep],[.18,.15,.4,P.gold],[.36,.12,.55,P.light]]){
  for(const side of [-1,1])box(scene,[depth,h,A.back-A.front],[side*(A.halfWidth-depth/2),y+dy,(A.front+A.back)/2],color);
  for(const z of [A.front+depth/2,A.back-depth/2])box(scene,[A.halfWidth*2-depth*2,h,depth],[0,y+dy,z],color);
 }
}
