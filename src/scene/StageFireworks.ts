import * as T from 'three';
import {GOLDEN_HALL} from '../../shared/goldenHall';
import {GALLERY_RAIL_HEIGHT} from '../../shared/gallery';
import {UPPER_DOOR_AXES} from '../../shared/upperHall';
import {STAGE} from '../orchestra/layout';
import {WALL_DATUM,WALL_LEVELS} from './HallWallBands';
import {ORGAN_LOFT_BACK,ORGAN_RAIL_JOIN_X,organBalconyFront} from '../../shared/organLoft';

/** Adapted from Caleb Miller's Firework Simulator v2 and Todd Gray's Fireworks,
 * with Grand Fireworks' willow/brocade shaping. See public/licenses/fireworks.txt.
 * One world-space simulation, two draw calls, no extra renderer or bloom pass. */
const STEP=1/30, HISTORY=38;
const DEPTH=STAGE.back+5.2, FLOOR=4.8, GRAVITY=1.45;
// The combined shell catalog of Miller and Gray, plus the existing brocade.
const STYLES=[
 'chrysanthemum','willow','brocade','ring','palm','crossette','pistil',
 'peony','glitter','dahlia','spider','kamuro','multibreak',
 'ghost','strobe','floral','fallingLeaves','crackle','horsetail',
] as const;
type Style=typeof STYLES[number];
type BreakStyle='crossette'|'floral'|'fallingLeaves'|'crackle';
type LightPattern='steady'|'twinkle'|'strobe'|'ghost'|'hidden';
const LAUNCH_HEIGHT=.55;
const LAUNCH_DEPTH=STAGE.back+2.6;
const LAUNCH_RESERVE=112;
const MAX_BURST_X=ORGAN_RAIL_JOIN_X-1.25;
const MIDDLE_GALLERY_DOOR=Math.floor(UPPER_DOOR_AXES.length/2);
// Keep the three original bays and continue at the same spacing towards the rear.
const GALLERY_WATERFALL_AXES=UPPER_DOOR_AXES.slice(MIDDLE_GALLERY_DOOR-1,MIDDLE_GALLERY_DOOR+4);
const THIRD_FLOOR_WATERFALL_AXES=UPPER_DOOR_AXES.slice(0,MIDDLE_GALLERY_DOOR+4);
const SECOND_FLOOR_FALL_Y=GOLDEN_HALL.balconyHeight+GALLERY_RAIL_HEIGHT-.08;
const THIRD_FLOOR_FALL_Y=WALL_LEVELS.cornices[1]+.44;
const FRONT_LOFT_WING_X=ORGAN_RAIL_JOIN_X-1.5;
const GALLERY_WATERFALL_LEVELS=[
 {x:12.15,y:SECOND_FLOOR_FALL_Y,floor:2.8,offset:0,axes:GALLERY_WATERFALL_AXES,
  front:{x:FRONT_LOFT_WING_X,z:ORGAN_LOFT_BACK+organBalconyFront(FRONT_LOFT_WING_X)+.28,floor:3.8}},
 {x:WALL_DATUM.halfWidth-.76,y:THIRD_FLOOR_FALL_Y,floor:2.8+THIRD_FLOOR_FALL_Y-SECOND_FLOOR_FALL_Y,offset:1.4,axes:THIRD_FLOOR_WATERFALL_AXES,
  front:{x:13.3,z:WALL_DATUM.front+.82,floor:2.8+THIRD_FLOOR_FALL_Y-SECOND_FLOOR_FALL_Y}},
] as const;
const COMPOSITION_HEIGHTS=[10.8,14.1,17.5] as const;
const PHRASES=['opening','single','pair','triple','sweep','pyramid','barrage','theme','volley','mirror','feature','finale'] as const;
type Color=readonly [number,number,number];
type Cue={at:number;x:number;y:number;size:number;style:Style;color:Color;launchX?:number};

const GOLD:Color=[1,.62,.12];
const PALETTES:readonly Color[]=[GOLD,[1,.16,.22],[.16,.5,1],[.62,.2,1],[.15,1,.55],[1,.87,.62]];
// A phrase has a deliberate pair of colours, with gold reserved for hanging embers.
const COLOR_THEMES:readonly (readonly [Color,Color])[]=[
 [[.18,.44,1],[1,.78,.35]],
 [[1,.22,.36],[1,.8,.58]],
 [[.55,.22,1],[.3,.78,1]],
 [[.12,.8,.48],[1,.75,.28]],
 [[1,.65,.22],[1,.9,.7]],
];

