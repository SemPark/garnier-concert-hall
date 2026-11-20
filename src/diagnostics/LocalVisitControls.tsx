import {useEffect,useRef,useState,type RefObject} from 'react';
import type {World} from '../World';
import type {Presence} from '../network/Presence';
import type {ConcertAudio} from '../audio/ConcertAudio';
import type {Snapshot} from '../../shared/protocol';
import {JAZZ_HALL} from '../../shared/hallKind';
import {analyticsPrivacySignal,readAnalyticsPreference} from '../analytics/regionConsent';
import {DetailedVisitConsent} from './DetailedVisitConsent';
import {MAX_VISIT_ROWS,mapSeatAction,otherVisitorGroup,confirmedVisitorSeat} from './LocalVisitRecorder';

type LocalAction='user_skip_next'|'user_skip_previous'|'playlist_change'|'tarot_open'|'queen_open'|'seat_denied';
export type VisitObserver={
 action(value:LocalAction):void;
 select(id:string):void;
 snapshot(state:Snapshot):void;
 interrupt():void;
 relocate():void;
};
type Props={world:World;net:Presence;audio:ConcertAudio;observer:RefObject<VisitObserver|null>};
function allowed(){
 try{return !analyticsPrivacySignal(navigator)&&readAnalyticsPreference(localStorage)!=='no'&&localStorage.getItem('pleee-visit-stats')!=='off'&&new URL(location.href).searchParams.get('visit-stats')!=='off';}
 catch{return false;}
}

