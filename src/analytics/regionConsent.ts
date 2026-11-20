import {ANALYTICS_MODE_PATH,type AnalyticsMode,type AnalyticsPolicy} from '../../shared/analyticsPolicy';
export const ANALYTICS_CHOICE_KEY='pleee-ga4-choice-v2';
export const PRIOR_ANALYTICS_CHOICE_KEY='pleee-ga4-opt-in-v1';
export type AnalyticsChoice='yes'|'no'|null;

export function readAnalyticsPreference(storage:Pick<Storage,'getItem'>):AnalyticsChoice{
 try{
  const current=storage.getItem(ANALYTICS_CHOICE_KEY);
  if(current==='yes'||current==='no')return current;
  return storage.getItem(PRIOR_ANALYTICS_CHOICE_KEY)==='no'?'no':null;
 }catch{return 'no';}
}
export function analyticsPrivacySignal(privacy:{globalPrivacyControl?:boolean;doNotTrack?:string|null}){
 return privacy.globalPrivacyControl===true||['1','yes'].includes(privacy.doNotTrack??'');
}
export function analyticsMayStart(mode:AnalyticsMode,choice:AnalyticsChoice,blocked=false){
 return !blocked&&choice!=='no'&&(mode==='auto'||(mode==='ask'&&choice==='yes'));
}
export function analyticsDetailAllowed(choice:AnalyticsChoice,automatic=false){
 return choice==='yes'||(choice===null&&automatic);
}
export async function fetchAnalyticsPolicy(signal:AbortSignal,request:typeof fetch=fetch):Promise<AnalyticsPolicy>{
 try{
  const res=await request(ANALYTICS_MODE_PATH,{signal,cache:'no-store',credentials:'omit',
   referrerPolicy:'no-referrer',mode:'same-origin',redirect:'error'});
  if(!res.ok)return {mode:'off'};
  const data=await res.json();
  if(data?.mode==='auto'&&data.detailAutomatic===true)return {mode:'auto',detailAutomatic:true};
  return {mode:data?.mode==='auto'||data?.mode==='ask'?data.mode:'off'};
 }catch{return {mode:'off'};}
}
