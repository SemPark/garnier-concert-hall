import * as T from 'three';
import {box} from './primitives';
import {LOBBY_FURNITURE as F} from '../../shared/grandStair';
import type {ProgramBoard,ProgramInfo} from './LobbyAmenities';

/** Static portrait of our own Avatar conductor; programme text stays live and separate. */
export function buildProgramBoard(scene:T.Scene):ProgramBoard{
 const g=new T.Group(),f=F.programBoard;g.position.set(f.x,0,f.z);g.rotation.y=Math.PI-.5;scene.add(g);
 const brass=0xb8934f;
 box(g,[2.2,.12,.75],[0,.06,0],brass);
 for(const x of [-1,1])box(g,[.08,3.96,.1],[x,2.04,0],brass);
 box(g,[2.04,3.48,.14],[0,2.24,0],0x38261b);
 for(const x of [-1.02,1.02])box(g,[.07,3.55,.18],[x,2.24,.015],brass);
 for(const y of [.48,4])box(g,[2.1,.07,.18],[0,y,.015],brass);
 const canvas=typeof document==='undefined'?null:document.createElement('canvas');
 if(canvas){canvas.width=1200;canvas.height=2010;}
 const ctx=canvas?.getContext('2d'),map=canvas?new T.CanvasTexture(canvas):null;
 if(map){map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;}
 const face=new T.Mesh(new T.PlaneGeometry(1.96,3.283),new T.MeshBasicMaterial({map,toneMapped:false,color:map?0xffffff:0x251d19}));
 face.position.set(0,2.24,.085);face.userData.programBoard=true;face.userData.cameraWall=true;g.add(face);
 g.traverse(o=>{o.userData.fullDetail=true;o.userData.preserveSilhouette=true;});
 let portrait:HTMLImageElement|undefined,last='',current:ProgramInfo|undefined;
 const update=(info:ProgramInfo)=>{
  current=info;if(!canvas||!ctx||!map)return;const key=JSON.stringify(info);if(last===key)return;last=key;
  ctx.setTransform(3,0,0,3,0,0);ctx.fillStyle='#fff9ed';ctx.fillRect(0,0,400,670);
  ctx.strokeStyle='#c9a250';ctx.lineWidth=1.5;ctx.strokeRect(8,8,384,654);
  // Illustrated moonlit concert poster, with our actual character layered over the scenery.
  const sky=ctx.createLinearGradient(0,16,0,312);sky.addColorStop(0,'#173d4a');sky.addColorStop(.6,'#426b76');sky.addColorStop(1,'#8ba4a1');
  ctx.fillStyle=sky;ctx.fillRect(16,16,368,296);
  const halo=ctx.createRadialGradient(200,220,8,200,220,123);halo.addColorStop(0,'#e8d8aa88');halo.addColorStop(1,'#d7dfc900');ctx.fillStyle=halo;ctx.fillRect(60,115,280,197);
  ctx.fillStyle='#f6dda0';ctx.beginPath();ctx.arc(335,55,18,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#254d5a';ctx.beginPath();ctx.arc(342,49,16,0,Math.PI*2);ctx.fill();
  for(const [x,y,r] of [[44,49,2],[76,118,2],[351,122,2.5],[315,153,1.5],[49,184,2],[358,205,1.5],[92,157,1],[301,28,1],[38,259,1.5]]){
   ctx.fillStyle='#f4dfac';ctx.beginPath();ctx.moveTo(x,y-r*2);ctx.lineTo(x+r*.6,y);ctx.lineTo(x,y+r*2);ctx.lineTo(x-r*.6,y);ctx.closePath();ctx.fill();
  }
  // A gilt arcade and a quiet silhouette of an old European street.
  ctx.strokeStyle='#e5c78b99';ctx.lineWidth=1.2;
  for(const inset of [0,7]){ctx.beginPath();ctx.moveTo(97+inset,309);ctx.lineTo(97+inset,222);ctx.arc(200,222,103-inset,Math.PI,0);ctx.lineTo(303-inset,309);ctx.stroke();}
  for(let i=0;i<11;i++){
   const x=20+i*35,h=26+(i*17)%34;ctx.fillStyle=i%2?'#294a53':'#345660';ctx.fillRect(x,312-h,32,h);
   ctx.beginPath();ctx.moveTo(x-2,312-h);ctx.lineTo(x+16,301-h);ctx.lineTo(x+34,312-h);ctx.closePath();ctx.fill();
   ctx.fillStyle='#e7c989';for(let j=0;j<2;j++){ctx.fillRect(x+7+j*13,321-h,4,7);}
  }
  ctx.strokeStyle='#dfc592';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(161,312);ctx.bezierCurveTo(252,291,157,283,213,267);ctx.stroke();
  // Side foliage gives the illustration a framed, evening-garden feel.
  ctx.strokeStyle='#d6c18b';ctx.lineWidth=1;
  for(const side of [-1,1]){const x=200+side*157;ctx.beginPath();ctx.moveTo(x,304);ctx.quadraticCurveTo(x-side*13,279,x-side*8,252);ctx.stroke();
   for(let i=0;i<4;i++){ctx.save();ctx.translate(x-side*6,267+i*9);ctx.rotate(side*(i%2?.8:-.8));ctx.beginPath();ctx.ellipse(0,0,3,8,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
  if(portrait)ctx.drawImage(portrait,38,106,324,205);
  ctx.textAlign='center';ctx.fillStyle='#efd49b';ctx.font='600 13px Georgia,serif';ctx.fillText('AUREA  ·  CHRISTMAS CONCERT',200,36);
  ctx.fillStyle='#fff8e7';ctx.font='700 34px "Noto Serif KR",serif';
  ctx.fillText('눈 내리는 밤의',200,77);ctx.fillText('캐럴 음악회',200,117);
  ctx.fillStyle='#c9a250';ctx.fillRect(16,309,368,3);
  ctx.fillStyle='#fff9ed';ctx.fillRect(16,312,368,342);
  ctx.textAlign='left';
  const label=(value:string,y:number)=>{ctx.font='700 18px sans-serif';ctx.fillStyle='#573b22';ctx.fillText(value,34,y);};
  const wrap=(value:string,y:number,size:number,maxRows:number)=>{
   ctx.font=`600 ${size}px sans-serif`;ctx.fillStyle='#21170f';let line='',row=0;
   for(const ch of value){if(ctx.measureText(line+ch).width>332){
    if(row===maxRows-1){while(ctx.measureText(line+'…').width>332)line=line.slice(0,-1);ctx.fillText(line+'…',34,y+row*(size+6));return;}
    ctx.fillText(line,34,y+row*(size+6));line='';row++;
   }line+=ch;}ctx.fillText(line,34,y+row*(size+6));
  };
  label(info.playing?'지금 연주 중':'잠시 쉬는 시간',339);
  wrap(info.now,371,23,3);
  ctx.fillStyle='#42301f';ctx.font='600 18px sans-serif';ctx.fillText(info.remaining,34,455);
  ctx.strokeStyle='#d5c5a5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(34,470);ctx.lineTo(366,470);ctx.stroke();
  label('다음 곡',489);wrap(info.next,519,21,3);
  ctx.fillStyle='#e7dcc4';ctx.fillRect(28,595,344,47);ctx.textAlign='center';
  const full=info.seats>=info.capacity;ctx.fillStyle=full?'#923e32':'#385238';ctx.font='700 23px sans-serif';ctx.fillText(full?'만석 · 잠시 기다려 주세요':'입장 가능',200,617);
  ctx.fillStyle='#65533c';ctx.font='600 17px sans-serif';ctx.fillText(`공연장 ${info.seats} / ${info.capacity}석`,200,635);map.needsUpdate=true;
 };
 if(canvas)new T.ImageLoader().load(new URL('../assets/hall/conductor-programme.webp',import.meta.url).href,image=>{portrait=image;last='';if(current)update(current);});
 update({now:'공연을 준비하고 있습니다',next:'잠시 후 안내합니다',remaining:'AUREA CONCERT HALL',playing:false,seats:0,capacity:440});
 return {update};
}
