import {useEffect,useState} from 'react';
import {detailedAnalyticsMock,type AnalyticsConsent} from './ga4';
import {DetailedAnalytics} from './DetailedAnalytics';
import {ExtraAnalytics} from './ExtraAnalytics';
import {ZoneAnalytics} from './ZoneAnalytics';
import {ResearchAnalytics} from './ResearchAnalytics';
import {WebPerformanceAnalytics} from './WebPerformanceAnalytics';
import {analyticsMayStart,analyticsPrivacySignal,readAnalyticsPreference,type AnalyticsChoice} from './regionConsent';
import type {AnalyticsMode} from '../../shared/analyticsPolicy';

const consentKey=(key:string)=>detailedAnalyticsMock?'mock-'+key:key;
const CHOICE_KEY=consentKey('pleee-seat-and-dwell-consent-v1');
const EXTRA_CHOICE_KEY=consentKey('pleee-extra-analytics-consent-v1');
const ZONE_CHOICE_KEY=consentKey('pleee-zone-analytics-consent-v1');
const RESEARCH_CHOICE_KEY=consentKey('pleee-research-analytics-consent-v1');
const PERFORMANCE_CHOICE_KEY=consentKey('pleee-web-performance-consent-v1');

const readBasicChoice=()=>{
 try{return detailedAnalyticsMock?readChoice('pleee-ga4-choice-mock-v1'):readAnalyticsPreference(localStorage);}
 catch{return 'no';}
};

export function useDetailedAnalytics(analytics:AnalyticsConsent|null,
 mode:AnalyticsMode,basicChoice:AnalyticsChoice,hall:'classical'|'jazz'){
 const [initialBasicChoice]=useState(readBasicChoice);
 const [{detail,extra,zones,research,performance}]=useState(()=>{
  if(!analytics||(!detailedAnalyticsMock&&import.meta.env.VITE_PLEEE_SEAT_DWELL_ENABLED!=='true'))return {detail:null,extra:null,zones:null,research:null,performance:null};
  const available=(key:string)=>()=>analytics.detailReady&&!analyticsPrivacySignal(navigator)&&readChoice(key)==='yes';
  return {
   detail:new DetailedAnalytics(available(CHOICE_KEY),event=>analytics.sendDetail(event)),
   extra:new ExtraAnalytics(hall,available(EXTRA_CHOICE_KEY),event=>analytics.sendDetail(event)),
   zones:new ZoneAnalytics(hall,available(ZONE_CHOICE_KEY),event=>analytics.sendDetail(event)),
   research:new ResearchAnalytics(hall,available(RESEARCH_CHOICE_KEY),event=>analytics.sendDetail(event)),
   performance:new WebPerformanceAnalytics(hall,readChoice(PERFORMANCE_CHOICE_KEY)==='yes',
    ()=>!analyticsPrivacySignal(navigator)&&readBasicChoice()!=='no'&&readChoice(PERFORMANCE_CHOICE_KEY)==='yes',
    ()=>analytics.detailReady,event=>analytics.sendDetail(event)),
  };
 });
 const eligible=!!detail&&analyticsMayStart(mode,basicChoice,analyticsPrivacySignal(navigator));
 const seatChoice=useDetailChoice(CHOICE_KEY,detail,eligible);
 const extraChoice=useDetailChoice(EXTRA_CHOICE_KEY,extra,eligible);
 const zoneChoice=useDetailChoice(ZONE_CHOICE_KEY,zones,eligible);
 const researchChoice=useDetailChoice(RESEARCH_CHOICE_KEY,research,eligible);
 const performanceChoice=useDetailChoice(PERFORMANCE_CHOICE_KEY,performance,eligible,eligible&&analyticsMayStart(mode,initialBasicChoice));
 return {detail,extra,zones,research,seatChoice,extraChoice,zoneChoice,researchChoice,performanceChoice,eligible};
}

function useDetailChoice(key:string,collector:{setAllowed(allowed:boolean):void}|null,eligible:boolean,canMeasure=eligible){
 const [choice,setChoice]=useState(()=>readChoice(key));
 function apply(value:AnalyticsChoice){
  collector?.setAllowed(canMeasure&&value==='yes');
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
 },[key,collector,canMeasure]);
 return {choice,choose};
}

function readChoice(key:string):AnalyticsChoice{
 try{
  const value=localStorage.getItem(key);
  return value==='yes'||value==='no'?value:null;
 }catch{return 'no';}
}

