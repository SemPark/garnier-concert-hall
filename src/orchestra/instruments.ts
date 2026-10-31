import * as T from 'three';
import {box,cylinder,sphere,line,material} from '../scene/primitives';
import type {Instrument} from '../character/Avatar';
const brass=0xdab45f,silver=0xc6ced0,ebony=0x252b30,wood=0xa45727;
const geometries=new Map<string,T.BufferGeometry>();
function geometry(key:string,create:()=>T.BufferGeometry){let g=geometries.get(key);if(!g){g=create();geometries.set(key,g);}return g;}
function tube(g:T.Object3D,points:number[][],radius:number,color=brass){const key=JSON.stringify([points,radius]);const mesh=new T.Mesh(geometry(key,()=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number]))),24,radius,6,false)),material(color,.5));g.add(mesh);return mesh;}
function bell(g:T.Object3D,r:number,length:number,pos:number[],rotation:number[],color=brass){
 const key=`bell/${r}/${length}`;const mesh=new T.Mesh(geometry(key,()=>new T.LatheGeometry([new T.Vector2(.025,0),new T.Vector2(.035,length*.4),new T.Vector2(r*.55,length*.82),new T.Vector2(r,length)],16)),material(color,.65));mesh.position.set(...pos as [number,number,number]);mesh.rotation.set(...rotation as [number,number,number]);g.add(mesh);
 // A rolled rim and dark inner opening make a bell readable from the audience.
 const rim=new T.Mesh(geometry(`bell-rim/${r}`,()=>new T.TorusGeometry(r,.012,6,28)),material(color,.7));rim.rotation.x=Math.PI/2;rim.position.y=length;mesh.add(rim);
 const inner=new T.Mesh(geometry(`bell-mouth/${r}`,()=>new T.CircleGeometry(r*.83,28)),material(0x49351a,.15));inner.rotation.x=-Math.PI/2;inner.position.y=length*.91;mesh.add(inner);
 mesh.userData.instrumentFeature='bell';return mesh;
}
function stringBody(g:T.Group,size:number){
 const outline=geometry('string-body',()=>{const s=new T.Shape();s.moveTo(0,-.5);s.bezierCurveTo(-.37,-.5,-.43,-.2,-.2,-.08);s.bezierCurveTo(-.1,0,-.16,.12,-.25,.19);s.bezierCurveTo(-.37,.43,-.17,.5,0,.5);s.bezierCurveTo(.17,.5,.37,.43,.25,.19);s.bezierCurveTo(.16,.12,.1,0,.2,-.08);s.bezierCurveTo(.43,-.2,.37,-.5,0,-.5);return new T.ExtrudeGeometry(s,{depth:.12,bevelEnabled:true,bevelSegments:1,bevelSize:.022,bevelThickness:.015,steps:1,curveSegments:8});});
 const body=new T.Mesh(outline,material(wood,0,.45));body.scale.setScalar(size);body.position.z=-.06*size;g.add(body);
 box(g,[size*.1,size*.72,size*.06],[0,size*.63,-size*.09],0x3b281e);box(g,[size*.085,size*.7,.014],[0,size*.57,-size*.135],ebony);
 box(g,[size*.16,size*.04,size*.06],[0,-size*.06,-size*.15],0xddba7b);box(g,[size*.12,size*.24,.018],[0,-size*.32,-size*.145],ebony);
 for(const x of [-.035,-.012,.012,.035])line(g,new T.Vector3(x*size,-size*.38,-size*.16),new T.Vector3(x*size,size*.94,-size*.16),.0025,0xf3e0b6);
 for(const x of [-.14,.14])tube(g,[[x*size,-.24*size,-.135*size],[(x-.03)*size,-.08*size,-.14*size],[(x+.02)*size,.03*size,-.14*size]],.009*size,ebony);
 for(const y of [.85,.94])for(const x of [-.1,.1])sphere(g,.022*size,[x*size,y*size,-size*.08],ebony);
 sphere(g,.045*size,[0,size*1.02,-size*.07],wood);
}
export function buildInstrument(type:Instrument,g:T.Group,leftHand:T.Group,rightHand:T.Group){
 g.userData.instrument=type;
 if(['violin','viola','cello','bass'].includes(type)){
  const small=type==='violin'||type==='viola',size=type==='violin'?.42:type==='viola'?.5:type==='cello'?.83:1.07;
  stringBody(g,size);g.position.set(small?-.12:type==='bass'?-.24:.025,small?1.05:type==='cello'?.51:.74,small?-.4:-.38);if(small){g.rotation.z=1.05;g.rotation.y=-.25;}else{g.rotation.x=-.07;g.rotation.z=.16;cylinder(g,.012,type==='cello'?.23:.15,[0,-size*.5-.1,0],silver);}
  const bow=new T.Group();rightHand.add(bow);line(bow,new T.Vector3(-.31,0,-.14),new T.Vector3(.31,0,-.14),.012,0x61391f);line(bow,new T.Vector3(-.3,.025,-.14),new T.Vector3(.3,.025,-.14),.005,0xe9d5a7);bow.rotation.z=small?-.18:.1;
 }else if(type==='flute'||type==='piccolo'){
  const f=new T.Group();g.add(f);f.position.set(.08,1.11,-.4);f.rotation.z=Math.PI/2;const length=type==='piccolo'?.43:.72;cylinder(f,.028,length,[0,0,0],type==='piccolo'?ebony:silver);for(let i=0;i<7;i++){const y=-length*.35+i*length*.1;cylinder(f,.039,.015,[0,y,0],silver);sphere(f,.025,[0,y,-.03],silver);}
 }else if(['oboe','english-horn','clarinet','bass-clarinet','bassoon','contrabassoon'].includes(type)){
  const w=new T.Group();g.add(w);w.position.set(0,1.12,-.39);w.rotation.x=.2;
  const bassoon=type.includes('bassoon'),low=type==='bass-clarinet'||bassoon,length=type==='contrabassoon'?1:low?.82:.53,r=low?.043:.026;
  cylinder(w,r,length,[0,-length/2,0],bassoon?0x98502b:ebony);
  if(bassoon){cylinder(w,r,length*.8,[.09,-length*.55,.01],0x98502b);tube(w,[[0,-length,0],[.045,-length-.04,0],[.09,-length,.01]],r,0x98502b);tube(w,[[0,0,0],[.04,.08,0],[.13,.08,.03],[.13,.04,.05]],.012,silver);}
  else if(type==='bass-clarinet'){tube(w,[[0,0,0],[0,.13,0],[0,.17,.08],[0,.13,.15]],.025,silver);tube(w,[[0,-length,0],[0,-length-.06,-.04],[0,-length-.03,-.13]],.033,silver);bell(w,.09,.15,[0,-length-.02,-.13],[-Math.PI/2,0,0]);}
  else if(type==='english-horn'){sphere(w,.062,[0,-length,0],0x5a4432).scale.y*=1.6;tube(w,[[0,0,0],[0,.07,0],[0,.1,.06]],.015,silver);}
  else bell(w,type==='clarinet'?.067:.043,.13,[0,-length+.02,0],[Math.PI,0,0],ebony);
  for(let i=0;i<8;i++){sphere(w,.019,[r,-.07-i*(length*.085),-.018],silver);line(w,new T.Vector3(r,-.05,-.02),new T.Vector3(r,-length*.9,-.02),.006,silver);}
 }else if(type==='horn'){
  const h=new T.Group();g.add(h);h.position.set(-.02,.89,-.49);h.userData.instrumentFeature='horn-coil';
  for(const [radius,z]of [[.27,0],[.205,-.055]]){const ring=new T.Mesh(geometry(`french-horn-coil/${radius}`,()=>new T.TorusGeometry(radius,.033,8,32)),material(brass,.7));ring.position.z=z;h.add(ring);}
  tube(h,[[-.04,.27,0],[-.21,.34,0],[-.29,.31,-.02],[-.27,.22,-.06]],.021);
  tube(h,[[.23,-.13,0],[.36,-.17,0],[.4,-.11,-.13]],.052);
  bell(h,.23,.29,[.4,-.11,-.13],[-Math.PI/2,0,.2]);
  for(let i=0;i<3;i++){cylinder(h,.018,.16,[-.08+i*.065,.08,-.08],silver);sphere(h,.027,[-.08+i*.065,.17,-.08],brass);}
 }else if(type==='tuba'){
  const h=new T.Group();g.add(h);h.position.set(-.08,.63,-.5);h.userData.instrumentFeature='tuba-body';
  // Broad vertical U-bow and a separate upward-facing bell, unlike the round horn.
  tube(h,[[-.29,.38,0],[-.33,-.12,0],[-.19,-.29,0],[.13,-.29,0],[.28,-.12,0],[.26,.32,0]],.072);
  tube(h,[[-.14,.25,-.1],[-.17,-.1,-.1],[0,-.19,-.1],[.15,-.07,-.1],[.14,.26,-.1]],.043);
  tube(h,[[.23,-.09,.015],[.34,.07,.015],[.34,.39,.015]],.066);
  bell(h,.29,.49,[.34,.35,.015],[0,0,0]);
  tube(h,[[-.27,.27,0],[-.35,.45,0],[-.18,.53,-.02],[-.08,.47,-.08]],.024);
  for(let i=0;i<3;i++){cylinder(h,.025,.2,[-.14+i*.09,.22,-.14],brass);sphere(h,.035,[-.14+i*.09,.34,-.14],silver);}
 }else if(type==='trumpet'||type==='trombone'){
  const trombone=type==='trombone',h=new T.Group();g.add(h);h.position.set(0,1.11,-.42);
  const length=trombone?.96:.7;h.userData.instrumentFeature=trombone?'trombone-slide':'trumpet-valves';
  tube(h,[[0,0,0],[0,0,-length]],.032);
  bell(h,trombone?.18:.145,.27,[0,0,-length+.04],[-Math.PI/2,0,0]);
  if(trombone){
   tube(h,[[.13,-.11,-.12],[.13,-.11,-1.1],[0,-.11,-1.2],[-.13,-.11,-1.1],[-.13,-.11,-.12]],.024);
   for(const z of [-.16,-.73])line(h,new T.Vector3(-.13,-.11,z),new T.Vector3(.13,-.11,z),.018,silver);
  }else{
   tube(h,[[0,0,-.13],[.13,0,-.22],[.13,-.14,-.49],[0,-.14,-.49],[0,-.14,-.18]],.031);
   for(let i=0;i<3;i++){cylinder(h,.024,.17,[.025,.025,-.24-i*.08],brass);sphere(h,.036,[.025,.125,-.24-i*.08],silver);}
  }
 }else if(type==='harp'){
  const h=new T.Group();h.position.set(-.62,.04,-.55);g.add(h);box(h,[.85,.13,.5],[0,.06,0],brass);line(h,new T.Vector3(-.38,.1,0),new T.Vector3(-.31,1.72,0),.065,brass);line(h,new T.Vector3(.32,.1,0),new T.Vector3(.4,1.37,0),.105,wood);tube(h,[[-.31,1.72,0],[-.12,1.66,0],[.15,1.42,0],[.4,1.37,0]],.07);for(let i=0;i<16;i++)line(h,new T.Vector3(-.28+i*.043,1.65-i*.019,0),new T.Vector3(-.3+i*.04,.18,0),.004,0xf3db99);
 }else if(type==='piano'||type==='celesta'){
  const grand=type==='piano',width=grand?1.65:1.2,depth=grand?1.9:.65,z=grand?-1.18:-.67;box(g,[width,.26,depth],[0,.85,z],ebony);
  for(const x of [-width/2+.1,width/2-.1])for(const zz of [z-depth/2+.1,z+depth/2-.1])cylinder(g,.045,.73,[x,.365,zz],ebony);
  for(let i=0;i<21;i++){box(g,[width/22,.04,.27],[-width/2+.04+i*width/21,1.0,-.4],0xf0e6cf);if(i%7!==2&&i%7!==6)box(g,[width/35,.06,.16],[-width/2+.07+i*width/21,1.03,-.45],ebony);}
  if(grand){const lid=box(g,[width,.05,depth],[0,1.1,-1.18],ebony);lid.rotation.z=-.2;line(g,new T.Vector3(-.6,.95,-1.7),new T.Vector3(-.6,1.23,-1.7),.018,brass);}else{box(g,[width,1,.16],[0,.65,-.95],0x6b3a25);for(const x of [-.45,.45])box(g,[.035,.7,.025],[x,.7,-.85],brass);}
 }else if(type==='timpani'){
  for(const [x,z,r]of [[-.67,-.75,.36],[0,-.57,.33],[.64,-.8,.30]]){sphere(g,r,[x,.5,z],0xb07a3d).scale.y*=.9;cylinder(g,r,.035,[x,.72,z],0xe3d7b8);cylinder(g,r+.015,.04,[x,.69,z],brass);for(const xx of [-.18,.18])cylinder(g,.018,.4,[x+xx,.2,z],ebony);}
 }else if(type==='bass-drum'||type==='gong'){
  g.position.x=.68;const gong=type==='gong';const d=cylinder(g,gong?.65:.55,gong?.045:.45,[0,.95,-.85],gong?brass:0x98542c);d.rotation.x=Math.PI/2;const face=cylinder(g,gong?.14:.52,.035,[0,.95,-.61],gong?0x967339:0xe8dfc9);face.rotation.x=Math.PI/2;
  for(const x of [-.73,.73])cylinder(g,.025,1.7,[x,.85,-.85],ebony);box(g,[1.5,.05,.08],[0,1.7,-.85],ebony);box(g,[1.5,.04,.6],[0,.035,-.85],ebony);
 }else if(type==='chimes'){
  g.position.x=.68;for(const x of [-.65,.65])cylinder(g,.028,1.85,[x,.925,-.85],ebony);box(g,[1.4,.06,.08],[0,1.85,-.85],brass);for(let i=0;i<12;i++){const len=1.35-i*.055;cylinder(g,.027,len,[-.55+i*.1,1.76-len/2,-.85],brass);}
 }else if(type==='xylophone'||type==='marimba'||type==='vibraphone'){
  const marimba=type==='marimba',vibes=type==='vibraphone',count=marimba?25:vibes?20:18,width=marimba?2.35:vibes?1.75:1.65,barColor=vibes?0xbdc7c6:wood;
  const rack=new T.Group();rack.position.set(0,0,-.7);g.add(rack);
  for(let i=0;i<count;i++){
   const x=-width/2+(i+.5)*width/count,len=(marimba?.82:.58)-i/count*.22;
   box(rack,[width/count*.85,.045,len],[x,.91,0],barColor);
   cylinder(rack,.025,.25+(count-i)/count*.35,[x,.58,0],vibes?silver:brass);
   if(i%7!==2&&i%7!==6)box(rack,[width/count*.78,.045,len*.75],[x+width/count*.48,.99,-.29],vibes?0xd7dddd:0x6b3b24);
  }
  for(const z of [-.35,.35])box(rack,[width+.12,.09,.07],[0,.78,z],ebony);
  for(const x of [-width/2+.12,width/2-.12])for(const z of [-.27,.27]){cylinder(rack,.025,.78,[x,.39,z],ebony);sphere(rack,.045,[x,.055,z],ebony);}
  if(vibes){box(rack,[.35,.07,.18],[0,.09,.12],silver);cylinder(rack,.035,.55,[.6,.56,.18],silver);}
 }else if(type==='snare'){
  cylinder(g,.3,.24,[0,.73,-.6],silver);cylinder(g,.32,.025,[0,.86,-.6],0xeee2c9);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;line(g,new T.Vector3(Math.sin(a)*.305,.62,-.6+Math.cos(a)*.305),new T.Vector3(Math.sin(a)*.305,.84,-.6+Math.cos(a)*.305),.012,ebony);}cylinder(g,.025,.6,[0,.3,-.6],silver);
 }else if(type==='cymbals'){
  for(const x of [-.24,.24]){const c=cylinder(g,.24,.025,[x,.92,-.43],brass);c.rotation.z=x<0?.45:-.45;sphere(g,.05,[x,.95,-.43],brass);}
 }else if(type==='triangle'){
  tube(g,[[.01,1.18,-.43],[.2,.86,-.43],[-.2,.86,-.43],[-.025,1.13,-.43]],.016,silver);
 }else if(type==='sleigh-bells'){
  g.position.x=-.22;box(g,[.07,.48,.06],[0,.93,-.42],wood);for(let i=0;i<5;i++)for(const x of [-.07,.07])sphere(g,.05,[x,.77+i*.08,-.42],brass);
 }else line(rightHand,new T.Vector3(),new T.Vector3(0,.03,-.36),.012,0xeee3c7);
 if(['timpani','xylophone','marimba','vibraphone','snare','bass-drum','gong','chimes','triangle'].includes(type))for(const hand of [leftHand,rightHand]){line(hand,new T.Vector3(),new T.Vector3(0,-.08,-.32),.012,0xd3b682);sphere(hand,.035,[0,-.08,-.32],0xe3d8c2);}
}
