import {useId,useLayoutEffect,useRef,useState} from 'react';
import type {SeatClaim} from '../shared/protocol';
import {availableGhostTableSeat} from './ghostTableSeats';
import './ghostTableDiscovery.css';

type GhostTableDiscoveryProps={
 table:number;
 claims:Record<string,SeatClaim>;
 selfId:string;
 connected:boolean;
 onClose:()=>void;
 onChoose:()=>Promise<boolean>;
 onOpenSeatMap:()=>void;
};

export function GhostTableDiscovery({table,claims,selfId,connected,onClose,onChoose,onOpenSeatMap}:GhostTableDiscoveryProps){
 const [pending,setPending]=useState(false);
 const [failed,setFailed]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),active=useRef(false);
 const titleId=useId(),summaryId=useId();
 const available=!!availableGhostTableSeat(table,claims,selfId);
 const choose=async()=>{
  setPending(true);
  setFailed(false);
  let accepted=false;
  try{accepted=await onChoose();}catch{/* Keep the choice open for a retry. */}
  if(!active.current)return;
  setPending(false);
  if(accepted)onClose();else setFailed(true);
 };
 const availability=available?'이 테이블에 빈자리가 있어요.':'이 테이블은 지금 가득 찼어요. 좌석 지도에서 다른 빈자리를 고를 수 있어요.';
 useLayoutEffect(()=>{
  const element=dialog.current!;
  active.current=true;
  element.showModal();
  return ()=>{active.current=false;element.close();};
 },[]);

 return <dialog ref={dialog} className="ghost-table-discovery" aria-labelledby={titleId} aria-describedby={summaryId}
  onCancel={event=>{event.preventDefault();onClose();}}>
  <header>
   <div>
    <p className="ghost-table-number">{table}번 테이블</p>
    <h2 id={titleId}>유령과 함께 앉아볼까요?</h2>
   </div>
   <button type="button" className="ghost-table-dismiss" aria-label="유령 테이블 안내 닫기" onClick={onClose}>×</button>
  </header>
  <p id={summaryId} className="ghost-table-summary" role="status">
   {pending?'좌석을 확인하고 있어요.':failed&&available?'좌석을 예약하지 못했어요. 다시 시도하거나 좌석 지도에서 다른 자리를 골라 주세요.':availability}
  </p>
  {available
   ?<button type="button" className="ghost-table-primary" disabled={!connected||pending} onClick={()=>void choose()}>이 테이블에 앉기</button>
   :<button type="button" className="ghost-table-primary" disabled={!connected||pending} onClick={onOpenSeatMap}>다른 자리 고르기</button>}
  {failed&&available&&<button type="button" className="ghost-table-secondary" disabled={!connected} onClick={onOpenSeatMap}>다른 자리 고르기</button>}
 </dialog>;
}
