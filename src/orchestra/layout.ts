import type {Instrument} from '../character/Avatar';
import {JAZZ_HALL} from '../../shared/hallKind';
export type OrchestraSection='first-violins'|'second-violins'|'violas'|'cellos'|'basses'|'harps'|'keyboards'|'woodwinds'|'brass'|'percussion';
export type MusicianPlacement={instrument:Instrument;section:OrchestraSection;x:number;z:number;rise:number;yaw:number;row:number;deskId?:string};
/** Stage and side boxes share the entrance datum; the audience is 1.3m below. */
export const STAGE_FLOOR=0;
export const STAGE={width:30.4,front:-9.5,back:-29,wallX:15.3};
export const MUSICIAN_SCALE=1.1;
export const CONCERT_CAMERA={eye:[0,14,3.5],look:[0,2.3,-19.7]} as const;
export const CONDUCTOR={x:0,z:-11.8};
export const REFERENCE_COUNTS={
 'first-violins':13,'second-violins':14,violas:14,cellos:10,basses:6,harps:2,
 woodwinds:16,brass:16,percussion:9,keyboards:2,
} as const;
export const STAGE_PLAN_SCALE=STAGE.width/19.2;
export const ROW_RADII=[2.4,4.6,6.8,9,11.2,13.4,16.2] as const;
// Two front string rows share the stage floor. Each following row is centred
// on its own continuous fan terrace, with room for straight legs and chair backs.
const heights=[.27,.56,.84,1.12,1.4],radii=[5.65,7.85,10.05,12.25,14.45];
/** false = smaller trial orchestra (64 players); true = the full 102-player seating of the supplied diagram. */
export const FULL_ORCHESTRA=false;
// The small orchestra has no players at the very back, so its last (fifth) terrace is left out:
// the fourth becomes one deep platform for percussion and piano, closer to the audience.
export const STAGE_TERRACES=heights.slice(0,JAZZ_HALL?0:FULL_ORCHESTRA?5:4).map((h,i)=>({index:i,radius:radii[i],centerZ:CONDUCTOR.z-radii[i],rise:h*STAGE_PLAN_SCALE}));
export const TERRACE_BACK=-28.8;
/** Small orchestra: the third and fourth terraces do not wrap round to the sides. Outside the centre arc
 * their fronts run straight to the side walls, so both wings stay low and flat (room for the piano). */
const BACK_ONLY_FRONT:Record<number,number>={2:-19.5,3:-21.7};
export function terraceFront(t:typeof STAGE_TERRACES[number],x:number):number{
 const z=fanFront(t,x),line=FULL_ORCHESTRA?undefined:BACK_ONLY_FRONT[t.index];
 return line===undefined?z:Math.min(z,line);
}
function fanFront(t:typeof STAGE_TERRACES[number],x:number):number{
 // Broaden the ordinary outer left wing for piano, celesta and harps; there
 // is no separate platform. All five contours remain smooth, nested fans.
 const u=Math.max(0,Math.min(1,(-x-8)/3));
 const r=t.radius-(t.index===4?1.6*u*u*(3-2*u):0);
 const xx=Math.abs(x),join=r*.975,end=r+.45;
 if(xx<=join)return CONDUCTOR.z-Math.sqrt(r*r-xx*xx);
 const start=CONDUCTOR.z-Math.sqrt(r*r-join*join),v=Math.min(1,(xx-join)/(end-join));
 const smooth=v*v*(3-2*v);return start+(CONDUCTOR.z+2-start)*smooth;
}
export function terraceOutline(t:typeof STAGE_TERRACES[number]){
 const half=STAGE.width/2,points=[];for(let i=0;i<=160;i++){const x=-half+i/160*STAGE.width;points.push({x,z:terraceFront(t,x)});}return points;
}
/** Jazz hall: a big-band bandstand instead of the orchestra's fans. Each brass row is raised enough that its
 * players' upper bodies show over the row in front when seen from the audience: trombones on a middle tier, the
 * standing trumpets on a high one. The drums keep their own low tier and the bass stands on a small one of its own
 * so the piano does not hide it. Later entries lie on top of earlier ones. */
export const JAZZ_RISERS=[
 {x0:-2.7,x1:.9,front:-13.95,back:-18.1,rise:.35},
 {x0:.9,x1:7.3,front:-13.95,back:-18.1,rise:1.1},
 {x0:.2,x1:5.8,front:-15.95,back:-18.1,rise:2.2},
 {x0:-5.95,x1:-3.75,front:-15.3,back:-17.3,rise:.5},
] as const;
export function stageRiseAt(x:number,z:number){let rise=0;
 if(JAZZ_HALL){for(const r of JAZZ_RISERS)if(x>=r.x0&&x<=r.x1&&z<=r.front+1e-7&&z>=r.back)rise=r.rise;return rise;}
 for(const t of STAGE_TERRACES)if(z<=terraceFront(t,x)+1e-7)rise=t.rise;return rise;}
