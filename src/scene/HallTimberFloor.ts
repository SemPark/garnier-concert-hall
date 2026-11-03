import * as T from 'three';
import {woodMaterial} from './HallTextures';
import {PARTERRE as P} from '../../shared/parterre';

type V={x:number;z:number;u:number;v:number};
/** Clip individual boards at the border, retaining their grain coordinates. */
function clip(poly:V[],axis:'x'|'z',bound:number,greater:boolean){
 const out:V[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],inside=(p:V)=>greater?p[axis]>=bound:p[axis]<=bound,ia=inside(a),ib=inside(b);if(ia)out.push(a);if(ia!==ib){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,u:a.u+(b.u-a.u)*t,v:a.v+(b.v-a.v)*t});}}return out;
}
/** A single mesh per floor region: interlocking oak herringbone with a straight three-board border. */
export function buildHallTimberFloor(scene:T.Scene,width:number,front:number,rear:number){
 const palette=[0xb69a7b,0xa48b70,0xc4ad91,0x927a61,0xb59e84,0xc6b297,0xaa8b68,0xd0b89a].map(c=>new T.Color(c));
 const positions:number[]=[],uv:number[]=[],colors:number[]=[],normals:number[]=[];
 const append=(poly:V[],tone:number|T.Color,y:number)=>{for(let i=1;i<poly.length-1;i++)for(const p of [poly[0],poly[i],poly[i+1]]){positions.push(p.x,y,p.z);normals.push(0,1,0);uv.push(p.u,p.v);const color=typeof tone==='number'?new T.Color(tone,tone*.985,tone*.96):tone;colors.push(color.r,color.g,color.b);}};
 const rect=(x0:number,x1:number,z0:number,z1:number,y:number,tone:number)=>append([{x:x0,z:z0,u:0,v:0},{x:x0,z:z1,u:0,v:(z1-z0)/3},{x:x1,z:z1,u:(x1-x0)/.8,v:(z1-z0)/3},{x:x1,z:z0,u:(x1-x0)/.8,v:0}],tone,y);
 const region=(f:number,r:number,y:number)=>{
  const border=.54,x0=-width/2+border,x1=width/2-border,z0=f+border,z1=r-border,w=.27,n=5,c=Math.SQRT1_2,gap=0;
  const extent=Math.ceil((width+(r-f))/(2*Math.SQRT2*w))+n,center=(r+f)/2;
  for(let j=-extent;j<=extent;j++)for(let i=-extent;i<=extent;i++){
   const phase=((i+j)%(2*n)+2*n)%(2*n);if(phase!==0&&phase!==n)continue;
   const horizontal=phase===0,dx=horizontal?n:1,dz=horizontal?1:n;
   const vertices=[[gap/2,gap/2],[gap/2,dz*w-gap/2],[dx*w-gap/2,dz*w-gap/2],[dx*w-gap/2,gap/2]];
   let poly:V[]=vertices.map(([a,b])=>({x:(i*w+a+j*w+b)*c,z:(j*w+b-i*w-a)*c+center,u:horizontal?b/w*.42:a/w*.42,v:horizontal?a/(n*w):b/(n*w)}));
   if(poly.every(p=>p.x<x0)||poly.every(p=>p.x>x1)||poly.every(p=>p.z<z0)||poly.every(p=>p.z>z1))continue;
   for(const [axis,bound,greater]of [['x',x0,true],['x',x1,false],['z',z0,true],['z',z1,false]] as const)poly=clip(poly,axis,bound,greater);
   const seed=((Math.imul(i,73856093)^Math.imul(j,19349663))>>>0);append(poly,palette[seed%palette.length],y);
  }
  for(let k=0;k<3;k++){const inset=k*.18;rect(-width/2+inset,width/2-inset,f+inset+.002,f+inset+.178,y,.91);rect(-width/2+inset,width/2-inset,r-inset-.178,r-inset-.002,y,.91);rect(-width/2+inset+.002,-width/2+inset+.178,f+inset+.18,r-inset-.18,y,.9);rect(width/2-inset-.178,width/2-inset-.002,f+inset+.18,r-inset-.18,y,.9);}
 };
 region(P.front,P.stairFront,P.floor);region(P.stairBack,rear,0);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const source=woodMaterial('floor'),material=source.clone();material.onBeforeCompile=source.onBeforeCompile;material.customProgramCacheKey=source.customProgramCacheKey;material.vertexColors=true;material.color.setHex(0xf5ecde);material.roughness=.78;material.envMapIntensity=.18;
 const timberCompile=material.onBeforeCompile;material.onBeforeCompile=(shader,renderer)=>{timberCompile(shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 parquetUv=vMapUv/vec2(.42,1.0),parquetEdge=min(fract(parquetUv),1.0-fract(parquetUv));
 vec2 parquetAA=max(fwidth(parquetUv),vec2(.0001));
 float joint=max(1.0-smoothstep(vec2(0.0),parquetAA*1.2,parquetEdge).x,1.0-smoothstep(vec2(0.0),parquetAA*1.2,parquetEdge).y);
 diffuseColor.rgb*=1.0-.12*joint;`);};material.customProgramCacheKey=()=> 'modu-herringbone-oak-v2';
 const floor=new T.Mesh(geometry,material);floor.receiveShadow=true;floor.userData.fullDetail=true;floor.userData.landmark='herringbone-parterre-floor';scene.add(floor);return floor;
}
