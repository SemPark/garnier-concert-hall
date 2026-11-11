import {useEffect,useRef,useState} from 'react';
import type {World} from './World';
import {JAZZ_HALL} from '../shared/hallKind';

/** Souvenir card drawn into the photo itself, so the saved file matches the preview:
 * vine flourishes in the corners, thin side lines, small scrolls top and bottom, and the text at the lower right. */
async function decorate(blob:Blob):Promise<Blob>{
 const image=await createImageBitmap(blob);
 const canvas=document.createElement('canvas');
 const W=canvas.width=image.width,H=canvas.height=image.height;
 const c=canvas.getContext('2d');
 if(!c){image.close();return blob;}
 c.drawImage(image,0,0);image.close();
 const u=Math.min(W,H)/100,cx=W/2,m=3.6*u;
 await document.fonts.load(`italic 500 ${10*u}px 'Modu Serif'`).catch(()=>{});
 const shade=c.createRadialGradient(W,H,0,W,H,72*u);
 shade.addColorStop(0,'rgba(12,8,5,.86)');shade.addColorStop(.5,'rgba(12,8,5,.5)');shade.addColorStop(1,'rgba(12,8,5,0)');
 c.fillStyle=shade;c.fillRect(0,0,W,H);
 const gold=c.createLinearGradient(0,0,W,H);
 gold.addColorStop(0,'#f5e2b0');gold.addColorStop(.5,'#d6b272');gold.addColorStop(1,'#f0d89e');
 c.lineCap='round';c.lineJoin='round';
 // Everything below is drawn in card units (1 = 1% of the short side), mirrored into place.
 const leaf=(x:number,y:number,angle:number,length:number)=>{
  c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);
  c.quadraticCurveTo(length*.45,-length*.4,length,0);c.quadraticCurveTo(length*.45,length*.4,0,0);c.fill();c.restore();
 };
 const leaves=(list:number[][])=>{for(const [x,y,angle,length] of list)leaf(x,y,angle,length);};
 const arm=()=>{
  c.beginPath();
  // Main stem: a curled tip far along the edge, then a wide sweep round the corner (the two arms cross there).
  c.moveTo(20.4,2.7);c.bezierCurveTo(21.8,3.3,23.1,2.3,22.5,1.2);c.bezierCurveTo(21.9,.1,20,.3,18.4,1);
  c.bezierCurveTo(14,2.9,9.2,1,6,3.5);c.bezierCurveTo(3.4,5.6,2.9,8.6,4.2,10.6);
  // Spiral inside the sweep.
  c.moveTo(12.4,1.9);c.bezierCurveTo(12.9,5.2,9.6,7.8,7.5,6.4);c.bezierCurveTo(5.9,5.3,7,3.3,8.5,4);c.bezierCurveTo(9.5,4.5,9.1,5.6,8.3,5.4);
  // Curl on the outer side, a second small one further along, and a hanging tendril.
  c.moveTo(15.6,1.7);c.bezierCurveTo(14.2,-.7,11,-1.1,9.5,.2);c.bezierCurveTo(8.6,1,9.2,2.1,10.1,1.6);
  c.moveTo(19.2,.8);c.bezierCurveTo(18.6,-.8,16.8,-.9,16.4,.1);
  c.moveTo(16.6,1.6);c.bezierCurveTo(16.9,3.6,15.2,4.6,14.2,3.7);c.bezierCurveTo(13.6,3.1,14.3,2.4,14.8,2.9);
  // Sprig pointing out to the corner.
  c.moveTo(5.2,4.3);c.bezierCurveTo(3.8,3.2,2.4,2,.4,.6);
  c.stroke();
  leaves([[22.5,1.2,-.5,1.7],[18.4,1,-1,1.6],[17.4,1.4,.75,1.7],[13.6,2.1,-1.05,1.7],[12.6,2,.9,1.5],[9.6,1.7,-1.3,1.6],
   [11.2,-.5,-2.3,1.5],[14,-.4,-.6,1.4],[10.9,5.7,.5,1.5],[15.6,4.3,.2,1.3],
   [3.9,3.3,-1.75,1.7],[3.9,3.3,-2.95,1.7],[2.2,1.9,-1.8,1.5],[2.2,1.9,-2.9,1.5],[.4,.6,-2.36,1.9],[6.4,3.2,-1.9,1.4]]);
 };
 const corner=(x:number,y:number,sx:number,sy:number)=>{
  c.save();c.translate(x,y);c.scale(sx*u,sy*u);c.lineWidth=.13;
  arm();c.save();c.transform(0,1,1,0,0,0);arm();c.restore();
  // The side arm ends in a hanging bud that leads into the side line.
  c.beginPath();c.moveTo(1.2,22.5);c.bezierCurveTo(.2,23.6,.6,25,1.3,25.6);c.stroke();
  leaves([[1.3,25.4,Math.PI/2,2.8],[1.3,25.2,2.3,1.3],[1.3,25.2,.85,1.3]]);
  c.restore();
 };
 const scroll=(y:number,sy:number)=>{
  for(const sx of [1,-1]){
   c.save();c.translate(cx,y);c.scale(sx*u,sy*u);c.lineWidth=.12;c.beginPath();
   c.moveTo(1.1,.9);c.bezierCurveTo(2.8,-1.5,5.6,-1.4,6.3,.3);c.bezierCurveTo(6.8,1.6,5.3,2.2,4.7,1.3);
   c.moveTo(1.6,1.7);c.bezierCurveTo(4.4,3.5,8.2,2.8,10.2,.7);c.bezierCurveTo(11.7,-.9,13.8,-.6,13.8,.7);c.bezierCurveTo(13.8,1.8,12.4,1.9,12.3,1);
   c.moveTo(10.2,.7);c.bezierCurveTo(12.6,-1.9,15.4,-.5,18.6,-.3);
   c.moveTo(6.6,2.6);c.bezierCurveTo(7.6,3.9,9.3,3.7,9.5,2.6);
   c.moveTo(6.9,-.3);c.bezierCurveTo(7.5,-1.7,9,-1.7,9.3,-.8);
   c.stroke();
   leaves([[18.6,-.3,.05,2.1],[15.2,-.9,-.9,1.2],[8.2,2.3,-1.1,1.3],[4.2,-.9,-1.5,1.3],[13.8,.7,.9,1.2],[.5,.2,-.8,2.2],[.6,1.9,.75,1.5]]);
   c.beginPath();c.arc(16.9,.5,.2,0,Math.PI*2);c.fill();
   c.restore();
  }
  // Lily in the middle: one upright petal, a pearl and a small drop.
  c.save();c.translate(cx,y);c.scale(u,sy*u);
  leaf(0,.9,-Math.PI/2,3);leaf(0,2.2,Math.PI/2,1.4);c.beginPath();c.arc(0,1.5,.38,0,Math.PI*2);c.fill();c.restore();
 };
 c.strokeStyle=gold;c.fillStyle=gold;
 corner(m,m,1,1);corner(W-m,m,-1,1);corner(m,H-m,1,-1);corner(W-m,H-m,-1,-1);
 scroll(m+.4*u,1);scroll(H-m-.4*u,-1);
 // Side lines: one short stretch below each upper vine and above each lower one, open in the middle.
 const reach=Math.max(0,Math.min(.16*H,H/2-m-35*u));
 c.lineWidth=Math.max(1,.12*u);c.beginPath();
 for(const x of [m+1.3*u,W-m-1.3*u])for(const [from,to] of [[m+29.5*u,m+29.5*u+reach],[H-m-29.5*u-reach,H-m-29.5*u]]){c.moveTo(x,from);c.lineTo(x,to);}
 c.stroke();
 // Text block, right-aligned inside the lower-right vine.
 const right=W-m-11*u,base=H-m-10.5*u;
 c.textAlign='right';c.textBaseline='alphabetic';c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=1.2*u;
 c.fillStyle='#f8ead0';
 c.font=`italic 500 ${11*u}px 'Modu Serif',Baskerville,Georgia,serif`;
 const title=c.measureText('pleee').width;c.fillText('pleee',right,base-16.2*u);
 c.font=`400 ${2.5*u}px 'Noto Serif KR','AppleMyungjo','Nanum Myeongjo',Georgia,serif`;c.fillText('영원히 끝나지 않는 플레이리스트',right,base-7.5*u);
 const now=new Date(),two=(value:number)=>String(value).padStart(2,'0');
 c.fillStyle='#ead9b6';
 c.font=`italic 500 ${2.9*u}px 'Modu Serif',Baskerville,Georgia,serif`;c.fillText(`${now.getFullYear()}. ${two(now.getMonth()+1)}. ${two(now.getDate())}`,right,base-3.6*u);
 c.fillStyle='#dccaa4';
 c.font=`400 ${1.9*u}px 'Noto Serif KR','AppleMyungjo','Nanum Myeongjo',Georgia,serif`;
 if('letterSpacing' in c)(c as CanvasRenderingContext2D&{letterSpacing:string}).letterSpacing=`${.5*u}px`;
 c.fillText(JAZZ_HALL?'재즈 홀':'클래식 홀',right+.5*u,base);
 // Swash under the name: one long dip that curls up at both ends.
 c.shadowBlur=0;c.strokeStyle=gold;
 const sx0=right-title/2,y=base-13.3*u,half=Math.min(13*u,title/2);
 c.lineWidth=Math.max(1,.14*u);c.beginPath();
 for(const s of [1,-1]){
  c.moveTo(sx0,y+1.65*u);
  c.bezierCurveTo(sx0+s*half*.46,y+1.65*u,sx0+s*half*.77,y+1.2*u,sx0+s*half,y);
  c.bezierCurveTo(sx0+s*(half+2.4*u),y-1.1*u,sx0+s*(half+2.2*u),y-3.3*u,sx0+s*(half+.4*u),y-3*u);
  c.bezierCurveTo(sx0+s*(half-.8*u),y-2.8*u,sx0+s*(half-.7*u),y-1.4*u,sx0+s*(half+.4*u),y-1.6*u);
 }
 c.stroke();
 return new Promise(resolve=>canvas.toBlob(result=>resolve(result??blob),'image/png'));
}