function buildLayout(full:boolean):MusicianPlacement[]{
 const players:MusicianPlacement[]=[];
 function place(instrument:Instrument,section:OrchestraSection,row:number,angle:number,radius:number=ROW_RADII[row]){
  const x=Math.sin(angle)*radius,z=CONDUCTOR.z-Math.cos(angle)*radius;
  players.push({instrument,section,row,x,z,rise:stageRiseAt(x,z),yaw:Math.atan2(x-CONDUCTOR.x,z-CONDUCTOR.z)});
 }
 function band(instrument:Instrument,section:OrchestraSection,row:number,count:number,from:number,to:number){
  for(let i=0;i<count;i++)place(instrument,section,row,from+(to-from)*(count===1?.5:i/(count-1)));
 }
 if(full){
  // Counted from the source image: the two violin wedges, viola wedge and cello
  // wedge are packed onto actual curved rows rather than scattered pixel anchors.
  band('violin','first-violins',0,2,-1.7,-1.02);band('violin','second-violins',0,1,-.34,-.34);
  band('viola','violas',0,1,.34,.34);band('cello','cellos',0,2,1.02,1.7);
  band('violin','first-violins',1,4,-1.68,-.764);
  band('violin','second-violins',1,2,-.458,-.153);
  band('viola','violas',1,5,.153,1.375);band('cello','cellos',1,1,1.68,1.68);
  for(const row of [2,3]){
   band('violin','first-violins',row,3,-1.7,-1.332);
   band('violin','second-violins',row,3,-1.148,-.78);
   band('viola','violas',row,3,.78,1.24);band('cello','cellos',row,2,1.47,1.7);
  }
  const windRows:Instrument[][]=[
   ['flute','flute','flute','piccolo','oboe','oboe','english-horn','english-horn'],
   ['clarinet','clarinet','clarinet','bass-clarinet','bassoon','bassoon','bassoon','contrabassoon'],
  ];
  windRows.forEach((types,i)=>types.forEach((type,j)=>place(type,'woodwinds',i+2,-.59+j*1.18/7+(i===1?-.025:0))));
  band('violin','first-violins',4,1,-1.45,-1.45);band('violin','second-violins',4,5,-1.29,-.65);
  band('horn','brass',4,7,-.49,.47);band('tuba','brass',4,1,.63,.63);
  band('viola','violas',4,2,.79,.95);
  // Fill the third raised row's right-hand gap with the two cellists lowered
  // from the fourth raised row; keep the total cello complement unchanged.
  band('cello','cellos',4,3,1.11,1.43);
  const back:Instrument[]=['trumpet','trumpet','trumpet','trumpet','trombone','trombone','trombone','trombone','bass','bass','bass','bass','bass','bass'];
  back.forEach((type,i)=>place(type,type==='bass'?'basses':type==='cello'?'cellos':'brass',5,-.68+i*2.33/15));
  // Every percussion label in the diagram is retained, including the separate
  // sleigh-bell and triangle stations. Timpani is one three-drum set.
  const percussion:Instrument[]=['bass-drum','snare','cymbals','sleigh-bells','triangle','chimes','gong','timpani','xylophone'];
  percussion.forEach((type,i)=>place(type,'percussion',6,-.64+i*.125));
  place('harp','harps',6,-1.64,14.25);place('harp','harps',6,-1.44,14.5);
  place('celesta','keyboards',6,-1.26,14.9);place('piano','keyboards',6,-1.04,16.2);
 }else{
  // Smaller trial orchestra (64 players): every instrument of the diagram stays, in the diagram's own
  // seating: first violins front left with the seconds behind them, cellos front right with the violas
  // inside and behind, basses at the right behind the cellos, flutes/oboes then clarinets/bassoons in the
  // centre, horns-trumpets-trombones-tuba behind them, percussion across the back, harp and keyboards left.
  // Each row is one mirror-symmetric arc with the same ~1.63 m between chairs.
  type Seat=[Instrument,OrchestraSection];
  const arc=(row:number,step:number,seats:readonly (Seat|null)[],radius?:number)=>seats.forEach((seat,i)=>{if(seat)place(seat[0],seat[1],row,(i-(seats.length-1)/2)*step,radius);});
  const v1:Seat=['violin','first-violins'],v2:Seat=['violin','second-violins'],va:Seat=['viola','violas'],vc:Seat=['cello','cellos'],cb:Seat=['bass','basses'];
  const of=(section:OrchestraSection,...types:Instrument[])=>types.map(t=>[t,section] as Seat);
  // Every string row is a full half circle, so all row ends meet one straight line across the stage
  // at the conductor (as the outside desks do in a real orchestra).
  const half=(row:number,seats:readonly (Seat|null)[],radius?:number)=>arc(row,Math.PI/(seats.length-1),seats,radius);
  half(0,[v1,v1,v2,va,vc,vc]);
  half(1,[v1,v1,v1,v2,v2,va,va,va,vc,vc]);
  half(2,[v1,v1,v2,v2,...of('woodwinds','piccolo','flute','flute','oboe','english-horn'),va,va,vc,vc]);
  // Second terrace: the harp at the left end and the basses at the right end outside the cellos, all in the
  // same row. The outermost seat on each side stays free: the Christmas trees stand there.
  half(3,[null,['harp','harps'],v1,v2,v2,v2,...of('woodwinds','bass-clarinet','clarinet','clarinet','bassoon','contrabassoon'),va,vc,cb,cb,cb,null]);
  arc(4,.1455,of('brass','horn','horn','horn','horn','trumpet','trumpet','trombone','trombone','tuba'));
  const percussion=of('percussion','bass-drum','snare','cymbals','sleigh-bells','triangle','chimes','gong','timpani','xylophone');
  // The wide bass drum needs more room behind the terrace edge.
  percussion.forEach(([type,section],i)=>place(type,section,5,(i-4)*.145,type==='bass-drum'?15:13.8));
  // Piano and celesta stand together on the flat left wing behind the harp.
  place('celesta','keyboards',3,Math.atan2(-11.6,3.4),Math.hypot(11.6,3.4));
  place('piano','keyboards',3,Math.atan2(-11.6,6.6),Math.hypot(11.6,6.6));
 }
 // Desks only pair neighbouring string chairs on the same physical row/level.
 for(const section of ['first-violins','second-violins','violas','cellos'])for(let row=0;row<7;row++){
  const seats=players.filter(p=>p.section===section&&p.row===row).sort((p,q)=>Math.atan2(p.x,CONDUCTOR.z-p.z)-Math.atan2(q.x,CONDUCTOR.z-q.z));
  seats.forEach((p,i)=>p.deskId=`${section}-${row}-${Math.floor(i/2)}`);
 }
 return players;
}
/** The complete diagram seating, kept so it can be restored with FULL_ORCHESTRA. */
export const FULL_ORCHESTRA_LAYOUT:readonly MusicianPlacement[]=buildLayout(true);
/** The classic 17-piece big band, set up as the Count Basie Orchestra is: the horns in three straight rows on the
 * audience's right (five saxophones on the floor, four trombones on the low tier, four trumpets standing on the
 * high tier), the rhythm section on the left (piano at the edge facing in, guitar in front, bass behind, drums on
 * the low tier beside the brass), with no conductor: the leader plays the piano. */
