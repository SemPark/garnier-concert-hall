import * as T from 'three';
import {box,cylinder,sphere,line,text,material,C} from './primitives';
import {LOBBY_FURNITURE as F,COMPOSERS} from '../../shared/grandStair';

export type ProgramInfo={now:string;next:string;remaining:string;playing:boolean;seats:number;capacity:number};
export type ProgramBoard={update:(info:ProgramInfo)=>void};
const velvet=0x7c2430,brass=0xb8934f,walnut=0x5a3b25,marbleWhite=0xe8e1d3;

/** Box office, cloakroom, café, lounge, composer busts and the live programme board for the lobby. */
export function buildLobbyAmenities(scene:T.Scene,clickTargets:T.Object3D[]):{programBoard:ProgramBoard}{
 const hit=new T.MeshBasicMaterial({visible:false});
 const goldTrim=0xc9a250,glass=new T.MeshLambertMaterial({color:0x2a3238,transparent:true,opacity:.35});
 // Both sit in the first ground-tier arcade bay, so the stone arch frames them. Local frame: +z faces the hall, the
 // arch face is z=0, the bay runs back to the outer wall at about z=-1.85, x runs along the bay (opening 4.1 wide).
 const inBay=(f:{x:number;z:number})=>{const g=new T.Group();g.position.set(Math.sign(f.x)*13.15,0,f.z);g.rotation.y=f.x<0?Math.PI/2:-Math.PI/2;scene.add(g);return g;};
 const plaque=(g:T.Group,label:string)=>{box(g,[2.6,.55,.08],[0,5.62,.05],0x7a3428);box(g,[2.75,.66,.06],[0,5.62,.02],goldTrim);text(g,label,2.3,[0,5.64,.1],'#f3dc9c');
  for(const x of [-2.32,2.32]){cylinder(g,.04,.4,[x,3.45,.18],brass);sphere(g,.14,[x,3.75,.18],0xfff0c6);}};
 // Box office, after the ticket windows of 19th-century theatres: the arch is closed by a walnut base with a marble
 // counter, a glazed screen in gilt mullions with three brass-grilled ticket windows, and a glazed lunette above.
 {const g=inBay(F.boxOffice),w=4.1;
  box(g,[w,1.05,.3],[0,.53,-.2],walnut);for(let i=0;i<3;i++){const x=-w/2+(i+.5)*w/3;box(g,[w/3-.3,.62,.04],[x,.55,-.03],0x6e4a2e);box(g,[w/3-.44,.48,.03],[x,.55,0],0x7d5636);}
  box(g,[w+.1,.08,.6],[0,1.09,-.05],0xe8e1d3);box(g,[w+.12,.05,.62],[0,1.03,-.05],goldTrim);
  const pane=new T.Mesh(new T.PlaneGeometry(w,1.98),glass);pane.position.set(0,2.11,-.3);pane.userData.fullDetail=true;g.add(pane);
  for(const x of [-w/2+.06,-w/6,w/6,w/2-.06]){box(g,[.12,1.98,.12],[x,2.11,-.28],goldTrim);}box(g,[w,.1,.14],[0,3.1,-.28],goldTrim);
  for(let i=0;i<3;i++){const x=-w/2+(i+.5)*w/3;box(g,[.5,.24,.06],[x,1.25,-.26],0x1d1712);for(let k=-3;k<=3;k++)line(g,new T.Vector3(x+k*.1,1.2,-.25),new T.Vector3(x+k*.1,1.85,-.25),.012,brass);}
  const lunette=new T.Mesh(new T.CircleGeometry(2.05,24,0,Math.PI),glass);lunette.position.set(0,3.1,-.3);lunette.userData.fullDetail=true;g.add(lunette);
  for(let k=1;k<6;k++){const a=k/6*Math.PI;line(g,new T.Vector3(0,3.1,-.28),new T.Vector3(Math.cos(a)*2.05,3.1+Math.sin(a)*2.05,-.28),.025,goldTrim);}
  box(g,[w,2.2,.06],[0,2.2,-1.65],0x4a3020);for(let r=0;r<4;r++)for(let c=0;c<9;c++)box(g,[.32,.24,.14],[-1.6+c*.4,1.6+r*.34,-1.58],0x3a2618);
  plaque(g,'BILLETTERIE');
  const target=new T.Mesh(new T.BoxGeometry(w,3,1),hit);target.position.set(0,1.6,0);target.userData.boxOffice=true;g.add(target);clickTargets.push(target);}
 // Cloakroom: a marble-topped counter across the arch with a bell and brass tokens; behind it, in the bay, two rows
 // of coats on rails with numbered tags, hats on the shelf above, against a red wall.
 {const g=inBay(F.cloakroom),w=4.1;
  box(g,[w,1.0,.55],[0,.5,-.15],walnut);box(g,[w+.1,.08,.72],[0,1.04,-.1],0xe8e1d3);for(let i=0;i<4;i++)box(g,[w/4-.25,.6,.03],[-w/2+(i+.5)*w/4,.52,.14],0x6e4a2e);
  cylinder(g,.09,.05,[w/2-.4,1.11,0],brass);sphere(g,.06,[w/2-.4,1.17,0],brass);for(let i=0;i<8;i++)cylinder(g,.05,.012,[-w/2+.5+i*.14,1.09,0],brass);
  box(g,[w,3.4,.06],[0,1.9,-1.65],0x7c2430);for(const y of [.25,3.55])box(g,[w,.1,.08],[0,y,-1.61],goldTrim);
  const coats=[0x2b2b33,0x5a3e2b,0x3d4a3a,0x6b2e2e,0x1f2a3a,0x7a6a55,0x3a3a3a,0x4a2a3a];
  for(const [y,z] of [[1.5,-.95],[1.5,-1.5]] as const){line(g,new T.Vector3(-w/2+.1,y+.85,z),new T.Vector3(w/2-.1,y+.85,z),.02,brass);
   for(let i=0;i<11;i++){const x=-w/2+.3+i*(w-.6)/10,c=coats[(i*3+(z<-1.2?1:0))%coats.length];box(g,[.28,1.05+((i*7)%3)*.08,.22],[x,y+.25,z],c);box(g,[.12,.12,.12],[x,y+.8,z],c);line(g,new T.Vector3(x-.13,y+.82,z),new T.Vector3(x+.13,y+.82,z),.012,0xa0a0a0);box(g,[.07,.09,.01],[x+.09,y+.7,z+.12],0xe8d9a8);}}
  box(g,[w,.05,.4],[0,3.25,-1.55],walnut);for(let i=0;i<8;i++){const x=-w/2+.35+i*(w-.7)/7,c=coats[i%coats.length];cylinder(g,.15,.12,[x,3.34,-1.55],c);cylinder(g,.22,.02,[x,3.29,-1.55],c);}
  plaque(g,'VESTIAIRE');}
 // Café: a marble-topped walnut bar along the wall, a mirrored back shelf with bottles, and standing tables.
 {const f=F.cafeCounter,g=new T.Group();g.position.set(f.x,0,f.z);scene.add(g);
  box(g,[f.hx*2,1.1,f.hz*2],[0,.55,0],walnut);box(g,[f.hx*2+.2,.08,f.hz*2+.1],[.05,1.14,0],marbleWhite);
  const backsplash=box(g,[.06,2.2,f.hz*2],[-.25,2.1,0],0x9fb3b8);backsplash.userData.fullDetail=true;backsplash.userData.cameraWall=true;for(const y of [1.6,2.2,2.8])box(g,[.35,.05,f.hz*2-.2],[-.18,y,0],brass);
  for(let i=0;i<24;i++){const z=-f.hz+.3+(i%12)*(f.hz*2-.6)/11,y=i<12?1.78:2.38;cylinder(g,.06,.3,[-.12,y,z],[0x3c5c3a,0x7a2c22,0xd9c27a,0x2f3f5a][i%4]);}
  cylinder(g,.25,.45,[.1,1.4,-2],0x8d8d8d);box(g,[.5,.45,.4],[.1,1.4,2],0xa8a8a8);
  box(g,[.04,.5,1.6],[-.25,3.2,0],0x2c211a);text(g,'CAFÉ',1.6,[-.215,3.2,0],'#f0d9a0').rotation.y=Math.PI/2;
  for(const t of F.cafeTables){cylinder(scene,.32,.05,[t.x,.03,t.z],brass);cylinder(scene,.05,1.05,[t.x,.55,t.z],brass);cylinder(scene,.42,.05,[t.x,1.08,t.z],marbleWhite);}}
 // Lounge: red velvet sofas against the wall and a round button ottoman, the Garnier "borne".
 for(const f of F.sofas){const g=new T.Group();g.position.set(f.x,0,f.z);scene.add(g);
  box(g,[.9,.42,2.5],[0,.32,0],velvet);box(g,[.25,.9,2.6],[.38,.75,0],velvet);for(const z of [-1.25,1.25])box(g,[.9,.62,.18],[0,.5,z],velvet);
  for(const z of [-1.2,1.2])for(const x of [-.35,.35])cylinder(g,.04,.12,[x,.06,z],brass);box(g,[.92,.05,2.6],[0,.54,0],0x8f2d3a);}
 {const f=F.ottoman;cylinder(scene,f.hx,.45,[f.x,.3,f.z],velvet);cylinder(scene,f.hx*.45,.8,[f.x,.85,f.z],velvet);cylinder(scene,f.hx*.48,.1,[f.x,1.28,f.z],brass);cylinder(scene,.12,.9,[f.x,1.75,f.z],brass);sphere(scene,.2,[f.x,2.25,f.z],0xfff0c6);}
 // Seated composer statues flanking the entrance arch on tall stone pedestals.
 F.busts.forEach((f,i)=>{const g=new T.Group();g.position.set(f.x,0,f.z);g.scale.setScalar(1.3);scene.add(g);const st=0xd8cdb8;
  box(g,[1.5,.3,1.5],[0,.15,0],0xb39467);box(g,[1.3,1.9,1.3],[0,1.25,0],0xcbb48a);box(g,[1.5,.22,1.5],[0,2.31,0],0xb39467);
  box(g,[.9,.75,.8],[0,2.8,-.15],st);box(g,[.85,.9,.3],[0,3.6,-.45],st);cylinder(g,.33,.95,[0,3.55,-.05],st);sphere(g,.24,[0,4.25,-.05],st);
  for(const side of [-1,1]){box(g,[.26,.22,.8],[side*.2,3.0,.35],st);box(g,[.22,.75,.24],[side*.2,2.6,.72],st);line(g,new T.Vector3(side*.33,3.85,-.05),new T.Vector3(side*.4,3.15,.35),.09,st);}
  box(g,[.9,.24,.02],[0,1.45,.66],brass);text(g,COMPOSERS[i],.85,[0,1.45,.68],'#3a2a1c');});
 // Programme board at the foot of the flight: an easel frame around a canvas redrawn from the live playback.
 const f=F.programBoard,g=new T.Group();g.position.set(f.x,0,f.z);g.rotation.y=Math.PI-.5;scene.add(g);
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