export function LocalVisitControls({world,net,audio,observer}:Props){
 const [permission]=useState(()=>new DetailedVisitConsent(allowed,()=>crypto.randomUUID()));
 const [consented,setConsented]=useState(false);
 const [running,setRunning]=useState(false),[message,setMessage]=useState('');
 const finalSample=useRef<(()=>void)|null>(null);
 const detach=useRef<(()=>void)|null>(null);
 function discard(reason:string){
  permission.revoke();
  detach.current?.();
  setConsented(false);setRunning(false);setMessage(reason);
 }
 useEffect(()=>{
  const check=()=>{if(!allowed())discard('통계 제외 설정에 따라 이 탭의 기록을 삭제했습니다.');};
  const leave=()=>discard('');
  window.addEventListener('storage',check);
  window.addEventListener('focus',check);
  window.addEventListener('pagehide',leave);
  return ()=>{
   window.removeEventListener('storage',check);window.removeEventListener('focus',check);
   window.removeEventListener('pagehide',leave);permission.revoke();detach.current?.();
  };
 },[permission]);
 useEffect(()=>{
  if(!running)return;
  const recorder=permission.current();
  if(!recorder){discard('상세 기록이 허용되지 않았습니다.');return;}
  let previousSeat:string|null|undefined,previousTrain:boolean|undefined;
  let failed=false;
  const guard=<T,>(run:(arg:T)=>void)=>(arg:T)=>{
   if(failed)return;
   if(!permission.isCurrent(recorder)){discard('상세 기록 동의가 해제되었습니다.');return;}
   try{run(arg);}
   catch{failed=true;setRunning(false);setMessage('관측 오류로 로컬 기록을 중단했습니다.');}
  };
  const observe=(action:string|null=null,move?:'seat'|'teleport')=>{
   if(document.hidden||!world.entered||world.hallLoading||!world.self||net.status!=='connected'){recorder.interrupt();return;}
   if(world.ridingTrain){recorder.interrupt();return;}
   const seat=confirmedVisitorSeat(net.state,world.self,net.selfId);
   const others=net.state?otherVisitorGroup(net.state.visitors.filter(v=>v.id!==net.selfId&&v.zone===world.zone).length):undefined;
   recorder.record({others,hall:JAZZ_HALL?'jazz':'classical',zone:world.zone,...world.position,
    walking:world.pose==='walk',seat,track:audio.playback.track.id,playlist:audio.playlistId,
    measuredMs:audio.localMeasuredMs},Date.now(),performance.now(),action,move);
   if(recorder.rows.length>=MAX_VISIT_ROWS){setRunning(false);setMessage('기록 한도에 도달했습니다. JSON을 저장하세요.');}
  };
  const state=(snapshot:Snapshot)=>{
   const me=world.self;
   if(!me||me.id!==net.selfId)return;
   const seat=confirmedVisitorSeat(snapshot,me,net.selfId);
   if(seat&&previousSeat!==undefined&&previousSeat!==seat)observe('hall_seated_'+seat.replace(/-/g,'_'),'seat');
   if(previousSeat&&!seat&&me.zone==='auditorium'&&me.pose!=='sit')observe('seat_stand');
   if(world.ridingTrain!==previousTrain&&previousTrain!==undefined)recorder.interrupt();
   previousSeat=seat;previousTrain=world.ridingTrain;
  };
  audio.startLocalMeasurement();
  if(net.state)guard(state)(net.state);
  observer.current={action:guard((value:LocalAction)=>observe(value)),
   select:guard((id:string)=>{const action=mapSeatAction(id);if(action)observe(action);}),
   snapshot:guard(state),interrupt:()=>{recorder.interrupt();previousSeat=undefined;previousTrain=undefined;},
   relocate:()=>guard(()=>observe(null,'teleport'))(null)};
  const sample=guard(()=>observe());
  finalSample.current=()=>sample(null);
  const mediaEvents=['playing','waiting','ended','error','pause'];
  const handleMedia=guard((event:Event)=>observe('media_'+event.type));
  for(const name of mediaEvents)audio.media.addEventListener(name,handleMedia);
  const visibility=()=>{recorder.interrupt();if(!document.hidden)sample(null);};

  sample(null);
  const timer=window.setInterval(sample,10000);
  document.addEventListener('visibilitychange',visibility);
  const cleanup=()=>{
   if(failed&&detach.current!==cleanup)return;
   failed=true;detach.current=null;
   finalSample.current=null;observer.current=null;audio.stopLocalMeasurement();recorder.interrupt();window.clearInterval(timer);
   for(const name of mediaEvents)audio.media.removeEventListener(name,handleMedia);
   document.removeEventListener('visibilitychange',visibility);
  };
  detach.current=cleanup;
  return cleanup;
 },[world,net,audio,observer,running,permission]);
 const start=()=>{
  const recorder=permission.grant();
  if(!recorder){discard('브라우저의 통계 제외 설정으로 상세 기록이 차단되었습니다.');return;}
  if(recorder.rows.length>=MAX_VISIT_ROWS){setMessage('현재 방문의 기록 한도에 도달했습니다.');return;}
  setConsented(true);setMessage('');setRunning(true);
 };
 const pause=()=>{
  finalSample.current?.();detach.current?.();setRunning(false);
  if(permission.current())setMessage('기록을 일시중지했습니다.');
 };
 const download=()=>{
  const recorder=permission.current();
  if(!recorder){discard('상세 기록이 허용되지 않았습니다.');return;}
  const rows=recorder.rows;
  if(!rows?.length){setMessage('저장할 관측 기록이 없습니다.');return;}
  const url=URL.createObjectURL(new Blob([JSON.stringify({samples:rows})],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='pleee-local-visit-'+Date.now()+'.json';
  link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  setMessage(rows.length+'건을 JSON으로 내보냈습니다.');
 };
 return <section className="device-diagnostic" aria-label="로컬 방문 기록">
  <strong>상세 행동 기록 동의</strong>
  <p>선택 사항입니다. 공간 이용을 분석하기 위해 이동 위치(10초 간격 및 조작 시점), 좌석 선택·착석, 체류·재생 시간, 음악·체험 조작과 주변 관객 수 구간을 이 개발 탭의 메모리에 기록합니다. Google 등 외부로 전송하지 않습니다.</p>
  <p>거부해도 음악과 공연장을 이용할 수 있습니다. 철회하거나 페이지를 떠나면 탭의 기록을 삭제합니다. 직접 저장한 JSON 파일은 기기에 남습니다.</p>
  <button type="button" onClick={running?pause:start}>{running?'기록 일시중지':consented?'기록 다시 시작':'동의하고 이 탭에서 기록 시작'}</button>
  <button type="button" onClick={()=>discard(consented?'동의를 철회하고 이 탭의 기록을 삭제했습니다.':'상세 기록을 거부했습니다.')}>{consented?'동의 철회 및 기록 삭제':'동의하지 않음'}</button>
  <button type="button" disabled={running||!consented} onClick={download}>방문 JSON 저장</button>
  <p role="status">{running?'이 탭에 기록 중':message}</p>
 </section>;
}
