import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {TRAIN_DECK,TRAIN_EXIT,TRAIN_PERIOD,TRAIN_PLATFORM,TRAIN_SEATS,TRAIN_STEP} from '../../shared/encoreTrain';
import {hasGalleryFloor} from '../../shared/gallery';
import {parterreHeight} from '../../shared/parterre';
import {hallImageMaterial,woodMaterial} from './HallTextures';
import {buildFloorGuide} from './TicketGuide';

const DUST_COUNT=256,DUST_LIFE=3,DUST_RATE=60;
const CAR_SCALE=new T.Vector3(.64,.86,.72);
const CHIMNEY_TOP=3.34,CHIMNEY_Z=1.06;
const STATION_DWELL=3;
const ARRIVAL_ASCENT_DURATION=1.8;
const ARRIVAL_RIBBON_DELAY=.28;

/** A bright lens and tapered glow in one mesh, with no scene light or shadow. */
function underbodyLamp(){
 const geometry=new T.LatheGeometry([
  new T.Vector2(.57,-1.45),new T.Vector2(.36,-.77),new T.Vector2(.085,-.105),
  new T.Vector2(.13,-.07),new T.Vector2(.13,0),new T.Vector2(0,.01),
 ],16);
 const material=new T.ShaderMaterial({
  transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,forceSinglePass:true,
  vertexShader:`varying float vY;
void main(){
 vY=position.y;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`,
  fragmentShader:`uniform float uPower; varying float vY;
void main(){
 float lens=smoothstep(-.12,-.055,vY);
 float beam=pow(clamp(1.+vY/1.45,0.,1.),1.8)*.24;
 gl_FragColor=vec4(mix(vec3(1.,.66,.26),vec3(1.,.92,.66),lens),uPower*mix(beam,.95,lens));
 #include <colorspace_fragment>
}`,
  uniforms:{uPower:{value:0}},
 });
 const lamp=new T.Mesh(geometry,material);
 lamp.name='객차 하부 비행 조명';lamp.position.y=.055;lamp.visible=false;
 return lamp;
}

/** Gold streams follow the canopy, descend the columns and curl back over the deck. */
function arrivalRibbons(topY:number,frontZ:number){
 const deckY=TRAIN_PLATFORM.y+TRAIN_DECK.height;
 const parts:T.BufferGeometry[]=[];
 for(const side of [-1,1])for(let strand=0;strand<3;strand++){
  const z=frontZ-.18*strand;
  const y=topY-.13*strand;
  const edge=4.03+.16*strand;
  const path=new T.CatmullRomCurve3([
   [.15,y,z],[1.6,y+.06,z],[3.5,y,z],[edge,y-.36,z-.18],
   [edge+.09,T.MathUtils.lerp(deckY,topY,.54),z-.28],[edge-.13,deckY+.56,z-.45],
   [3.35,deckY+.16,z-.9],[2.3+.28*strand,deckY+.13,z-1.22],
  ].map(([x,y,z])=>new T.Vector3(side*x,y,z)));
  for(const halo of [false,true]){
   const radius=halo?.145-strand*.019:.048-strand*.009;
   const tube=new T.TubeGeometry(path,40,radius,6);
   const count=tube.attributes.position.count;
   tube.setAttribute('aRibbon',new T.BufferAttribute(new Float32Array(count).fill(strand),1));
   tube.setAttribute('aHalo',new T.BufferAttribute(new Float32Array(count).fill(Number(halo)),1));
   parts.push(tube);
  }
 }
 const geometry=mergeGeometries(parts)!;
 for(const part of parts)part.dispose();
 const material=new T.ShaderMaterial({
  uniforms:{uArrival:{value:0},uReduced:{value:0}},transparent:true,depthWrite:false,
  blending:T.AdditiveBlending,
  vertexShader:`attribute float aRibbon,aHalo;
 varying float vTravel,vRibbon,vHalo;
 void main(){
  vTravel=uv.x;vRibbon=aRibbon;vHalo=aHalo;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
 }`,
  fragmentShader:`uniform float uArrival,uReduced;
 varying float vTravel,vRibbon,vHalo;
 void main(){
  float head=uArrival*1.44-vRibbon*.08;
  float trail=head-vTravel;
  float sweep=smoothstep(-.055,.018,trail)*(1.-smoothstep(.09,.42,trail));
  float hot=exp(-32.*abs(trail-.033));
  float glints=.65+.35*cos(vTravel*68.-uArrival*45.+vRibbon*1.8);
  float envelope=smoothstep(0.,.06,uArrival)*(1.-smoothstep(.76,1.,uArrival));
  float energy=mix(sweep*(.61+.28*glints)+.47*hot,.55,uReduced)*envelope;
  float alpha=energy*mix(.93,.16,vHalo)*(1.-smoothstep(.92,1.,vTravel));
  vec3 color=mix(vec3(1.,.47,.095),vec3(1.,.94,.67),clamp(.26+hot*.72-vRibbon*.09,0.,1.));
  gl_FragColor=vec4(color,alpha);
  #include <colorspace_fragment>
 }`,
 });
 const ribbons=new T.Mesh(geometry,material);
 ribbons.name='승강장 도착 금빛 물결';ribbons.visible=false;
 return ribbons;
}