function buildJazzLayout():MusicianPlacement[]{
 const players:MusicianPlacement[]=[];
 // `face` is the direction the player looks, as [x,z]; the audience is +z.
 const put=(instrument:Instrument,section:OrchestraSection,row:number,x:number,z:number,face:[number,number]=[0,1])=>players.push({instrument,section,row,x,z,rise:stageRiseAt(x,z),yaw:Math.atan2(-face[0],-face[1])});
 // Positions measured from the reference photograph (leader at x=0, one saxophone chair ≈ 1.5 m):
 // each row sits straight behind the last, the trumpets closer together and a little to the left.
 const saxes:Instrument[]=['tenor-sax','alto-sax','alto-sax','tenor-sax','bari-sax'];
 [1.1,2.6,4.1,5.6,7.1].forEach((x,i)=>put(saxes[i],'woodwinds',0,x,-12.9));
 for(const x of [1.8,3.3,4.75,6.2])put('trombone','brass',1,x,-15.05);
 for(const x of [1.1,2.4,3.7,5])put('trumpet','brass',2,x,-17.05);
 put('piano','keyboards',0,-6.6,-13.2,[1,-.25]);put('guitar','keyboards',0,-2.9,-12.5,[.2,1]);
 put('bass','basses',1,-4.85,-16.2,[.2,1]);put('drum-kit','percussion',1,-1.45,-15.6,[.08,1]);
 return players;
}
export const ORCHESTRA_LAYOUT:readonly MusicianPlacement[]=JAZZ_HALL?buildJazzLayout():FULL_ORCHESTRA?FULL_ORCHESTRA_LAYOUT:buildLayout(false);
