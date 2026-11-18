import {PlaybackTracker} from './PlaybackTracker';

const PRODUCTION_ORIGIN='https://pleee.hall-live.workers.dev';
export const GA4_CONSENT_KEY='pleee-ga4-opt-in-v1';
type Tag=(...args:unknown[])=>void;
type AnalyticsWindow=Window&{dataLayer?:unknown[];gtag?:Tag};
type EventName='page_view'|'playback_start'|'playback_180_seconds';
type AnalyticsTransport={
 // Return a cleanup for a script which has not loaded yet.
 load(onReady:()=>void,onFailure:()=>void):()=>void;
 disable(disabled:boolean):void;
 send(event:EventName):void;
};

export function ga4MeasurementId(config:{production:boolean;origin:string;enabled:unknown;measurementId:unknown}){
 const id=config.measurementId;
 return config.production&&config.origin===PRODUCTION_ORIGIN&&config.enabled==='true'&&
  typeof id==='string'&&/^G-[A-Z0-9]{5,20}$/.test(id)?id:null;
}

export function allowsCookielessAnalytics(
 storage:Pick<Storage,'getItem'>,
 privacy:{globalPrivacyControl?:boolean;doNotTrack?:string|null},
){
 if(privacy.globalPrivacyControl===true||['1','yes'].includes(privacy.doNotTrack??''))return false;
 try{return storage.getItem(GA4_CONSENT_KEY)!=='no';}catch{return false;}
}

export function queueCookielessDefaults(tag:Tag){
 tag('consent','default',{
  analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',
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

function browserTransport(id:string):AnalyticsTransport{
 const analytics=window as AnalyticsWindow;
 const parameters={page_location:PRODUCTION_ORIGIN+'/',page_referrer:'',page_title:'PLEEE'};
 let tag:Tag|undefined;
 return {
  disable(disabled){Reflect.set(analytics,`ga-disable-${id}`,disabled);},
  load(onReady,onFailure){
   const dataLayer=analytics.dataLayer??(analytics.dataLayer=[]);
   tag=analytics.gtag??(analytics.gtag=function(){dataLayer.push(arguments);});
   // Consent defaults must be queued before any config, event or tag script request.
   queueCookielessDefaults(tag);
   const script=document.createElement('script');
   script.async=true;
   script.referrerPolicy='no-referrer';
   script.src='https://www.googletagmanager.com/gtag/js?id='+id;
   // No measurement is queued until the script loads and the visitor is not opted out.
   script.onload=()=>{
    tag?.('js',new Date());
    tag?.('config',id,{...parameters,send_page_view:false,
     allow_google_signals:false,allow_ad_personalization_signals:false});
    onReady();
   };
   script.onerror=()=>{script.remove();onFailure();};
   document.head.append(script);
   return ()=>{script.onload=null;script.onerror=null;script.remove();};
  },
  send(event){tag?.('event',event,{...parameters,send_to:id});},
 };
}

export function createPlaybackAnalytics(){
 const id=ga4MeasurementId({
  production:import.meta.env.PROD,origin:location.origin,
  enabled:import.meta.env.VITE_PLEEE_GA4_ENABLED,measurementId:import.meta.env.VITE_GA4_MEASUREMENT_ID,
 });
 return id?new AnalyticsConsent(browserTransport(id)):null;
}
