import {useEffect,useState} from 'react';
import type {AnalyticsConsent} from './ga4';
import {DetailedAnalytics} from './DetailedAnalytics';
import {ExtraAnalytics} from './ExtraAnalytics';
import {analyticsMayStart,analyticsPrivacySignal,type AnalyticsChoice} from './regionConsent';
import type {AnalyticsMode} from '../../shared/analyticsPolicy';

const CHOICE_KEY='pleee-seat-and-dwell-consent-v1';
const EXTRA_CHOICE_KEY='pleee-extra-analytics-consent-v1';

export function useDetailedAnalytics(analytics:AnalyticsConsent|null,
 mode:AnalyticsMode,basicChoice:AnalyticsChoice,hall:'classical'|'jazz'){
 const [{detail,extra}]=useState(()=>{
  if(!analytics||import.meta.env.VITE_PLEEE_SEAT_DWELL_ENABLED!=='true')return {detail:null,extra:null};
  const available=(key:string)=>()=>analytics.detailReady&&!analyticsPrivacySignal(navigator)&&readChoice(key)==='yes';
  return {
   detail:new DetailedAnalytics(available(CHOICE_KEY),event=>analytics.sendDetail(event)),
   extra:new ExtraAnalytics(hall,available(EXTRA_CHOICE_KEY),event=>analytics.sendDetail(event)),
  };
 });
 const eligible=!!detail&&analyticsMayStart(mode,basicChoice,analyticsPrivacySignal(navigator));
 const seatChoice=useDetailChoice(CHOICE_KEY,detail,eligible);
 const extraChoice=useDetailChoice(EXTRA_CHOICE_KEY,extra,eligible);
 return {detail,extra,seatChoice,extraChoice,eligible};
}

function useDetailChoice(key:string,collector:{setAllowed(allowed:boolean):void}|null,eligible:boolean){
 const [choice,setChoice]=useState(()=>readChoice(key));
 function apply(value:AnalyticsChoice){
  collector?.setAllowed(eligible&&value==='yes');
  setChoice(value);
 }
 function choose(value:'yes'|'no'){
  if(value==='yes'&&!eligible)return;
  try{localStorage.setItem(key,value);}
  catch{if(value==='yes')return;}
  apply(value);
 }
 useEffect(()=>{
  if(!collector)return;
  apply(readChoice(key));
  const sync=(event:StorageEvent)=>{
   if(event.key===null||event.key===key)apply(readChoice(key));
  };
  window.addEventListener('storage',sync);
  return ()=>{window.removeEventListener('storage',sync);collector.setAllowed(false);};
 },[key,collector,eligible]);
 return {choice,choose};
}

function readChoice(key:string):AnalyticsChoice{
 try{
  const value=localStorage.getItem(key);
  return value==='yes'||value==='no'?value:null;
 }catch{return 'no';}
}

export function DetailedAnalyticsChoices({choice,choose,extra=false}:{choice:AnalyticsChoice;extra?:boolean;
 choose:(value:'yes'|'no')=>void}){
 const ko=/^ko(?:-|$)/i.test(navigator.language);
 const label=extra?(ko?'공간·기능·음악 분석':'Hall, feature and music analytics')
  :(ko?'상세 행동 분석':'Detailed activity analytics');
 const explanation=extra?(ko
  ?'허용하면 클래식·재즈 공간 종류, 기능 사용·완료 횟수, 음악 재생 상태와 실제 청취 시간을 집계합니다. Google Analytics 통계 쿠키가 적용됩니다.'
  :'If you allow, we summarize classical or jazz hall use, feature use and completion, playback status and audible listening time. Google Analytics cookies apply.')
  :(ko?'허용하면 층·구역별 체류 시간과 좌석 번호별 선택·실제 착석 횟수를 집계합니다. Google Analytics 통계 쿠키가 적용됩니다.'
   :'If you allow, we summarize dwell time by floor and area and count selections and confirmed seating by seat number. Google Analytics cookies apply.');
 const allow=extra?(ko?'추가 분석 허용':'Allow additional analytics'):(ko?'상세 분석 허용':'Allow detailed analytics');
 const reject=extra?(ko?'추가 분석 거부':'Reject additional analytics'):(ko?'상세 분석 거부':'Reject detailed analytics');
 const withdraw=extra?(ko?'추가 분석 동의 철회':'Withdraw additional consent'):(ko?'상세 분석 동의 철회':'Withdraw detailed consent');
 return <section className="device-diagnostic" aria-label={label}>
  <strong>{label}</strong>
  <p>{explanation}</p>
  <p>{ko?'수신처는 Google LLC의 Google Analytics입니다.':'Google LLC receives the summaries through Google Analytics.'}{' '}
   <a href="/privacy.html" target="_blank" rel="noreferrer">{ko?'개인정보 안내':'Privacy notice'}</a></p>
  <div className="analytics-choice-buttons">
   <button type="button" aria-pressed={choice==='yes'} onClick={()=>choose('yes')}>{allow}</button>
   <button type="button" aria-pressed={choice==='no'} onClick={()=>choose('no')}>{choice==='yes'?withdraw:reject}</button>
  </div>
 </section>;
}
