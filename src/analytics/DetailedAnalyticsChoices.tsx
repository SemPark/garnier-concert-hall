import {useEffect,useState} from 'react';
import type {AnalyticsConsent} from './ga4';
import {DetailedAnalytics} from './DetailedAnalytics';
import {analyticsMayStart,analyticsPrivacySignal,type AnalyticsChoice} from './regionConsent';
import type {AnalyticsMode} from '../../shared/analyticsPolicy';

const CHOICE_KEY='pleee-seat-and-dwell-consent-v1';

export function useDetailedAnalytics(analytics:AnalyticsConsent|null,
 mode:AnalyticsMode,basicChoice:AnalyticsChoice){
 const [detail]=useState(()=>analytics&&import.meta.env.VITE_PLEEE_SEAT_DWELL_ENABLED==='true'
  ?new DetailedAnalytics(()=>analytics.detailReady&&!analyticsPrivacySignal(navigator)&&
   readChoice()==='yes',event=>analytics.sendDetail(event)):null);
 const [choice,setChoice]=useState(readChoice);
 const eligible=!!detail&&analyticsMayStart(mode,basicChoice,analyticsPrivacySignal(navigator));
 function apply(value:AnalyticsChoice){
  detail?.setAllowed(eligible&&value==='yes');
  setChoice(value);
 }
 function choose(value:'yes'|'no'){
  if(value==='yes'&&!eligible)return;
  try{localStorage.setItem(CHOICE_KEY,value);}
  catch{if(value==='yes')return;}
  apply(value);
 }
 useEffect(()=>{
  if(!detail)return;
  apply(readChoice());
  const sync=(event:StorageEvent)=>{
   if(event.key===null||event.key===CHOICE_KEY)apply(readChoice());
  };
  window.addEventListener('storage',sync);
  return ()=>{window.removeEventListener('storage',sync);detail.setAllowed(false);};
 },[detail,eligible]);
 return {detail,choice,choose,eligible};
}

function readChoice():AnalyticsChoice{
 try{
  const value=localStorage.getItem(CHOICE_KEY);
  return value==='yes'||value==='no'?value:null;
 }catch{return 'no';}
}

export function DetailedAnalyticsChoices({choice,choose}:{choice:AnalyticsChoice;
 choose:(value:'yes'|'no')=>void}){
 const ko=/^ko(?:-|$)/i.test(navigator.language);
 const label=ko?'상세 행동 분석':'Detailed activity analytics';
 return <section className="device-diagnostic" aria-label={label}>
  <strong>{label}</strong>
  <p>{ko
   ?'허용하면 층·구역별 체류 시간과 좌석 번호별 선택·실제 착석 횟수를 집계합니다. Google Analytics 통계 쿠키가 적용됩니다.'
   :'If you allow, we summarize dwell time by floor and area and count selections and confirmed seating by seat number. Google Analytics cookies apply.'}</p>
  <p>{ko?'수신처는 Google LLC의 Google Analytics입니다.':'Google LLC receives the summaries through Google Analytics.'}{' '}
   <a href="/privacy.html" target="_blank" rel="noreferrer">{ko?'개인정보 안내':'Privacy notice'}</a></p>
  <div className="analytics-choice-buttons">
   <button type="button" aria-pressed={choice==='yes'} onClick={()=>choose('yes')}>{ko?'상세 분석 허용':'Allow detailed analytics'}</button>
   <button type="button" aria-pressed={choice==='no'} onClick={()=>choose('no')}>{choice==='yes'
    ?(ko?'상세 분석 동의 철회':'Withdraw detailed consent')
    :(ko?'상세 분석 거부':'Reject detailed analytics')}</button>
  </div>
 </section>;
}
