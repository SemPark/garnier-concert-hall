import {buildFork,buildWineGlass,WINE_SCALE} from '../scene/DinnerDishes';
import {JAZZ_HALL} from '../../shared/hallKind';
import {buildCoffeeCup,buildMacaron} from './CoffeeCup';
import {faceGeometry,faceFarGeometry,faceSurfaceZ,paintFace} from './Face';
import {skirtGeometry} from './Skirt';
import type {Outfit} from '../../shared/wardrobe';
import * as T from 'three';
import {box,cylinder,sphere,material} from '../scene/primitives';
import {frontLitMaterial,prepareClothContact,type ClothContact} from './characterLight';
import {buildInstrument} from '../orchestra/instruments';
import {poseVillager,type CameraFacing,type Icon} from './villager';
import type {Gesture} from '../../shared/gestures';
export type Instrument='violin'|'viola'|'cello'|'bass'|'harp'|'piano'|'celesta'|'flute'|'piccolo'|'oboe'|'english-horn'|'clarinet'|'bass-clarinet'|'bassoon'|'contrabassoon'|'horn'|'trumpet'|'trombone'|'tuba'|'bass-drum'|'snare'|'cymbals'|'sleigh-bells'|'triangle'|'chimes'|'gong'|'timpani'|'xylophone'|'marimba'|'vibraphone'|'alto-sax'|'tenor-sax'|'bari-sax'|'guitar'|'drum-kit'|'conductor';
export type HairStyle='short'|'long';
type Arm={shoulder:T.Group;hand:T.Group};
export const PERCUSSION:readonly Instrument[]=['bass-drum','snare','cymbals','sleigh-bells','triangle','chimes','gong','timpani','xylophone','marimba','vibraphone'];
const ARM_LENGTH=.4,HIP=new T.Vector3(0,.55,0),DOWN=new T.Vector3(0,-1,0);
/** Seconds into the eat gesture when the macaron reaches the mouth and half of it goes. */
const MACARON_BITE_AT=1.5;
const shadowGeometry=new T.CircleGeometry(.36,20),shadowMaterial=new T.MeshBasicMaterial({color:0x18100a,transparent:true,opacity:.2,depthWrite:false});
// One shared bell-shaped body for every character, so batching keeps one instance group.
// The top stays broad so the arms meet the body without shoulder pads.
const bellGeometry=new T.LatheGeometry([[0,0],[.27,0],[.285,.04],[.27,.17],[.255,.33],[.245,.46],[.225,.53],[.15,.57],[0,.585]].map(([x,y])=>new T.Vector2(x,y)),16);
// Cloth details follow the tapered torso.
const garmentPatches=new Map<string,T.BufferGeometry>();
function garmentPatch(parent:T.Group,torso:T.Mesh,w:number,h:number,x:number,y:number,color:number,tilt=0){
 const key=[w,h,x,y,tilt].join('/');let geometry=garmentPatches.get(key);
 if(!geometry){
  geometry=new T.PlaneGeometry(w,h,4,8);geometry.rotateY(Math.PI);geometry.rotateZ(tilt);geometry.translate(x,y,0);
  torso.updateMatrixWorld(true);const ray=new T.Raycaster(),vertices=geometry.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
   ray.set(new T.Vector3(vertices.getX(i),vertices.getY(i),-1),new T.Vector3(0,0,1));
   const hit=ray.intersectObject(torso,false)[0];if(hit)vertices.setZ(i,hit.point.z-.004);
  }
  geometry.computeVertexNormals();garmentPatches.set(key,geometry);
 }
 const cloth=material(color).clone();cloth.polygonOffset=true;cloth.polygonOffsetFactor=-1;cloth.polygonOffsetUnits=-1;
 const patch=new T.Mesh(geometry,cloth);parent.add(patch);return patch;
}
// Rounded arm ends tuck into the body instead of showing a flat cut or a ball joint.
const FLOOR_INSTRUMENTS=new Set<Instrument>(['cello','bass','harp','piano','celesta','timpani','bass-drum','gong','snare','chimes','xylophone','marimba','vibraphone','drum-kit']);
const armGeometry=new T.CapsuleGeometry(.066,ARM_LENGTH-.13,4,10);
// A short, chubby index finger for the hush gesture.
const fingerGeometry=new T.CapsuleGeometry(.024,.07,4,8);
/**
 * Women's long hair, shared by every woman, as one smooth closed piece (no separate cap, so no seam or ledge).
 * The crown is the same dome as the men's cap; below its widest line the hair hangs straight down, so the two
 * join without a crease. It covers the ears, ends at the jaw beside the face (clear of the shoulders), falls
 * past the shoulders at the back in soft locks, and curves into the head above the forehead.
 */