interface Particle{
 x:number;y:number;z:number;px:number;py:number;pz:number;
 vx:number;vy:number;vz:number;life:number;fullLife:number;drag:number;
 seed:number;size:number;red:number;green:number;blue:number;trail:number;splitAt:number;sparkTimer:number;sparkFreq:number;
 pattern:LightPattern;breakStyle:BreakStyle|null;gallery:boolean;floor:number;history:Float32Array;slot:number;samples:number;
}
function particle(trail:boolean):Particle{return{
 x:0,y:0,z:0,px:0,py:0,pz:0,vx:0,vy:0,vz:0,life:0,fullLife:0,drag:0,
 seed:0,size:0,red:1,green:0,blue:0,trail:HISTORY,splitAt:0,sparkTimer:0,sparkFreq:0,pattern:'steady',breakStyle:null,gallery:false,floor:FLOOR,
 history:new Float32Array(trail?HISTORY*3:0),slot:0,samples:0,
};}
const rand=(lo:number,hi:number)=>lo+Math.random()*(hi-lo);
const sideDepth=(x:number)=>T.MathUtils.smoothstep(Math.abs(x),4,MAX_BURST_X);
const burstDepth=(x:number)=>DEPTH+3.5*sideDepth(x);
const launchDepth=(x:number)=>LAUNCH_DEPTH+2.1*sideDepth(x);
interface Rocket{cue:Cue;age:number;flight:number;lift:'gold'|'colored'|'dim'|'faint';}
const BREAK_DENSITY:Record<BreakStyle,number>={crossette:.14,floral:.08,fallingLeaves:.08,crackle:.25};
const GOLD_STYLES:readonly Style[]=['willow','brocade','kamuro','palm','fallingLeaves','crackle'];

export class StageFireworks{
 private readonly group=new T.Group();
 private readonly points:T.Points<T.BufferGeometry,T.ShaderMaterial>;
 private readonly lines:T.LineSegments<T.BufferGeometry,T.LineBasicMaterial>;
 private readonly stars:Particle[];
 private readonly sparks:Particle[];
 private starCount=0;private galleryCount=0;private sparkCount=0;
 private readonly rockets:Rocket[]=[];
 private readonly subBursts:Cue[]=[];
 private fountainTick=0;
 private movements=0;
 private readonly pointPositions:Float32Array;private readonly pointColors:Float32Array;private readonly pointSizes:Float32Array;
 private readonly linePositions:Float32Array;private readonly lineColors:Float32Array;
 private pointCount=0;private lineCount=0;
 private last:number|null=null;private accumulator=0;private clock=0;private nextMovement=0;
 private readonly cues:Cue[]=[];private styleBag:Style[]=[];private lastStyle:Style|null=null;private lastMovement:typeof PHRASES[number]|null=null;private lastPalette=-1;
 private low=false;

 constructor(scene:T.Scene,private readonly mobile:boolean){
  this.stars=Array.from({length:mobile?500:816},()=>particle(true));
  this.sparks=Array.from({length:mobile?1100:2400},()=>particle(false));
  const pointCapacity=this.stars.length+this.sparks.length;
  const lineCapacity=this.stars.length*(HISTORY-1)*2+this.sparks.length*2;
  this.pointPositions=new Float32Array(pointCapacity*3);this.pointColors=new Float32Array(pointCapacity*3);this.pointSizes=new Float32Array(pointCapacity);
  this.linePositions=new Float32Array(lineCapacity*3);this.lineColors=new Float32Array(lineCapacity*3);
  const pointGeo=new T.BufferGeometry(),lineGeo=new T.BufferGeometry();
  const attribute=(a:Float32Array,n:number)=>new T.BufferAttribute(a,n).setUsage(T.DynamicDrawUsage);
  pointGeo.setAttribute('position',attribute(this.pointPositions,3));
  pointGeo.setAttribute('aColor',attribute(this.pointColors,3));
  pointGeo.setAttribute('aSize',attribute(this.pointSizes,1));
  lineGeo.setAttribute('position',attribute(this.linePositions,3));
  lineGeo.setAttribute('color',attribute(this.lineColors,3));
  pointGeo.setDrawRange(0,0);lineGeo.setDrawRange(0,0);
  // Todd's solid, additive star cores. Depth test keeps the effect behind architecture/players.
  this.points=new T.Points(pointGeo,new T.ShaderMaterial({
   transparent:true,depthTest:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
   vertexShader:`attribute float aSize;attribute vec3 aColor;varying vec3 vColor;
    void main(){vColor=aColor;vec4 mv=modelViewMatrix*vec4(position,1.0);
     gl_PointSize=clamp(aSize*95.0/max(1.0,-mv.z),1.0,4.5);gl_Position=projectionMatrix*mv;}`,
   fragmentShader:`varying vec3 vColor;void main(){vec2 uv=gl_PointCoord-.5;
    if(dot(uv,uv)>.25)discard;gl_FragColor=vec4(vColor,1.0);
    #include <colorspace_fragment>
   }`,
  }));
  this.lines=new T.LineSegments(lineGeo,new T.LineBasicMaterial({
   vertexColors:true,transparent:true,depthTest:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false,
  }));
  // Includes the side-gallery waterfalls as well as the stage shells.
  const bounds=new T.Sphere(new T.Vector3(0,10,-5),49);
  pointGeo.boundingSphere=bounds;lineGeo.boundingSphere=bounds;
  this.group.name='stage-fireworks';this.group.visible=false;
  this.points.name='firework-stars-and-embers';this.lines.name='firework-curved-tails';
  this.group.add(this.lines,this.points);scene.add(this.group);
 }

