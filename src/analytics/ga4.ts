import type hallAnalyticsActions from '../../shared/hall-analytics-actions.json';
import {PlaybackTracker} from './PlaybackTracker';
import {browserAnalyticsExcluded} from './browserExclusion';

const PRODUCTION_ORIGIN='https://pleee.hall-live.workers.dev';
const PRODUCTION_HOST=new URL(PRODUCTION_ORIGIN).hostname;
type Tag=(...args:unknown[])=>void;
type AnalyticsWindow=Window&{dataLayer?:unknown[];gtag?:Tag};
type HallAction=keyof typeof hallAnalyticsActions;
type EventName='page_view'|'playback_start'|'playback_180_seconds'|HallAction;
type AnalyticsTransport={
 // Return a cleanup for a script which has not loaded yet.
 load(onReady:()=>void,onFailure:()=>void):()=>void;
 disable(disabled:boolean):void;
 forgetCookies?():void;
 send(event:EventName):void;
};

export function ga4MeasurementId(config:{production:boolean;origin:string;enabled:unknown;measurementId:unknown}){
 const id=config.measurementId;
 return config.production&&config.origin===PRODUCTION_ORIGIN&&config.enabled==='true'&&
  typeof id==='string'&&/^G-[A-Z0-9]{5,20}$/.test(id)?id:null;
}

// Only called after server policy and browser choice allow initialization.
export function queueAnalyticsDefaults(tag:Tag){
 tag('consent','default',{
  analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',
 });
 tag('set','ads_data_redaction',true);
 tag('set','url_passthrough',false);
}

export class AnalyticsConsent {
 private accepted=false;
 private pageViewed=false;
 private stopLoading:(()=>void)|null=null;
 private ready=false;
 private generation=0;
 private current:PlaybackTracker|null=null;

 constructor(private transport:AnalyticsTransport|null){}

 get tracker(){return this.current;}

 trackAction(action:HallAction){
  if(!this.current)return;
  try{this.transport?.send(action);}
  catch{/* Optional analytics must not interrupt the action. */}
 }

 refuse(){
  this.setAccepted(false);
  this.transport?.forgetCookies?.();
 }

 setAccepted(accepted:boolean){
  const transport=this.transport;
  if(!transport||accepted===this.accepted)return;
  this.accepted=accepted;
  const generation=++this.generation;
  if(!accepted){
   transport.disable(true);
   this.current=null;
   this.stopLoading?.();
   this.stopLoading=null;
   return;
  }
  transport.disable(false);
  const activate=()=>{
   if(!this.accepted||generation!==this.generation)return;
   this.ready=true;
   this.stopLoading=null;
   if(!this.pageViewed){transport.send('page_view');this.pageViewed=true;}
   this.current=new PlaybackTracker(event=>{
    if(this.accepted&&generation===this.generation)transport.send(event);
   });
  };
  if(this.ready){activate();return;}
  const fail=()=>{if(generation===this.generation)this.stopLoading=null;};
  this.stopLoading=transport.load(activate,fail);
 }
}

export function expiryCookiesForHost(measurementId:string){
 // Do not delete domain cookies shared with any sibling site.
 const names=['_ga','_ga_'+measurementId.slice(2)];
 return names.map(name=>name+'=; Max-Age=0; Path=/; Secure; SameSite=Lax');
}

function parseUrl(value:string){
 try{return new URL(value);}
 catch{return null;}
}

export function landingAnalyticsParameters(landingUrl:string,referrer:string){
 const page={page_location:PRODUCTION_ORIGIN+'/',page_referrer:'',page_title:'PLEEE'};
 if(referrer){
  const parsed=parseUrl(referrer);
  if(parsed&&(parsed.protocol==='https:'||parsed.protocol==='http:')&&parsed.hostname!==PRODUCTION_HOST){
   page.page_referrer=parsed.origin;
  }
  return {page};
 }

 // Some in-app browsers omit the referrer. Recognize our tagged Threads links
 // without forwarding any user-supplied values or tagging unmarked visits.
 const query=parseUrl(landingUrl)?.searchParams;
 const sources=query?.getAll('utm_source');
 const media=query?.getAll('utm_medium');
 if(sources?.length===1&&sources[0]==='threads'){
  if(media?.length===0)return {page,campaign:{campaign_source:'threads'}};
  if(media?.length===1&&media[0]==='social'){
   return {page,campaign:{campaign_source:'threads',campaign_medium:'social'}};
  }
 }
 return {page};
}

function browserTransport(id:string):AnalyticsTransport{
 const analytics=window as AnalyticsWindow;
 // Snapshot the landing attribution while creating the consent controller.
 const {page,campaign}=landingAnalyticsParameters(location.href,document.referrer);
 let tag:Tag|undefined;
 return {
  disable(disabled){Reflect.set(analytics,`ga-disable-${id}`,disabled);},
  forgetCookies(){for(const value of expiryCookiesForHost(id))document.cookie=value;},
  load(onReady,onFailure){
   const dataLayer=analytics.dataLayer??(analytics.dataLayer=[]);
   tag=analytics.gtag??(analytics.gtag=function(){dataLayer.push(arguments);});
   // Consent defaults must be queued before any config, event or tag script request.
   queueAnalyticsDefaults(tag);
   const script=document.createElement('script');
   script.async=true;
   script.referrerPolicy='no-referrer';
   script.src='https://www.googletagmanager.com/gtag/js?id='+id;
   // No measurement is queued until the script loads and the visitor is not opted out.
   script.onload=()=>{
    tag?.('js',new Date());
    tag?.('config',id,{...page,...campaign,send_page_view:false,
     allow_google_signals:false,allow_ad_personalization_signals:false,cookie_domain:'none',cookie_path:'/'});
    onReady();
   };
   script.onerror=()=>{script.remove();onFailure();};
   document.head.append(script);
   return ()=>{script.onload=null;script.onerror=null;script.remove();};
  },
  send(event){tag?.('event',event,{...page,send_to:id});},
 };
}

export function createPlaybackAnalytics(){
 const id=ga4MeasurementId({
  production:import.meta.env.PROD,origin:location.origin,
  enabled:import.meta.env.VITE_PLEEE_GA4_ENABLED,measurementId:import.meta.env.VITE_GA4_MEASUREMENT_ID,
 });
 return id&&!browserAnalyticsExcluded()?new AnalyticsConsent(browserTransport(id)):null;
}
