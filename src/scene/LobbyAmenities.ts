import * as T from 'three';
import {box,cylinder,sphere,line,text,material,C} from './primitives';
import {LOBBY_FURNITURE as F,COMPOSERS} from '../../shared/grandStair';

export type ProgramInfo={now:string;next:string;remaining:string;playing:boolean;seats:number;capacity:number};
export type ProgramBoard={update:(info:ProgramInfo)=>void};
const velvet=0x7c2430,brass=0xb8934f,walnut=0x5a3b25,marbleWhite=0xe8e1d3;

/** Box office, cloakroom, café, lounge, composer busts and the live programme board for the lobby. */
export function buildLobbyAmenities(scene:T.Scene,clickTargets:T.Object3D[]):{programBoard:ProgramBoard}{
 const hit=new T.MeshBasicMaterial({visible:false});
 // Box office: a panelled walnut booth with a brass grille, a sign, and a click target that opens the seat map.
 const booth=(f:{x:number;z:number;hx:number;hz:number},label:string,sub:string)=>{
  const g=new T.Group();g.position.set(f.x,0,f.z);scene.add(g);
  box(g,[f.hx*2,1.15,f.hz*2],[0,.58,0],walnut);box(g,[f.hx*2+.1,.08,f.hz*2+.1],[0,1.19,0],marbleWhite);
  for(let i=0;i<4;i++)box(g,[f.hx*2/4-.18,.8,.04],[-f.hx+(i+.5)*f.hx*2/4,.55,f.hz+.01],0x6e4a2e);
  box(g,[f.hx*2,1.6,.1],[0,2.05,-f.hz+.15],walnut);for(let x=-f.hx+.2;x<f.hx;x+=.22)line(g,new T.Vector3(x,1.25,.2),new T.Vector3(x,2.75,.2),.018,brass);
  box(g,[f.hx*2+.2,.18,f.hz*2+.2],[0,2.85,0],brass);box(g,[f.hx*2-.4,.55,.06],[0,3.25,.15],0x2c211a);
  text(g,label,f.hx*2-.6,[0,3.32,.19],'#f0d9a0');text(g,sub,f.hx*1.3,[0,3.08,.19],'#d8c08a');
  for(const x of [-f.hx+.5,f.hx-.5]){cylinder(g,.04,.35,[x,1.4,.3],brass);sphere(g,.12,[x,1.62,.3],0xfff0c6);}
  return g;
 };
 booth(F.boxOffice,'BILLETTERIE','매표소 · 좌석 선택');
 const target=new T.Mesh(new T.BoxGeometry(F.boxOffice.hx*2,3,F.boxOffice.hz*2+.6),hit);target.position.set(F.boxOffice.x,1.5,F.boxOffice.z);target.userData.boxOffice=true;scene.add(target);clickTargets.push(target);
 const cloak=booth(F.cloakroom,'VESTIAIRE','물품 보관소');
 for(let i=0;i<9;i++){const x=-2.2+i*.55,c=[0x2b2b33,0x5a3e2b,0x3d4a3a,0x6b2e2e][i%4];box(cloak,[.42,1.05,.18],[x,1.85,-.45],c);sphere(cloak,.06,[x,2.42,-.45],brass);}
 // Café: a marble-topped walnut bar along the wall, a mirrored back shelf with bottles, and standing tables.
 {const f=F.cafeCounter,g=new T.Group();g.position.set(f.x,0,f.z);scene.add(g);
  box(g,[f.hx*2,1.1,f.hz*2],[0,.55,0],walnut);box(g,[f.hx*2+.2,.08,f.hz*2+.1],[.05,1.14,0],marbleWhite);
  box(g,[.1,2.2,f.hz*2],[-.75,2.1,0],0x9fb3b8);for(const y of [1.6,2.2,2.8])box(g,[.3,.05,f.hz*2-.2],[-.6,y,0],brass);
  for(let i=0;i<24;i++){const z=-f.hz+.3+(i%12)*.65,y=i<12?1.78:2.38;cylinder(g,.06,.3,[-.6,y,z],[0x3c5c3a,0x7a2c22,0xd9c27a,0x2f3f5a][i%4]);}
  cylinder(g,.25,.45,[.1,1.4,-2],0x8d8d8d);box(g,[.5,.45,.4],[.1,1.4,2],0xa8a8a8);
  box(g,[.6,.5,.04],[-.7,3.6,0],0x2c211a);text(g,'CAFÉ',1.6,[-.66,3.6,0],'#f0d9a0').rotation.y=Math.PI/2;
  for(const t of F.cafeTables){cylinder(scene,.32,.05,[t.x,.03,t.z],brass);cylinder(scene,.05,1.05,[t.x,.55,t.z],brass);cylinder(scene,.42,.05,[t.x,1.08,t.z],marbleWhite);}}
 // Lounge: red velvet sofas against the wall and a round button ottoman, the Garnier "borne".
 for(const f of F.sofas){const g=new T.Group();g.position.set(f.x,0,f.z);scene.add(g);
  box(g,[.9,.42,2.5],[0,.32,0],velvet);box(g,[.25,.9,2.6],[.38,.75,0],velvet);for(const z of [-1.25,1.25])box(g,[.9,.62,.18],[0,.5,z],velvet);
  for(const z of [-1.2,1.2])for(const x of [-.35,.35])cylinder(g,.04,.12,[x,.06,z],brass);box(g,[.92,.05,2.6],[0,.54,0],0x8f2d3a);}
 {const f=F.ottoman;cylinder(scene,f.hx,.45,[f.x,.3,f.z],velvet);cylinder(scene,f.hx*.45,.8,[f.x,.85,f.z],velvet);cylinder(scene,f.hx*.48,.1,[f.x,1.28,f.z],brass);cylinder(scene,.12,.9,[f.x,1.75,f.z],brass);sphere(scene,.2,[f.x,2.25,f.z],0xfff0c6);}
 // Composer busts on marble pedestals between the foyer columns, facing the walkway.
 F.busts.forEach((f,i)=>{const g=new T.Group();g.position.set(f.x,0,f.z);g.rotation.y=f.x<0?Math.PI/2:-Math.PI/2;scene.add(g);
  box(g,[.6,1.3,.6],[0,.65,0],0x8f4a35);box(g,[.72,.1,.72],[0,1.35,0],marbleWhite);
  box(g,[.55,.32,.3],[0,1.56,0],marbleWhite);sphere(g,.2,[0,1.92,0],marbleWhite);sphere(g,.21,[0,1.99,-.03],0xdcd4c4);
  box(g,[.5,.16,.02],[0,1.05,.31],brass);text(g,COMPOSERS[i],.5,[0,1.05,.33],'#3a2a1c');});
 // Programme board beside the hall door: an easel frame around a canvas redrawn from the live playback.
 const f=F.programBoard,g=new T.Group();g.position.set(f.x,0,f.z);g.rotation.y=-.35;scene.add(g);
 for(const x of [-.6,.6])line(g,new T.Vector3(x,0,.25),new T.Vector3(x*.8,2.7,0),.04,brass);line(g,new T.Vector3(0,0,-.35),new T.Vector3(0,2.5,0),.04,brass);
 box(g,[1.4,2,.08],[0,1.75,0],0x2c211a);
 const canvas=typeof document==='undefined'?null:document.createElement('canvas'),ctx=canvas?.getContext('2d')??null;
 const map=canvas?new T.CanvasTexture(canvas):null;if(canvas){canvas.width=320;canvas.height=460;}if(map)map.colorSpace=T.SRGBColorSpace;
 const face=new T.Mesh(new T.PlaneGeometry(1.26,1.84),new T.MeshBasicMaterial({map,color:map?0xffffff:0x2c211a}));face.position.set(0,1.75,.05);face.userData.programBoard=true;g.add(face);
 let last='';
 const update=(info:ProgramInfo)=>{if(!ctx||!canvas||!map)return;const key=JSON.stringify(info);if(key===last)return;last=key;
  ctx.fillStyle='#231a14';ctx.fillRect(0,0,320,460);ctx.strokeStyle='#c9a250';ctx.lineWidth=4;ctx.strokeRect(10,10,300,440);
  ctx.fillStyle='#c9a250';ctx.textAlign='center';ctx.font='600 22px Georgia, serif';ctx.fillText('PROGRAMME',160,52);ctx.font='15px sans-serif';ctx.fillStyle='#e7d7b5';ctx.fillText('오늘의 프로그램',160,76);
  const wrap=(t:string,y:number,size:number,color:string)=>{ctx.font=`${size}px sans-serif`;ctx.fillStyle=color;let line='',yy=y;for(const ch of t){if(ctx.measureText(line+ch).width>270){ctx.fillText(line,160,yy);line='';yy+=size+6;}line+=ch;}ctx.fillText(line,160,yy);return yy;};
  ctx.fillStyle='#c9a250';ctx.font='13px sans-serif';ctx.fillText(info.playing?'지금 연주 중':'잠시 쉬는 시간',160,118);
  let y=wrap(info.now,146,19,'#fbf1dc');ctx.fillStyle='#bfae8c';ctx.font='14px sans-serif';ctx.fillText(info.remaining,160,y+28);
  ctx.fillStyle='#c9a250';ctx.font='13px sans-serif';ctx.fillText('다음 곡',160,y+70);y=wrap(info.next,y+96,16,'#e7d7b5');
  ctx.strokeStyle='#6b5536';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(40,380);ctx.lineTo(280,380);ctx.stroke();
  const full=info.seats>=info.capacity;ctx.font='600 18px sans-serif';ctx.fillStyle=full?'#e08a7a':'#a8d0a0';ctx.fillText(full?'만석 · 잠시 기다려 주세요':'입장 가능',160,412);
  ctx.font='13px sans-serif';ctx.fillStyle='#d8c8a8';ctx.fillText(`공연장 ${info.seats} / ${info.capacity}석`,160,436);map.needsUpdate=true;};
 return {programBoard:{update}};
}
