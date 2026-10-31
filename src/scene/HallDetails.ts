import * as T from 'three';
import {box,cylinder,sphere,line,material} from './primitives';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {hallImageMaterial,applyWoodSurface} from './HallTextures';
const gold=0xc69b49,light=0xe6c882,dark=0x44301e;
const ring=new T.TorusGeometry(1,.026,6,48);
// The photographed fixture has a narrow crown, a widening skirt and a round bowl.
export const CHANDELIER_PROFILE=[[.12,0],[.44,.08],[.83,.29],[1.1,.63],[1.23,1.02],[1.2,1.17],[.93,1.32],[.79,2.1],[.62,3.05],[.45,3.8],[.43,3.94]] as const;
const silhouette=new T.LatheGeometry(CHANDELIER_PROFILE.map(([r,y])=>new T.Vector2(r,y)),40);
let crystalSkin:T.MeshLambertMaterial|undefined;
function crystalMaterial(){
 if(crystalSkin)return crystalSkin;
 const w=192,h=128,data=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=(y*w+x)*4,strand=x%8<4,bead=(y%8-4)**2+(x%8-2)**2<8;const shine=bead?255:strand?225:132;data[n]=shine;data[n+1]=shine;data[n+2]=Math.min(255,shine+10);data[n+3]=strand||bead?255:0;}
 const map=new T.DataTexture(data,w,h);map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;
 return crystalSkin=new T.MeshLambertMaterial({color:0xf5f5ed,map,alphaTest:.35,side:T.DoubleSide,emissive:0xb9c7cb,emissiveIntensity:.3});
}
export function crystalChandelier(scene:T.Scene,x:number,z:number){
 const g=new T.Group();g.position.set(x,17.5,z);g.userData.landmark='crystal-chandelier';scene.add(g);
 cylinder(g,.018,H.height-21.44,[0,(H.height-21.44)/2+3.94,0],dark);
 const skin=new T.Mesh(silhouette,crystalMaterial());skin.userData.fullDetail=true;skin.userData.crystalSilhouette=true;g.add(skin);
 for(const [r,y]of [[.45,3.94],[1.23,1.08],[.83,.3]]){const rim=new T.Mesh(ring,material(light,.6,.28));rim.rotation.x=Math.PI/2;rim.scale.set(r,r,1);rim.position.y=y;rim.userData.fullDetail=true;g.add(rim);}
 const crystal=material(0xeef3ef,.05,.25);crystal.emissive.setHex(0xc0d4df);crystal.emissiveIntensity=.25;
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2;for(let j=1;j<11;j++){const y=j/10*3.8;let lo:readonly [number,number]=CHANDELIER_PROFILE[0],hi:readonly [number,number]=CHANDELIER_PROFILE[1];for(let k=1;k<CHANDELIER_PROFILE.length;k++)if(y<=CHANDELIER_PROFILE[k][1]){lo=CHANDELIER_PROFILE[k-1];hi=CHANDELIER_PROFILE[k];break;}const r=lo[0]+(hi[0]-lo[0])*(y-lo[1])/(hi[1]-lo[1]);const bead=sphere(g,.035,[Math.cos(a)*r,y,Math.sin(a)*r],0xeaf0ec);bead.scale.y*=1.65;bead.material=crystal;bead.userData.lodMax=29;}}
 // One internal emissive bulb; shared hall lights provide illumination cheaply.
 const bulb=sphere(g,.15,[0,1.15,0],0xfff4d9);bulb.material=material(0xfff4d9);bulb.material.emissive.setHex(0xffe7bc);bulb.material.emissiveIntensity=1.4;
}
/** Shared ornament images replace per-bay painted canvases and fine mesh decoration. */
export function friezeMaterial(){return hallImageMaterial('scroll');}
// Four UV quadrants share one WebP texture; no per-panel image downloads or canvases.
const frescoGeometry=Array.from({length:4},(_,variant)=>{
 const geometry=new T.PlaneGeometry(1,1),uv=geometry.getAttribute('uv'),col=variant%2,row=Math.floor(variant/2);
 for(let i=0;i<uv.count;i++)uv.setXY(i,col*.5+.003+uv.getX(i)*.494,(1-row)*.5+.003+uv.getY(i)*.494);
 return geometry;
});
function addCeilingFresco(g:T.Group,variant:number,x:number,width:number,height:number){
 const mesh=new T.Mesh(frescoGeometry[variant],hallImageMaterial('fresco'));mesh.scale.set(width,height,1);mesh.rotation.x=Math.PI/2;mesh.position.set(x,-.095,0);mesh.userData.landmark='ceiling-fresco';mesh.userData.variant=variant;mesh.userData.fullDetail=true;g.add(mesh);
 for(const edge of [-1,1]){
  box(g,[width+.10,.035,.045],[x,-.108,edge*height/2],light).userData.fullDetail=true;
  box(g,[.045,.035,height],[x+edge*width/2,-.108,0],light).userData.fullDetail=true;
 }
 return mesh;
}
export function paintedCeiling(scene:T.Scene){
 const backing=box(scene,[H.width,.35,H.rear-H.front],[0,H.height,(H.front+H.rear)/2],0x5b3e20);applyWoodSurface(backing,'walnut');backing.userData.landmark='ceiling-timber-backing';
 // Each transverse beam is built once at a boundary, avoiding doubled coplanar joins.
 let sharedBeam:T.BufferGeometry|undefined;for(const z of [...H.bayCenters.map(z=>z-3),H.bayCenters.at(-1)!+3]){const beam:T.Mesh=box(scene,[30.2,.24,.28],[0,H.height-.36,z],dark);applyWoodSurface(beam,'walnut');if(sharedBeam){beam.geometry.dispose();beam.geometry=sharedBeam;}else sharedBeam=beam.geometry;beam.userData.landmark='ceiling-timber-beam';}
 for(const x of [-15.12,15.12]){const beam=box(scene,[.30,.20,78],[x,H.height-.35,12],dark);applyWoodSurface(beam,'walnut');beam.userData.landmark='ceiling-timber-beam';}
 const materials=[hallImageMaterial('ceiling1'),hallImageMaterial('ceiling2')],panel=new T.PlaneGeometry(29.5,5.5);
 H.bayCenters.forEach((z,i)=>{const g=new T.Group();g.position.set(0,H.height-.28,z);g.userData.landmark='painted-coffer';scene.add(g);const image=new T.Mesh(panel,materials[i%2]);image.rotation.x=Math.PI/2;image.position.y=-.08;image.userData.fullDetail=true;g.add(image);
  addCeilingFresco(g,i%4,0,4.84,3.24);
  if(i%2===1){addCeilingFresco(g,(i+1)%4,-9.85,3.92,3.03);addCeilingFresco(g,(i+2)%4,9.85,3.92,3.03);}
  for(const dz of [-2.88,2.88]){box(g,[30.2,.2,.18],[0,-.05,dz],gold);box(g,[30.2,.08,.07],[0,-.19,dz],light);}
  for(const x of [-15.12,15.12]){box(g,[.2,.16,5.85],[x,-.03,0],gold);box(g,[.07,.08,5.85],[x,-.16,0],light);}
 });
 for(const x of [-15.7,15.7])for(const [dy,w]of [[0,.4],[-.22,.65],[-.47,.85]])box(scene,[w,.18,H.rear-H.front],[x,H.height-.25+dy,(H.front+H.rear)/2],gold);
}
