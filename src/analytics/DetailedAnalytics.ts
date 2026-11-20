import {analyticsArea,type Area,type Floor} from './analyticsArea';
import {SEATS,type Zone} from '../../shared/venue';

type SeatAction='selected'|'seated';
type AreaTime={floor:Floor;area:Area;ms:number};
type SeatCount={seat_id:string;seat_action:SeatAction;action_count:number};

export type DetailEvent=
 |{name:'pleee_area_dwell';params:{floor:Floor;area:Area;dwell_seconds:number}}
 |{name:'pleee_seat';params:SeatCount};

const seats=new Set(SEATS.map(seat=>seat.id));

class Observation{
 readonly areas=new Map<string,AreaTime>();
 readonly seatCounts=new Map<string,SeatCount>();
 previous:{key:string;now:number}|null=null;
 seat:string|null|undefined;
}

export class DetailedAnalytics{
 private observation:Observation|null=null;
 constructor(private readonly available:()=>boolean,private readonly send:(event:DetailEvent)=>void){}

 setAllowed(allowed:boolean){
  if(!allowed)this.observation=null;
  else this.observation??=new Observation();
 }

 private current(){return this.observation&&this.available()?this.observation:null;}
 get measuring(){return this.current()!==null;}

 interrupt(){if(this.observation)this.observation.previous=null;}

 position(zone:Zone,y:number,z:number,now:number){
  const visit=this.current();
  const region=analyticsArea(zone,y,z);
  if(!visit||!region||!Number.isFinite(now)){this.interrupt();return;}
  const {floor,area,key}=region;
  const before=visit.previous;
  visit.previous={key,now};
  if(!before||before.key!==key||now<=before.now||now-before.now>2500)return;
  const total=visit.areas.get(key)??{floor,area,ms:0};
  total.ms+=now-before.now;
  visit.areas.set(key,total);
 }

 selected(id:string){this.recordSeat(id,'selected');}

 seated(id:string|null){
  const visit=this.current();
  if(!visit)return;
  const before=visit.seat;
  visit.seat=id;
  if(id&&before!==undefined&&before!==id)this.recordSeat(id,'seated');
 }

 private recordSeat(id:string,action:SeatAction){
  const visit=this.current();
  if(!visit||!seats.has(id))return;
  const key=action+'_'+id;
  const count=visit.seatCounts.get(key)??{seat_id:id,seat_action:action,action_count:0};
  count.action_count++;
  visit.seatCounts.set(key,count);
 }

 flush(){
  const visit=this.current();
  // Consume before dispatch so a failed send or repeated pagehide cannot replay it.
  this.observation=null;
  if(!visit)return;
  const deliver=(event:DetailEvent)=>{
   if(!this.available())return;
   try{this.send(event);}catch{/* Analytics must never disrupt the concert. */}
  };
  for(const key of [...visit.seatCounts.keys()].sort()){
   deliver({name:'pleee_seat',params:visit.seatCounts.get(key)!});
  }
  for(const key of [...visit.areas.keys()].sort()){
   const {floor,area,ms}=visit.areas.get(key)!;
   const seconds=Math.floor(ms/30000)*30;
   if(seconds)deliver({name:'pleee_area_dwell',params:{floor,area,dwell_seconds:seconds}});
  }
 }
}