const LONG_HAIR_CENTER=[0,.15,.045] as const,LONG_HAIR_RADIUS=[.43,.31,.39] as const;
/** Carry the original hairline along with the flatter, narrower face surface. */
function fitHairToFace(geometry:T.BufferGeometry){
 const points=geometry.getAttribute('position');
 for(let i=0;i<points.count;i++){
  const z=points.getZ(i);points.setX(i,points.getX(i)*.96);
  if(z<0)points.setZ(i,-.35*.9*Math.pow(-z/.35,.72));
 }
 geometry.computeVertexNormals();return geometry;
}
// Men have no ears: the cap comes down over the sides and back of the head, while the front hairline stays put
// (people face −z).
function capGeometry(columns:number,rows:number){
 const geometry=new T.SphereGeometry(1,columns,rows).scale(.42,.31,.39).translate(0,.15,.045),points=geometry.getAttribute('position');
 for(let i=0;i<points.count;i++){const y=points.getY(i);if(y<.15)points.setY(i,.15+(y-.15)*(1+.4*T.MathUtils.smoothstep(points.getZ(i),-.2,.02)));}
 return fitHairToFace(geometry);
}
const shortHairGeometry=capGeometry(16,12),shortHairFar=capGeometry(8,6);
function buildLongHair(cols:number,dome:number,hang:number){
 const [,cy,cz]=LONG_HAIR_CENTER,[rx,ry,rz]=LONG_HAIR_RADIUS,fold=3,depth=.12;
 const {smoothstep,lerp}=T.MathUtils,positions:number[]=[],index:number[]=[];
 let ring=0;
 for(let j=0;j<=cols;j++){
  const phi=-Math.PI+2*Math.PI*j/cols,turn=Math.abs(phi),sx=Math.sin(phi),sz=Math.cos(phi);
  // 0 behind the head, 1 beside the ears, then 1 again toward the face where the hair tucks in.
  const side=smoothstep(turn,.7,1.35),face=smoothstep(turn,1.75,2.4);
  const length=lerp(lerp(.7+.045*Math.cos(phi*5),.38,side),.22,face);
  // Spread: a slight fullness at ear height and a gentle taper to the ends. Above the face the dome simply carries
  // on round into the head, like the men's cap, so the forehead line has no brim.
  const spread=(t:number)=>lerp(1+.02*(1-Math.cos(Math.min(t/.3,1)*Math.PI))-.16*(t/length)**2,Math.sqrt(Math.max(0,1-(t/ry)**2)),face);
  const put=(k:number,y:number)=>positions.push(sx*rx*k,y,cz+sz*rz*k);
  const start=positions.length;
  for(let i=0;i<=dome;i++){const th=i/dome*Math.PI/2;put(Math.sin(th),cy+ry*Math.cos(th));}
  for(let i=1;i<=hang;i++){const t=length*i/hang;put(spread(t),cy-t);}
  // A rounded end that folds back up into the inside of the hair.
  const end=spread(length);
  for(let i=1;i<fold;i++){const a=Math.PI*i/fold;put(end-depth/2*(1-Math.cos(a)),cy-length-.022*Math.sin(a));}
  // The inside is only glimpsed at the ends, so a few rows are enough.
  for(const f of [1,2/3,1/3,0])put(spread(f*length)-depth,cy-f*length);
  ring=(positions.length-start)/3;
 }
 // Leave out triangles buried inside the skull (the hair's tuck above the forehead): they can never be seen.
 const buried=(v:number)=>(positions[v*3]/.37)**2+((positions[v*3+1]-.03)/.345)**2+(positions[v*3+2]/.35)**2<.97;
 const face=(a:number,b:number,c:number)=>{if(!(buried(a)&&buried(b)&&buried(c)))index.push(a,b,c);};
 for(let j=0;j<cols;j++)for(let i=0;i<ring-1;i++){const a=j*ring+i,b=a+ring;face(a,a+1,b);face(b,a+1,b+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(index);return fitHairToFace(geometry);
}
// Far-away listeners get a coarser copy of the same shape.
const longHairGeometry=buildLongHair(24,7,8),longHairFar=buildLongHair(12,4,4);
/** Index finger seat on the right mitten: thumb side, toward the face, rising above the knuckles. */
export const FINGER_OFFSET=[-.035,.105,-.045] as const;
/** In the jazz hall the trumpets stand on the back tier, as a big band's do. */
export function musicianSits(type:Instrument|undefined){return !!type&&type!=='bass'&&type!=='conductor'&&!PERCUSSION.includes(type)&&!(JAZZ_HALL&&type==='trumpet');}
export class Avatar{
 readonly appearance:'woman'|'man';readonly hair:HairStyle;
 readonly root=new T.Group();readonly body=new T.Group();readonly head=new T.Group();readonly eyes=new T.Group();
 readonly leftArm=new T.Group();readonly rightArm=new T.Group();readonly leftHand=new T.Group();readonly rightHand=new T.Group();
 readonly finger:T.Mesh;readonly leftLeg=new T.Group();readonly rightLeg=new T.Group();private readonly knees:T.Group[]=[];readonly instrument=new T.Group();phase=0;instrumentType?:Instrument;
 /** Head-top icon of the current gesture, for the emote layer. */
 icon:Icon|null=null;iconAlpha=0;
 private sitAmount=0;private left:Arm;private right:Arm;
 private direction=new T.Vector3();private armRotation=new T.Quaternion();private hipOffset=new T.Vector3();private tilt=new T.Euler();
 readonly variant:number;readonly skirt:T.Mesh|null;
 constructor(color=0x252733,instrument?:Instrument,variant=0,readonly outfit?:Outfit){this.variant=variant;
  this.appearance=variant%8>=4?'woman':'man';this.hair=this.appearance==='woman'?'long':'short';
  this.instrumentType=instrument;this.root.add(this.body);this.body.add(this.head,this.leftArm,this.rightArm,this.leftLeg,this.rightLeg,this.instrument);
  const skin=0xf9cfcc,hair=[0x3b2c27,0x5a3423,0x232022,0xb4552a,0xb88a48,0x7e6b5c,0x553f32,0xaaa59b][Math.floor(variant/8)%8];
  // Narrow body with a plain neckline and a very short skin-coloured neck.
  const torso=new T.Mesh(bellGeometry,material(color));torso.position.y=.47;torso.scale.set(.82,1,.72);torso.userData.clothContact='torso';this.body.add(torso);
  if(this.appearance==='man')box(this.body,[.075,.06,.045],[0,.96,-.1775],0xa23c3c);else sphere(this.body,.04,[0,.97,-.16],0xe8b647);
  // Big round head with dot eyes, catch-lights, blush and a button nose.
  cylinder(this.body,.08,.02,[0,1.005,0],skin).userData.facePart='neck';
  this.head.position.y=1.318;// Lower the head into the neckline for both appearances.
  const skull=new T.Mesh(faceGeometry,material(skin));skull.position.y=.03;skull.scale.set(.37,.345,.35);skull.userData.lowDetail=faceFarGeometry;this.head.add(skull);// Blush and mouth sit on this surface, not in front of it.
  paintFace(this.head,this.eyes);
  sphere(this.head,.04,[0,-.075,faceSurfaceZ(0,-.075)-.015],0xe8a77f).scale.set(.035,.025,.023);
  // Men wear one simple cap: it covers the crown, sides and back, with no fringe (and no ears).
  // Women wear the long hair in one piece instead, so nothing overlaps.
  if(this.appearance==='man'){const cap=new T.Mesh(shortHairGeometry,material(hair));cap.userData.lowDetail=shortHairFar;cap.userData.hairPart='cap';this.head.add(cap);}
  else{const long=new T.Mesh(longHairGeometry,material(hair));long.userData.hairPart='long';long.userData.lowDetail=longHairFar;this.head.add(long);}
  const wearsSkirt=this.appearance==='woman'&&!instrument;
  this.skirt=wearsSkirt?new T.Mesh(skirtGeometry,material(color)):null;
  if(this.skirt){this.skirt.position.y=.78;this.skirt.scale.z=.87;this.skirt.userData.garment='skirt';this.skirt.userData.clothContact='skirt';this.body.add(this.skirt);}
  // Every visiting man wears the dress shirt and lapels; the cloakroom outfit only changes the colour.
  if((outfit||!instrument)&&this.appearance==='man'){const shirt=garmentPatch(this.body,torso,.15,.23,0,.84,0xf4efe5);shirt.userData.garment='dress-shirt';shirt.userData.clothContact='plain';for(const side of [-1,1]){const lapel=box(this.body,[.055,.28,.09],[side*.105,.86,-.15],color);lapel.rotation.z=side*.23;lapel.userData.garment='lapel';lapel.userData.clothContact='plain';}}
  this.left={shoulder:this.leftArm,hand:this.leftHand};this.right={shoulder:this.rightArm,hand:this.rightHand};
  for(const [side,arm]of [[-1,this.left],[1,this.right]] as const){
   // Arms start inside the torso, so the top of the arm is buried in the body instead of hanging beside it.
   arm.shoulder.position.set(side*.16,.99,0);arm.shoulder.add(arm.hand);arm.hand.position.y=-ARM_LENGTH;
   const limb=new T.Mesh(armGeometry,material(color));limb.position.y=-(ARM_LENGTH-.06)/2;limb.userData.clothContact='sleeve';arm.shoulder.add(limb);
   sphere(arm.hand,.082,[0,0,0],skin).scale.set(.082,.088,.078);
  }
  // Hidden by zero scale (not visibility) so batched musicians never show it.
  this.finger=new T.Mesh(fingerGeometry,material(skin));this.finger.position.set(...FINGER_OFFSET);this.finger.scale.setScalar(0);this.rightHand.add(this.finger);
  for(const [side,hip]of [[-1,this.leftLeg],[1,this.rightLeg]] as const){hip.position.set(side*.115,.55,0);
   const dress=(leg:T.Mesh)=>{leg.userData.garment=wearsSkirt?'stocking':'trousers';if(!wearsSkirt)leg.userData.clothContact='trousers';};
   // Everyone has a knee, so visitors and musicians alike sit with their shins down in front of the chair.
   {const r=wearsSkirt?.065:.085,colour=wearsSkirt?skin:0x242329,knee=new T.Group();
    // Same overall length as the straight leg (foot at −0.49); a round knee like the shoulders hides the joint.
    dress(cylinder(hip,r,.25,[0,-.125,0],colour));knee.position.set(0,-.25,0);hip.add(knee);this.knees.push(knee);
    dress(sphere(knee,r,[0,0,0],colour));dress(cylinder(knee,r,.2,[0,-.1,0],colour));sphere(knee,.12,[0,-.24,-.045],0x2b2422).scale.set(.11,.075,.155);}
  }
  // Existing materials share a broad character fill; cloth, skin and hair keep distinct responses.
  this.head.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material))o.material=frontLitMaterial(o.material,o.userData.hairPart?'hair':'head');});
  this.root.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){
   const cloth=o.userData.clothContact as ClothContact|undefined;
   if(cloth)prepareClothContact(o.geometry,cloth);
   o.material=frontLitMaterial(o.material,cloth?'cloth':'body');
  }});
  if(!instrument){this.fork=buildFork();this.fork.scale.setScalar(0);this.forkBite=new T.Mesh(new T.IcosahedronGeometry(.028,1),new T.MeshStandardMaterial({roughness:.6}));this.forkBite.position.set(0,.01,-.15);this.fork.add(this.forkBite);this.rightHand.add(this.fork);this.wineGlass=buildWineGlass();this.wineGlass.position.set(-.07,-.03,-.05);this.wineGlass.scale.setScalar(0);this.rightHand.add(this.wineGlass);this.coffeeCup=buildCoffeeCup();this.rightHand.add(this.coffeeCup);this.macaron=buildMacaron();this.macaron.scale.setScalar(0);this.leftHand.add(this.macaron);}
  const shadow=new T.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;this.root.add(shadow);
  if(instrument){buildInstrument(instrument,this.instrument,this.leftHand,this.rightHand);if(FLOOR_INSTRUMENTS.has(instrument)){this.root.add(this.instrument);this.instrument.userData.floorAnchored=true;if(instrument==='cello')this.instrument.position.y=.64;}if(instrument==='conductor'||JAZZ_HALL&&instrument==='piano')santaHat(this.head);/* the big band's leader plays the piano */}
 }
 /** Orchestra bodies are settled once; only the head and rigid arms need live transforms. */
 settlePose(sitting:boolean){this.sitAmount=sitting?1:0;this.update(0,0,sitting,false,null,10,0);for(const group of [this.head,this.leftArm,this.rightArm])group.userData.animated=true;}
 /** Each arm is one rigid piece: rotate only at the shoulder, never stretch or bend. */
 private aimAt(arm:Arm,x:number,y:number,z:number,weight=1){this.direction.set(x,y,z).sub(arm.shoulder.position).normalize();this.armRotation.setFromUnitVectors(DOWN,this.direction);arm.shoulder.quaternion.slerp(this.armRotation,weight);}
 /** Reach for the cat's actual head in world space, regardless of the approach direction. */
 pet(point:T.Vector3,time:number,reduced:boolean){
  const lean=.65;this.tilt.set(-lean,0,0);this.hipOffset.copy(HIP).applyEuler(this.tilt);
  this.body.rotation.copy(this.tilt);this.body.position.set(-this.hipOffset.x,HIP.y-this.hipOffset.y,-this.hipOffset.z);
  for(const leg of [this.leftLeg,this.rightLeg])leg.rotation.set(lean,0,0);
  this.head.rotation.set(-.2,0,0);
  this.direction.copy(point);this.body.worldToLocal(this.direction);const {x,y,z}=this.direction;
  this.aimAt(this.right,x,y+(reduced?0:Math.sin(time*9)*.025),z);
  this.rightHand.quaternion.copy(this.rightArm.quaternion).invert();
 }
 holdingCoffee=false;private coffeeCup?:T.Group;holdingMacaron=false;macaronBites=0;private macaron?:T.Group;
 holdingCandle=false;
 /** Train passengers wave with the opposite hand. */
 trainPassenger=false;
 /** Colour of the forkful while this visitor eats a dinner dish (null: not dining). The fork is shown only while eating. */
 diningBite:number|null=null;
 /** Holding the dinner wine glass (only while sipping); it drinks exactly like the lobby coffee. */
 holdingWine=false;private wineGlass?:T.Group;private faceFront?:number;private fork?:T.Group;private forkBite?:T.Mesh;
 update(time:number,speed:number,sitting:boolean,performing:boolean,gesture?:Gesture|null,gestureAge=10,dt=1/60,cameraFacing?:CameraFacing){
  this.rightHand.position.set(0,-ARM_LENGTH,0);this.leftHand.position.set(0,-ARM_LENGTH,0);
  const leftSleeve=this.leftArm.children.find(o=>o instanceof T.Mesh) as T.Mesh|undefined;if(leftSleeve){leftSleeve.scale.y=1;leftSleeve.position.y=-(ARM_LENGTH-.06)/2;}
  const sleeve=this.rightArm.children.find(o=>o instanceof T.Mesh) as T.Mesh|undefined;if(sleeve){sleeve.scale.y=1;sleeve.position.y=-(ARM_LENGTH-.06)/2;}
  const t=time+this.phase,play=performing?1:0,type=this.instrumentType;this.sitAmount=T.MathUtils.damp(this.sitAmount,sitting?1:0,12,dt);
  const pose=poseVillager({time,speed,sit:this.sitAmount,music:performing,musician:!!type,gesture,age:gestureAge,cameraFacing},this.phase),sit=pose.sit;
  if(this.trainPassenger&&gesture==='wave'&&pose.left){
   const [x,y,z]=pose.left;pose.right=[-x,y,z];pose.left=null;pose.sway=-pose.sway;pose.headRoll=-pose.headRoll;
  }
  // At the dinner table the body leans in to reach the middle of the plate, then sits back up as the fork rises.
  if(gesture==='eat'&&this.diningBite!=null)pose.lean=.24*pose.weight*(1-T.MathUtils.smoothstep(gestureAge,.75,1.3));
  // Bend around the hips: the body pivots at the hip joint and the legs counter-rotate, so the feet stay put.
  if(!type&&!gesture)pose.sway=0;
  this.tilt.set(-pose.lean,pose.turn,pose.sway);this.hipOffset.copy(HIP).applyEuler(this.tilt);
  // Preserve the seated hip offset throughout the gesture.
  const rise=this.sitAmount-sit;
  // Leaning sideways rises onto the lower foot so neither foot sinks into the floor.
  this.body.position.set(-this.hipOffset.x,sit*.1+pose.lift+HIP.y-this.hipOffset.y+.115*Math.abs(Math.sin(pose.sway))*(1-sit),-sit*.12-rise*.5-this.hipOffset.z);this.body.rotation.copy(this.tilt);
  if(this.skirt){this.skirt.morphTargetInfluences![0]=sit;this.skirt.rotation.set(0,-pose.turn,(1-sit)*Math.sin(t*5)*Math.min(.035,speed*.012));}
  this.head.rotation.set(-pose.headPitch,pose.turn?pose.headYaw:0,pose.turn?pose.headRoll:0);for(const eye of this.eyes.children){const mesh=eye as T.Mesh;if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[0]=1-pose.blink;}
  // A seated cellist opens the knees around the instrument instead of kicking through it.
  const splay=type==='cello'?.75*sit:0;
  for(const [hip,sign]of [[this.leftLeg,1],[this.rightLeg,-1]] as const){hip.position.set(-sign*.115*Math.cos(pose.turn),.55,-sign*.115*Math.sin(pose.turn));hip.rotation.order='YXZ';hip.rotation.set(T.MathUtils.lerp(pose.swing*.5*sign,Math.PI/2,sit)+pose.lean*(1-sit),splay*sign-pose.turn,-pose.sway);}
  // Seated, the knees bend so the shins hang straight down in front of the chair.
  for(const knee of this.knees)knee.rotation.x=-Math.PI/2*sit;
  // Resting arms are held out on a diagonal (less when seated).
  const spread=T.MathUtils.lerp(.42,.16,sit);
  this.leftArm.rotation.set(-pose.swing*.34,0,-spread);this.rightArm.rotation.set(pose.swing*.34,0,spread);
  // Floor-standing keyboards and harps must not rise with the seated torso.
  // Floor instruments belong to the root, so the body can sway without lifting their feet.
  // Long bow strokes with a slight arc, and a vibrato in the left hand, so playing reads from far away.
  if(type==='violin'||type==='viola'){this.aimAt(this.left,-.41,1.08+Math.sin(t*9)*.008*play,-.46);this.aimAt(this.right,.10+Math.sin(t*2.8)*.08*play,1.04,-.38);}
  if(type==='cello'||type==='bass'){this.aimAt(this.left,-.11,1.02+Math.sin(t*8)*.015*play,-.35);this.aimAt(this.right,.2+Math.sin(t*2.6)*.16*play,.86+Math.cos(t*2.6)*.05*play,-.35);}
  // Jazz bass is plucked: the left hand high on the neck, the right pulling the strings in a walking pulse.
  if(type==='bass'&&JAZZ_HALL){const pluck=Math.max(0,Math.sin(t*6.2));this.aimAt(this.left,-.2,1.42+Math.sin(t*3.1)*.03*play,-.3);this.aimAt(this.right,-.04+pluck*.05*play,.9+pluck*.03*play,-.5);}
  if(type==='flute'||type==='piccolo'){this.aimAt(this.left,-.08,1.1,-.33);this.aimAt(this.right,.23,1.07,-.37);}
  if(type&&['oboe','english-horn','clarinet','bass-clarinet','bassoon','contrabassoon','horn','trumpet','trombone','tuba','alto-sax','tenor-sax','bari-sax'].includes(type)){this.aimAt(this.left,-.12,.99,-.36);this.aimAt(this.right,.14,.92,-.37);}
  if(type==='guitar'){this.aimAt(this.left,-.4,1.02+Math.sin(t*5)*.01*play,-.3);this.aimAt(this.right,.12+Math.sin(t*7)*.03*play,.8+Math.sin(t*7)*.05*play,-.34);}
  // Jazz drumming: sticks held up, the right hand riding the cymbal in a swing pattern, the left dropping light snare accents.
  if(type==='drum-kit'){const ride=Math.pow(Math.abs(Math.sin(t*5.2)),3),snare=Math.pow(Math.max(0,Math.sin(t*2.6+1)),6);this.aimAt(this.left,-.2,1.12-snare*.16*play,-.42);this.aimAt(this.right,.36,1.2-ride*.1*play,-.45);}
  if(type&&PERCUSSION.includes(type)){this.aimAt(this.left,-.24,.92+Math.max(0,Math.sin(t*4))*.22*play,-.37);this.aimAt(this.right,.24,.92+Math.max(0,Math.sin(t*4+Math.PI))*.22*play,-.37);}
  if(type==='piano'){this.aimAt(this.left,-.2+Math.sin(t*1.6)*.06*play,.95+Math.sin(t*3.2)*.05*play,-.6);this.aimAt(this.right,.2+Math.cos(t*1.6)*.06*play,.95+Math.cos(t*3.2)*.05*play,-.6);}
  if(type==='harp'||type==='celesta'){this.aimAt(this.left,-.2+Math.sin(t*1.6)*.06*play,.9+Math.sin(t*3.2)*.06*play,-.38);this.aimAt(this.right,.2+Math.cos(t*1.6)*.06*play,.9+Math.cos(t*3.2)*.06*play,-.38);}
  if(type==='conductor'){
   // A big, sweeping beat: the right hand draws the bar pattern high in front, the left shapes the phrase.
   const u=t*2.2;
   this.aimAt(this.right,.45+Math.sin(u)*.32*play,1.18+(Math.abs(Math.sin(u*2))*.42-.12)*play,-.25-Math.cos(u)*.08*play);
   this.aimAt(this.left,-.45-Math.sin(u+.7)*.22*play,1.12+Math.sin(u*.5)*.3*play,-.22);
  }
  // The left hand carries the candle; backward greetings and hush use the free right hand.
  if(this.wineGlass){this.wineGlass.scale.setScalar(this.holdingWine?WINE_SCALE:0);this.wineGlass.rotation.x=0;}
  if(this.coffeeCup){this.coffeeCup.scale.setScalar(this.holdingCoffee?1:0);this.coffeeCup.rotation.x=0;}
  if(this.macaron){
   // Each bite takes a whole half away at once, the moment it reaches the mouth.
   this.macaron.scale.setScalar(this.holdingMacaron?1:0);
   const eaten=gesture==='eat'&&gestureAge<MACARON_BITE_AT?this.macaronBites-1:this.macaronBites;
   const [first,second]=this.macaron.userData.halves as T.Object3D[];first.scale.setScalar(eaten>=1?0:1);second.scale.setScalar(eaten>=2?0:1);
  }
  if(this.holdingMacaron&&!type)this.aimAt(this.left,-.23,.96,-.3);
  if(this.holdingCoffee&&!type)this.aimAt(this.right,.20,.96,-.30);
  if(this.holdingCandle&&!type)this.aimAt(this.left,-.1,.93,-.3);
  if(pose.weight>0&&(type||gesture!=='ovation'&&gesture!=='shh')){if(pose.left)this.aimAt(this.left,...pose.left,pose.weight);if(pose.right)this.aimAt(this.right,...pose.right,pose.weight);}
  if(gesture==='ovation'&&pose.weight>0&&!type){
   // Use the arm on the side of the turn, and blend through the switch.
   const usualLeft=T.MathUtils.smoothstep(cameraFacing?.turn??-1,.02,.24);
   const left=this.trainPassenger?1-usualLeft:usualLeft;
   for(const [arm,side,weight] of [[this.left,-1,left],[this.right,1,1-left]] as const){
    if(!weight)continue;
    const wave=Math.sin(gestureAge*7)*.035;
    this.direction.set(side*(.48+wave),1.22,-.16);
    this.aimAt(arm,this.direction.x,this.direction.y,this.direction.z,pose.weight*weight);
   }
  }
  const vessel=this.holdingWine?this.wineGlass:this.holdingCoffee?this.coffeeCup:undefined;
  if(gesture==='drink'&&vessel&&pose.weight>0&&!type){
   // Raise the drink first, tilt back for the sip, then straighten before lowering it.
   const sip=T.MathUtils.smoothstep(gestureAge,.38,.9)*(1-T.MathUtils.smoothstep(gestureAge,1.6,2.3));
   this.head.rotation.x+=.46*sip;
   vessel.rotation.x=.28*pose.weight+.4*sip;
   const rimHeight=this.holdingWine?.175*WINE_SCALE:.14;
   const rimRadius=this.holdingWine?.036*WINE_SCALE:.078;
   const rim=new T.Vector3(0,rimHeight,rimRadius).applyQuaternion(vessel.quaternion).add(vessel.position);
   this.direction.set(0,-.13,faceSurfaceZ(0,-.13)-.008).applyQuaternion(this.head.quaternion).add(this.head.position).sub(rim);
   const reach=T.MathUtils.lerp(ARM_LENGTH,this.direction.distanceTo(this.rightArm.position),pose.weight);
   this.aimAt(this.right,this.direction.x,this.direction.y,this.direction.z,pose.weight);this.rightHand.position.y=-reach;
   if(sleeve){sleeve.scale.y=reach/ARM_LENGTH;sleeve.position.y=-(reach-.06)/2;}
  }
  if(gesture==='eat'&&this.holdingMacaron&&this.macaron&&pose.weight>0&&!type){
   // One quick nod as the bite is taken.
   const chomp=Math.sin(Math.PI*T.MathUtils.clamp((gestureAge-MACARON_BITE_AT+.12)/.32,0,1));this.head.rotation.x+=chomp*.22;
   this.direction.set(0,-.13,faceSurfaceZ(0,-.13)-.045).applyQuaternion(this.head.quaternion).add(this.head.position).sub(this.macaron.position);
   const reach=T.MathUtils.lerp(ARM_LENGTH,this.direction.distanceTo(this.leftArm.position),pose.weight);
   this.aimAt(this.left,this.direction.x,this.direction.y,this.direction.z,pose.weight);this.leftHand.position.y=-reach;
   if(leftSleeve){leftSleeve.scale.y=reach/ARM_LENGTH;leftSleeve.position.y=-(reach-.06)/2;}
  }
  // Dinner: the right hand lifts the fork with one piece on it to the mouth; the piece goes at the bite, as the macaron does.
  if(this.fork&&this.forkBite){
   const dining=gesture==='eat'&&this.diningBite!==null&&!type&&pose.weight>0;this.fork.scale.setScalar(dining?1:0);
   if(dining){
    (this.forkBite.material as T.MeshStandardMaterial).color.setHex(this.diningBite!);this.forkBite.visible=gestureAge>.6&&gestureAge<MACARON_BITE_AT;
    const chomp=Math.sin(Math.PI*T.MathUtils.clamp((gestureAge-MACARON_BITE_AT+.12)/.32,0,1));this.head.rotation.x+=chomp*.22;
    // The hand stops a fork's length out in front of the mouth, a little to the right and barely lower, so the fork
    // comes in level from the front (never up through the chin); its tines and the piece point straight at the lips.
    // The lips sit on the real front of the face (measured once in head space from its meshes, hair excluded; the face
    // looks along the head's −z), a
    // little below centre; head.matrix carries its position, turn and enlarged scale into body space.
    if(this.faceFront===undefined){this.root.updateMatrixWorld(true);const toHead=this.head.matrixWorld.clone().invert(),box=new T.Box3(),part=new T.Box3();
     this.head.traverse(o=>{if(o instanceof T.Mesh&&!o.userData.hairPart){o.geometry.computeBoundingBox();box.union(part.copy(o.geometry.boundingBox!).applyMatrix4(toHead.clone().multiply(o.matrixWorld)));}});
     this.faceFront=Number.isFinite(box.min.z)?box.min.z:-.3;}
    const mouth=new T.Vector3(0,-.1,this.faceFront-.02).applyMatrix4(this.head.matrix);
    // Out from the face along the way it looks (head centre → lips, level), a little to the side and lower.
    const out=mouth.clone().sub(this.head.position);out.y=0;out.normalize();const across=new T.Vector3(-out.z,0,out.x);
    this.direction.copy(mouth).addScaledVector(out,.12).addScaledVector(across,.21).add(new T.Vector3(0,-.12,0));
    // First the fork dips to the plate to pick the piece up, then it rises to the mouth.
    // The plate's centre is 0.82 m in front of the seat and its food 0.96 m above the seat height (see DinnerDishes):
    // the fork's tip lands there, the hand a little nearer and higher.
    this.body.updateMatrix();const centre=new T.Vector3(0,.96,-.82).applyMatrix4(new T.Matrix4().copy(this.body.matrix).invert());
    const lift=T.MathUtils.smoothstep(gestureAge,.75,1.3),plate=centre.clone().add(new T.Vector3(.07,.1,.1));
    this.direction.lerpVectors(plate,this.direction,lift);
    const reach=T.MathUtils.lerp(ARM_LENGTH,T.MathUtils.clamp(this.direction.distanceTo(this.rightArm.position),.12,ARM_LENGTH*1.1),pose.weight);
    this.aimAt(this.right,this.direction.x,this.direction.y,this.direction.z,pose.weight);this.rightHand.position.y=-reach;
    if(sleeve){sleeve.scale.y=reach/ARM_LENGTH;sleeve.position.y=-(reach-.06)/2;}
    this.root.updateMatrixWorld(true);const lips=this.body.localToWorld(mouth.clone().lerp(centre,1-lift)),at=this.fork.getWorldPosition(new T.Vector3());
    this.fork.lookAt(at.multiplyScalar(2).sub(lips));
   }
  }
  this.finger.scale.setScalar(0);
  this.finger.quaternion.identity();
  if(gesture==='shh'&&pose.weight>0&&!type){
   // Choose from the camera target before the head starts turning.
   // The animated mouth position would raise the right hand first on every gesture.
   this.direction.set(0,-.14,faceSurfaceZ(0,-.14)-.012).applyQuaternion(this.head.quaternion).add(this.head.position);
   const left=T.MathUtils.smoothstep(cameraFacing?.turn??0,.02,.24);
   const mouthX=this.direction.x,mouthY=this.direction.y,mouthZ=this.direction.z;
   for(const [arm,side,weight] of [[this.left,-1,left],[this.right,1,1-left]] as const){
    if(!weight)continue;
    this.direction.set(side*FINGER_OFFSET[0],FINGER_OFFSET[1],FINGER_OFFSET[2]).applyQuaternion(this.head.quaternion);
    const fingerX=this.direction.x,fingerY=this.direction.y,fingerZ=this.direction.z;
    this.direction.set(mouthX-fingerX,mouthY-fingerY,mouthZ-fingerZ);
    const blend=pose.weight*weight;
    const reach=T.MathUtils.lerp(ARM_LENGTH,T.MathUtils.clamp(this.direction.distanceTo(arm.shoulder.position),.28,ARM_LENGTH),blend);
    this.aimAt(arm,this.direction.x,this.direction.y,this.direction.z,blend);
    arm.hand.position.y=-reach;
    const armSleeve=side<0?leftSleeve:sleeve;
    if(armSleeve){armSleeve.scale.y=(reach-.06)/(ARM_LENGTH-.06);armSleeve.position.y=-(reach-.06)/2;}
    if(weight>.5){
     if(this.finger.parent!==arm.hand)arm.hand.add(this.finger);
     this.finger.position.set(fingerX,fingerY,fingerZ);
     this.finger.quaternion.copy(this.head.quaternion);
     this.finger.scale.setScalar(T.MathUtils.smoothstep(pose.weight,.6,1)*T.MathUtils.smoothstep(weight,.5,1));
    }
   }
  }
  this.icon=pose.icon;this.iconAlpha=pose.iconAlpha;
  // Mittens stay rounded and tools keep their body-space orientation.
  for(const arm of [this.left,this.right])arm.hand.quaternion.copy(arm.shoulder.quaternion).invert();
 }
}

