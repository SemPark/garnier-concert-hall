import {ANALYTICS_MODE_PATH,type AnalyticsMode} from '../../shared/analyticsPolicy';
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
export async function fetchAnalyticsMode(signal:AbortSignal,request:typeof fetch=fetch):Promise<AnalyticsMode>{
 try{
  const res=await request(ANALYTICS_MODE_PATH,{signal,cache:'no-store',credentials:'omit',
   referrerPolicy:'no-referrer',mode:'same-origin',redirect:'error'});
  if(!res.ok)return 'off';
  const data=await res.json();
  return data?.mode==='auto'||data?.mode==='ask'?data.mode:'off';
 }catch{return 'off';}
}
