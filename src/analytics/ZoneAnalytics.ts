import {analyticsArea,type Area,type AreaKey,type Floor,type Hall} from './analyticsArea';
import type {Zone} from '../../shared/venue';

type Flow={hall:Hall;from_zone:AreaKey;to_zone:AreaKey;action_count:number};
export type ZoneEvent=
 |{name:'pleee_zone_flow';params:Flow}
 |{name:'pleee_last_zone';params:{hall:Hall;floor:Floor;area:Area}};

class Observation {
 readonly transitions=new Map<string,Flow>();
 previous:{key:AreaKey;now:number}|null=null;
 last:{floor:Floor;area:Area}|null=null;
}

export class ZoneAnalytics {
 private observation:Observation|null=null;
 constructor(private readonly hall:Hall,private readonly available:()=>boolean,
  private readonly send:(event:ZoneEvent)=>void){}

 setAllowed(allowed:boolean){
  if(allowed)this.observation??=new Observation();
  else this.observation=null;
 }

 private current(){return this.observation&&this.available()?this.observation:null;}
 get measuring(){return this.current()!==null;}
 interrupt(){if(this.observation)this.observation.previous=null;}

 position(zone:Zone,y:number,z:number,now:number){
  const visit=this.current();
  if(!visit)return;
  const area=analyticsArea(zone,y,z);
  if(!area||!Number.isFinite(now)){this.interrupt();return;}
  const {key,floor,area:region}=area;
  const previous=visit.previous;
  visit.previous={key,now};
  visit.last={floor,area:region};
  if(!previous||previous.key===key||now<=previous.now||now-previous.now>2500)return;
  const pair=previous.key+'>'+key;
  const flow=visit.transitions.get(pair)??{hall:this.hall,from_zone:previous.key,to_zone:key,action_count:0};
  flow.action_count++;
  visit.transitions.set(pair,flow);
 }

 flush(){
  const visit=this.current();
  this.observation=null;
  if(!visit)return;
  const deliver=(event:ZoneEvent)=>{
   if(!this.available())return;
   try{this.send(event);}catch{/* Analytics does not affect venue controls. */}
  };
  // Sorting by bucket makes the payload independent of the observed order.
  for(const pair of [...visit.transitions.keys()].sort()){
   deliver({name:'pleee_zone_flow',params:visit.transitions.get(pair)!});
  }
  if(visit.last)deliver({name:'pleee_last_zone',params:{hall:this.hall,...visit.last}});
 }
}
