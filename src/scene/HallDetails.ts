import * as T from 'three';
import {box,cylinder,sphere,line,material} from './primitives';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
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
function leaf(c:CanvasRenderingContext2D,x:number,y:number,r:number,a:number){c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(r*.3,-r*.8,r,-r*.8,r,0);c.bezierCurveTo(r,r*.5,r*.3,r*.5,0,0);c.fill();c.stroke();c.restore();}
function scroll(c:CanvasRenderingContext2D,x:number,y:number,r:number){
 c.save();c.translate(x,y);c.lineWidth=2;c.strokeStyle='#d7b46a';c.fillStyle='#ae7f39';for(const sign of [-1,1]){c.beginPath();for(let i=0;i<=90;i++){const a=i/90*Math.PI*3,rad=r*(1-i/110);const xx=sign*Math.cos(a)*rad,yy=Math.sin(a)*rad*.63;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.stroke();for(let i=0;i<6;i++)leaf(c,sign*(i-2.5)*r*.32,Math.sin(i)*r*.25,r*.36,sign*i*.65);}c.restore();
}
let friezeMat:T.MeshLambertMaterial|undefined;
export function friezeMaterial(){
 if(friezeMat)return friezeMat;const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;const c=canvas.getContext('2d')!;c.fillStyle='#3c2b1d';c.fillRect(0,0,512,192);
 for(const inset of [5,12]){c.strokeStyle=inset===5?'#f0d296':'#a16f2f';c.lineWidth=4;c.strokeRect(inset,inset,512-inset*2,192-inset*2);}
 scroll(c,128,96,85);scroll(c,384,96,85);c.strokeStyle='#e2c486';c.lineWidth=4;c.beginPath();c.ellipse(256,96,35,58,0,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(245,55);c.lineTo(236,124);c.quadraticCurveTo(256,147,276,124);c.lineTo(267,55);c.stroke();for(let i=0;i<5;i++){c.beginPath();c.moveTo(247+i*5,62);c.lineTo(243+i*6,123);c.stroke();}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;return friezeMat=new T.MeshLambertMaterial({map:texture,emissive:0x65471e,emissiveIntensity:.12});
}
function border(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){for(const [inset,color,lw]of [[0,'#e3c483',4],[6,'#6f4824',4],[11,'#d4a952',3],[17,'#281d16',4]] as const){c.strokeStyle=color;c.lineWidth=lw;c.strokeRect(x+inset,y+inset,w-inset*2,h-inset*2);}}
function painting(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,seed:number){
 c.save();c.beginPath();c.rect(x,y,w,h);c.clip();const bg=c.createLinearGradient(x,y,x+w,y+h);bg.addColorStop(0,'#416c79');bg.addColorStop(.65,'#658685');bg.addColorStop(1,'#bdad8c');c.fillStyle=bg;c.fillRect(x,y,w,h);
 for(let i=0;i<15;i++){c.fillStyle=i%2?'#c5bca43b':'#dfcfaf47';c.beginPath();c.ellipse(x+(i*73+seed*41)%w,y+(i*37)%h,w*.22,h*.1,.1,0,Math.PI*2);c.fill();}
 for(let i=0;i<3;i++){c.save();c.translate(x+w*(.27+i*.23),y+h*(.42+(i%2)*.16));c.rotate((i-1)*.55+seed*.07);const s=h*.028;c.scale(s,s);c.fillStyle=['#a8563f','#b29c6d','#444e59'][(i+seed)%3];c.beginPath();c.moveTo(-2,-1);c.bezierCurveTo(-5,3,-7,5,-11,7);c.bezierCurveTo(-3,10,3,9,7,4);c.lineTo(2,-2);c.closePath();c.fill();c.fillStyle='#cda57d';c.beginPath();c.ellipse(0,-3,1.05,1.4,.15,0,Math.PI*2);c.fill();c.strokeStyle='#bf936d';c.lineWidth=.85;c.lineCap='round';c.beginPath();c.moveTo(-1.8,-.5);c.lineTo(-5,-2.5);c.lineTo(-7,-5);c.moveTo(1.8,-.5);c.lineTo(5,0);c.lineTo(7,-2);c.moveTo(-1,4);c.lineTo(-3,7);c.lineTo(-6,8);c.moveTo(2,4);c.lineTo(6,5);c.lineTo(8,4);c.stroke();c.restore();}
 c.restore();border(c,x,y,w,h);
}
function ceilingTexture(seed:number){
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=384;const c=canvas.getContext('2d')!;c.fillStyle='#80602f';c.fillRect(0,0,1536,384);border(c,3,3,1530,378);
 for(let x=35;x<1520;x+=28){c.fillStyle='#d4ad5f';c.beginPath();c.arc(x,24,3.5,0,Math.PI*2);c.arc(x,360,3.5,0,Math.PI*2);c.fill();}
 painting(c,575,55,386,274,seed);
 for(const center of [280,1256]){c.save();c.translate(center,192);if(seed%2===0){c.rotate(.12*(center<700?-1:1));painting(c,-160,-115,320,230,seed+1);}else{c.fillStyle='#604121';c.beginPath();c.ellipse(0,0,165,142,0,0,Math.PI*2);c.fill();for(const r of [130,140]){c.strokeStyle='#d4b579';c.lineWidth=5;c.beginPath();c.ellipse(0,0,r*1.1,r,0,0,Math.PI*2);c.stroke();}scroll(c,0,0,92);}c.restore();}
 for(const center of [505,1031]){c.save();c.translate(center,192);c.rotate(Math.PI/4);c.fillStyle='#263d39';c.fillRect(-36,-36,72,72);border(c,-45,-45,90,90);c.restore();scroll(c,center,78,33);scroll(c,center,310,33);}
 for(const center of [62,1474])scroll(c,center,192,47);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return new T.MeshLambertMaterial({map:texture,emissive:0x65471e,emissiveIntensity:.12});
}
export function paintedCeiling(scene:T.Scene){
 box(scene,[H.width,.35,H.rear-H.front],[0,H.height,(H.front+H.rear)/2],0x5b3e20);
 const materials=[0,1,2].map(ceilingTexture),panel=new T.PlaneGeometry(29.5,5.5);
 H.bayCenters.forEach((z,i)=>{const g=new T.Group();g.position.set(0,H.height-.28,z);g.userData.landmark='painted-coffer';scene.add(g);const image=new T.Mesh(panel,materials[i%3]);image.rotation.x=Math.PI/2;image.position.y=-.08;g.add(image);
  for(const dz of [-2.88,2.88]){box(g,[30.2,.2,.18],[0,-.05,dz],gold);box(g,[30.2,.08,.07],[0,-.19,dz],light);}
  for(const x of [-15.12,15.12]){box(g,[.2,.16,5.85],[x,-.03,0],gold);box(g,[.07,.08,5.85],[x,-.16,0],light);}
 });
 for(const x of [-15.7,15.7])for(const [dy,w]of [[0,.4],[-.22,.65],[-.47,.85]])box(scene,[w,.18,H.rear-H.front],[x,H.height-.25+dy,(H.front+H.rear)/2],gold);
}
