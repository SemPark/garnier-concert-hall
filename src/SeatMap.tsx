import {memo,useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {DINNER_TABLES,NPC_SEATS,SEATS,SEAT_GRADES,TABLE_RADIUS,seatGrade,seatLabel,seatNumber,type Seat} from '../shared/venue';
import type {SeatClaim} from '../shared/protocol';
import {QUEEN_SEAT,TAROT_HOST_SEAT,TEA_TABLE} from '../shared/storyGuestSeats';
import {seatMapPosition,SEAT_MAP_SIZE,SEAT_MAP_PARTS as M,mapX,mapY,SEAT_MAP_SCALE} from './seatMapLayout';
import './seatMapStories.css';
const TABLE_PX=TABLE_RADIUS*SEAT_MAP_SCALE;
export const GUEST_INTRO_KEY='pleee-ticket-guests-intro';
const visibleGrades=SEAT_GRADES.filter(grade=>[...SEATS,...NPC_SEATS].some(seat=>seatGrade(seat)===grade));

const storyTableSymbols:Partial<Record<number,{label:string;description:string;coach:string;theme:string;path:string}>>={
 [TAROT_HOST_SEAT.row]:{label:'별빛 타로',coach:'유령이 보는 별빛 타로',description:'별빛 타로를 봐주는 유령이 앉아 있어요.',theme:'tarot',path:'M6 3h12v18H6zM12 7l1.5 4 4 1-4 1-1.5 4-1.5-4-4-1 4-1Z'},
 [QUEEN_SEAT.row]:{label:'하트 여왕',coach:'여왕의 카드 게임',description:'하트 여왕과 카드 게임을 할 수 있는 테이블이에요.',theme:'queen',path:'M12 20S3 14.5 3 8.8a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1C21 14.5 12 20 12 20Z'},
 [TEA_TABLE]:{label:'모자장수의 차',coach:'모자장수의 티타임',description:'모자장수와 차를 마실 수 있는 테이블이에요.',theme:'tea',path:'M4 9h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a2 2 0 0 1 0 4h-2M3 21h16M8 6c-2-2 2-2 0-4m5 4c-2-2 2-2 0-4'},
};

type GuestCoachPosition={row:number;side:'left'|'right';x:number;y:number;maxWidth:number;lineOffset:number};

function GhostSeatIcon(){
 return <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
  <path fill="currentColor" fillRule="evenodd" d="M2 7a6 6 0 1 1 12 0v7l-3-2-3 2-3-2-3 2V7Zm4.75.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm4.5 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/>
 </svg>;
}

type SeatMapProps={
 open:boolean;
 claims:Record<string,SeatClaim>;
 selfId:string;
 connected:boolean;
 guideActions?:ReactNode;
 onClose:()=>void;
 onChoose:(id:string)=>boolean|void|Promise<boolean|void>;
};

export const SeatMap=memo(function SeatMap({open,claims,selfId,connected,guideActions,onClose,onChoose}:SeatMapProps){
 const [prepared,setPrepared]=useState(0);
 const [showZoomHint,setShowZoomHint]=useState(false);
 const [tableRow,setTableRow]=useState<number|null>(null);
 const [guestSpotlight,setGuestSpotlight]=useState(false);
 const guestIntroShown=useRef(false);
 const [pending,setPending]=useState(false),[failed,setFailed]=useState(false);
 const visit=useRef(0),submitting=useRef(false);
 const [measured,setMeasured]=useState(false),[selected,setSelected]=useState<Seat|null>(null),[zoom,setZoom]=useState(1),[fit,setFit]=useState(.5);
 const mapArea=useRef<HTMLDivElement>(null),viewport=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null);
 const [guestCoaches,setGuestCoaches]=useState<GuestCoachPosition[]>([]);
 useLayoutEffect(()=>{
  visit.current++;
  submitting.current=false;
  setPending(false);setFailed(false);setTableRow(null);
  return ()=>{visit.current++;};
 },[open]);
 useLayoutEffect(()=>{
  if(!open){setGuestSpotlight(false);return;}
  if(guestIntroShown.current)return;
  guestIntroShown.current=true;
  try{
   if(localStorage.getItem(GUEST_INTRO_KEY)==='coach')return;
   localStorage.setItem(GUEST_INTRO_KEY,'coach');
  }catch{/* Keep the one-time introduction in memory. */}
  setGuestSpotlight(true);
 },[open]);
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
 const story=tableRow===null?undefined:storyTableSymbols[tableRow];
 const spotlight=guestSpotlight||tableRow!==null;
 const isIntroducedTable=(row:number)=>guestSpotlight&&!!storyTableSymbols[row];
 useLayoutEffect(()=>{
  const area=mapArea.current,scroll=viewport.current;
  if(!open||!spotlight||!area||!scroll){setGuestCoaches([]);return;}
  const update=()=>{
   const bounds=area.getBoundingClientRect();
   const positions=[...scroll.querySelectorAll<HTMLButtonElement>('.story-table-symbol[data-table-lit]')].flatMap(marker=>{
    const target=marker.getBoundingClientRect();
    const centerX=(target.left+target.right)/2-bounds.left;
    const centerY=(target.top+target.bottom)/2-bounds.top;
    if(centerX<0||centerX>bounds.width||centerY<0||centerY>bounds.height)return [];
    const left=target.left-bounds.left-18,right=bounds.right-target.right-18;
    const preferLeft=centerX<bounds.width/2;
    const side=preferLeft?left>=92||left>=right?'left':'right':right>=92||right>=left?'right':'left';
    const maxWidth=Math.min(140,side==='left'?left:right);
    if(maxWidth<68)return [];
    const y=Math.max(24,Math.min(bounds.height-24,centerY));
    const x=side==='left'?target.left-bounds.left-12:target.right-bounds.left+12;
    return [{row:Number(marker.dataset.tableRow),side,x,y,maxWidth,lineOffset:centerY-y} satisfies GuestCoachPosition];
   });
   setGuestCoaches(positions);
  };
  const observer=new ResizeObserver(update);
  observer.observe(area);
  scroll.addEventListener('scroll',update,{passive:true});
  update();
  return ()=>{observer.disconnect();scroll.removeEventListener('scroll',update);};
 },[open,spotlight,guestSpotlight,tableRow,scale]);

 const chooseTable=(row:number)=>{
  setGuestSpotlight(false);setTableRow(row);setSelected(null);setFailed(false);
 };
 const chooseSeat=(seat:Seat)=>{
  setGuestSpotlight(false);setSelected(seat);setFailed(false);
  setTableRow(seat.level==='parterre'?seat.row:null);
 };
 const confirmSeat=async()=>{
  if(!selected||!available||!connected||submitting.current)return;
  const currentVisit=visit.current;
  submitting.current=true;setPending(true);setFailed(false);
  let accepted=false;
  try{accepted=(await onChoose(selected.id))!==false;}catch{accepted=false;}
  if(currentVisit!==visit.current)return;
  submitting.current=false;setPending(false);
  if(accepted)onClose();else setFailed(true);
 };
 const selectedStory=selected?.level==='parterre'?storyTableSymbols[selected.row]:undefined;
 const selectionLabel=selected?[selectedStory?.label,seatGrade(selected)+'석',seatLabel(selected)].filter(Boolean).join(' · ')
  :tableRow===null?'원하는 좌석을 선택하세요':[story?.label,tableRow+'번 테이블'].filter(Boolean).join(' · ');
 let selectionNote=story?.description??(tableRow===null?'확대 후 지도를 밀어 좌석을 선택할 수 있어요.':'이 테이블의 밝은 좌석을 선택할 수 있어요.');
 if(tableRow!==null&&!selected&&!SEATS.some(seat=>seat.level==='parterre'&&seat.row===tableRow&&(!claims[seat.id]||claims[seat.id].visitorId===selfId))){
  selectionNote='이 테이블은 지금 가득 찼어요. 지도의 다른 테이블을 확인해 보세요.';
 }
 if(selected?.level==='balcony')selectionNote='뒤쪽 문으로 나가 복도 계단을 올라 2층 좌석에 앉습니다.';
 if(failed)selectionNote='좌석을 예약하지 못했어요. 다시 시도하거나 다른 자리를 선택하세요.';
 if(selected&&!available)selectionNote='다른 관객이 선택한 자리예요. 다른 자리를 선택하세요.';
 if(!connected)selectionNote='음악당에 다시 연결되면 좌석을 선택할 수 있어요.';
 if(pending)selectionNote='좌석을 확인하고 있어요.';
 return <dialog ref={dialog} className="ticket-dialog" onCancel={e=>{e.preventDefault();onClose();}}
  onClick={event=>{
   if(!spotlight||!(event.target instanceof Element)||event.target.closest('button'))return;
   setGuestSpotlight(false);
   setTableRow(null);
  }} aria-label="전체 좌석 선택">
  <div className="ticket-heading"><div><h2>나의 자리</h2><p>관객용 좌석 {SEATS.length}석</p></div>{guideActions&&<div className="ticket-guide-actions">{guideActions}</div>}<button autoFocus onClick={onClose} aria-label="좌석 선택 닫기">✕</button></div>
  <div className="ticket-toolbar"><div className="ticket-legend">{visibleGrades.map(g=><span key={g} className={`grade grade-${g}`}><i/>{g}석</span>)}<span className="selected">● 선택</span><span className="mine">● 내 자리</span><span className="occupied">● 이용 중</span><span className="ghost"><GhostSeatIcon/>유령 착석</span></div></div>
  <div ref={mapArea} className="ticket-map-area" data-table-spotlight={spotlight||undefined}>
   {spotlight&&guestCoaches.map(({row,side,x,y,maxWidth,lineOffset})=>{
    const symbol=storyTableSymbols[row];
    if(!symbol)return null;
    const style={left:x,top:y,maxWidth,'--coach-line-offset':lineOffset+'px'} as CSSProperties;
    return <div key={row} className="ticket-guest-coach" data-side={side} style={style} aria-hidden="true">
     <strong>{symbol.label}</strong><span>{symbol.coach}</span>
    </div>;
   })}
   {showZoomHint&&!spotlight&&<div className="ticket-touch-hint" role="status">두 손가락으로 확대·축소할 수 있어요</div>}
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
    const style={left:mapX(table.x)-TABLE_PX,top:mapY(table.z)-TABLE_PX,width:TABLE_PX*2,height:TABLE_PX*2};
    const name=table.id+'번 테이블';
    return <button type="button" className={symbol?`ticket-table story-table-symbol ${symbol.theme}`:'ticket-table'} key={table.id}
     style={style} data-table-row={table.id} data-table-lit={isIntroducedTable(table.id)||undefined}
     aria-label={symbol?name+' · '+symbol.label:name} aria-description={symbol?.description}
     title={symbol?symbol.label+' · '+symbol.description:undefined}
     aria-pressed={tableRow===table.id} disabled={pending} onClick={()=>chooseTable(table.id)}>
     {symbol?<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={symbol.path} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
     </svg>:table.id}
    </button>;
   })}
   {NPC_SEATS.map(seat=>{
    const {x,y}=seatMapPosition(seat);
    const label=`${seatGrade(seat)}석 ${seatLabel(seat)} · 유령 착석`;
    return <button key={seat.id} type="button" className="ticket-seat ghost" data-table-lit={isIntroducedTable(seat.row)||undefined} style={{left:x,top:y}} disabled aria-label={label} title={label}><GhostSeatIcon/></button>;
   })}
   {SEATS.slice(0,prepared).map(seat=>{
    const claim=claims[seat.id],mine=!!claim&&claim.visitorId===selfId,occupied=!!claim&&!mine;
    const {x,y}=seatMapPosition(seat),chosen=selected?.id===seat.id;
    const state=chosen?'selected':mine?'mine':occupied?'occupied':'';
    return <button key={seat.id} className={`ticket-seat ${seat.level} grade-${seatGrade(seat)} ${state}`}
     data-table-lit={seat.level==='parterre'&&seat.row===tableRow&&!occupied||undefined}
     style={{left:x,top:y}} disabled={!connected||occupied||pending}
     aria-label={`${seatGrade(seat)}석 ${seatLabel(seat)}${occupied?' 이용 중':mine?' 내 자리':''}`}
     aria-pressed={chosen} title={`${seatGrade(seat)}석 · ${seatLabel(seat)}`}
     onClick={()=>chooseSeat(seat)}>{seatNumber(seat)}</button>;
   })}
  </div></div></div></div>
  <div className="ticket-footer"><div aria-live="polite"><strong>{selectionLabel}</strong><small>{selectionNote}</small></div><button className="ticket-confirm" disabled={!available||!connected||pending} onClick={confirmSeat}>이 좌석으로 이동</button></div>
 </dialog>;
});
