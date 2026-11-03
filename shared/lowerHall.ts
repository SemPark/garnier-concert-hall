import {PARTERRE} from './parterre';
export const LOWER_HALL={front:-27,rear:39.8,doorZ:PARTERRE.sideStairZ[0],doorWidth:4.8,doorHeight:6.85,ceiling:7.90,plinth:1.23,statueWidth:.9} as const;
/** The existing doorway plus its two framed figure piers is one complete facade cell. */
export const HALL_CELL_WIDTH=LOWER_HALL.doorWidth+2.1;
export type HallCell={index:number;center:number;start:number;end:number};
/** Whole cells share one grid across all three storeys; corner remainders are infill only. */
export function hallCells(front:number,rear:number):HallCell[]{
 const cells:HallCell[]=[];
 for(let index=-12;index<=12;index++){
  const center=LOWER_HALL.doorZ+index*HALL_CELL_WIDTH,start=center-HALL_CELL_WIDTH/2,end=center+HALL_CELL_WIDTH/2;
  if(start>=front-.001&&end<=rear+.001)cells.push({index,center,start,end});
 }
 return cells;
}
export const LOWER_CELLS=hallCells(LOWER_HALL.front,LOWER_HALL.rear);
/** A single pier at every cell edge; ordinary cells also have a middle pier dividing two fields. */
export const LOWER_STATUES=[...new Set(LOWER_CELLS.flatMap(c=>[c.start,...(c.index===0?[]:[c.center]),c.end]))].sort((a,b)=>a-b).filter((z,i,a)=>i===0||z-a[i-1]>.01);

const CELL_EDGES=[...new Set(LOWER_CELLS.flatMap(c=>[c.start,c.end]))].sort((a,b)=>a-b).filter((z,i,a)=>i===0||z-a[i-1]>.01);

export type ParapetModule={kind:'marble'|'pattern';start:number;end:number};
/** Marble piers align under the figures. Any short remainder beside a door becomes up to three marble fields. */
export function parapetModules(start:number,end:number):ParapetModule[]{
 const width=.82,raw=[{start,end:Math.min(end,start+width)},...CELL_EDGES.filter(z=>z>start&&z<end).map(z=>({start:Math.max(start,z-width/2),end:Math.min(end,z+width/2)})),{start:Math.max(start,end-width),end}].sort((a,b)=>a.start-b.start);
 const merged:{start:number;end:number}[]=[];
 for(const p of raw){const last=merged.at(-1);if(last&&p.start-last.end<1.15)last.end=Math.max(last.end,p.end);else merged.push({...p});}
 const result:ParapetModule[]=[];let cursor=start;
 for(const p of merged){
  if(p.start>cursor)result.push({kind:'pattern',start:cursor,end:p.start});
  const count=Math.min(3,Math.max(1,Math.round((p.end-p.start)/1.5)));
  for(let i=0;i<count;i++)result.push({kind:'marble',start:p.start+(p.end-p.start)*i/count,end:p.start+(p.end-p.start)*(i+1)/count});
  cursor=p.end;
 }
 return result;
}
