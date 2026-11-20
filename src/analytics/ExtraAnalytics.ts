import actions from '../../shared/hall-analytics-actions.json';
import {PlaybackTracker,type PlaybackSample} from './PlaybackTracker';

type Hall='classical'|'jazz';
export type Feature=keyof typeof actions|'tarot'|'queen_cards';
type FeatureAction='used'|'completed';
const completions=new Set<Feature>(['tarot','queen_cards']);
type FeatureCount={hall:Hall;feature:Feature;feature_action:FeatureAction;action_count:number};

export type ExtraEvent=
 |{name:'pleee_hall';params:{hall:Hall}}
 |{name:'pleee_feature';params:FeatureCount}
 |{name:'pleee_listening';params:{hall:Hall;playback_state:'playing'|'not_playing';listening_seconds:number}};

class Observation{
 readonly features=new Map<string,FeatureCount>();
 readonly listening=new PlaybackTracker(()=>{},true);
 playbackState:'playing'|'not_playing'|null=null;
}

export class ExtraAnalytics{
 private observation:Observation|null=null;
 constructor(private readonly hall:Hall,private readonly available:()=>boolean,
  private readonly send:(event:ExtraEvent)=>void){}

 setAllowed(allowed:boolean){
  if(!allowed)this.observation=null;
  else this.observation??=new Observation();
 }

 private current(){return this.observation&&this.available()?this.observation:null;}
 get measuring(){return this.current()!==null;}

 feature(feature:Feature,action:FeatureAction='used'){
  const visit=this.current();
  if(!visit||(!Object.hasOwn(actions,feature)&&!completions.has(feature)))return;
  if(action==='completed'&&!completions.has(feature))return;
  const key=action+'_'+feature;
  const count=visit.features.get(key)??{hall:this.hall,feature,feature_action:action,action_count:0};
  count.action_count++;
  visit.features.set(key,count);
 }

 samplePlayback(sample:PlaybackSample){
  const visit=this.current();
  if(!visit)return;
  visit.listening.sample(sample);
  visit.playbackState=sample.audible?'playing':'not_playing';
 }

 resetPlayback(){this.observation?.listening.resetSample();}

 flush(){
  const visit=this.current();
  this.observation=null;
  if(!visit)return;
  const deliver=(event:ExtraEvent)=>{
   if(!this.available())return;
   try{this.send(event);}catch{/* Optional analytics must never disrupt the concert. */}
  };
  deliver({name:'pleee_hall',params:{hall:this.hall}});
  for(const key of [...visit.features.keys()].sort()){
   deliver({name:'pleee_feature',params:visit.features.get(key)!});
  }
  if(visit.playbackState)deliver({name:'pleee_listening',params:{
   hall:this.hall,playback_state:visit.playbackState,listening_seconds:Math.floor(visit.listening.measuredMs/1000),
  }});
 }
}