 private init(p:Particle,x:number,y:number,z:number,vx:number,vy:number,vz:number,life:number){
  p.x=p.px=x;p.y=p.py=y;p.z=p.pz=z;p.vx=vx;p.vy=vy;p.vz=vz;
  p.life=p.fullLife=life;p.splitAt=0;p.breakStyle=null;p.pattern='steady';p.gallery=false;p.floor=FLOOR;p.trail=HISTORY;p.seed=rand(0,Math.PI*2);p.slot=0;p.samples=1;
  if(p.history.length){p.history[0]=x;p.history[1]=y;p.history[2]=z;}
 }

 private ember(x:number,y:number,z:number,vx:number,vy:number,vz:number,life:number,white=false,color?:Pick<Particle,'red'|'green'|'blue'>,launch=false){
  const capacity=this.low?Math.min(700,this.sparks.length):this.sparks.length;
  const cap=launch?capacity:capacity-LAUNCH_RESERVE;
  if(this.sparkCount>=cap)return;
  const p=this.sparks[this.sparkCount++];
  this.init(p,x,y,z,vx,vy,vz,life);
  p.drag=2.7;p.size=rand(.32,.62);p.red=color?.red??1;
  p.green=color?.green??(white?.86:rand(.43,.68));p.blue=color?.blue??(white?.47:.065);
  if(launch)p.floor=LAUNCH_HEIGHT-.15;
  return p;
 }

