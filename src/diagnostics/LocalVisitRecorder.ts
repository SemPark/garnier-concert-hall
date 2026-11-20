import type {Snapshot} from '../../shared/protocol';
import {GOLDEN_HALL} from '../../shared/goldenHall';
import {ATRIUM} from '../../shared/grandStair';
import {SEATS,type Zone} from '../../shared/venue';

const seats=new Set(SEATS.map(seat=>seat.id));
export const MAX_VISIT_ROWS=1800;
export function confirmedVisitorSeat(state:Snapshot|null,self:{id:string;zone:Zone;seatId:string|null}|null,selfId:string){
 const id=self?.seatId,claim=id?state?.seats[id]:undefined;
 return self?.id===selfId&&self.zone==='auditorium'&&id&&seats.has(id)&&claim?.visitorId===selfId&&claim.status==='seated'?id:null;
}
export function otherVisitorGroup(count:number){
 return count===0?'0':count===1?'1':count<=4?'2-4':'5+';
}
type Crowd=ReturnType<typeof otherVisitorGroup>;
type Movement='unknown'|'walk'|'transition'|'teleport'|'seat';
type Observation={
 hall:'classical'|'jazz';zone:Zone;x:number;y:number;z:number;walking:boolean;
 seat:string|null;track:string;playlist:string;measuredMs:number;others?:Crowd;
};
export type VisitRow={
 visit:string;seq:number;at:number;layout:'dinner-v1';hall:Observation['hall'];zone:Zone;floor:1|2;
 x:number;z:number;area:string;dwellMs:number|null;playbackMs:number|null;move:Movement;
 seat:string|null;action:string|null;playlist:string;track:string;others?:Crowd;
};

export class LocalVisitRecorder{
 readonly rows:VisitRow[]=[];
 private previous:{row:VisitRow;measuredMs:number;clock:number}|null=null;
 private sequence=0;
 private discarded=false;
 constructor(readonly visit:string){}

 discard(){this.discarded=true;this.previous=null;this.rows.length=0;}

 interrupt(){if(this.previous){this.previous=null;this.sequence++;}}

 record(observation:Observation,at:number,clock:number,action:string|null=null,movement?:Movement){
  if(this.discarded||this.rows.length>=MAX_VISIT_ROWS)return;
  const {hall,zone,x,y,z,track,playlist,measuredMs}=observation;
  if(![x,y,z,at,clock,measuredMs].every(Number.isFinite))return;
  const floor=y>=(zone==='lobby'?ATRIUM.balconyY:GOLDEN_HALL.balconyHeight)-.3?2:1;
  const area=zone==='lobby'?'lobby':z<8?'front':z<24?'middle':'rear';
  const seat=observation.seat&&seats.has(observation.seat)?observation.seat:null;
  const before=this.previous;
  const elapsed=before?Math.round(clock-before.clock):0;
  const contiguous=!!before&&elapsed>=0&&elapsed<=12500&&at>=before.row.at&&Math.abs((at-before.row.at)-elapsed)<1500;
  const sameArea=contiguous&&before.row.area===area&&before.row.zone===zone&&before.row.floor===floor;
  const positionX=Math.round(x*10)/10,positionZ=Math.round(z*10)/10;
  const move:Movement=!contiguous?'unknown':movement??(before.row.zone!==zone?'transition':
   observation.walking&&(before.row.x!==positionX||before.row.z!==positionZ)?'walk':'unknown');
  const audioDelta=before?Math.round(measuredMs-before.measuredMs):0;
  const stable=sameArea&&move!=='teleport'&&move!=='transition';
  const row:VisitRow={
   visit:this.visit,seq:++this.sequence,at,layout:'dinner-v1',hall,zone,floor,x:positionX,z:positionZ,area,
   dwellMs:stable?elapsed:null,
   playbackMs:stable&&before.row.track===track&&before.row.playlist===playlist&&audioDelta>=0?Math.min(elapsed,audioDelta):null,
   move,seat,action,playlist,track,others:observation.others,
  };
  if(before&&!contiguous)row.seq=++this.sequence;
  this.rows.push(row);this.previous={row,measuredMs,clock};
 }
}

export function mapSeatAction(id:string){return seats.has(id)?'hall_selected_'+id.replace(/-/g,'_'):null;}
