import type {Instrument} from '../character/Avatar';
export type OrchestraSection='first-violins'|'second-violins'|'violas'|'cellos'|'basses'|'harps'|'keyboards'|'woodwinds'|'brass'|'percussion';
export type MusicianPlacement={instrument:Instrument;section:OrchestraSection;x:number;z:number;rise:number;yaw:number};
export const STAGE_FLOOR=.675;
export const STAGE={width:28,front:-9.5,back:-29,wallX:15.3};
export const MUSICIAN_SCALE=.86;
export const CONCERT_CAMERA={eye:[0,12.5,-2.7],look:[0,1.8,-19.4]} as const;
export const CONDUCTOR={x:0,z:-10.7};
// Count the visible instrument symbols in the supplied diagram, including the
// partially cropped sixth bass. A timpani set has one player, not one per drum.
export const REFERENCE_COUNTS={
 'first-violins':13,'second-violins':14,violas:14,cellos:10,basses:6,harps:2,
 woodwinds:16,brass:15,percussion:9,keyboards:2,
} as const;
export const STRING_TIERS=[{r:5,rise:.15},{r:6.5,rise:.3},{r:8,rise:.45},{r:9.5,rise:.6}] as const;
export const REAR_TIERS=[
 {z:-17.8,width:4.8,depth:1.4,rise:.7},
 {z:-19.2,width:5.8,depth:1.4,rise:1},
 {z:-20.6,width:7,depth:1.4,rise:1.3},
 {z:-22,width:9,depth:1.4,rise:1.7},
 {z:-23.4,width:15,depth:1.4,rise:2.1},
 {z:-24.8,width:17,depth:1.4,rise:2.6},
 {z:-26.7,width:23,depth:2.2,rise:3.1},
] as const;
export const SIDE_PLATFORMS=[
 {x:-10.2,z:-11.7,width:2.1,depth:2.2,rise:.65},
 {x:-12,z:-14,width:2.1,depth:2.2,rise:.85},
 {x:-11.8,z:-20.4,width:3.3,depth:3.4,rise:1.25},
 {x:-11.8,z:-24.4,width:2.8,depth:2.8,rise:2.1},
] as const;
const players:MusicianPlacement[]=[];
function add(instrument:Instrument,section:OrchestraSection,x:number,z:number,rise:number){players.push({instrument,section,x,z,rise,yaw:Math.atan2(x-CONDUCTOR.x,z-CONDUCTOR.z)});}
function arc(instrument:Instrument,section:OrchestraSection,r:number,count:number,from:number,to:number,rise:number){for(let i=0;i<count;i++){const a=from+(to-from)*(count===1?.5:i/(count-1));add(instrument,section,Math.sin(a)*r,CONDUCTOR.z-Math.cos(a)*r,rise);}}
function row(instruments:Instrument[],section:OrchestraSection,z:number,spacing:number,rise:number){instruments.forEach((instrument,i)=>add(instrument,section,(i-(instruments.length-1)/2)*spacing,z,rise));}
// Each section is kept separate; cellos occupy only the front-right fan.
arc('violin','first-violins',3.5,3,-1.28,-.5,0);
arc('violin','first-violins',5,4,-1.28,-.5,.15);
arc('violin','first-violins',6.5,6,-1.3,-.5,.3);
arc('violin','second-violins',8,7,-1.3,-.5,.45);
arc('violin','second-violins',9.5,7,-1.3,-.5,.6);
arc('cello','cellos',3.5,3,.5,1.28,0);
arc('cello','cellos',5,3,.5,1.28,.15);
arc('cello','cellos',6.5,4,.5,1.3,.3);
arc('viola','violas',8,7,.5,1.3,.45);
arc('viola','violas',9.5,7,.5,1.3,.6);
arc('bass','basses',11.5,6,.56,1.36,.95);
add('harp','harps',-10.2,-11.7,.65);add('harp','harps',-12,-14,.85);
add('piano','keyboards',-11.8,-20.4,1.25);add('celesta','keyboards',-11.8,-24.4,2.1);
row(['flute','flute','oboe','english-horn'],'woodwinds',-17.8,1.1,.7);
row(['flute','piccolo','oboe','english-horn'],'woodwinds',-19.2,1.2,1);
row(['clarinet','clarinet','bassoon','bassoon'],'woodwinds',-20.6,1.4,1.3);
row(['clarinet','bass-clarinet','bassoon','contrabassoon'],'woodwinds',-22,1.5,1.7);
row(['horn','horn','horn','horn','horn','horn','tuba'],'brass',-23.4,1.7,2.1);
row(['trumpet','trumpet','trumpet','trumpet','trombone','trombone','trombone','trombone'],'brass',-24.8,1.8,2.6);
row(['bass-drum','snare','cymbals','sleigh-bells','triangle','chimes','gong','timpani','xylophone'],'percussion',-26.7,2.3,3.1);
export const ORCHESTRA_LAYOUT:readonly MusicianPlacement[]=players;