 /** A shuffled bag uses every shape before refilling; adjacent shows cannot
  * repeat the same phrase or palette. No repeating timeline, no runaway timers. */
 private chooseStyle():Style{
  if(!this.styleBag.length){
   this.styleBag=[...STYLES];
   for(let i=this.styleBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.styleBag[i],this.styleBag[j]]=[this.styleBag[j],this.styleBag[i]];}
   if(this.styleBag[this.styleBag.length-1]===this.lastStyle)[this.styleBag[0],this.styleBag[this.styleBag.length-1]]=[this.styleBag[this.styleBag.length-1],this.styleBag[0]];
  }
  return this.lastStyle=this.styleBag.pop()!;
 }
 private direct(){
  const choices=PHRASES.filter(phrase=>phrase!==this.lastMovement&&phrase!=='opening'&&phrase!=='finale');
  const movement=this.movements===0?'opening':this.movements%8===0?'finale':choices[Math.floor(Math.random()*choices.length)];
  this.movements++;
  this.lastMovement=movement;
  this.lastPalette=(this.lastPalette+1+Math.floor(Math.random()*(COLOR_THEMES.length-1)))%COLOR_THEMES.length;
  const [primary,accent]=COLOR_THEMES[this.lastPalette];
  const style=this.chooseStyle();
  const companion=this.chooseStyle();
  const [low,middle,high]=COMPOSITION_HEIGHTS;
  const direction=this.movements%2===0?1:-1;

  const fire=(delay:number,x:number,y:number,size:number,shape:Style=style,color:Color=primary)=>{
   this.cues.push({
    at:this.clock+delay,x,y,size,style:shape,
    launchX:x*.78,
    color:GOLD_STYLES.includes(shape)?GOLD:color,
   });
  };
  // Matched pairs use the same height, size, colour and shape. A short stagger
  // keeps their expansion readable while preserving their visual weight.
  const pair=(delay:number,width:number,height:number,size:number,shape:Style=style,color:Color=primary)=>{
   fire(delay,-width,height,size,shape,color);
   fire(delay+.12,width,height,size,shape,color);
  };

  switch(movement){
   case 'opening':
    pair(0,8.6,low,1.02,'chrysanthemum',accent);
    fire(.85,0,high,1.48,'pistil',primary);
    break;
   case 'single':
    fire(0,0,middle,1.48);
    pair(1.2,9.2,low,.76,companion,accent);
    break;
   case 'feature':
    pair(0,8.8,low,.88,companion,accent);
    fire(.7,0,high,1.55);
    break;
   case 'pair': {
    const height=this.movements%2===0?middle:low;
    pair(0,7.8,height,1.15);
    fire(1.25,0,height===low?high:low,1.04,companion,accent);
    break;
   }
   case 'triple':
    pair(0,9,low,1.02);
    fire(.7,0,high,1.4,companion,accent);
    break;
   case 'sweep':
    // An arch across the organ, followed from left to right or right to left.
    fire(0,-9.3*direction,low,.88);
    fire(.58,-5.1*direction,middle,1.03,style,accent);
    fire(1.16,0,high,1.36,companion);
    fire(1.74,5.1*direction,middle,1.03,style,accent);
    fire(2.32,9.3*direction,low,.88);
    break;
   case 'pyramid':
    pair(0,9.5,low,.82);
    pair(.72,5.6,middle,.94,companion,accent);
    fire(1.45,0,high,1.4);
    break;
   case 'theme':
    pair(0,8.6,low,1.02);
    pair(1.15,7,middle,.92,style,accent);
    fire(2.1,0,high,1.34);
    break;
   case 'mirror':
    pair(0,7.5,high,1.02);
    pair(.95,9.4,low,.86,companion,accent);
    fire(1.9,0,middle,1.28);
    break;
   case 'barrage':
    for(let i=0;i<3;i++){
     pair(i*.65,9.5-i*2.7,low+i*2.5,.78,style,i%2===0?primary:accent);
    }
    break;
   case 'volley':
    // Counter-diagonals fill both halves over the phrase, with alternating leads.
    fire(0,-8.8*direction,low,.93);
    fire(.42,8.8*direction,high,.93,companion,accent);
    fire(1.2,8.8*direction,low,.93);
    fire(1.62,-8.8*direction,high,.93,companion,accent);
    fire(2.3,0,middle,1.28);
    break;
   case 'finale':
    pair(0,9.3,low,.95,style,accent);
    pair(.9,6.5,middle,1.03,companion);
    fire(1.85,0,high,1.55,'kamuro',GOLD);
    pair(2.65,9.4,low,.83,'crossette',accent);
    break;
  }
  // The next phrase rises through the previous one's lingering tails.
  this.nextMovement=this.cues[this.cues.length-1].at+rand(1.65,2.05);
 }

 private burst(cue:Cue){
  const {style}=cue;
  if(style==='multibreak'){
   this.burst({...cue,style:'chrysanthemum',size:cue.size*.75});
   const children=['peony','ring','glitter'] as const;
   for(let i=0;i<children.length;i++){
    this.subBursts.push({...cue,at:this.clock+rand(.4,.9),x:T.MathUtils.clamp(cue.x+(i-1)*2.65,-MAX_BURST_X,MAX_BURST_X),
     y:cue.y+rand(-1,1),size:cue.size*.45,style:children[i],color:PALETTES[(this.lastPalette+i+2+PALETTES.length)%PALETTES.length]});
   }
   return;
  }
  const willow=style==='willow',brocade=style==='brocade',palm=style==='palm',kamuro=style==='kamuro';
  const breakStyle=Object.hasOwn(BREAK_DENSITY,style)?style as BreakStyle:null;
  // A new shell must remain visible even while a long-lived willow is hanging.
  // Reuse the oldest stage trails instead of increasing the mobile particle budget.
  const minimum=this.low?24:32;
  while(this.stageStarLimit-(this.starCount-this.galleryCount)<minimum){
   let oldest=-1,age=-1;
   for(let i=0;i<this.starCount;i++){
    const p=this.stars[i],elapsed=p.fullLife-p.life;
    if(!p.gallery&&elapsed>age){oldest=i;age=elapsed;}
   }
   if(oldest<0)break;
   const retired=this.stars[oldest];this.starCount--;
   this.stars[oldest]=this.stars[this.starCount];this.stars[this.starCount]=retired;
  }
  const remaining=this.stageStarLimit-(this.starCount-this.galleryCount);
  const density=remaining<this.stars.length*.35?.55:1;
  const count=Math.round((this.low?85:this.mobile?115:175)*Math.sqrt(cue.size)*density);
  const spread=(willow?3.8:brocade||kamuro?4.3:5)*cue.size;
  const depth=burstDepth(cue.x);
  const add=(vx:number,vy:number,vz:number,color:Color=cue.color,life=rand(willow?3.7:3.2,willow?4.6:4.1))=>{
   if(this.starCount-this.galleryCount>=this.stageStarLimit||this.starCount>=this.stars.length)return;
   const p=this.stars[this.starCount++];
   this.init(p,cue.x,cue.y,depth,vx,vy,vz,life);
   p.drag=willow?.52:brocade||kamuro?.58:palm?.48:.78;
   p.size=willow?.65:.85;
   [p.red,p.green,p.blue]=color;
   p.pattern=brocade||willow||kamuro||style==='glitter'?'twinkle':'steady';
   p.sparkFreq=(willow||kamuro?.12:.19)*(this.low?2.1:this.mobile?1.5:1);
   if(style==='ring'||style==='peony'||style==='glitter'){
    p.trail=style==='ring'?9:style==='glitter'?5:1;
    p.sparkFreq=0;
    p.size=1.05;
   }
   if(style==='dahlia'){p.size=1.32;p.trail=26;p.drag=.9;}
   if(style==='spider'){p.trail=30;p.drag=1.65;p.sparkFreq=.32;}
   if(style==='strobe'){p.pattern='strobe';p.trail=10;p.sparkFreq=.5;}
   if(style==='ghost'){p.pattern='ghost';p.trail=15;p.sparkFreq=0;}
   if(style==='horsetail'){p.trail=HISTORY;p.drag=.48;}
   if(breakStyle){
    p.breakStyle=breakStyle;p.splitAt=rand(.65,1.14);p.trail=17;p.sparkFreq=.38;
    if(breakStyle==='floral'||breakStyle==='fallingLeaves')p.pattern='hidden';
   }
   p.sparkTimer=rand(0,p.sparkFreq);
   return p;
  };
  if(cue.style==='ring'){
   // Miller's tilted ring, with true depth instead of a flat screen ellipse.
   const n=Math.round(count*.7),tilt=rand(-.55,.55);
   for(let i=0;i<n;i++){const a=i/n*Math.PI*2,speed=spread*rand(.97,1.03);
    add(Math.cos(a)*speed,Math.sin(a)*speed*.85+.6,Math.cos(a)*speed*tilt*.3,cue.color,2.5);}
  }else if(palm){
   // Todd's palm: a handful of thick fronds, not hundreds of spherical rays.
   const fronds=7+Math.floor(Math.random()*3),n=Math.floor(count/fronds);
   for(let branch=0;branch<fronds;branch++){
    const a=-1.36+branch/(fronds-1)*2.72;
    for(let k=0;k<n;k++){const speed=spread*rand(.85,1.03),jitter=rand(-.024,.024);
     add(Math.sin(a+jitter)*speed,Math.cos(a+jitter)*speed*.67+.8,Math.sin(branch*2.4)*.35,GOLD,rand(3.5,4.2));}
   }
  }else if(style==='horsetail'){
   // The burst keeps the rising comet's momentum, then falls in one direction.
   for(let i=0;i<count*.7;i++){
    const a=rand(0,Math.PI*2),speed=spread*rand(.2,.6);
    add(Math.sin(a)*speed*.84,Math.cos(a)*speed*.48+1.25,rand(-.42,.42),cue.color,rand(3.1,4.3));
   }
  }else{
   // Miller's createBurst: equally spaced rings on a spherical surface. Restore
   // its discarded depth coordinate, compressed to fit the stage bay.
   const sizeFactor=breakStyle?BREAK_DENSITY[breakStyle]:style==='dahlia'||style==='spider'?.48:1;
   const target=Math.max(5,Math.round(count*sizeFactor));
   const radius=.5*Math.sqrt(target/Math.PI),circumference=2*radius*Math.PI,half=circumference/2;
   for(let ring=0;ring<=half;ring++){
    const latitude=ring/half*Math.PI/2,ringSize=Math.cos(latitude);
    const parts=circumference*ringSize,inc=Math.PI*2/parts,offset=rand(0,inc);
    for(let i=0;i<parts;i++){
     const a=inc*i+offset+rand(0,inc*.33);
     const speed=spread*(style==='glitter'?rand(.18,.72):style==='dahlia'?rand(1.1,1.28):style==='spider'?rand(1.42,1.66):rand(.86,1.02));
     // Grand's willow: flatter crown, upward bias, prolonged hanging gold.
     add(Math.sin(a)*ringSize*speed,Math.cos(a)*ringSize*speed*(willow?.66:.9)+(willow?1.05:.5),
      Math.sin(latitude)*(i%2?1:-1)*speed*.26);
    }
   }
   if(style==='pistil'||style==='ghost'){
    // Miller's contrasting inner shell, half the reach of the outer blossom.
    for(let i=0;i<Math.round(count*(style==='ghost'?.13:.3));i++){
     const a=rand(0,Math.PI*2),speed=spread*rand(.3,.48);
     const p=add(Math.sin(a)*speed,Math.cos(a)*speed+.5,rand(-.25,.25),[1,.92,.72],2.6);
     if(p){p.trail=style==='ghost'?HISTORY:18;p.sparkFreq=.3;p.pattern='steady';}
    }
   }
  }
  for(let i=0;i<12;i++){
   const a=rand(0,Math.PI*2),speed=rand(.5,1.8);
   this.ember(cue.x,cue.y,depth,Math.sin(a)*speed,Math.cos(a)*speed,rand(-.3,.3),rand(.25,.55),true);
  }
 }

 /** Miller's secondary effects each branch only once. */
 private split(parent:Particle,style:BreakStyle){
  const start=rand(0,Math.PI*2);
  const count=style==='crossette'?4:style==='floral'?this.low?7:12:style==='fallingLeaves'?6:this.low?7:12;
  for(let i=0;i<count;i++){
   const a=start+i/count*Math.PI*2,speed=rand(.75,1.55);
   const vx=parent.vx*.28+Math.sin(a)*speed,vy=parent.vy*.28+Math.cos(a)*speed;
   if(style==='crackle'){
    const spark=this.ember(parent.x,parent.y,parent.z,vx*1.7,vy*1.7,rand(-.3,.3),rand(.24,.46),true);
    if(spark)spark.size=.98;
    continue;
   }
   if(this.starCount-this.galleryCount>=this.stageStarLimit||this.starCount>=this.stars.length)break;
   const p=this.stars[this.starCount++];
   const leaves=style==='fallingLeaves';
   this.init(p,parent.x,parent.y,parent.z,vx,vy,parent.vz*.3,leaves?rand(2.5,3.5):rand(1.05,1.8));
   p.drag=leaves?.58:.65;p.size=.78;p.red=leaves?1:parent.red;p.green=leaves?.65:parent.green;p.blue=leaves?.12:parent.blue;
   p.pattern=leaves?'hidden':'steady';p.trail=style==='floral'?10:24;
   p.sparkFreq=leaves?.17:.31;p.sparkTimer=rand(0,p.sparkFreq);
  }
 }

 // Keep space in the shared buffer for the gallery falls between stage bursts.
 private get stageStarLimit(){return this.stars.length-(this.low?104:this.mobile?144:190);}
 private gallerySpark(x:number,y:number,z:number,vx:number,vz:number,floor:number){
  if(this.galleryCount>=this.stars.length-this.stageStarLimit||this.starCount>=this.stars.length)return;
  const p=this.stars[this.starCount++];
  this.init(p,x,y,z,vx,rand(-.8,-.25),vz,rand(2.5,3.2));
  p.gallery=true;this.galleryCount++;p.floor=floor;p.drag=.18;p.size=.8;p.red=1;p.green=rand(.65,.83);p.blue=.27;
  p.pattern='twinkle';p.trail=30;p.sparkFreq=0;p.sparkTimer=0;
 }
 private galleryWaterfalls(){
  const baseInterval=this.low?15:this.mobile?12:10;
  const swellInterval=this.low?11:this.mobile?8:6;
  for(const [tier,level] of GALLERY_WATERFALL_LEVELS.entries()){
   const tick=this.fountainTick+tier*5;
   const base=tick%baseInterval===0,swell=tick%swellInterval===0;
   if(!base&&!swell)continue;
   for(const side of [-1,1]){
    const phase=this.clock+level.offset+(side===1?2.8:0);
    for(let n=0;n<level.axes.length;n++){
     const index=(n+Math.floor(this.fountainTick/3))%level.axes.length,doorZ=level.axes[index];
     const count=Number(base)+Number(swell&&(phase+index*3.1)%8<4.6);
     for(let i=0;i<count;i++)this.gallerySpark(side*level.x,level.y,doorZ+rand(-1.5,1.5),-side*rand(.45,1.05),rand(-.3,.3),level.floor);
    }
    // Both front falls hug the organ wings, clear of the musicians and train crossing.
    const {x,z,floor}=level.front;
    const count=Number(base)+Number(swell&&(phase+1.2)%8<3.8);
    for(let i=0;i<count;i++)this.gallerySpark(side*(x+rand(-.72,.72)),level.y,z,rand(-.22,.22),rand(.45,1.05),floor);
   }
  }
 }

 private launchEffects(){
  // A quiet fan keeps the stage background alive between aerial bursts.
  const interval=this.low?5:3;
  if(this.fountainTick++%interval===0){
   for(const side of [-1,1]){
    const x=side*(MAX_BURST_X-.75);
    const spark=this.ember(x,LAUNCH_HEIGHT,launchDepth(x),side*rand(-1.8,1.05),rand(4.4,7.4),rand(-.26,.26),rand(1.25,1.95),false,undefined,true);
    if(spark){spark.drag=1.1;spark.size=.62;}
   }
  }
  for(let i=this.rockets.length-1;i>=0;i--){
   const rocket=this.rockets[i],{cue,lift}=rocket;
   rocket.age+=STEP;
   const t=Math.min(1,rocket.age/rocket.flight);
   const rise=2*t-t*t;
   const launchX=cue.launchX??cue.x;
   const x=T.MathUtils.lerp(launchX,cue.x,t);
   const y=T.MathUtils.lerp(LAUNCH_HEIGHT,cue.y,rise);
   const z=T.MathUtils.lerp(launchDepth(launchX),burstDepth(cue.x),t);
   const color=lift==='colored'?{red:cue.color[0],green:cue.color[1],blue:cue.color[2]}:undefined;
   const head=this.ember(x,y,z,0,0,0,.085,true,color,true);
   if(head)head.size=lift==='faint'?.82:lift==='dim'?1.05:1.65;
   if(lift==='gold'||lift==='colored'||Math.random()<(lift==='dim'?.5:.22)){
    const trail=this.ember(x,y,z,rand(-.22,.22),-rand(.35,1.15),rand(-.16,.16),rand(.22,.58),false,color,true);
    if(trail)trail.size=lift==='faint'?.35:.64;
   }
   if(t>=1){this.burst(cue);this.rockets.splice(i,1);}
  }
 }

 private step(){
  this.clock+=STEP;
  if(this.clock>=this.nextMovement)this.direct();
  while(this.cues.length&&this.clock>=this.cues[0].at){
   const cue=this.cues.shift()!;
   const lifts=['gold','gold','colored'] as const;
   // Equal-height pairs reach their apex together, independent of random lift colour.
   const flight=1.22+Math.max(0,cue.y-12)*.047;
   this.rockets.push({cue,age:0,flight,lift:lifts[Math.floor(Math.random()*lifts.length)]});
  }
  for(let i=this.subBursts.length-1;i>=0;i--){
   const cue=this.subBursts[i];
   if(cue.at<=this.clock){this.subBursts.splice(i,1);this.burst(cue);}
  }
  this.galleryWaterfalls();
  this.launchEffects();
  for(let i=0;i<this.starCount;){
   const p=this.stars[i];p.life-=STEP;
   if(p.life<=0||p.y<p.floor){if(p.gallery)this.galleryCount--;this.starCount--;this.stars[i]=this.stars[this.starCount];this.stars[this.starCount]=p;continue;}
   this.move(p,GRAVITY,.08);
   if(p.breakStyle){
    p.splitAt-=STEP;
    if(p.splitAt<=0){this.split(p,p.breakStyle);p.life=0;i++;continue;}
   }
   p.slot=(p.slot+1)%HISTORY;p.samples=Math.min(HISTORY,p.samples+1);
   const h=p.slot*3;p.history[h]=p.x;p.history[h+1]=p.y;p.history[h+2]=p.z;
   // Miller's burn-rate emitter: lots of sparks while hot, less as a star burns out.
   const burnRate=Math.sqrt(p.life/p.fullLife);p.sparkTimer-=STEP;
   if(p.sparkFreq>0&&p.sparkTimer<0){
    p.sparkTimer+=p.sparkFreq*(.75+(1-burnRate)*4);
    const a=rand(0,Math.PI*2),speed=rand(.06,.34)*burnRate;
    this.ember(p.x,p.y,p.z,Math.sin(a)*speed,Math.cos(a)*speed,rand(-.09,.09),rand(.8,1.9),false,p);
   }
   i++;
  }
  for(let i=0;i<this.sparkCount;){
   const p=this.sparks[i];p.life-=STEP;
   if(p.life<=0||p.y<p.floor){this.sparkCount--;this.sparks[i]=this.sparks[this.sparkCount];this.sparks[this.sparkCount]=p;continue;}
   this.move(p,.9,.035);i++;
  }
 }

 private move(p:Particle,gravity:number,wind:number){
  p.px=p.x;p.py=p.y;p.pz=p.z;
  const drag=Math.exp(-p.drag*STEP);
  p.vx=(p.vx+wind*STEP)*drag;p.vy=(p.vy-gravity*STEP)*drag;p.vz*=drag;
  p.x+=p.vx*STEP;p.y+=p.vy*STEP;p.z+=p.vz*STEP;
 }

 private point(p:Particle,brightness:number){
  const i=this.pointCount++,o=i*3;
  this.pointPositions[o]=p.x;this.pointPositions[o+1]=p.y;this.pointPositions[o+2]=p.z;
  this.pointColors[o]=brightness*p.red;this.pointColors[o+1]=brightness*p.green;this.pointColors[o+2]=brightness*p.blue;
  this.pointSizes[i]=p.size;
 }
 private line(x:number,y:number,z:number,brightness:number,green:number,blue:number,red=1){
  const o=this.lineCount++*3;
  this.linePositions[o]=x;this.linePositions[o+1]=y;this.linePositions[o+2]=z;
  this.lineColors[o]=brightness*red;this.lineColors[o+1]=brightness*green;this.lineColors[o+2]=brightness*blue;
 }
 private draw(){
  this.pointCount=0;this.lineCount=0;
  for(let i=0;i<this.starCount;i++){
   const p=this.stars[i],remaining=p.life/p.fullLife;
   const fade=Math.min(1,p.life/.6,Math.max(0,(p.y-p.floor)/.65));
   if(p.pattern==='hidden'||p.life<=0)continue;
   const flicker=p.pattern==='strobe'?Math.floor((this.clock+p.seed)*13)%3===0?1:.08
    :p.pattern==='ghost'?remaining>.68?.04:1
    :p.pattern==='twinkle'?.62+.38*Math.abs(Math.sin(this.clock*18+p.seed)):1;
   const bright=1.65*fade*flicker;this.point(p,bright);
   // Todd's history buffer extended into a curved 1.2 s trail. Individual dark
   // gaps and detached Miller embers prevent the silhouette becoming solid wires.
   const stride=this.low?3:2;
   const samples=Math.min(p.samples,p.trail);
   for(let j=0;j<samples-1;j+=stride){
    const older=Math.min(j+stride,samples-1);
    if(j>5&&Math.sin(j*12.7+p.seed*31)>.64)continue;
    const a=((p.slot-j+HISTORY)%HISTORY)*3,b=((p.slot-older+HISTORY)%HISTORY)*3;
    const hot=bright*(1-j/HISTORY)*.9,cool=bright*(1-older/HISTORY)*.85;
    this.line(p.history[a],p.history[a+1],p.history[a+2],hot,p.green,p.blue,p.red);
    this.line(p.history[b],p.history[b+1],p.history[b+2],cool,p.green*.8,p.blue*.6,p.red);
   }
  }
  for(let i=0;i<this.sparkCount;i++){
   const p=this.sparks[i],fade=Math.min(1,p.life/Math.min(.45,p.fullLife*.55),Math.max(0,(p.y-p.floor)/.4));
   const flicker=.55+.45*Math.abs(Math.sin(this.clock*24+p.seed));
   const bright=1.25*fade*flicker;this.point(p,bright);
   this.line(p.px,p.py,p.pz,bright*.6,p.green,p.blue,p.red);
   this.line(p.x,p.y,p.z,bright,p.green,p.blue,p.red);
  }
  for(const [g,count] of [[this.points.geometry,this.pointCount],[this.lines.geometry,this.lineCount]] as const){
   g.setDrawRange(0,count);
   for(const a of Object.values(g.attributes) as T.BufferAttribute[]){
    a.clearUpdateRanges();if(count)a.addUpdateRange(0,count*a.itemSize);a.needsUpdate=count>0;
   }
  }
 }

 update(now:number,enabled:boolean,low:boolean){
  if(!enabled){
   this.group.visible=false;this.last=null;this.clock=0;this.accumulator=0;this.nextMovement=0;this.cues.length=0;this.subBursts.length=0;this.fountainTick=0;this.movements=0;
   this.starCount=0;this.galleryCount=0;this.sparkCount=0;this.rockets.length=0;return;
  }
  this.low=low;this.group.visible=true;
  if(this.last===null){this.last=now;this.draw();return;}
  // Ignore long background gaps; never catch up a whole hidden show on one frame.
  this.accumulator+=Math.min(.1,Math.max(0,now-this.last));this.last=now;
  let changed=false;
  while(this.accumulator>=STEP){this.accumulator-=STEP;this.step();changed=true;}
  if(changed)this.draw();
 }

 dispose(){
  this.group.removeFromParent();
  this.points.geometry.dispose();this.points.material.dispose();
  this.lines.geometry.dispose();this.lines.material.dispose();
 }
}
