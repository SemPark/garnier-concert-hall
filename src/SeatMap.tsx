import {memo,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {DINNER_TABLES,NPC_SEATS,SEATS,SEAT_GRADES,TABLE_RADIUS,seatGrade,seatLabel,seatNumber,type Seat} from '../shared/venue';
import type {SeatClaim} from '../shared/protocol';
import {QUEEN_SEAT,TAROT_HOST_SEAT,TEA_TABLE} from '../shared/storyGuestSeats';
import {seatMapPosition,SEAT_MAP_SIZE,SEAT_MAP_PARTS as M,mapX,mapY,SEAT_MAP_SCALE} from './seatMapLayout';
const TABLE_PX=TABLE_RADIUS*SEAT_MAP_SCALE;
const visibleGrades=SEAT_GRADES.filter(grade=>[...SEATS,...NPC_SEATS].some(seat=>seatGrade(seat)===grade));

const storyTableSymbols:Partial<Record<number,{label:string;theme:string;path:string}>>={
 [TAROT_HOST_SEAT.row]:{label:'별빛 타로',theme:'tarot',path:'M9.5 21h5V11h-5v10ZM12 11V9m0-6.5c1.6 1.8 2.2 3 2.2 4a2.2 2.2 0 0 1-4.4 0c0-1 .6-2.2 2.2-4Z'},
 [QUEEN_SEAT.row]:{label:'하트 여왕 카드 게임',theme:'queen',path:'M12 20S3 14.5 3 8.8a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1C21 14.5 12 20 12 20Z'},
 [TEA_TABLE]:{label:'모자장수의 차',theme:'tea',path:'M4 9h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a2 2 0 0 1 0 4h-2M3 21h16M8 6c-2-2 2-2 0-4m5 4c-2-2 2-2 0-4'},
};

function GhostSeatIcon(){
 return <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
  <path fill="currentColor" fillRule="evenodd" d="M2 7a6 6 0 1 1 12 0v7l-3-2-3 2-3-2-3 2V7Zm4.75.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm4.5 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/>
 </svg>;
}

export const SeatMap=memo(function SeatMap({open,claims,selfId,connected,onClose,onChoose}:{open:boolean;claims:Record<string,SeatClaim>;selfId:string;connected:boolean;onClose:()=>void;onChoose:(id:string)=>void}){
 const [prepared,setPrepared]=useState(0);
 const [showZoomHint,setShowZoomHint]=useState(false);
 const [measured,setMeasured]=useState(false),[selected,setSelected]=useState<Seat|null>(null),[zoom,setZoom]=useState(1),[fit,setFit]=useState(.5);
 const viewport=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null);
 // Prepare visitor seats in small tasks once, rather than remounting the map on every visit.
 useEffect(()=>{if(prepared>=SEATS.length)return;const timer=setTimeout(()=>setPrepared(n=>Math.min(SEATS.length,n+32)),24);return()=>clearTimeout(timer);},[prepared]);
 useEffect(()=>{if(!open){dialog.current?.close();setShowZoomHint(false);return;}setShowZoomHint(true);const hintTimer=setTimeout(()=>setShowZoomHint(false),3500);setSelected(null);setZoom(1);dialog.current?.showModal();const el=viewport.current!;const resize=new ResizeObserver(()=>{if(el.clientWidth<40||el.clientHeight<40)return;setFit(Math.min((el.clientWidth-20)/SEAT_MAP_SIZE.width,(el.clientHeight-20)/SEAT_MAP_SIZE.height));setMeasured(true);});resize.observe(el);return()=>{clearTimeout(hintTimer);resize.disconnect();};},[open]);
 const zoomRef=useRef(zoom);zoomRef.current=zoom;
 const zoomCentre=useRef<{x:number;y:number;viewX?:number;viewY?:number}|null>(null);
 const changeZoom=(delta:number)=>{const el=viewport.current;if(!el)return;const view=el.getBoundingClientRect(),map=el.querySelector('.ticket-map')!.getBoundingClientRect();zoomCentre.current={x:(view.left+el.clientWidth/2-map.left)/(fit*zoom),y:(view.top+el.clientHeight/2-map.top)/(fit*zoom)};setZoom(z=>Math.max(1,Math.min(4,z+delta)));};
 useLayoutEffect(()=>{const el=viewport.current,centre=zoomCentre.current;if(!el||!centre)return;const view=el.getBoundingClientRect(),map=el.querySelector('.ticket-map')!.getBoundingClientRect();el.scrollLeft+=map.left+centre.x*fit*zoom-view.left-(centre.viewX??el.clientWidth/2);el.scrollTop+=map.top+centre.y*fit*zoom-view.top-(centre.viewY??el.clientHeight/2);zoomCentre.current=null;},[fit,zoom]);
 useEffect(()=>{
  const el=viewport.current;if(!open||!el)return;
  let pinch:{distance:number;zoom:number;mapX:number;mapY:number}|null=null;
  let single:{x:number;y:number}|null=null;
  const start=(e:TouchEvent)=>{
   if(e.touches.length===2){
    const a=e.touches[0],b=e.touches[1],map=el.querySelector('.ticket-map')!.getBoundingClientRect(),currentZoom=zoomRef.current;
    pinch={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom:currentZoom,mapX:((a.clientX+b.clientX)/2-map.left)/(fit*currentZoom),mapY:((a.clientY+b.clientY)/2-map.top)/(fit*currentZoom)};
    single=null;
   }else if(e.touches.length===1)single={x:e.touches[0].clientX,y:e.touches[0].clientY};
  };
  const move=(e:TouchEvent)=>{
   if(e.touches.length===2&&pinch){
    e.preventDefault();
    const a=e.touches[0],b=e.touches[1],view=el.getBoundingClientRect();
    zoomCentre.current={x:pinch.mapX,y:pinch.mapY,viewX:(a.clientX+b.clientX)/2-view.left,viewY:(a.clientY+b.clientY)/2-view.top};
    setZoom(Math.max(1,Math.min(4,pinch.zoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/Math.max(1,pinch.distance))));
   }else if(e.touches.length===1&&single){
    const touch=e.touches[0];el.scrollLeft+=single.x-touch.clientX;el.scrollTop+=single.y-touch.clientY;
    single={x:touch.clientX,y:touch.clientY};e.preventDefault();
   }
  };
  const end=()=>{pinch=null;single=null;};
  el.addEventListener('touchstart',start,{passive:true});el.addEventListener('touchmove',move,{passive:false});el.addEventListener('touchend',end);el.addEventListener('touchcancel',end);
  return()=>{el.removeEventListener('touchstart',start);el.removeEventListener('touchmove',move);el.removeEventListener('touchend',end);el.removeEventListener('touchcancel',end);};
 },[open,fit]);
 // Opens showing the whole hall (zoom 1 = the full map fits); zoom in from there.
 const scale=fit*zoom,available=selected&&(!claims[selected.id]||claims[selected.id].visitorId===selfId);
 return <dialog ref={dialog} className="ticket-dialog" onCancel={e=>{e.preventDefault();onClose();}} aria-label="전체 좌석 선택">
  <div className="ticket-heading"><div><h2>나의 자리</h2><p>관객용 좌석 {SEATS.length}석</p></div><button autoFocus onClick={onClose} aria-label="좌석 선택 닫기">✕</button></div>
  <div className="ticket-toolbar"><div className="ticket-legend">{visibleGrades.map(g=><span key={g} className={`grade grade-${g}`}><i/>{g}석</span>)}<span className="selected">● 선택</span><span className="mine">● 내 자리</span><span className="occupied">● 이용 중</span><span className="ghost"><GhostSeatIcon/>유령 착석</span></div></div>
  <div className="ticket-map-area">
   {showZoomHint&&<div className="ticket-touch-hint" role="status">두 손가락으로 확대·축소할 수 있어요</div>}
   {/* Zoom stack in the bottom-right corner: zoom in / out together, the whole-map view below. */}
   <div className="ticket-zoom-controls">
    <div className="ticket-zoom-pair">
     <button aria-label="좌석 지도 확대" disabled={zoom>=4} onClick={()=>changeZoom(.5)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
     <button aria-label="좌석 지도 축소" disabled={zoom<=1} onClick={()=>changeZoom(-.5)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button>
    </div>
    <button className="ticket-zoom-fit" aria-label="전체 보기" disabled={zoom<=1} onClick={()=>{setZoom(1);viewport.current?.scrollTo(0,0);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg></button>
   </div>
  <div className="ticket-viewport" ref={viewport}><div className="ticket-scroll" style={{width:SEAT_MAP_SIZE.width*scale,height:SEAT_MAP_SIZE.height*scale}}><div className="ticket-map" style={{width:SEAT_MAP_SIZE.width,height:SEAT_MAP_SIZE.height,transform:`scale(${scale})`}}>
   <div className="ticket-hall" style={M.hall}/><div className="ticket-stage" style={M.stage}>무 대 <small>오케스트라</small></div>
   {DINNER_TABLES.map(table=>{
    const symbol=storyTableSymbols[table.id];
    return <span className={`ticket-table${symbol?` story-table-symbol ${symbol.theme}`:''}`} key={table.id}
     style={{left:mapX(table.x)-TABLE_PX,top:mapY(table.z)-TABLE_PX,width:TABLE_PX*2,height:TABLE_PX*2}}>
     {symbol?<svg viewBox="0 0 24 24" role="img" aria-label={symbol.label} focusable="false">
      <path d={symbol.path} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
     </svg>:table.id}
    </span>;
   })}
   {NPC_SEATS.map(seat=>{
    const {x,y}=seatMapPosition(seat);
    const label=`${seatGrade(seat)}석 ${seatLabel(seat)} · 유령 착석`;
    return <button key={seat.id} type="button" className="ticket-seat ghost" style={{left:x,top:y}} disabled aria-label={label} title={label}><GhostSeatIcon/></button>;
   })}
   {SEATS.slice(0,prepared).map(s=>{const claim=claims[s.id],mine=!!claim&&claim.visitorId===selfId,occupied=!!claim&&!mine,pos=seatMapPosition(s);return <button key={s.id} className={`ticket-seat ${s.level} grade-${seatGrade(s)} ${selected?.id===s.id?'selected':mine?'mine':occupied?'occupied':''}`} style={{left:pos.x,top:pos.y}} disabled={!connected||occupied} aria-label={`${seatGrade(s)}석 ${seatLabel(s)}${occupied?' 이용 중':mine?' 내 자리':''}`} aria-pressed={selected?.id===s.id} title={`${seatGrade(s)}석 · ${seatLabel(s)}`} onClick={()=>setSelected(s)}>{seatNumber(s)}</button>;})}
  </div></div></div></div>
  <div className="ticket-footer"><div><strong>{selected?`${seatGrade(selected)}석 · ${seatLabel(selected)}`:'원하는 좌석을 선택하세요'}</strong><small>{selected?.level==='balcony'?'뒤쪽 문으로 나가 복도 계단을 올라 2층 좌석에 앉습니다.':'확대 후 지도를 밀어 좌석을 선택할 수 있어요.'}</small></div><button className="ticket-confirm" disabled={!available||!connected} onClick={()=>{if(selected){onChoose(selected.id);onClose();}}}>이 좌석으로 이동</button></div>
 </dialog>;
});