// The tube is tapered after construction, so both LODs must apply the same vertex shaping.
const santaProfile=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(.015,.19,0),new T.Vector3(.12,.35,0),new T.Vector3(.26,.29,0)]);
function santaHatGeometry(segments:number,radial:number){
 const geometry=new T.TubeGeometry(santaProfile,segments,1,radial,false),positions=geometry.getAttribute('position');
 for(let i=0;i<positions.count;i++){const t=Math.floor(i/(radial+1))/segments,center=santaProfile.getPointAt(t),r=.31*(1-t)+.016;positions.setXYZ(i,center.x+(positions.getX(i)-center.x)*r,center.y+(positions.getY(i)-center.y)*r,center.z+(positions.getZ(i)-center.z)*r);}
 geometry.computeVertexNormals();return geometry;
}
const santaHatNear=santaHatGeometry(14,16),santaHatFar=santaHatGeometry(8,8);
function santaHat(head:T.Group){
 const hat=new T.Group();hat.position.set(0,.4,.045);hat.userData.costume='santa-hat';head.add(hat);
 const cone=new T.Mesh(santaHatNear,material(0xa91e2d));cone.userData.lowDetail=santaHatFar;hat.add(cone);
 const brim=new T.Mesh(new T.TorusGeometry(.30,.055,8,32),material(0xfff4e3));brim.rotation.x=Math.PI/2;hat.add(brim);sphere(hat,.085,[.26,.29,0],0xfff4e3);
}