export function PhotoMode({world}:{world:World}){
 const [busy,setBusy]=useState(false);
 const [photo,setPhoto]=useState('');
 const [error,setError]=useState('');
 const active=useRef(true);
 const photoFile=useRef<File|null>(null);
 const [sharing,setSharing]=useState(false);
 useEffect(()=>{
  active.current=true;
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')world.endPhotoMode();};
  window.addEventListener('keydown',escape);
  return()=>{active.current=false;window.removeEventListener('keydown',escape);};
 },[world]);
 useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo);},[photo]);
 const capture=async()=>{
  if(busy)return;
  setBusy(true);setError('');
  try{
   const blob=await decorate(await world.capturePhoto());
   if(active.current){photoFile.current=new File([blob],`PLEEE-${Date.now()}.png`,{type:'image/png'});setPhoto(URL.createObjectURL(blob));}
  }catch(error){
   if(active.current)setError(error instanceof Error?error.message:'촬영하지 못했습니다.');
  }finally{
   if(active.current)setBusy(false);
  }
 };
 const share=async()=>{
  const file=photoFile.current;if(!file||sharing)return;
  setError('');
  if(!navigator.canShare?.({files:[file]})){
   setError('이 브라우저에서는 사진 공유를 지원하지 않아요. 사진을 저장한 뒤 공유해 주세요.');return;
  }
  setSharing(true);
  try{await navigator.share({files:[file],title:'PLEEE — 끝나지 않는 플레이리스트'});}
  catch(error){if(active.current&&!(error instanceof DOMException&&error.name==='AbortError'))setError('공유하지 못했어요. 사진을 저장한 뒤 공유해 주세요.');}
  finally{if(active.current)setSharing(false);}
 };
 return <section className="photo-mode" aria-label="사진 모드">
  <button className="photo-close" aria-label="사진 모드 닫기" onClick={()=>world.endPhotoMode()}>×</button>
  {photo?<div className="photo-preview" role="dialog" aria-label="촬영한 사진">
   <img src={photo} alt="플리 공연장에서 촬영한 사진"/>
   <div className="photo-preview-actions">
    <button onClick={()=>{setPhoto('');setError('');photoFile.current=null;}}>다시 찍기</button>
    <a href={photo} download={photoFile.current?.name??'PLEEE.png'}>사진 저장</a>
    <button disabled={sharing} onClick={()=>void share()}>{sharing?'공유 중…':'공유하기'}</button>
   </div>
   <p role="status">{error||'모바일에서는 사진을 길게 눌러 저장할 수도 있어요.'}</p>
  </div>:<div className="photo-controls">
   <p className="photo-guide">드래그로 상하·좌우 조절</p>
   <div className="photo-presets" role="group" aria-label="자동 사진 구도">
    {([['recommended','추천 구도'],['current','현재 화면']] as const).map(([value,label])=><button key={value} aria-pressed={world.photoComposition===value} onClick={()=>world.setPhotoComposition(value)}>{label}</button>)}
   </div>
   <div className="photo-actions">
    <button className="photo-shutter" aria-label="사진 촬영" disabled={busy} onClick={()=>void capture()}><span/></button>
    <span className="photo-status" role="status">{busy?'촬영 중…':error}</span>
   </div>
  </div>}
 </section>;
}
