import {useEffect,useRef,useState} from 'react';
import type {AnalyticsMode,AnalyticsPolicy} from '../../shared/analyticsPolicy';
import {detailedAnalyticsMock,type AnalyticsConsent} from './ga4';
import {
 ANALYTICS_CHOICE_KEY,PRIOR_ANALYTICS_CHOICE_KEY,analyticsMayStart,analyticsPrivacySignal,
 fetchAnalyticsPolicy,readAnalyticsPreference,type AnalyticsChoice,
} from './regionConsent';

const choiceKey=detailedAnalyticsMock?'pleee-ga4-choice-mock-v1':ANALYTICS_CHOICE_KEY;
function readChoice(){
 if(!detailedAnalyticsMock)return readAnalyticsPreference(window.localStorage);
 const value=window.localStorage.getItem(choiceKey);
 return value==='yes'||value==='no'?value:null;
}
export function useAnalyticsPreference(analytics:AnalyticsConsent|null){
 const [policy,setPolicy]=useState<AnalyticsPolicy>({mode:'off'});
 const [choice,setChoice]=useState<AnalyticsChoice>(null);
 const modeRef=useRef<AnalyticsMode>('off');
 const choiceRef=useRef<AnalyticsChoice>(null);
 function apply(next:AnalyticsChoice){
  choiceRef.current=next;setChoice(next);
  try{
   if(next==='no')analytics?.refuse();
   else analytics?.setAccepted(analyticsMayStart(modeRef.current,next,analyticsPrivacySignal(navigator)));
  }
  catch{/* Optional analytics must never disrupt the concert. */}
 }
 function choose(value:Exclude<AnalyticsChoice,null>){
  if(modeRef.current==='off'||analyticsPrivacySignal(navigator))return;
  try{localStorage.setItem(choiceKey,value);}
  catch{if(value==='yes')return;}
  apply(value);
 }
 useEffect(()=>{
  if(!analytics||analyticsPrivacySignal(navigator))return;
  const abort=new AbortController();
  try{apply(readChoice());}
  catch{return;}
  const sync=(event:StorageEvent)=>{
   if(event.key!==null&&event.key!==choiceKey&&event.key!==PRIOR_ANALYTICS_CHOICE_KEY)return;
   try{if(event.storageArea===window.localStorage)apply(readChoice());}
   catch{apply('no');}
  };
  window.addEventListener('storage',sync);
  void (detailedAnalyticsMock?Promise.resolve<AnalyticsPolicy>({mode:'ask'}):fetchAnalyticsPolicy(abort.signal)).then(next=>{
   if(abort.signal.aborted)return;
   modeRef.current=next.mode;setPolicy(next);apply(choiceRef.current);
  });
  return ()=>{
   abort.abort();window.removeEventListener('storage',sync);
   modeRef.current='off';analytics.setAccepted(false);
  };
 },[analytics]);
 return {...policy,choice,choose};
}

export function AnalyticsOptOut({choice,choose}:{
 choice:AnalyticsChoice;choose:(value:'yes'|'no')=>void;
}){
 const ko=typeof navigator!=='undefined'&&/^ko(?:-|$)/i.test(navigator.language);
 return <label className="analytics-opt-out">
  <input type="checkbox" role="switch" checked={choice==='no'}
   onChange={event=>choose(event.currentTarget.checked?'no':'yes')}/>
  {ko?'Google Analytics 통계 수집 차단':'Block Google Analytics collection'}
 </label>;
}

export function AnalyticsChoices({choose,choice,inSettings=false}:{
 choose:(choice:'yes'|'no')=>void;choice:AnalyticsChoice;inSettings?:boolean;
}){
 const [expanded,setExpanded]=useState(false);
 const ko=typeof navigator!=='undefined'&&/^ko(?:-|$)/i.test(navigator.language);
 const copy=ko?{
  label:'방문·재생 통계 쿠키 선택',manage:'통계 선택 변경',explanation:'Google Analytics 통계 쿠키를 허용할까요? 허용하지 않아도 음악당을 이용할 수 있어요.',
  privacy:'개인정보 안내',yes:'허용',no:'거부',
 }:{
  label:'Analytics cookies',manage:'Manage analytics cookies',explanation:'Allow Google Analytics cookies to measure visits and music playback? You can use PLEEE without allowing them.',
  privacy:'Privacy notice',yes:'Allow',no:'Reject',
 };
 if(inSettings&&!expanded)return <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(true)}>{copy.manage}</button>;
 return <div className={inSettings?'analytics-choices in-settings':'analytics-choices'}
   role="group" aria-label={copy.label}>
  <p>{copy.explanation}{' '}
   {!inSettings&&<a href="/privacy.html" target="_blank" rel="noreferrer">{copy.privacy}</a>}</p>
  <div className="analytics-choice-buttons">
   <button type="button" aria-pressed={choice==='yes'} onClick={()=>choose('yes')}>{copy.yes}</button>
   <button type="button" aria-pressed={choice==='no'} onClick={()=>choose('no')}>{copy.no}</button>
  </div>
 </div>;
}
