import * as T from 'three';

const jawPower=.45,jawHeight=.92;
// Rounded rectangular lower outline: upright cheeks and a broad, soft chin.
function jawWidth(y:number){
 const t=Math.pow(-y,jawPower);
 return .96*Math.cbrt(Math.max(0,1-t*t*t))/Math.sqrt(Math.max(1e-8,1-y*y));
}
// Keep the lower face forward, rounding into a flatter chin in profile.
function chinDepth(y:number){return Math.pow(Math.max(1e-6,1-y*y),-.2);}
function flattenFront(z:number){return z<0?-.9*Math.pow(-z,.72):z;}
function buildFaceGeometry(columns:number,rows:number){
 const geometry=new T.SphereGeometry(1,columns,rows),points=geometry.getAttribute('position');
 for(let i=0;i<points.count;i++){const y=points.getY(i);points.setX(i,points.getX(i)*(y<0?jawWidth(y):.96));if(y<0){points.setY(i,-jawHeight*Math.pow(-y,jawPower));if(points.getZ(i)<0)points.setZ(i,points.getZ(i)*chinDepth(y));}points.setZ(i,flattenFront(points.getZ(i)));}
 geometry.computeVertexNormals();return geometry;
}
export const faceGeometry=buildFaceGeometry(32,24),faceFarGeometry=buildFaceGeometry(16,12);

/** Front surface of the same cheek/jaw used by the head, in head-local metres. */
export function faceSurfaceZ(x:number,y:number){
 const height=(y-.03)/.345,u=height<0?-Math.pow(-height/jawHeight,1/jawPower):height;
 const fullness=u<0?jawWidth(u):.96;
 return .35*flattenFront(-Math.sqrt(Math.max(0,1-u*u-(x/(.37*fullness))**2))*(u<0?chinDepth(u):1));
}
const ink=new T.MeshBasicMaterial({color:0x211b19,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
const white=new T.MeshBasicMaterial({color:0xfff8e9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const blush=new T.MeshBasicMaterial({color:0xe77e7c,transparent:true,opacity:.48,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
// Flat marks on the face: a few rings are enough to follow its curve.
function ellipse(cx:number,cy:number,rx:number,ry:number,blink=false,blinkAnchor=cy,rings=2,segments=20,shut=.1){
 const p:number[]=[],index:number[]=[],closed:number[]=[];
 const put=(x:number,y:number)=>{
  p.push(x,y,faceSurfaceZ(x,y)-.0015);
  if(!blink)return;
  const u=(x-cx)/rx,v=(y-cy)/ry;
  // Map the ellipse to a thin rectangular stroke that follows the face surface.
  const toSquare=Math.hypot(u,v)/(Math.max(Math.abs(u),Math.abs(v))||1);
  const xx=shut===0?cx:cx+(x-cx)*toSquare;
  const yy=blinkAnchor+(y-cy)*toSquare*shut;
  closed.push(xx,yy,faceSurfaceZ(xx,yy)-.0015);
 };
 put(cx,cy);
 for(let r=1;r<=rings;r++)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;put(cx+Math.cos(a)*rx*r/rings,cy+Math.sin(a)*ry*r/rings);}
 for(let i=0;i<segments;i++)index.push(0,1+(i+1)%segments,1+i);
 for(let r=1;r<rings;r++)for(let i=0;i<segments;i++){const a=1+(r-1)*segments+i,b=1+(r-1)*segments+(i+1)%segments,c=a+segments,d=b+segments;index.push(a,b,c,b,d,c);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(index);g.computeVertexNormals();if(blink)g.morphAttributes.position=[new T.Float32BufferAttribute(closed,3)];return g;
}
function smile(){
 const p:number[]=[],index:number[]=[],steps=12;
 for(let i=0;i<=steps;i++){const t=i/steps,x=(t-.5)*.092,y=-.128-.024*Math.sin(t*Math.PI);for(const edge of [-1,1]){const yy=y+edge*.004; p.push(x,yy,faceSurfaceZ(x,yy)-.0018);}if(i<steps){const a=i*2;index.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(index);g.computeVertexNormals();return g;
}
const eyeShapes=[-1,1].map(side=>ellipse(side*.115,-.015,.043,.056,true));
// The catch-light stays where it is and is wiped away from the top as the lid comes down: no white in a shut eye.
const highlights=[-1,1].map(side=>ellipse(side*.103,.008,.012,.014,true,-.006,1,10,0));
const cheekShapes=[-1,1].map(side=>ellipse(side*.22,-.095,.065,.035));
const smileShape=smile();
export function paintFace(head:T.Group,eyes:T.Group){
 const add=(parent:T.Group,geometry:T.BufferGeometry,material:T.Material,part:string)=>{const mesh=new T.Mesh(geometry,material);mesh.userData.facePart=part;mesh.userData.surfaceDecal=true;parent.add(mesh);return mesh;};
 head.add(eyes);for(let i=0;i<2;i++){add(eyes,eyeShapes[i],ink,'eye');add(eyes,highlights[i],white,'eye-highlight');add(head,cheekShapes[i],blush,'blush');}add(head,smileShape,ink,'mouth');
}
