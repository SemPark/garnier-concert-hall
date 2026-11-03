import * as T from 'three';

const jawPower=.65;
function buildFaceGeometry(columns:number,rows:number){
 const geometry=new T.SphereGeometry(1,columns,rows),points=geometry.getAttribute('position');
 for(let i=0;i<points.count;i++){const y=points.getY(i);if(y<0){points.setY(i,-Math.pow(-y,jawPower));points.setX(i,points.getX(i)*(1+.055*Math.sin(-y*Math.PI)));}}
 geometry.computeVertexNormals();return geometry;
}
export const faceGeometry=buildFaceGeometry(48,40),faceFarGeometry=buildFaceGeometry(16,12);

/** Front surface of the same cheek/jaw used by the head, in head-local metres. */
export function faceSurfaceZ(x:number,y:number){
 const height=(y-.03)/.345,u=height<0?-Math.pow(-height,1/jawPower):height;
 const fullness=u<0?1+.055*Math.sin(-u*Math.PI):1;
 return -.35*Math.sqrt(Math.max(0,1-u*u-(x/(.37*fullness))**2));
}
const ink=new T.MeshBasicMaterial({color:0x211b19,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
const white=new T.MeshBasicMaterial({color:0xfff8e9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const blush=new T.MeshBasicMaterial({color:0xe77e7c,transparent:true,opacity:.48,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
function ellipse(cx:number,cy:number,rx:number,ry:number,blink=false,blinkAnchor=cy){
 const p:number[]=[],index:number[]=[],closed:number[]=[],rings=4,segments=32;
 const put=(x:number,y:number)=>{p.push(x,y,faceSurfaceZ(x,y)-.0015);const yy=blinkAnchor+(y-blinkAnchor)*.1;closed.push(x,yy,faceSurfaceZ(x,yy)-.0015);};
 put(cx,cy);
 for(let r=1;r<=rings;r++)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;put(cx+Math.cos(a)*rx*r/rings,cy+Math.sin(a)*ry*r/rings);}
 for(let i=0;i<segments;i++)index.push(0,1+(i+1)%segments,1+i);
 for(let r=1;r<rings;r++)for(let i=0;i<segments;i++){const a=1+(r-1)*segments+i,b=1+(r-1)*segments+(i+1)%segments,c=a+segments,d=b+segments;index.push(a,b,c,b,d,c);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(index);g.computeVertexNormals();if(blink)g.morphAttributes.position=[new T.Float32BufferAttribute(closed,3)];return g;
}
function smile(){
 const p:number[]=[],index:number[]=[],steps=24;
 for(let i=0;i<=steps;i++){const t=i/steps,x=(t-.5)*.092,y=-.128-.024*Math.sin(t*Math.PI);for(const edge of [-1,1]){const yy=y+edge*.004; p.push(x,yy,faceSurfaceZ(x,yy)-.0018);}if(i<steps){const a=i*2;index.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(index);g.computeVertexNormals();return g;
}
const eyeShapes=[-1,1].map(side=>ellipse(side*.115,-.015,.043,.056,true));
const highlights=[-1,1].map(side=>ellipse(side*.103,.008,.012,.014,true,-.015));
const cheekShapes=[-1,1].map(side=>ellipse(side*.22,-.095,.065,.035));
const smileShape=smile();
export function paintFace(head:T.Group,eyes:T.Group){
 const add=(parent:T.Group,geometry:T.BufferGeometry,material:T.Material,part:string)=>{const mesh=new T.Mesh(geometry,material);mesh.userData.facePart=part;mesh.userData.surfaceDecal=true;parent.add(mesh);return mesh;};
 head.add(eyes);for(let i=0;i<2;i++){add(eyes,eyeShapes[i],ink,'eye');add(eyes,highlights[i],white,'eye-highlight');add(head,cheekShapes[i],blush,'blush');}add(head,smileShape,ink,'mouth');
}
