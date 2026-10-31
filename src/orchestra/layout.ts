import type {Instrument} from '../character/Avatar';
export type OrchestraSection='first-violins'|'second-violins'|'violas'|'cellos'|'basses'|'harps'|'keyboards'|'woodwinds'|'brass'|'percussion';
export type MusicianPlacement={instrument:Instrument;section:OrchestraSection;x:number;z:number;rise:number;yaw:number;row:number;deskId?:string};
export const STAGE_FLOOR=.675;
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
export const STAGE_TERRACES=heights.map((h,i)=>({index:i,radius:radii[i],centerZ:CONDUCTOR.z-radii[i],rise:h*STAGE_PLAN_SCALE}));
export const TERRACE_BACK=-28.8;
export function terraceFront(t:typeof STAGE_TERRACES[number],x:number):number{
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
export function stageRiseAt(x:number,z:number){let rise=0;for(const t of STAGE_TERRACES)if(z<=terraceFront(t,x)+1e-7)rise=t.rise;return rise;}
const players:MusicianPlacement[]=[];
function place(instrument:Instrument,section:OrchestraSection,row:number,angle:number,radius:number=ROW_RADII[row]){
 const x=Math.sin(angle)*radius,z=CONDUCTOR.z-Math.cos(angle)*radius;
 players.push({instrument,section,row,x,z,rise:stageRiseAt(x,z),yaw:Math.atan2(x-CONDUCTOR.x,z-CONDUCTOR.z)});
}
function band(instrument:Instrument,section:OrchestraSection,row:number,count:number,from:number,to:number){
 for(let i=0;i<count;i++)place(instrument,section,row,from+(to-from)*(count===1?.5:i/(count-1)));
}
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
// Desks only pair neighbouring string chairs on the same physical row/level.
for(const section of ['first-violins','second-violins','violas','cellos'])for(let row=0;row<7;row++){
 const seats=players.filter(p=>p.section===section&&p.row===row).sort((p,q)=>Math.atan2(p.x,CONDUCTOR.z-p.z)-Math.atan2(q.x,CONDUCTOR.z-q.z));
 seats.forEach((p,i)=>p.deskId=`${section}-${row}-${Math.floor(i/2)}`);
}
export const ORCHESTRA_LAYOUT:readonly MusicianPlacement[]=players;
