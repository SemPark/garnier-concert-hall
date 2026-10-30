import type {Instrument} from '../character/Avatar';
export type OrchestraSection='first-violins'|'second-violins'|'violas'|'cellos'|'basses'|'harps'|'keyboards'|'woodwinds'|'brass'|'percussion';
export type MusicianPlacement={instrument:Instrument;section:OrchestraSection;x:number;z:number;rise:number;yaw:number;deskId?:string};
export const STAGE_FLOOR=.675;
export const STAGE={width:30.4,front:-9.5,back:-29,wallX:15.3};
export const MUSICIAN_SCALE=1.1;
export const CONCERT_CAMERA={eye:[0,13,-1.4],look:[0,2.3,-20.1]} as const;
export const CONDUCTOR={x:0,z:-10.7};
// Retain the user's 101-player complement; the SCL PDF specifies stage geometry,
// not a mandatory headcount or the instrumentation of Mozart's Figaro overture.
export const REFERENCE_COUNTS={
 'first-violins':13,'second-violins':14,violas:14,cellos:10,basses:6,harps:2,
 woodwinds:16,brass:15,percussion:9,keyboards:2,
} as const;
export const STAGE_PLAN_SCALE=STAGE.width/19.2;
// SCL p1 / Musikverein stage plan: 27, 29, 28, 28, 28 cm rises,
// 238 cm front apron, then 120 / 125 / 125 / 125 cm terrace depths.
const heights=[.27,.56,.84,1.12,1.4],depths=[2.38,3.58,4.83,6.08,7.33];
export const STAGE_TERRACES=heights.map((h,i)=>({index:i,centerZ:STAGE.front-depths[i]*STAGE_PLAN_SCALE,halfStraight:4.05+i*.3,rise:h*STAGE_PLAN_SCALE}));
export const TERRACE_BACK=-28.1;
export function terraceFront(t:typeof STAGE_TERRACES[number],x:number){return Math.min(STAGE.front-1.75*STAGE_PLAN_SCALE,t.centerZ+Math.max(0,Math.abs(x)-t.halfStraight)*.62);}
export function terraceOutline(t:typeof STAGE_TERRACES[number]){
 const half=STAGE.width/2,clip=t.halfStraight+(STAGE.front-1.75*STAGE_PLAN_SCALE-t.centerZ)/.62;
 const xs=[-half,-clip,-t.halfStraight,t.halfStraight,clip,half].filter(x=>Math.abs(x)<=half);
 return [...new Set(xs)].sort((a,b)=>a-b).map(x=>({x,z:terraceFront(t,x)}));
}
export function stageRiseAt(x:number,z:number){let rise=0;for(const t of STAGE_TERRACES)if(z<=terraceFront(t,x)+1e-7)rise=t.rise;return rise;}
/** Follow the continuous chevron terrace instead of building an island per section. */
function stringRowZ(x:number,row:number){if(row===0)return -12;return (terraceFront(STAGE_TERRACES[row-1],x)+terraceFront(STAGE_TERRACES[row],x))/2;}
const players:MusicianPlacement[]=[];
function add(instrument:Instrument,section:OrchestraSection,x:number,z:number,deskId?:string){players.push({instrument,section,x,z,rise:stageRiseAt(x,z),yaw:Math.atan2(x-CONDUCTOR.x,z-CONDUCTOR.z),deskId});}
const sections=['first-violins','second-violins','violas','cellos'] as const;
const counts=[[2,2,2,2],[3,3,3,2],[4,4,4,3],[4,5,5,3]];
for(let row=0;row<counts.length;row++){
 const total=counts[row].reduce((a,b)=>a+b,0);let column=0;
 sections.forEach((section,si)=>{for(let i=0;i<counts[row][si];i++){
  const x=(column++-(total-1)/2)*1.3,z=stringRowZ(x,row),instrument=section==='cellos'?'cello':section==='violas'?'viola':'violin';
  add(instrument,section,x,z,`${section}-${row}-${Math.floor(i/2)}`);
 }});
}
// Woodwind pairs form two coherent rows, rather than four narrow staircase rows.
const winds:Instrument[][]=[['flute','flute','flute','piccolo','oboe','oboe','english-horn','english-horn'],['clarinet','clarinet','clarinet','bass-clarinet','bassoon','bassoon','bassoon','contrabassoon']];
for(let row=0;row<2;row++)winds[row].forEach((type,i)=>add(type,'woodwinds',(i-3.5)*1.3,row===0?-20.2:-22.3));
for(let row=0;row<2;row++)for(let i=0;i<3;i++)add('horn','brass',-7-i*1.4,(i===0&&row===0?-19.5:-19.9-row*1.7));
for(let i=0;i<4;i++){add('trumpet','brass',5.65+i*1.5,-21.5);add('trombone','brass',5.65+i*1.5,-23.25);}
add('tuba','brass',12.1,-21.5);
// Vienna/Musikverein practice: double basses along the rear, behind the winds.
for(let i=0;i<6;i++)add('bass','basses',(i-2.5)*1.45,-26.5);
add('harp','harps',-12.5,-13.3);add('harp','harps',-13.6,-15.3);
add('piano','keyboards',-12.1,-17.6);add('celesta','keyboards',-12.4,-20.7);
// The five supplied SCL instruments: mallets at audience-left, bass drum and
// five timpani at audience-right. Four auxiliary players complete the section.
add('marimba','percussion',-11.7,-26.4);add('vibraphone','percussion',-12,-23.75);add('xylophone','percussion',-8.75,-25.3);
add('gong','percussion',-6.25,-26.8);add('triangle','percussion',-5.7,-24.4);add('snare','percussion',-8.1,-23.1);add('cymbals','percussion',-6.3,-23.0);
add('bass-drum','percussion',12,-25.5);add('timpani','percussion',8.6,-26.7);
export const ORCHESTRA_LAYOUT:readonly MusicianPlacement[]=players;