/** Expanding rings and rising light around the arriving train share one mesh. */
function arrivalAscent(trackZ:number){
 const centerZ=trackZ-.65;
 const y=TRAIN_PLATFORM.y+TRAIN_DECK.height+.035;
 const floor=new T.PlaneGeometry(9.6,4.6).rotateX(-Math.PI/2).translate(0,y,centerZ);
 floor.setAttribute('aSeed',new T.Float32BufferAttribute([-1,-1,-1,-1],1));
 const parts:T.BufferGeometry[]=[floor];
 for(let i=0;i<24;i++){
  const beam=new T.PlaneGeometry(1,1);
  for(let v=0;v<4;v++)beam.attributes.position.setXYZ(v,0,y,centerZ);
  beam.setAttribute('aSeed',new T.Float32BufferAttribute(new Float32Array(4).fill(i/24),1));
  parts.push(beam);
 }
 const geometry=mergeGeometries(parts)!;
 for(const part of parts)part.dispose();
 geometry.boundingSphere=new T.Sphere(new T.Vector3(0,y+2.4,centerZ),6.5);
 const material=new T.ShaderMaterial({
  uniforms:{uTime:{value:0}},transparent:true,depthWrite:false,
  side:T.DoubleSide,forceSinglePass:true,blending:T.AdditiveBlending,
  vertexShader:`attribute float aSeed;
 uniform float uTime;
 varying vec2 vUv;
 varying float vFloor,vGlow;
 void main(){
  vUv=uv;
  vFloor=1.-step(0.,aSeed);
  if(aSeed<0.){
   vGlow=1.;
   gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
  }else{
   float seed=fract(aSeed*17.);
   float age=clamp((uTime-.08-.52*seed)/1.15,0.,1.);
   float angle=aSeed*6.283+age*1.2;
   float radius=.67+.28*age;
   float height=mix(3.4,5.3,fract(aSeed*11.));
   vec3 offset=vec3(cos(angle)*4.45*radius,max(0.,age*height-(1.-uv.y)*(.55+seed)),sin(angle)*2.0*radius);
   vec4 view=modelViewMatrix*vec4(position+offset,1.);
   view.x+=(uv.x-.5)*(.12+.14*seed);
   gl_Position=projectionMatrix*view;
   vGlow=smoothstep(0.,.12,age)*(1.-smoothstep(.56,1.,age));
  }
 }`,
  fragmentShader:`uniform float uTime;
 varying vec2 vUv;
 varying float vFloor,vGlow;
 void main(){
  vec3 amber=vec3(1.,.47,.12),gold=vec3(1.,.94,.64);
  if(vFloor>.5){
   vec2 p=vUv*2.-1.;
   float r=length(p),age=clamp(uTime/1.38,0.,1.);
   float wave=abs(r-mix(.12,.94,age));
   float echo=abs(r-mix(.035,.77,age));
   float ring=exp(-76.*wave),halo=exp(-18.*wave);
   float marks=pow(clamp(.5+.5*cos(atan(p.y,p.x+1e-5)*24.),0.,1.),5.);
   float energy=(ring*.96+halo*.28+exp(-55.*echo)*(.32+.34*marks));
   energy*=smoothstep(0.,.11,uTime)*(1.-smoothstep(.77,1.38,uTime));
   gl_FragColor=vec4(mix(amber,gold,ring),energy);
  }else{
   float center=1.-smoothstep(.06,.5,abs(vUv.x-.5));
   float head=pow(clamp(vUv.y,0.,1.),1.8);
   gl_FragColor=vec4(mix(amber,gold,head),center*head*vGlow*.86);
  }
  #include <colorspace_fragment>
 }`,
 });
 const ascent=new T.Mesh(geometry,material);
 ascent.name='승강장 도착 상승 효과';ascent.visible=false;
 return ascent;
}

