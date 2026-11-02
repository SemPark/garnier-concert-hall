import {memo,useEffect,useRef,useState} from 'react';
import {SEATS,FLOOR_SEATS,BALCONY_SEATS,SEAT_GRADES,seatGrade,seatLabel,seatNumber,type Seat} from '../shared/venue';
import type {SeatClaim} from '../shared/protocol';
import {GOLDEN_HALL} from '../shared/goldenHall';
const H_REAR=GOLDEN_HALL.rear;
import {seatMapPosition,seatMapRowY,SEAT_MAP_SIZE,SEAT_MAP_PARTS as M,mapX,mapY} from './seatMapLayout';
export const SeatMap=memo(function SeatMap({open,claims,selfId,connected,onClose,onChoose}:{open:boolean;claims:Record<string,SeatClaim>;selfId:string;connected:boolean;onClose:()=>void;onChoose:(id:string)=>void}){
 const [prepared,setPrepared]=useState(0);
 const [measured,setMeasured]=useState(false),[selected,setSelected]=useState<Seat|null>(null),[zoom,setZoom]=useState(1),[fit,setFit]=useState(.5);
 const viewport=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null);
 // Prepare the hidden map in small tasks once, instead of remounting 440 buttons on every visit.
 useEffect(()=>{if(prepared>=SEATS.length)return;const timer=setTimeout(()=>setPrepared(n=>Math.min(SEATS.length,n+32)),24);return()=>clearTimeout(timer);},[prepared]);
 useEffect(()=>{if(!open){dialog.current?.close();return;}setSelected(null);setZoom(1);dialog.current?.showModal();const el=viewport.current!;const resize=new ResizeObserver(()=>{if(el.clientWidth<40||el.clientHeight<40)return;setFit(Math.min((el.clientWidth-20)/SEAT_MAP_SIZE.width,(el.clientHeight-20)/SEAT_MAP_SIZE.height));setMeasured(true);});resize.observe(el);return()=>resize.disconnect();},[open]);
 // Opens showing the whole hall (zoom 1 = the full map fits); zoom in from there.
 const scale=fit*zoom,available=selected&&(!claims[selected.id]||claims[selected.id].visitorId===selfId);
 return <dialog ref={dialog} className="ticket-dialog" onCancel={e=>{e.preventDefault();onClose();}} aria-label="전체 좌석 선택">
  <div className="ticket-heading"><div><h2>나의 자리</h2><p>전체 {SEATS.length}석 · 1층 {FLOOR_SEATS.length}석 / 2층 {BALCONY_SEATS.length}석</p></div><button autoFocus onClick={onClose} aria-label="좌석 선택 닫기">✕</button></div>
  <div className="ticket-toolbar"><div className="ticket-legend">{SEAT_GRADES.map(g=><span key={g} className={`grade grade-${g}`}><i/>{g}석</span>)}<span className="selected">● 선택</span><span className="mine">● 내 자리</span><span className="occupied">● 이용 중</span></div><div><button aria-label="좌석 지도 축소" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.5))}>−</button><button onClick={()=>{setZoom(1);viewport.current?.scrollTo(0,0);}}>전체 보기</button><button aria-label="좌석 지도 확대" disabled={zoom>=4} onClick={()=>setZoom(z=>Math.min(4,z+.5))}>＋</button></div></div>
  <div className="ticket-viewport" ref={viewport}><div className="ticket-scroll" style={{width:SEAT_MAP_SIZE.width*scale,height:SEAT_MAP_SIZE.height*scale}}><div className="ticket-map" style={{width:SEAT_MAP_SIZE.width,height:SEAT_MAP_SIZE.height,transform:`scale(${scale})`}}>
   <div className="ticket-hall" style={M.hall}/><div className="ticket-rear-gallery" style={M.rearGallery}>2층 뒤쪽 연결 통로</div><div className="ticket-stage" style={M.stage}>무 대 <small>오케스트라</small></div><span className="ticket-floor-title" style={{top:M.floorTop+8}}>1층</span><span className="ticket-left-title" style={{left:M.hall.left-86,top:mapY(-20)-11}}>2층<br/>왼쪽</span><span className="ticket-right-title" style={{left:M.hall.left+M.hall.width+6,top:mapY(-20)-11}}>2층<br/>오른쪽</span>
   {[6.4].map(x=><span key={x} className="ticket-aisle" style={{left:mapX(x)-6,top:M.floorTop+40,height:M.floorBottom-M.floorTop-40}}>통로</span>)}
   <span className="ticket-cross-aisle" style={{top:(seatMapRowY(10)+seatMapRowY(11))/2+5}}>가로 통로</span>
   {Array.from({length:22},(_,i)=><span className="ticket-row" key={i} style={{top:seatMapRowY(i+1)}}>{i+1}열</span>)}
   {SEATS.slice(0,prepared).map(s=>{const claim=claims[s.id],mine=!!claim&&claim.visitorId===selfId,occupied=!!claim&&!mine,pos=seatMapPosition(s);return <button key={s.id} className={`ticket-seat ${s.level} grade-${seatGrade(s)} ${selected?.id===s.id?'selected':mine?'mine':occupied?'occupied':''}`} style={{left:pos.x,top:pos.y}} disabled={!connected||occupied} aria-label={`${seatGrade(s)}석 ${seatLabel(s)}${occupied?' 이용 중':mine?' 내 자리':''}`} aria-pressed={selected?.id===s.id} title={`${seatGrade(s)}석 · ${seatLabel(s)}`} onClick={()=>setSelected(s)}>{seatNumber(s)}</button>;})}
   <div className="ticket-entry" style={{top:mapY(H_REAR)-40}}>중앙 입구</div>
  </div></div></div>
  <div className="ticket-footer"><div><strong>{selected?`${seatGrade(selected)}석 · ${seatLabel(selected)}`:'원하는 좌석을 선택하세요'}</strong><small>{selected?.level==='balcony'?'뒤쪽 문으로 나가 복도 계단을 올라 2층 좌석에 앉습니다.':'확대 후 지도를 밀어 좌석을 선택할 수 있어요.'}</small></div><button className="ticket-confirm" disabled={!available||!connected} onClick={()=>{if(selected){onChoose(selected.id);onClose();}}}>이 좌석으로 이동</button></div>
 </dialog>;
});
