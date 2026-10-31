import * as T from 'three';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {box,material} from './primitives';

/** The same finished wall plane and elevation grid apply around the entire hall. */
export const WALL_DATUM={halfWidth:H.width/2-.28,front:H.front+.28,rear:H.rear-.28};
export const WALL_LEVELS={cornices:[7.55,18.45,26.35,28.8],window:20.05,vent:8.6,panelY:13.6,panelHeight:9.1,lowerPanelY:3.4,lowerPanelHeight:5.4} as const;
const profiles=[{dy:0,height:.13,depth:.44},{dy:.18,height:.18,depth:.52},{dy:.38,height:.12,depth:.61}];

function rectangle(path:T.Path,x:number,front:number,rear:number,reverse=false){
 const points=[[-x,front],[x,front],[x,rear],[-x,rear]];if(reverse)points.reverse();
 path.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))path.lineTo(p[0],p[1]);path.closePath();
}
/** A single annular prism has mitred corners, with no overlapping coplanar end caps. */
function ringGeometry(depth:number){
 const shape=new T.Shape();rectangle(shape,WALL_DATUM.halfWidth+.1,WALL_DATUM.front-.1,WALL_DATUM.rear+.1);
 const hole=new T.Path();rectangle(hole,WALL_DATUM.halfWidth-depth,WALL_DATUM.front+depth,WALL_DATUM.rear-depth,true);shape.holes.push(hole);
 const geometry=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,curveSegments:1});geometry.rotateX(Math.PI/2);return geometry;
}
const rings=profiles.map(p=>ringGeometry(p.depth));
export function buildPerimeterCornices(scene:T.Scene){
 for(const y of WALL_LEVELS.cornices){
  profiles.forEach((p,i)=>{const mesh=new T.Mesh(rings[i],material(0xe7c77a));mesh.scale.y=p.height;mesh.position.y=y+p.dy+p.height/2;mesh.userData.landmark='perimeter-cornice';mesh.userData.elevation=y;mesh.userData.fullDetail=true;scene.add(mesh);});
  // Dentils follow the same lower edge on both side and end walls.
  const inset=.41,x=WALL_DATUM.halfWidth-inset,front=WALL_DATUM.front+inset,rear=WALL_DATUM.rear-inset;
  for(let z=front+.18;z<rear;z+=.36)for(const side of [-1,1])box(scene,[.25,.18,.13],[side*x,y-.16,z],0xc69b49);
  for(let xx=-x+.18;xx<x;xx+=.36)for(const z of [front,rear])box(scene,[.13,.18,.25],[xx,y-.16,z],0xc69b49);
 }
}

const plane=new T.PlaneGeometry(1,1);
export function buildPerimeterFriezes(scene:T.Scene,frieze:T.Material){
 const inset=.3,x=WALL_DATUM.halfWidth-inset,front=WALL_DATUM.front+inset,rear=WALL_DATUM.rear-inset;
 for(const [y,height]of [[17.95,.48],[27.75,1.05]]){
  for(const {width,position,yaw}of [
   {width:rear-front,position:[-x,y,(front+rear)/2],yaw:Math.PI/2},
   {width:rear-front,position:[x,y,(front+rear)/2],yaw:-Math.PI/2},
   {width:2*x,position:[0,y,front],yaw:0},
   {width:2*x,position:[0,y,rear],yaw:Math.PI},
  ]){
   const root=new T.Group();root.position.fromArray(position);root.rotation.y=yaw;scene.add(root);
   box(root,[width,height+.18,.16],[0,0,-.08],0x8e622a);
   const count=Math.ceil(width/2.1);for(let i=0;i<count;i++){const mesh=new T.Mesh(plane,frieze);mesh.scale.set(width/count,height,1);mesh.position.set(-width/2+(i+.5)*width/count,0,.02);mesh.userData.fullDetail=true;root.add(mesh);}
  }
 }
}