/** One shared clock, a closed arc-length path, three independently following cars. */
export class EncoreTrain {
 readonly root=new T.Group();readonly targets:T.Object3D[]=[];
 private readonly cars:T.Group[]=[];
 private readonly lamps:T.Mesh<T.BufferGeometry,T.ShaderMaterial>[]=[];
 private readonly stationPulse:T.Mesh<T.BufferGeometry,T.ShaderMaterial>;
 private readonly stationRibbons:ReturnType<typeof arrivalRibbons>;
 private readonly stationAscent:ReturnType<typeof arrivalAscent>;
 private readonly curve:T.CatmullRomCurve3;
 private readonly length:number;
 private readonly sideBoundaries:number[];
 private readonly tangent=new T.Vector3();
 private readonly materials:T.Material[]=[];
 private readonly geometries:T.BufferGeometry[]=[];
 private readonly textures:T.Texture[]=[];
 private readonly boardingGuide:ReturnType<typeof buildFloorGuide>;
 // Stardust streams from the engine chimney into a world-space point cloud.
 private readonly dustPositions=new Float32Array(DUST_COUNT*3);
 private readonly dustData=new Float32Array(DUST_COUNT*2).fill(-1e3);
 private readonly dustGeometry=new T.BufferGeometry();
 private readonly dustUniforms={uTime:{value:0},uHeight:{value:800}};
 private dustCarry=0;
 private readonly dustPrevious=new T.Vector3();
 private readonly dustOrigin=new T.Vector3();
 private dustCursor=0;private dustStart:number|null=null;private dustTime=0;
 constructor(scene:T.Scene){
  this.root.name='앙코르 열차';scene.add(this.root);
  // Same clockwise direction on both floors; altitude changes only across the stage front.
  // Lift above the 2F rail before crossing it, descend after clearing its inner edge.
  const upper=TRAIN_PLATFORM.y+.35,lower=.35;
  const boardingZ=TRAIN_DECK.z,trackZ=TRAIN_PLATFORM.z+2.2;
  this.curve=new T.CatmullRomCurve3([
   [0,upper,trackZ],[-7,upper,trackZ],[-12.4,upper,trackZ],[-13.7,upper,trackZ-1.3],
   [-13.7,upper,35],[-13.7,upper,18],[-13.7,upper,2],
   [-13.7,9.7,-4],[-11,9.7,-7],[-6,8,-7],[0,5.8,-7],[6,4.5,-7],[10,3,-7],[13.7,1.5,-3],
   [13.7,lower,8],[13.7,lower,28],[10,1.6,37],[0,1.6,38],[-10,1.6,37],
   [-13.7,lower,28],[-13.7,lower,8],[-13.7,1.6,-2],[-10,3.1,-5],[-6,4.3,-5],[0,6.7,-5],
   [6,8.8,-5],[11,9.7,-5],[13.7,9.7,-2],
   [13.7,upper,7],[13.7,upper,22],[13.7,upper,38],[13.7,upper,trackZ-1.3],
   [12.4,upper,trackZ],[7,upper,trackZ],
  ].map(p=>new T.Vector3(...p as [number,number,number])),true,'centripetal');
  this.curve.arcLengthDivisions=1200;this.curve.updateArcLengths();this.length=this.curve.getLength();
  // Give each side of the hall equal travel time.
  const arcLengths=this.curve.getLengths();
  this.sideBoundaries=[0,10,17,24,this.curve.points.length].map(index=>{
   const sample=index/this.curve.points.length*this.curve.arcLengthDivisions;
   const lower=Math.floor(sample),upper=Math.ceil(sample);
   return T.MathUtils.lerp(arcLengths[lower],arcLengths[upper],sample-lower)/this.length;
  });
  const ivory=new T.MeshStandardMaterial({color:0xf1e3c2,roughness:.64});
  const wine=new T.MeshStandardMaterial({color:0x571322,roughness:.6});
  const gold=new T.MeshStandardMaterial({color:0xc69a4d,metalness:.55,roughness:.4});
  const glow=new T.MeshBasicMaterial({color:0xffdf94});
  this.materials.push(ivory,wine,gold,glow);
  for(let c=0;c<TRAIN_SEATS;c++){
   const car=new T.Group();this.cars.push(car);this.root.add(car);
   const parts=new Map<T.Material,T.BufferGeometry[]>();
   const add=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{g.translate(x,y,z);const list=parts.get(m)??[];list.push(g);parts.set(m,list);};
   const box=(w:number,h:number,d:number,m:T.Material,x:number,y:number,z:number,r=.06)=>add(new RoundedBoxGeometry(w,h,d,2,r),m,x,y,z);
   box(1.95,.36,2.9,wine,0,.24,0,.14);box(1.85,.18,2.75,gold,0,.48,0);
   // Hollow cabin with waist-high coach panels and open windows above.
   box(1.85,.08,2.7,ivory,0,.59,0,.03);
   for(const x of [-.85,.85]){
    box(.15,.70,2.7,ivory,x,.94,0,.05);
    box(.17,.045,2.7,gold,x,1.29,0,.02);
    box(.018,.055,2.5,wine,x+Math.sign(x)*.077,.78,0,.008);
   }
   // Close the rear below the window; keep the front bonnet unchanged.
   box(1.55,.70,.14,ivory,0,.94,-1.28,.05);
   box(1.7,.045,.16,gold,0,1.29,-1.28,.02);
   if(c===0)box(1.55,.42,.14,ivory,0,.72,1.28,.05);
   else{
    box(1.55,.70,.14,ivory,0,.94,1.28,.05);
    box(1.7,.045,.16,gold,0,1.29,1.28,.02);
   }
   // Open panoramic windows without transparent panes.
   for(const x of [-.87,.87]){
    box(.13,1.95,.13,gold,x,1.77,-1.22);box(.13,1.95,.13,gold,x,1.77,1.22);
    box(.1,.08,2.55,gold,x,2.68,0);
    box(.025,.05,2.5,glow,x,.46,0);
   }
   box(2.02,.22,2.95,wine,0,2.8,0,.1);box(2.04,.06,2.98,gold,0,2.68,0);
   // Brass ceiling fixture with a broad frosted lens facing the seats.
   add(new T.CylinderGeometry(.26,.24,.08,16),gold,0,2.63,0);
   add(new T.CylinderGeometry(.21,.17,.075,16),glow,0,2.56,0);
   box(.6,.08,.8,gold,0,2.95,0);box(.42,.09,.58,glow,0,3.0,0);
   if(c===0){
    box(1.6,1.03,.7,ivory,0,1,1.25,.22);
    add(new T.CylinderGeometry(.32,.38,.09,12),gold,0,2.95,CHIMNEY_Z);
    add(new T.CylinderGeometry(.24,.30,.34,12),wine,0,CHIMNEY_TOP-.21,CHIMNEY_Z);
    const rim=new T.LatheGeometry([
     new T.Vector2(.24,-.09),new T.Vector2(.36,-.065),new T.Vector2(.36,-.015),
     new T.Vector2(.32,0),new T.Vector2(.20,0),new T.Vector2(.20,-.06),
    ],12);
    add(rim,gold,0,CHIMNEY_TOP,CHIMNEY_Z);
    for(const x of [-.5,.5]){add(new T.SphereGeometry(.16,12,8),gold,x,1.15,1.64);add(new T.SphereGeometry(.11,12,8),glow,x,1.15,1.76);}
    for(let i=-2;i<=2;i++)box(.07,.26,.04,gold,i*.16,.74,1.63);
   }
   {
    // One forward-facing seat per carriage.
    box(.68,.13,.48,wine,0,.83,-.06);
    box(.68,.65,.14,wine,0,1.10,-.36);
    box(.48,.16,.32,gold,0,.70,-.06,.03);
   }
   for(const [m,geos] of parts){const converted=geos.map(g=>g.index?g.toNonIndexed():g);const geometry=mergeGeometries(converted)!;geometry.scale(CAR_SCALE.x,CAR_SCALE.y,CAR_SCALE.z);for(const g of new Set([...geos,...converted]))g.dispose();this.geometries.push(geometry);const mesh=new T.Mesh(geometry,m);mesh.userData.encoreTrain=true;mesh.userData.trainSeat=c===0?2:c-1;car.add(mesh);this.targets.push(mesh);}
   // One warm fill per train reaches all three open cabins, including the riders.
   if(c===1){
    const cabinLight=new T.PointLight(0xffd9a5,3.2,4.8,1);
    cabinLight.position.y=2.48*CAR_SCALE.y;
    car.add(cabinLight);
   }
  }
  const lampTemplate=underbodyLamp();
  this.geometries.push(lampTemplate.geometry);
  for(const car of this.cars){
   const lamp=lampTemplate.clone();lamp.material=lampTemplate.material.clone();
   this.materials.push(lamp.material);this.lamps.push(lamp);car.add(lamp);
  }
  lampTemplate.material.dispose();
  const columnWood=woodMaterial('wall-panel');
  const wood=columnWood.clone();
  const woodEdge=columnWood.clone();
  for(const material of [wood,woodEdge]){
   material.onBeforeCompile=columnWood.onBeforeCompile;
   material.customProgramCacheKey=columnWood.customProgramCacheKey;
  }
  this.materials.push(wood,woodEdge);
  const planks=Array.from({length:24},(_,i)=>new T.BoxGeometry(.312,TRAIN_DECK.height,TRAIN_DECK.depth)
   .translate((i-11.5)*TRAIN_DECK.width/24,TRAIN_PLATFORM.y+TRAIN_DECK.height/2,boardingZ));
  const deckGeometry=mergeGeometries(planks)!;for(const plank of planks)plank.dispose();
  const deck=new T.Mesh(deckGeometry,wood);
  this.root.add(deck);this.targets.push(deck);this.geometries.push(deckGeometry);
  const stepGeometry=new T.BoxGeometry(TRAIN_DECK.width,TRAIN_STEP.height,TRAIN_STEP.depth);
  const step=new T.Mesh(stepGeometry,woodEdge);step.position.set(0,TRAIN_PLATFORM.y+TRAIN_STEP.height/2,TRAIN_STEP.z);
  this.root.add(step);this.targets.push(step);this.geometries.push(stepGeometry);
  const trackLength=TRAIN_DECK.width+12;
  const sleeperSpacing=.5;
  const sleeperCount=Math.floor((trackLength-.19)/sleeperSpacing)+1;
  const sleepers=Array.from({length:sleeperCount},(_,i)=>new T.BoxGeometry(.19,.055,1.23)
   .translate((i-(sleeperCount-1)/2)*sleeperSpacing,TRAIN_PLATFORM.y+.0275,trackZ));
  const rails=[-.46,.46].map(offset=>new T.BoxGeometry(trackLength,.075,.09).translate(0,TRAIN_PLATFORM.y+.0925,trackZ+offset));
  const trackGeometry=mergeGeometries([...sleepers,...rails])!;
  for(const part of [...sleepers,...rails])part.dispose();
  this.root.add(new T.Mesh(trackGeometry,woodEdge));this.geometries.push(trackGeometry);
  const stationParts=new Map<T.Material,T.BufferGeometry[]>();
  const stationBox=(width:number,height:number,depth:number,x:number,y:number,z:number,material:T.Material)=>{
   const geometry=new T.BoxGeometry(width,height,depth).translate(x,TRAIN_PLATFORM.y+y,z);
   const parts=stationParts.get(material)??[];parts.push(geometry);stationParts.set(material,parts);
  };
  // Taller canopy, with the same scroll panels and gold mouldings as the hall.
  const pillarHeight=4.2*1.5,pillarExtension=pillarHeight-4.2;
  const roofLift=.85+pillarExtension;
  for(const x of [-4.05,4.05])for(const z of [boardingZ-.6,trackZ+1]){
   stationBox(.22,pillarHeight,.22,x,pillarHeight/2,z,wood);
   stationBox(.4,.18,.4,x,.09,z,wood);
   stationBox(.32,.055,.32,x,.21,z,gold);
   stationBox(.36,.12,.36,x,pillarHeight-.1,z,gold);
   stationBox(.035,pillarHeight-.6,.025,x,pillarHeight/2,z-.12,gold);
  }
  const roofCenter=(boardingZ+trackZ)/2;
  stationBox(8.7,.2,3.6,0,3.5+roofLift,roofCenter,wood);
  stationBox(8.8,.07,3.7,0,3.37+roofLift,roofCenter,gold);
  stationBox(8.15,.24,3.05,0,3.68+roofLift,roofCenter,wine);
  stationBox(8.25,.045,3.15,0,3.82+roofLift,roofCenter,gold);
  const fasciaZ=roofCenter-1.78;
  stationBox(8.35,.48,.14,0,3.16+roofLift,fasciaZ,wine);
  for(const y of [2.91,3.41])stationBox(8.45,.045,.19,0,y+roofLift,fasciaZ,gold);
  // Raised boarding edge and stair nosing clearly separate the deck from the floor.
  stationBox(7.8,.045,.06,0,.445,boardingZ-.66,gold);
  stationBox(7.8,.035,.06,0,.225,boardingZ-1.05,gold);
  for(const x of [-3.3,3.3]){
   stationBox(.04,.3,.04,x,3.12+roofLift,boardingZ-.2,gold);
   stationBox(.22,.27,.22,x,2.85+roofLift,boardingZ-.2,glow);
   stationBox(.3,.06,.3,x,3.015+roofLift,boardingZ-.2,gold);
   stationBox(.3,.06,.3,x,2.685+roofLift,boardingZ-.2,gold);
  }
  // Reuse the hall texture; all ornamental faces share one merged mesh.
  const ornament=hallImageMaterial('scroll').clone();this.materials.push(ornament);
  const ornamentParts:T.BufferGeometry[]=[];
  for(let i=0;i<4;i++){
   const panel=new T.PlaneGeometry(2.04,.43);
   panel.rotateY(Math.PI);panel.translate((i-1.5)*2.07,TRAIN_PLATFORM.y+3.16+roofLift,fasciaZ-.076);
   ornamentParts.push(panel);
  }
  for(const x of [-2.95,2.95]){
   const panel=new T.PlaneGeometry(1.55,.19);
   panel.rotateY(Math.PI);panel.translate(x,TRAIN_PLATFORM.y+.335,boardingZ-.681);
   ornamentParts.push(panel);
  }
  const ornamentGeometry=mergeGeometries(ornamentParts)!;
  for(const part of ornamentParts)part.dispose();
  this.geometries.push(ornamentGeometry);this.root.add(new T.Mesh(ornamentGeometry,ornament));
  for(const [material,parts] of stationParts){
   const geometry=mergeGeometries(parts)!;for(const part of parts)part.dispose();
   this.geometries.push(geometry);this.root.add(new T.Mesh(geometry,material));
  }
  // One draw for the pulse along the platform edge, canopy and both rails.
  const deckLight=new T.PlaneGeometry(7.8,.29);
  deckLight.translate(0,TRAIN_PLATFORM.y+.37,boardingZ-.684);
  const canopyLight=new T.PlaneGeometry(8.45,.32);
  canopyLight.translate(0,TRAIN_PLATFORM.y+2.91+roofLift,fasciaZ-.1);
  const railLights=[-.46,.46].map(offset=>new T.PlaneGeometry(8.45,.24)
   .rotateX(-Math.PI/2).translate(0,TRAIN_PLATFORM.y+.134,trackZ+offset));
  const pulseParts=[deckLight,canopyLight,...railLights];
  const pulseGeometry=mergeGeometries(pulseParts)!;
  for(const part of pulseParts)part.dispose();
  const pulseMaterial=new T.ShaderMaterial({
   uniforms:{uArrival:{value:0},uReduced:{value:0}},transparent:true,depthWrite:false,
   blending:T.AdditiveBlending,side:T.DoubleSide,forceSinglePass:true,
   vertexShader:`varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`uniform float uArrival,uReduced; varying vec2 vUv;
void main(){
 float x=abs(2.*vUv.x-1.),y=abs(2.*vUv.y-1.);
 float sweep=exp(-12.*abs(x-uArrival*1.35));
 float line=exp(-9.*y)*.75+exp(-3.5*y)*.26;
 float fade=1.-smoothstep(.56,1.,uArrival);
 float shimmer=.73+.27*cos(uArrival*35.-x*10.);
 float brightness=mix(.48+1.12*sweep+shimmer*.34,.85,uReduced);
 gl_FragColor=vec4(1.,.69,.27,line*fade*brightness*(1.-smoothstep(.91,1.,x)));
 #include <colorspace_fragment>
}`,
  });
  this.stationPulse=new T.Mesh(pulseGeometry,pulseMaterial);
  this.stationPulse.name='앙코르 승강장 도착 효과';this.stationPulse.visible=false;
  this.root.add(this.stationPulse);this.geometries.push(pulseGeometry);this.materials.push(pulseMaterial);
  this.stationRibbons=arrivalRibbons(TRAIN_PLATFORM.y+3.16+roofLift,fasciaZ-.16);
  this.root.add(this.stationRibbons);
  this.geometries.push(this.stationRibbons.geometry);this.materials.push(this.stationRibbons.material);
  this.stationAscent=arrivalAscent(trackZ);
  this.root.add(this.stationAscent);
  this.geometries.push(this.stationAscent.geometry);this.materials.push(this.stationAscent.material);
  this.dustGeometry.setAttribute('position',new T.BufferAttribute(this.dustPositions,3).setUsage(T.DynamicDrawUsage));
  this.dustGeometry.setAttribute('aData',new T.BufferAttribute(this.dustData,2).setUsage(T.DynamicDrawUsage));
  const dustMaterial=new T.ShaderMaterial({
   uniforms:this.dustUniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
   vertexShader:`attribute vec2 aData;uniform float uTime,uHeight;varying float vAlpha;varying vec3 vColor;
void main(){
 float age=(uTime-aData.x)/${DUST_LIFE.toFixed(1)},s=aData.y,w=s*6.283;
 float live=step(0.,age)*step(age,1.);
 vec3 p=position;
 float spread=(.65+.65*fract(s*19.7))*age;
 p.xz+=vec2(cos(w),sin(w))*spread;
 p+=vec3(sin(w*7.+uTime*1.3),0.,cos(w*5.+uTime*1.1))*.16*age;
 p.y+=(1.1+.8*fract(s*23.1))*age-.45*age*age;
 vec4 mv=modelViewMatrix*vec4(p,1.);
 float twinkle=.5+.5*sin(uTime*(5.+s*9.)+w*13.);
 vAlpha=live*smoothstep(0.,.05,age)*(1.-age)*(.45+.55*twinkle);
 vColor=mix(vec3(1.,.8,.42),vec3(.7,.84,1.),step(.7,fract(s*31.7)));
 float size=(.16+.3*fract(s*17.3))*(1.-.4*age);
 gl_PointSize=live*size*projectionMatrix[1][1]*uHeight*.5/max(.1,-mv.z);
 gl_Position=projectionMatrix*mv;
}`,
   fragmentShader:`varying float vAlpha;varying vec3 vColor;
void main(){
 vec2 u=gl_PointCoord*2.-1.;float d=dot(u,u);
 float star=1.1*exp(-d*6.)+.8*(exp(-abs(u.x)*14.-abs(u.y)*2.5)+exp(-abs(u.y)*14.-abs(u.x)*2.5));
 gl_FragColor=vec4(vColor,star*vAlpha*(1.-smoothstep(.7,1.,d)));
}`,
  });
  const dust=new T.Points(this.dustGeometry,dustMaterial);
  dust.name='열차 별가루';dust.frustumCulled=false;dust.renderOrder=20;
  dust.onBeforeRender=renderer=>{this.dustUniforms.uHeight.value=renderer.domElement.height;};
  this.root.add(dust);this.geometries.push(this.dustGeometry);this.materials.push(dustMaterial);
  const guide=this.boardingGuide=buildFloorGuide(this.root,0,boardingZ+.26,Math.PI,'탑승하기','trainBoardSign',{
   y:TRAIN_PLATFORM.y+TRAIN_DECK.height+.01,scale:.5,labelTarget:true,arrowAction:'trainBoardArrow',
  });
  this.targets.push(...guide.targets);
  guide.group.traverse(object=>{
   if(!(object instanceof T.Mesh))return;
   if(!this.geometries.includes(object.geometry))this.geometries.push(object.geometry);
   const material=object.material as T.MeshBasicMaterial;
   this.materials.push(material);
   if(material.map)this.textures.push(material.map);
  });
 }
 private routeDistance(phase:number){
  const segment=Math.floor(phase*4),progress=phase*4-segment;
  const start=this.sideBoundaries[segment],end=this.sideBoundaries[segment+1];
  const span=end-start;
  const previous=segment===0?1-this.sideBoundaries[3]:start-this.sideBoundaries[segment-1];
  const next=segment===3?this.sideBoundaries[1]:this.sideBoundaries[segment+2]-end;
  // Blend the speed across crossings while keeping the exact crossing time.
  const startSpeed=2*previous*span/(previous+span),endSpeed=2*span*next/(span+next);
  return start+progress*(startSpeed+progress*(3*span-2*startSpeed-endSpeed+progress*(startSpeed+endSpeed-2*span)));
 }
 update(seconds:number,visible:boolean,reducedMotion=false){
  this.root.visible=visible;
  if(!visible)return;
  this.boardingGuide.update(reducedMotion?0:seconds);
  const cycle=TRAIN_PERIOD+STATION_DWELL;
  const stationTime=T.MathUtils.euclideanModulo(seconds,cycle);
  const travelPhase=Math.max(0,stationTime-STATION_DWELL)/TRAIN_PERIOD;
  const headDistance=this.routeDistance(travelPhase)+2.55/this.length;
  this.stationAscent.visible=!reducedMotion&&stationTime<ARRIVAL_ASCENT_DURATION;
  if(this.stationAscent.visible)this.stationAscent.material.uniforms.uTime.value=stationTime;
  for(const effect of [this.stationPulse,this.stationRibbons]){
   effect.visible=stationTime<STATION_DWELL;
   if(!effect.visible)continue;
   const delay=effect===this.stationRibbons?ARRIVAL_RIBBON_DELAY:0;
   effect.material.uniforms.uArrival.value=Math.max(0,stationTime-delay)/(STATION_DWELL-delay);
   effect.material.uniforms.uReduced.value=Number(reducedMotion);
  }
  this.dustStart??=seconds;
  const time=seconds-this.dustStart,dt=T.MathUtils.clamp(time-this.dustTime,0,.25);
  // A jump in the shared clock (first frame, tab back in view) must not smear dust across the hall.
  const emit=!reducedMotion&&dt>0&&time-this.dustTime<1;
  this.dustTime=time;this.dustUniforms.uTime.value=time;
  let wrote=false;
  this.cars.forEach((car,i)=>{
   const distance=T.MathUtils.euclideanModulo(headDistance-i*2.55/this.length,1);
   this.curve.getPointAt(distance,car.position);
   const {x,y,z}=car.position;
   const ground=y>=TRAIN_PLATFORM.y&&hasGalleryFloor(x,z)?TRAIN_PLATFORM.y:parterreHeight(x,z)??0;
   const clearance=y-ground;
   const lamp=this.lamps[i];
   const power=T.MathUtils.smoothstep(clearance,.75,1.35);
   lamp.visible=power>0;
   if(lamp.visible){
    lamp.scale.y=Math.min(1,clearance/1.45);
    lamp.material.uniforms.uPower.value=power;
   }
   car.position.y+=.055*Math.sin(seconds*1.35-i*.65);
   this.curve.getTangentAt(distance,this.tangent);
   car.rotation.y=Math.atan2(this.tangent.x,this.tangent.z);
   car.updateMatrixWorld(true);
   if(i!==0)return;
   const previous=this.dustPrevious;
   if(emit){
    // Dust follows speed, so a train waiting at the platform only shimmers faintly.
    const speed=previous.distanceTo(car.position)/dt;
    this.dustCarry+=dt*DUST_RATE*T.MathUtils.clamp(speed/2,.12,1);
    this.dustOrigin.set(0,CHIMNEY_TOP+.03,CHIMNEY_Z).multiply(CAR_SCALE);
    car.localToWorld(this.dustOrigin);
    for(;this.dustCarry>=1;this.dustCarry--){
     const n=this.dustCursor;this.dustCursor=(n+1)%DUST_COUNT;
     this.dustPositions[n*3]=this.dustOrigin.x+(Math.random()-.5)*.16;
     this.dustPositions[n*3+1]=this.dustOrigin.y;
     this.dustPositions[n*3+2]=this.dustOrigin.z+(Math.random()-.5)*.16;
     this.dustData[n*2]=time;this.dustData[n*2+1]=Math.random();wrote=true;
    }
   }
   previous.copy(car.position);
  });
  if(wrote){this.dustGeometry.attributes.position.needsUpdate=true;this.dustGeometry.attributes.aData.needsUpdate=true;}
 }
 seat(index:number,target:T.Vector3){
 const car=Number.isInteger(index)&&index>=0&&index<TRAIN_SEATS?this.cars[index===2?0:1+index]:undefined;
 if(!car){target.set(TRAIN_EXIT.x,TRAIN_EXIT.y,TRAIN_EXIT.z);return 0;}
 target.set(0,.21,0);car.localToWorld(target);// Avatars face local -Z, while the train nose points along +Z.
 return car.rotation.y+Math.PI;}
 dispose(){this.root.removeFromParent();for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();}
}