export function DetailedAnalyticsChoices({choice,choose,kind='seat'}:{choice:AnalyticsChoice;kind?:'seat'|'extra'|'zones'|'research'|'performance';
 choose:(value:'yes'|'no')=>void}){
 const ko=/^ko(?:-|$)/i.test(navigator.language);
 const extra=kind==='extra',zones=kind==='zones',research=kind==='research';
 const performance=kind==='performance';
 const label=performance?(ko?'화면 성능 분석':'Web performance analytics'):research?(ko?'이용 경험 분석':'Visitor experience analytics'):zones?(ko?'구역 이동 분석':'Zone movement analytics'):extra?(ko?'공간·기능·음악 분석':'Hall, feature and music analytics')
  :(ko?'상세 행동 분석':'Detailed activity analytics');
 const explanation=performance?(ko
  ?'허용하면 다음 페이지부터 화면 표시·클릭과 탭 반응·화면 흔들림·연결 시간·로딩 방식과 영향을 받는 화면 영역을 측정합니다. Google Analytics 통계 쿠키가 적용됩니다.'
  :'If you allow, beginning with the next page we measure display and loading, interaction response, layout stability, connection timing, navigation or delivery type, and coarse interface groups. Google Analytics cookies apply.')
  :research?(ko
  ?'허용하면 재생 시도와 결과·대기, 청취 이정표, 곡·공연 목록, 첫 방문 안내 단계, 기능 화면 노출·취소, 인원 범위, 조작 결과를 집계합니다. Google Analytics 통계 쿠키가 적용됩니다.'
  :'If you allow, we summarize playback attempts, outcomes and waits, listening milestones, track and program use, onboarding stages, feature panel views and cancellations, co-audience ranges, and action outcomes. Google Analytics cookies apply.')
  :zones?(ko
  ?'허용하면 클래식·재즈 공연장에서 출발·도착 구역별 변경 횟수와 마지막으로 관측한 층·구역을 집계합니다. Google Analytics 통계 쿠키가 적용됩니다.'
  :'If you allow, we summarize changes between coarse zones and the last observed floor and zone in each hall. Google Analytics cookies apply.')
  :extra?(ko
  ?'허용하면 클래식·재즈 공간 종류, 기능 사용·완료 횟수, 음악 재생 상태와 실제 청취 시간을 집계합니다. Google Analytics 통계 쿠키가 적용됩니다.'
  :'If you allow, we summarize classical or jazz hall use, feature use and completion, playback status and audible listening time. Google Analytics cookies apply.')
  :(ko?'허용하면 층·구역별 체류 시간과 좌석 번호별 선택·실제 착석 횟수를 집계합니다. Google Analytics 통계 쿠키가 적용됩니다.'
   :'If you allow, we summarize dwell time by floor and area and count selections and confirmed seating by seat number. Google Analytics cookies apply.');
 const allow=performance?(ko?'화면 성능 분석 허용':'Allow web performance analytics'):research?(ko?'이용 경험 분석 허용':'Allow visitor experience analytics'):zones?(ko?'구역 이동 분석 허용':'Allow zone analytics'):extra?(ko?'추가 분석 허용':'Allow additional analytics'):(ko?'상세 분석 허용':'Allow detailed analytics');
 const reject=performance?(ko?'화면 성능 분석 거부':'Reject web performance analytics'):research?(ko?'이용 경험 분석 거부':'Reject visitor experience analytics'):zones?(ko?'구역 이동 분석 거부':'Reject zone analytics'):extra?(ko?'추가 분석 거부':'Reject additional analytics'):(ko?'상세 분석 거부':'Reject detailed analytics');
 const withdraw=performance?(ko?'화면 성능 분석 동의 철회':'Withdraw web performance consent'):research?(ko?'이용 경험 분석 동의 철회':'Withdraw visitor experience consent'):zones?(ko?'구역 이동 동의 철회':'Withdraw zone consent'):extra?(ko?'추가 분석 동의 철회':'Withdraw additional consent'):(ko?'상세 분석 동의 철회':'Withdraw detailed consent');
 return <section className="device-diagnostic" aria-label={label}>
  <strong>{label}</strong>
  <p>{explanation}</p>
  <p>{detailedAnalyticsMock?(ko?'로컬 모의 환경입니다.':'Local simulation.'):(ko?'수신처는 Google LLC의 Google Analytics입니다.':'Google LLC receives the summaries through Google Analytics.')}{' '}
   <a href="/privacy.html" target="_blank" rel="noreferrer">{ko?'개인정보 안내':'Privacy notice'}</a></p>
  <div className="analytics-choice-buttons">
   <button type="button" aria-pressed={choice==='yes'} onClick={()=>choose('yes')}>{allow}</button>
   <button type="button" aria-pressed={choice==='no'} onClick={()=>choose('no')}>{choice==='yes'?withdraw:reject}</button>
  </div>
 </section>;
}
