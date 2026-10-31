import {musicianSits,type Instrument} from '../character/Avatar';
import {STRING_SYMBOLS,OTHER_SYMBOLS} from './referencePlan';
export type OrchestraSection='first-violins'|'second-violins'|'violas'|'cellos'|'basses'|'harps'|'keyboards'|'woodwinds'|'brass'|'percussion';
export type MusicianPlacement={instrument:Instrument;section:OrchestraSection;x:number;z:number;rise:number;yaw:number;deskId?:string};
export const STAGE_FLOOR=.675;
export const STAGE={width:30.4,front:-9.5,back:-29,wallX:15.3};
export const MUSICIAN_SCALE=1.1;
export const CONCERT_CAMERA={eye:[0,13,-1.4],look:[0,2.3,-20.1]} as const;
export const CONDUCTOR={x:0,z:-13};
// Recounted from the supplied diagram: 102 musicians, plus the conductor.
export const REFERENCE_COUNTS={
 'first-violins':13,'second-violins':14,violas:14,cellos:10,basses:6,harps:2,
 woodwinds:16,brass:16,percussion:9,keyboards:2,
} as const;
export const STAGE_PLAN_SCALE=STAGE.width/19.2;
// Continuous shallow fan terraces. The curve follows the diagram's diagonal
// string-section boundaries, rather than slicing its broad wedges into blocks.
const heights=[.27,.56,.84,1.12,1.4],depths=[2.2,5.3,9.8,11.3,13.3];
export const STAGE_TERRACES=heights.map((h,i)=>({index:i,radius:depths[i],centerZ:CONDUCTOR.z-depths[i],rise:h*STAGE_PLAN_SCALE}));
export const TERRACE_BACK=-28.1;
export function terraceFront(t:typeof STAGE_TERRACES[number],x:number):number{
 const xx=Math.min(Math.abs(x),10)**2;
 const curve=t.index===0?-.025:t.index===1?-.01:.04;
 const front=t.centerZ+curve*xx;
 const u=Math.max(0,Math.min(1,(Math.abs(x)-8)/2)),gap=1.7+1.5*u*u*(3-2*u);
 return Math.max(TERRACE_BACK,t.index===0?front:Math.min(front,terraceFront(STAGE_TERRACES[t.index-1],x)-gap));
}
export function terraceOutline(t:typeof STAGE_TERRACES[number]){
 const half=STAGE.width/2,xs=[];for(let i=0;i<=96;i++)xs.push(-half+i/96*STAGE.width);
 return xs.map(x=>({x,z:terraceFront(t,x)}));
}
export function stageRiseAt(x:number,z:number){let rise=0;for(const t of STAGE_TERRACES)if(z<=terraceFront(t,x)+1e-7)rise=t.rise;return rise;}
const players:MusicianPlacement[]=[];
function add(instrument:Instrument,section:OrchestraSection,x:number,z:number,deskId?:string){players.push({instrument,section,x,z,rise:stageRiseAt(x,z),yaw:Math.atan2(x-CONDUCTOR.x,z-CONDUCTOR.z),deskId});}
// Preserve every string symbol's relative position, including the inside
// second-violin / viola desks and the two staggered cello rows. The diagram
// does not put every first violin at a smaller radius than every second violin.
export function planToStage([x,y]:readonly [number,number]){return {x:(x-680)*.024,z:y>650?CONDUCTOR.z+(y-820)*.028:CONDUCTOR.z-4.76+(y-650)*.0204};}
for(const [section,points]of Object.entries(STRING_SYMBOLS)){
 const instrument:Instrument=section==='basses'?'bass':section==='cellos'?'cello':section==='violas'?'viola':'violin';
 points.forEach((point,i)=>{const p=planToStage(point);add(instrument,section as OrchestraSection,p.x,p.z,section==='basses'?undefined:`${section}-${Math.floor(i/2)}`);});
}
for(const group of OTHER_SYMBOLS)for(const point of group.points){const p=planToStage(point);add(group.instrument,group.section,p.x,p.z);}
// Paper symbols have different drawn sizes. Resolve the small clearance needed
// by equal-sized 3D chairs locally, without changing their section or order.
const anchors=players.map(p=>({x:p.x,z:p.z}));
function chairFits(p:MusicianPlacement){
 if(!musicianSits(p.instrument))return true;
 const level=stageRiseAt(p.x,p.z),yaw=Math.atan2(p.x-CONDUCTOR.x,p.z-CONDUCTOR.z);
 return [[-.22,-.17],[.22,-.17],[-.22,.22],[.22,.22]].every(([dx,dz])=>stageRiseAt(p.x+(dx*Math.cos(yaw)+dz*Math.sin(yaw))*MUSICIAN_SCALE,p.z+(-dx*Math.sin(yaw)+dz*Math.cos(yaw))*MUSICIAN_SCALE)===level);
}
for(let pass=0;pass<120;pass++){
 for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
  const p=players[i],q=players[j],dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz),gap=1.13;
  if(d<gap){const move=(gap-d)/2+.00001;p.x+=dx/d*move;p.z+=dz/d*move;q.x-=dx/d*move;q.z-=dz/d*move;}
 }
 for(const [i,p]of players.entries()){
  const a=anchors[i],dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz);
  if(d>.75){p.x=a.x+dx/d*.75;p.z=a.z+dz/d*.75;}
  if(!chairFits(p)){const original=p.z;for(let step=1;step<=16;step++){
   p.z=original+step*.04;if(chairFits(p))break;
   p.z=original-step*.04;if(chairFits(p))break;p.z=original;
  }}
 }
}
// Pair neighbouring string chairs, rather than joining distant symbol indices.
for(const section of ['first-violins','second-violins','violas','cellos']){
 const unpaired=new Set(players.filter(p=>p.section===section));let desk=0;
 for(const p of unpaired){unpaired.delete(p);let nearest:MusicianPlacement|undefined,best=Infinity;
  for(const q of unpaired){const d=Math.hypot(p.x-q.x,p.z-q.z);if(d<best){best=d;nearest=q;}}
  p.deskId=`${section}-${desk++}`;if(nearest&&best<2.8){nearest.deskId=p.deskId;unpaired.delete(nearest);}
 }
}
for(const p of players){p.rise=stageRiseAt(p.x,p.z);p.yaw=Math.atan2(p.x-CONDUCTOR.x,p.z-CONDUCTOR.z);}
export const ORCHESTRA_LAYOUT:readonly MusicianPlacement[]=players;
