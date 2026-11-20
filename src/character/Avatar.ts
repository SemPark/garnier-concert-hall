import {turnForHighFive,type HighFivePose} from './highFivePose';
import {buildTeaCup} from './TeaCup';
import {buildFork,buildWineGlass,WINE_SCALE} from '../scene/DinnerDishes';
import {JAZZ_HALL} from '../../shared/hallKind';
import {buildCoffeeCup,buildMacaron} from './CoffeeCup';
import {faceGeometry,faceFarGeometry,faceSurfaceZ,paintFace} from './Face';
import {buildJazzGown,JAZZ_BLONDE,styleJazzHair} from './JazzVocalist';
import {skirtGeometry} from './Skirt';
import type {Outfit} from '../../shared/wardrobe';
import * as T from 'three';
import {box,cylinder,sphere,material} from '../scene/primitives';
import {frontLitMaterial,prepareClothContact,type ClothContact} from './characterLight';
import {buildInstrument} from '../orchestra/instruments';
import {greetingTarget,poseVillager,type CameraFacing,type Icon} from './villager';
import type {Gesture} from '../../shared/gestures';
export type Instrument='violin'|'viola'|'cello'|'bass'|'harp'|'piano'|'celesta'|'flute'|'piccolo'|'oboe'|'english-horn'|'clarinet'|'bass-clarinet'|'bassoon'|'contrabassoon'|'horn'|'trumpet'|'trombone'|'tuba'|'bass-drum'|'snare'|'cymbals'|'sleigh-bells'|'triangle'|'chimes'|'gong'|'timpani'|'xylophone'|'marimba'|'vibraphone'|'alto-sax'|'tenor-sax'|'bari-sax'|'guitar'|'drum-kit'|'conductor'|'vocals';
export type HairStyle='short'|'long';
type Arm={shoulder:T.Group;hand:T.Group;elbow?:T.Group;sleeve?:T.Mesh;captainSleeve?:T.BufferGeometry};
export const PERCUSSION:readonly Instrument[]=['bass-drum','snare','cymbals','sleigh-bells','triangle','chimes','gong','timpani','xylophone','marimba','vibraphone'];
const ARM_LENGTH=.4,HIP=new T.Vector3(0,.55,0),DOWN=new T.Vector3(0,-1,0);
const THIGH_LENGTH=.25,SHIN_LENGTH=.24;
const LEG_REACH=THIGH_LENGTH+SHIN_LENGTH;
const danceFeet=[new T.Vector3(),new T.Vector3()],danceShoulders=new T.Vector3(),danceTilt=new T.Vector3();
const hushElbowGuide=new T.Vector3();
const ankleDirection=new T.Vector3(),kneeDirection=new T.Vector3(),thighDirection=new T.Vector3(),inverseBody=new T.Quaternion();
export const AVATAR_HEAD_HEIGHT=1.318;
const SHOULDER_X=.16,SHOULDER_Y=.99;
export {ARM_LENGTH as DANCE_ARM_LENGTH,SHOULDER_X as DANCE_SHOULDER_X,SHOULDER_Y as DANCE_SHOULDER_Y};
const captainAim=new T.Vector3(),captainElbow=new T.Vector3(),captainOutside=new T.Vector3();
const captainRotation=new T.Quaternion(),captainForearm=new T.Quaternion();
const CAPTAIN_UPPER=.216,CAPTAIN_LOWER=.203;
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
export const FLOOR_INSTRUMENTS=new Set<Instrument>(['cello','bass','harp','piano','celesta','timpani','bass-drum','gong','snare','chimes','xylophone','marimba','vibraphone','drum-kit','vocals']);
const SLEEVE_RADIUS=.066;
const armGeometry=new T.CapsuleGeometry(SLEEVE_RADIUS,ARM_LENGTH-.13,4,10);
const SLEEVE_CENTER_Y=-(ARM_LENGTH-.06)/2;
const captainSleeveRest=new T.CapsuleGeometry(SLEEVE_RADIUS,ARM_LENGTH-.13,4,10,12);
const sleevePoint=new T.Vector3(),sleeveNormal=new T.Vector3(),sleeveCenter=new T.Vector3();
const bentSleeveCenter=new T.Vector3(),sleeveBend=new T.Quaternion();

/** Deform one continuous sleeve around the elbow while preserving each ring's radius. */
function bendCaptainSleeve(geometry:T.BufferGeometry,elbow:T.Quaternion,lengthScale:number){
 const rest=captainSleeveRest.getAttribute('position');
 const restNormals=captainSleeveRest.getAttribute('normal');
 const positions=geometry.getAttribute('position');
 const normals=geometry.getAttribute('normal');
 for(let i=0;i<rest.count;i++){
  const fromElbow=(rest.getY(i)+SLEEVE_CENTER_Y+CAPTAIN_UPPER)*lengthScale;
  const blend=1-T.MathUtils.smoothstep(fromElbow,-SLEEVE_RADIUS,SLEEVE_RADIUS);
  sleeveBend.identity().slerp(elbow,blend);
  sleeveCenter.set(0,fromElbow,0);
  bentSleeveCenter.copy(sleeveCenter).applyQuaternion(elbow);
  sleeveCenter.lerp(bentSleeveCenter,blend);
  sleevePoint.set(rest.getX(i),0,rest.getZ(i)).applyQuaternion(sleeveBend).add(sleeveCenter);
  sleeveNormal.fromBufferAttribute(restNormals,i).applyQuaternion(sleeveBend);
  positions.setXYZ(i,sleevePoint.x,sleevePoint.y-CAPTAIN_UPPER*lengthScale-SLEEVE_CENTER_Y,sleevePoint.z);
  normals.setXYZ(i,sleeveNormal.x,sleeveNormal.y,sleeveNormal.z);
 }
 positions.needsUpdate=true;
 normals.needsUpdate=true;
}
const BAD_ELBOW_START=.10,BAD_ELBOW_ARC=.14;
const badBendAxis=new T.Vector3(0,0,1),badPitchAxis=new T.Vector3(1,0,0);
const badShoulderTarget=new T.Quaternion(),badShoulderCorrection=new T.Quaternion(),badHandTarget=new T.Vector3();

function badArmPose(upper:T.Vector3,out:T.Vector3,elbowDegrees:number){
 const up=upper.normalize().negate();
 out.projectOnPlane(up).normalize();
 const shoulder=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(out,up,new T.Vector3().crossVectors(out,up)));
 const angle=T.MathUtils.degToRad(elbowDegrees),hand=new T.Vector3(0,-ARM_LENGTH,0);
 bendBadSleeve(hand,angle);
 return {shoulder,angle,hand};
}
const badArmHigh=badArmPose(new T.Vector3(.60,-.58,-.55),new T.Vector3(.71,.21,.66),110);
const badArmLow=badArmPose(new T.Vector3(.27,-.88,-.40),new T.Vector3(.87,.03,.49),70);
let badSleeveGeometry:T.CapsuleGeometry|undefined;

/** Round the existing sleeve around the BAD pose's elbow, in shoulder-local space. */
function bendBadSleeve(point:T.Vector3,elbowAngle:number){
 const offset=-point.y-BAD_ELBOW_START;
 const arc=T.MathUtils.clamp(offset,0,BAD_ELBOW_ARC);
 const angle=arc/BAD_ELBOW_ARC*elbowAngle,c=Math.cos(angle),s=Math.sin(angle);
 const radius=BAD_ELBOW_ARC/elbowAngle,straight=offset-arc;
 point.set(point.x*c+radius*(c-1)-straight*s,-BAD_ELBOW_START-radius*s-straight*c-point.x*s,point.z);
 return angle;
}

function createBadSleeve(){
 const geometry=new T.CapsuleGeometry(.066,ARM_LENGTH-.13,4,10,10);
 prepareClothContact(geometry,'sleeve');
 const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal');
 const point=new T.Vector3(),normal=new T.Vector3();
 geometry.morphAttributes.position=[];
 geometry.morphAttributes.normal=[];
 for(const pose of [badArmHigh,badArmLow]){
  const bentPositions=positions.clone(),bentNormals=normals.clone();
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).y+=SLEEVE_CENTER_Y;
   const angle=bendBadSleeve(point,pose.angle);
   normal.fromBufferAttribute(normals,i).applyAxisAngle(badBendAxis,-angle);
   bentPositions.setXYZ(i,point.x,point.y-SLEEVE_CENTER_Y,point.z);
   bentNormals.setXYZ(i,normal.x,normal.y,normal.z);
  }
  geometry.morphAttributes.position.push(bentPositions);
  geometry.morphAttributes.normal.push(bentNormals);
 }
 return geometry;
}
// A short, chubby index finger for the hush gesture.
const forkBiteGeometry=new T.IcosahedronGeometry(.028,1);
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
function buildLongHair(cols:number,dome:number,hang:number,bob=false){
 const [,cy,cz]=LONG_HAIR_CENTER,[rx,ry,rz]=LONG_HAIR_RADIUS,fold=3,depth=.12;
 const {smoothstep,lerp}=T.MathUtils,positions:number[]=[],index:number[]=[];
 let ring=0;
 for(let j=0;j<=cols;j++){
  const phi=-Math.PI+2*Math.PI*j/cols,turn=Math.abs(phi),sx=Math.sin(phi),sz=Math.cos(phi);
  // 0 behind the head, 1 beside the ears, then 1 again toward the face where the hair tucks in.
  const side=smoothstep(turn,.7,1.35),face=smoothstep(turn,1.75,2.4);
  const back=bob?.44+.022*Math.cos(phi*5):.7+.045*Math.cos(phi*5);
  const length=lerp(lerp(back,.38,side),bob?.035:.22,face);
  const frontLift=bob?.135*face:0;
  const temple=bob?smoothstep(turn,1.2,1.63)*(1-smoothstep(turn,1.83,2.4)):0;
  // Spread: a slight fullness at ear height and a gentle taper to the ends. Above the face the dome simply carries
  // on round into the head, like the men's cap, so the forehead line has no brim.
  const spread=(t:number)=>lerp(1+.02*(1-Math.cos(Math.min(t/.3,1)*Math.PI))-.16*(t/length)**2,Math.sqrt(Math.max(0,1-(t/ry)**2)),face);
  const put=(k:number,y:number)=>{
   const atHairline=1-smoothstep(y,cy,cy+ry);
   // Bring the bob forward at the temples, underneath the front waves.
   const templeForward=.17*temple*(.53*k+.47*atHairline);
   const height=y+frontLift*atHairline;
   const depth=cz+sz*rz*k-templeForward;
   // Across the forehead the rear volume meets both waves at one depth.
   // Tuck only the bottom of that edge into the head.
   const frontEdge=-.272+.076*(1-smoothstep(height,.25,.33));
   positions.push(sx*rx*k,height,bob?Math.max(depth,frontEdge):depth);
  };
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
 const face=(a:number,b:number,c:number)=>{if(bob||!(buried(a)&&buried(b)&&buried(c)))index.push(a,b,c);};
 for(let j=0;j<cols;j++)for(let i=0;i<ring-1;i++){const a=j*ring+i,b=a+ring;face(a,a+1,b);face(b,a+1,b+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(index);return fitHairToFace(geometry);
}
// Far-away listeners get a coarser copy of the same shape.
const longHairGeometry=buildLongHair(24,7,8),longHairFar=buildLongHair(12,4,4);
const bobGeometry=buildLongHair(28,8,7,true),bobFar=buildLongHair(14,4,4,true);

/** Index finger seat on the right mitten: thumb side, toward the face, rising above the knuckles. */
export const FINGER_OFFSET=[-.035,.125,.035] as const;
/** In the jazz hall the trumpets stand on the back tier, as a big band's do. */
export function musicianSits(type:Instrument|undefined){return !!type&&type!=='bass'&&type!=='conductor'&&type!=='vocals'&&!PERCUSSION.includes(type)&&!(JAZZ_HALL&&type==='trumpet');}
export class Avatar{
 readonly appearance:'woman'|'man';readonly hair:HairStyle;
 readonly root=new T.Group();readonly body=new T.Group();readonly head=new T.Group();readonly eyes=new T.Group();
 readonly leftArm=new T.Group();readonly rightArm=new T.Group();readonly leftHand=new T.Group();readonly rightHand=new T.Group();
 readonly finger:T.Mesh;readonly leftLeg=new T.Group();readonly rightLeg=new T.Group();private readonly knees:T.Group[]=[];private readonly shoes:T.Mesh[]=[];readonly instrument=new T.Group();phase=0;instrumentType?:Instrument;
 /** Head-top icon of the current gesture, for the emote layer. */
 icon:Icon|null=null;iconAlpha=0;
 private sitAmount=0;private left:Arm;private right:Arm;private danceFeetPosed=false;
 private direction=new T.Vector3();private armRotation=new T.Quaternion();private hipOffset=new T.Vector3();private tilt=new T.Euler();
 private readonly vocalMouth?:T.Mesh;
 readonly variant:number;readonly skirt:T.Mesh|null;
 constructor(color=0x252733,instrument?:Instrument,variant=0,readonly outfit?:Outfit){this.variant=variant;
  const vocalist=instrument==='vocals';
  this.appearance=vocalist||variant%8>=4?'woman':'man';this.hair=this.appearance==='woman'&&!vocalist?'long':'short';
  this.instrumentType=instrument;this.root.add(this.body);this.body.add(this.head,this.leftArm,this.rightArm,this.leftLeg,this.rightLeg,this.instrument);
  const skin=0xf9cfcc,hair=[0x3b2c27,0x5a3423,0x232022,0xb4552a,0xb88a48,0x7e6b5c,0x553f32,0xaaa59b][Math.floor(variant/8)%8];
  // Narrow body with a plain neckline and a very short skin-coloured neck.
  const torso=new T.Mesh(bellGeometry,material(color));torso.position.y=.47;torso.scale.set(.82,1,.72);torso.userData.clothContact='torso';
  if(vocalist)buildJazzGown(this.body,color,skin);
  else{
   this.body.add(torso);
   if(this.appearance==='man')box(this.body,[.075,.06,.045],[0,.96,-.1775],0xa23c3c);else sphere(this.body,.04,[0,.97,-.16],0xe8b647);
  }
  // Big round head with dot eyes, catch-lights, blush and a button nose.
  cylinder(this.body,.08,.02,[0,1.005,0],skin).userData.facePart='neck';
  this.head.position.y=AVATAR_HEAD_HEIGHT;// Lower the head into the neckline for both appearances.
  const skull=new T.Mesh(faceGeometry,material(skin));skull.position.y=.03;skull.scale.set(.37,.345,.35);skull.userData.lowDetail=faceFarGeometry;this.head.add(skull);// Blush and mouth sit on this surface, not in front of it.
  const mouth=paintFace(this.head,this.eyes,vocalist);
  if(vocalist)this.vocalMouth=mouth;
  sphere(this.head,.04,[0,-.075,faceSurfaceZ(0,-.075)-.015],0xe8a77f).scale.set(.035,.025,.023);
  if(vocalist){
   const bob=new T.Mesh(bobGeometry,material(JAZZ_BLONDE));
   bob.userData.hairPart='bob';
   bob.userData.lowDetail=bobFar;
   this.head.add(bob);
   styleJazzHair(this.head);
  }
  else if(this.hair==='short'){const cap=new T.Mesh(shortHairGeometry,material(hair));cap.userData.lowDetail=shortHairFar;cap.userData.hairPart='cap';this.head.add(cap);}
  else{const long=new T.Mesh(longHairGeometry,material(hair));long.userData.hairPart='long';long.userData.lowDetail=longHairFar;this.head.add(long);}
  const wearsSkirt=this.appearance==='woman'&&!instrument;
  this.skirt=wearsSkirt?new T.Mesh(skirtGeometry,material(color)):null;
  if(this.skirt){this.skirt.position.y=.78;this.skirt.scale.z=.87;this.skirt.userData.garment='skirt';this.skirt.userData.clothContact='skirt';this.body.add(this.skirt);}
  // Every visiting man wears the dress shirt and lapels; the cloakroom outfit only changes the colour.
  if((outfit||!instrument)&&this.appearance==='man'){const shirt=garmentPatch(this.body,torso,.15,.23,0,.84,0xf4efe5);shirt.userData.garment='dress-shirt';shirt.userData.clothContact='plain';for(const side of [-1,1]){const lapel=box(this.body,[.055,.28,.09],[side*.105,.86,-.15],color);lapel.rotation.z=side*.23;lapel.userData.garment='lapel';lapel.userData.clothContact='plain';}}
  this.left={shoulder:this.leftArm,hand:this.leftHand};this.right={shoulder:this.rightArm,hand:this.rightHand};
  for(const [side,arm]of [[-1,this.left],[1,this.right]] as const){
   // Arms start inside the torso, so the top of the arm is buried in the body instead of hanging beside it.
   arm.shoulder.position.set(side*SHOULDER_X,SHOULDER_Y,0);arm.shoulder.add(arm.hand);arm.hand.position.y=-ARM_LENGTH;
   const limb=new T.Mesh(armGeometry,material(vocalist?skin:color));limb.position.y=SLEEVE_CENTER_Y;if(!vocalist)limb.userData.clothContact='sleeve';arm.shoulder.add(limb);arm.sleeve=limb;
   sphere(arm.hand,.082,[0,0,0],skin).scale.set(.082,.088,.078);
  }
  // Hidden by zero scale (not visibility) so batched musicians never show it.
  this.finger=new T.Mesh(fingerGeometry,material(skin));this.finger.position.set(...FINGER_OFFSET);this.finger.scale.setScalar(0);this.rightHand.add(this.finger);
  // The floor-length gown covers the legs and follows the standing pose.
  if(!vocalist)for(const [side,hip]of [[-1,this.leftLeg],[1,this.rightLeg]] as const){hip.position.set(side*.115,.55,0);
   const dress=(leg:T.Mesh)=>{leg.userData.garment=wearsSkirt?'stocking':'trousers';if(!wearsSkirt)leg.userData.clothContact='trousers';};
   // Everyone has a knee, so visitors and musicians alike sit with their shins down in front of the chair.
   {const r=wearsSkirt?.065:.085,colour=wearsSkirt?skin:0x242329,knee=new T.Group();
    // Same overall length as the straight leg (foot at −0.49); a round knee like the shoulders hides the joint.
    dress(cylinder(hip,r,THIGH_LENGTH,[0,-THIGH_LENGTH/2,0],colour));knee.position.y=-THIGH_LENGTH;hip.add(knee);this.knees.push(knee);
    dress(sphere(knee,r,[0,0,0],colour));dress(cylinder(knee,r,.2,[0,-.1,0],colour));
    const shoe=sphere(knee,.12,[0,-SHIN_LENGTH,-.045],0x2b2422);shoe.scale.set(.11,.075,.155);this.shoes.push(shoe);}
  }
  // Existing materials share a broad character fill; cloth, skin and hair keep distinct responses.
  this.head.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material))o.material=frontLitMaterial(o.material,o.userData.hairPart?'hair':'head');});
  this.root.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){
   const cloth=o.userData.clothContact as ClothContact|undefined;
   if(cloth)prepareClothContact(o.geometry,cloth);
   o.material=frontLitMaterial(o.material,cloth?'cloth':'body');
  }});
  if(!instrument){this.fork=buildFork();this.fork.scale.setScalar(0);this.forkBite=new T.Mesh(forkBiteGeometry,new T.MeshStandardMaterial({roughness:.6}));this.forkBite.position.set(0,.01,-.15);this.fork.add(this.forkBite);this.rightHand.add(this.fork);this.wineGlass=buildWineGlass();this.wineGlass.position.set(-.07,-.03,-.05);this.wineGlass.scale.setScalar(0);this.rightHand.add(this.wineGlass);this.coffeeCup=buildCoffeeCup();this.rightHand.add(this.coffeeCup);this.teaCup=buildTeaCup();this.teaCup.position.set(-.13,-.08,-.035);this.teaCup.rotation.y=Math.PI;this.teaCup.scale.setScalar(0);this.rightHand.add(this.teaCup);this.macaron=buildMacaron();this.macaron.scale.setScalar(0);this.leftHand.add(this.macaron);}
  const shadow=new T.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;this.root.add(shadow);
  if(instrument){buildInstrument(instrument,this.instrument,this.leftHand,this.rightHand);if(FLOOR_INSTRUMENTS.has(instrument)){this.root.add(this.instrument);this.instrument.userData.floorAnchored=true;if(instrument==='cello')this.instrument.position.y=.64;}}
  if(instrument==='conductor'||vocalist)santaHat(this.head,vocalist);
 }
 /** Orchestra bodies are settled once; only the head and rigid arms need live transforms. */
 disposeDanceSleeves(){
  this.left.captainSleeve?.dispose();
  this.right.captainSleeve?.dispose();
 }

 settlePose(sitting:boolean){this.sitAmount=sitting?1:0;this.update(0,0,sitting,false,null,10,0);for(const group of [this.head,this.leftArm,this.rightArm])group.userData.animated=true;}
 /** Shift the pelvis under the shoulders while both feet take weight on the floor. */
 poseFlossHips(sway:number,weight:number){
  this.captureDanceFeet(weight);
  danceShoulders.set(0,this.leftArm.position.y,0).applyQuaternion(this.body.quaternion);
  this.body.rotateY(-sway*.24);
  this.body.rotateZ(sway*.34);
  this.body.position.add(danceShoulders.sub(danceTilt.set(0,this.leftArm.position.y,0).applyQuaternion(this.body.quaternion)));
  this.body.position.x+=sway*.045;
  this.body.position.y-=weight*(.05+.026*Math.abs(sway));
  this.head.rotation.z-=sway*.28;
  this.head.rotation.y+=sway*.17;
  this.plantDanceFeet(weight);
 }

 poseJointedArm(side:-1|1,target:T.Vector3,elbowGuide:T.Vector3,wristRoll:number,wristWeight:number,weight:number,lengthScale=1){
  const arm=side<0?this.left:this.right;
  if(!arm.elbow){
   const elbow=new T.Group();
   elbow.position.y=-CAPTAIN_UPPER;
   arm.elbow=elbow;
   arm.shoulder.add(elbow);
   arm.captainSleeve=captainSleeveRest.clone();
   prepareClothContact(arm.captainSleeve,'sleeve');
   for(const name of ['position','normal']){
    const attribute=arm.captainSleeve.getAttribute(name);
    if(attribute instanceof T.BufferAttribute)attribute.setUsage(T.DynamicDrawUsage);
   }
   arm.captainSleeve.userData.bentSleeve=true;
   // A conservative bound fits both the straight and bent sleeve.
   arm.captainSleeve.boundingSphere=new T.Sphere(new T.Vector3(),ARM_LENGTH+SLEEVE_RADIUS);
  }

  const elbow=arm.elbow;
  const upper=CAPTAIN_UPPER*lengthScale,lower=CAPTAIN_LOWER*lengthScale;
  elbow.position.y=-upper;
  const sleeve=arm.sleeve!;
  if(sleeve.geometry!==arm.captainSleeve){
   sleeve.geometry=arm.captainSleeve!;
   sleeve.updateMorphTargets();
  }
  if(arm.hand.parent!==elbow)elbow.add(arm.hand);

  // Solve the elbow from two fixed lengths and the direction it should bend.
  captainAim.copy(DOWN).multiplyScalar(ARM_LENGTH).applyQuaternion(arm.shoulder.quaternion)
   .lerp(captainOutside.copy(target).sub(arm.shoulder.position),weight);
  const distance=captainAim.length();
  const reach=T.MathUtils.clamp(distance,.13,upper+lower-.00001);
  captainAim.divideScalar(Math.max(distance,.001));
  const along=(upper**2-lower**2+reach**2)/(2*reach);
  const bend=Math.sqrt(Math.max(0,upper**2-along**2));
  captainOutside.copy(elbowGuide).projectOnPlane(captainAim).normalize();
  captainElbow.copy(captainAim).multiplyScalar(along).addScaledVector(captainOutside,bend);

  captainRotation.setFromUnitVectors(DOWN,captainOutside.copy(captainElbow).normalize());
  captainAim.multiplyScalar(reach).sub(captainElbow).normalize();
  captainForearm.setFromUnitVectors(DOWN,captainAim);
  arm.shoulder.quaternion.copy(captainRotation);
  elbow.quaternion.copy(captainRotation.invert()).multiply(captainForearm);
  bendCaptainSleeve(sleeve.geometry,elbow.quaternion,lengthScale);
  arm.hand.position.set(0,-lower,0);
  arm.hand.rotation.set(.28*Math.sin(wristRoll)*wristWeight*weight,.9*Math.cos(wristRoll)*wristWeight*weight,0);
 }

 poseCaptain(side:number,weight:number){
  this.captureDanceFeet(weight);
  this.body.rotateY(-side*.035*weight);
  this.body.rotateX(-.07*weight);
  this.body.position.x+=side*.022*weight;
  this.body.position.y-=(.05-.018*Math.abs(side))*weight;
  this.head.rotation.y+=side*.11*weight;
  this.plantDanceFeet(weight);
 }

 poseBad(lean:number,lower:number,pop:number){
  this.captureDanceFeet(lean,-.065);
  danceShoulders.copy(HIP).applyQuaternion(this.body.quaternion);
  this.body.rotateZ(-lean*.24);
  this.body.rotateX(-pop*.22);
  this.body.position.add(danceShoulders.sub(danceTilt.copy(HIP).applyQuaternion(this.body.quaternion)));
  this.body.position.y-=lean*.035;
  this.head.rotation.z-=lean*.12;
  this.head.rotation.x+=pop*.17;
  // Let the skirt hang over the knees while the torso snaps forward.
  if(this.skirt)this.skirt.rotation.x=pop*.25;
  this.plantDanceFeet(lean);

  const sleeve=this.rightArm.children.find(child=>child instanceof T.Mesh) as T.Mesh;
  badSleeveGeometry??=createBadSleeve();
  if(sleeve.geometry!==badSleeveGeometry){sleeve.geometry=badSleeveGeometry;sleeve.updateMorphTargets();}
  const morph=sleeve.morphTargetInfluences!;
  morph[0]=lean*(1-lower);
  morph[1]=lean*lower;
  badShoulderTarget.copy(badArmHigh.shoulder).slerp(badArmLow.shoulder,lower);
  // The chest hits behind the arm while the hand follows its slower path downward.
  badShoulderTarget.premultiply(badShoulderCorrection.setFromAxisAngle(badPitchAxis,pop*.25));
  this.rightArm.quaternion.slerp(badShoulderTarget,lean);
  this.rightHand.position.lerp(badHandTarget.copy(badArmHigh.hand).lerp(badArmLow.hand,lower),lean);
 }

 private captureDanceFeet(weight:number,rightDepth=0){
  this.danceFeetPosed=true;
  for(const [i,leg] of [this.leftLeg,this.rightLeg].entries()){
   danceFeet[i].set(0,-LEG_REACH,0).applyQuaternion(leg.quaternion).add(leg.position)
    .applyQuaternion(this.body.quaternion).add(this.body.position);
   danceFeet[i].lerp(danceTilt.set(i===0?-.16:.16,.06,i===0?0:rightDepth),weight);
  }
 }

 /** Offline motion targets in root-local coordinates; reuse the existing fixed-length leg IK. */
 poseCapturedFeet(left:T.Vector3,right:T.Vector3,weight=1){
  this.captureDanceFeet(0);
  danceFeet[0].lerp(left,weight);
  danceFeet[1].lerp(right,weight);
  this.plantDanceFeet(weight);
 }

 private plantDanceFeet(weight:number){
  const legs=[this.leftLeg,this.rightLeg];
  // Lower enough to keep the leg on the far side from pulling its foot off the floor.
  let drop=0;
  for(const [i,leg] of legs.entries()){
   danceTilt.copy(leg.position).applyQuaternion(this.body.quaternion).add(this.body.position).sub(danceFeet[i]);
   const verticalReach=Math.sqrt(Math.max(0,LEG_REACH**2-danceTilt.x**2-danceTilt.z**2));
   drop=Math.max(drop,danceTilt.y-verticalReach);
  }
  this.body.position.y-=drop;
  inverseBody.copy(this.body.quaternion).invert();
  for(const [i,leg] of legs.entries()){
   // Solve the existing two leg segments toward the planted ankle, bending the knee forward.
   ankleDirection.copy(danceFeet[i]).sub(this.body.position).applyQuaternion(inverseBody).sub(leg.position);
   const reach=T.MathUtils.clamp(ankleDirection.length(),.025,LEG_REACH-.0001);
   ankleDirection.normalize();
   const along=(reach*reach+THIGH_LENGTH**2-SHIN_LENGTH**2)/(2*reach);
   kneeDirection.set(0,0,-1).addScaledVector(ankleDirection,ankleDirection.z).normalize();
   thighDirection.copy(ankleDirection).multiplyScalar(along).addScaledVector(kneeDirection,Math.sqrt(THIGH_LENGTH**2-along**2));
   leg.quaternion.setFromUnitVectors(DOWN,kneeDirection.copy(thighDirection).normalize());
   ankleDirection.multiplyScalar(reach).sub(thighDirection).normalize().applyQuaternion(this.armRotation.copy(leg.quaternion).invert());
   this.knees[i].quaternion.setFromUnitVectors(DOWN,ankleDirection);
   const shoe=this.shoes[i];
   shoe.quaternion.copy(this.body.quaternion).multiply(leg.quaternion).multiply(this.knees[i].quaternion).invert();
   shoe.quaternion.slerp(this.armRotation.identity(),1-weight);
   shoe.position.set(0,0,-.045).applyQuaternion(shoe.quaternion);
   shoe.position.y-=SHIN_LENGTH;
  }
 }
 /** Turn sideways and aim the free hand at the shared contact point. */
 highFive(pose:HighFivePose,side=pose.side){
  this.root.position.x+=pose.dx;
  this.root.position.z+=pose.dz;
  this.root.rotation.y=turnForHighFive(this.root.rotation.y,pose.yaw+Math.PI,pose.turn);
  if(pose.reach<=0)return;
  this.head.rotation.x=T.MathUtils.lerp(this.head.rotation.x,-.12,pose.reach);
  const arm=this[side];
  const point=this.body.worldToLocal(this.direction.set(pose.hand.x,pose.hand.y,pose.hand.z));
  const reach=T.MathUtils.lerp(ARM_LENGTH,T.MathUtils.clamp(point.distanceTo(arm.shoulder.position),.23,.49),pose.reach);
  this.aimAt(arm,point.x,point.y,point.z,pose.reach);
  arm.hand.position.y=-reach;
  arm.hand.quaternion.copy(arm.shoulder.quaternion).invert();
  const sleeve=arm.shoulder.children.find(child=>child instanceof T.Mesh);
  if(sleeve){sleeve.scale.y=reach/ARM_LENGTH;sleeve.position.y=-(reach-.06)/2;}
 }
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
 holdingTea=false;private teaCup?:T.Group;
 holdingCoffee=false;private coffeeCup?:T.Group;holdingMacaron=false;macaronBites=0;private macaron?:T.Group;
 holdingCandle=false;
 holdingBouquet=false;
 wishing=false;
 /** Train passengers wave with the opposite hand. */
 trainPassenger=false;
 /** Colour of the forkful while this visitor eats a dinner dish (null: not dining). The fork is shown only while eating. */
 diningBite:number|null=null;
 /** Holding the dinner wine glass (only while sipping); it drinks exactly like the lobby coffee. */
 holdingWine=false;private wineGlass?:T.Group;private faceFront?:number;private fork?:T.Group;private forkBite?:T.Mesh;
 update(time:number,speed:number,sitting:boolean|number,performing:boolean,gesture?:Gesture|null,gestureAge=10,dt=1/60,cameraFacing?:CameraFacing,keepArmJoints=false,lunarSwing?:number){
  if(!keepArmJoints)for(const arm of [this.left,this.right]){
   if(arm.hand.parent===arm.shoulder)continue;
   arm.shoulder.add(arm.hand);
   arm.hand.quaternion.identity();
   arm.sleeve!.geometry=armGeometry;
   arm.sleeve!.updateMorphTargets();
  }
  this.head.position.set(0,AVATAR_HEAD_HEIGHT,0);
  this.rightHand.position.set(0,-ARM_LENGTH,0);this.leftHand.position.set(0,-ARM_LENGTH,0);
  const leftSleeve=this.leftArm.children.find(o=>o instanceof T.Mesh) as T.Mesh|undefined;if(leftSleeve){leftSleeve.scale.y=1;leftSleeve.position.y=SLEEVE_CENTER_Y;leftSleeve.morphTargetInfluences?.fill(0);}
  const sleeve=this.rightArm.children.find(o=>o instanceof T.Mesh) as T.Mesh|undefined;
  if(sleeve){sleeve.scale.y=1;sleeve.position.y=SLEEVE_CENTER_Y;sleeve.morphTargetInfluences?.fill(0);}
  const t=time+this.phase,play=performing?1:0,type=this.instrumentType;this.sitAmount=typeof sitting==='number'?sitting:T.MathUtils.damp(this.sitAmount,sitting?1:0,12,dt);
  const pose=poseVillager({time,speed,sit:this.sitAmount,music:performing,musician:!!type,gesture,age:gestureAge,cameraFacing},this.phase),sit=pose.sit;
  const vocalPhrase=type==='vocals'&&performing
   ?T.MathUtils.smoothstep(Math.sin(t*1.15)+.32*Math.sin(t*2.6),-.42,.38)
   :0;
  if(type==='vocals'){
   pose.sway=.045*Math.sin(t*1.8)*play;
   pose.lean=.038*vocalPhrase;
   pose.headPitch=.055*vocalPhrase;
   this.vocalMouth!.morphTargetInfluences![0]=1-vocalPhrase*(.57+.39*Math.sin(t*8.4)**2);
  }
  const lunarFlex=Math.abs(lunarSwing??0)*(1-sit);
  if(lunarSwing!==undefined){
   pose.swing=lunarSwing;
   pose.lift=0;
   pose.lean+=.1*lunarFlex;
  }
  if(this.trainPassenger&&gesture==='wave'&&pose.left){
   const [x,y,z]=pose.left;pose.right=[-x,y,z];pose.left=null;pose.sway=-pose.sway;pose.headRoll=-pose.headRoll;
  }
  const turn=cameraFacing?.turn;
  let leftReach=pose.left?1:0,rightReach=pose.right?1:0;
  if(!type&&gesture==='ovation'){
   const left=T.MathUtils.smoothstep(turn??-1,.02,.24);
   leftReach=this.trainPassenger?1-left:left;rightReach=1-leftReach;
  }
  if(!type&&gesture==='shh'){
   leftReach=T.MathUtils.smoothstep(turn??0,.02,.24);rightReach=1-leftReach;
  }
  // Restore dance reach before applying the ordinary gesture pose.
  this.leftArm.scale.setScalar(1);
  this.rightArm.scale.setScalar(1);
  // Keep the sleeve attached to the original shoulder through every gesture.
  this.leftArm.position.set(-SHOULDER_X,SHOULDER_Y,0);
  this.rightArm.position.set(SHOULDER_X,SHOULDER_Y,0);
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
  const wave=gesture==='wave';
  this.head.rotation.set(-pose.headPitch,pose.turn?pose.headYaw:0,pose.turn||wave?pose.headRoll:0);
  if(wave&&pose.weight>0){
   // Nod and lean away from the lifted arm around the neck.
   const neckHeight=1.045;
   this.head.position.set(0,AVATAR_HEAD_HEIGHT-neckHeight,0).applyQuaternion(this.head.quaternion);
   this.head.position.y+=neckHeight;
  }
  for(const eye of this.eyes.children){const mesh=eye as T.Mesh;if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[0]=1-pose.blink;}
  // A seated cellist opens the knees around the instrument instead of kicking through it.
  const splay=type==='cello'?.75*sit:0;
  for(const [hip,sign]of [[this.leftLeg,1],[this.rightLeg,-1]] as const){hip.position.set(-sign*.115*Math.cos(pose.turn),.55,-sign*.115*Math.sin(pose.turn));hip.rotation.order='YXZ';hip.rotation.set(T.MathUtils.lerp(pose.swing*.5*sign,Math.PI/2,sit)+pose.lean*(1-sit),splay*sign-pose.turn,-pose.sway);}
  // Seated, the knees bend so the shins hang straight down in front of the chair.
  if(this.danceFeetPosed){
   for(const knee of this.knees)knee.rotation.set(0,0,0);
   for(const shoe of this.shoes){shoe.quaternion.identity();shoe.position.set(0,-SHIN_LENGTH,-.045);}
   this.danceFeetPosed=false;
  }
  for(const knee of this.knees)knee.rotation.x=-Math.PI/2*sit-.38*lunarFlex;
  // Resting arms are held out on a diagonal (less when seated).
  const spread=T.MathUtils.lerp(.42,.16,sit)+.24*lunarFlex;
  this.leftArm.rotation.set(-pose.swing*.34,0,-spread);this.rightArm.rotation.set(pose.swing*.34,0,spread);
  if(type==='vocals'){
   this.aimAt(this.left,-.16,.92,-.39);
   this.aimAt(this.right,.39+.05*Math.sin(t*1.8),.75+.19*vocalPhrase,-.09-.16*vocalPhrase,.2+.8*vocalPhrase);
  }
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
  if(this.teaCup){this.teaCup.scale.setScalar(this.holdingTea?1:0);this.teaCup.rotation.x=0;}
  if(this.coffeeCup){this.coffeeCup.scale.setScalar(this.holdingCoffee?1:0);this.coffeeCup.rotation.x=0;}
  if(this.macaron){
   // Each bite takes a whole half away at once, the moment it reaches the mouth.
   this.macaron.scale.setScalar(this.holdingMacaron&&!this.holdingBouquet?1:0);
   const eaten=gesture==='eat'&&gestureAge<MACARON_BITE_AT?this.macaronBites-1:this.macaronBites;
   const [first,second]=this.macaron.userData.halves as T.Object3D[];first.scale.setScalar(eaten>=1?0:1);second.scale.setScalar(eaten>=2?0:1);
  }
  if(this.holdingMacaron&&!type)this.aimAt(this.left,-.23,.96,-.3);
  if((this.holdingCoffee||this.holdingTea)&&!type)this.aimAt(this.right,.20,.96,-.30);
  if(this.holdingCandle&&!type)this.aimAt(this.left,-.1,.93,-.3);
  if(pose.weight>0&&(type||gesture!=='ovation'&&gesture!=='shh')){if(pose.left)this.aimAt(this.left,...pose.left,pose.weight);if(pose.right)this.aimAt(this.right,...pose.right,pose.weight);}
  if(gesture==='ovation'&&pose.weight>0&&!type){
   // Use the arm on the side of the turn, and blend through the switch.
   for(const [arm,side,weight] of [[this.left,-1,leftReach],[this.right,1,rightReach]] as const){
    if(!weight)continue;
    this.aimAt(arm,...greetingTarget(gestureAge,side,true),pose.weight*weight);
   }
  }
  const vessel=this.holdingTea?this.teaCup:this.holdingWine?this.wineGlass:this.holdingCoffee?this.coffeeCup:undefined;
  if(gesture==='drink'&&vessel&&pose.weight>0&&!type){
   // Raise the drink first, tilt back for the sip, then straighten before lowering it.
   const sip=T.MathUtils.smoothstep(gestureAge,.38,.9)*(1-T.MathUtils.smoothstep(gestureAge,1.6,2.3));
   this.head.rotation.x+=(this.holdingTea?.16:.46)*sip;
   vessel.rotation.x=this.holdingTea?.12*pose.weight+.22*sip:.28*pose.weight+.4*sip;
   const rimHeight=this.holdingWine?.175*WINE_SCALE:this.holdingTea?.12:.14;
   const rimRadius=this.holdingWine?.036*WINE_SCALE:this.holdingTea?.105:.078;
   // The tea handle faces the hand via a half turn: its lip nearest the face is local -z.
   // Align that lip, leaving the bowl out in front of the face throughout the sip.
   const rim=new T.Vector3(0,rimHeight,this.holdingTea?-rimRadius:rimRadius).applyQuaternion(vessel.quaternion).add(vessel.position);
   this.direction.set(0,-.13,faceSurfaceZ(0,-.13)-(this.holdingTea?.025:.008)).applyQuaternion(this.head.quaternion).add(this.head.position).sub(rim);
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
   const mouthX=this.direction.x,mouthY=this.direction.y,mouthZ=this.direction.z;
   for(const [side,weight] of [[-1,leftReach],[1,rightReach]] as const){
    if(!weight)continue;
    this.direction.set(side*FINGER_OFFSET[0],FINGER_OFFSET[1],FINGER_OFFSET[2]).applyQuaternion(this.head.quaternion);
    const fingerX=this.direction.x,fingerY=this.direction.y,fingerZ=this.direction.z;
    const blend=pose.weight*weight*T.MathUtils.smoothstep(gestureAge,.12,.75);
    // Fold the elbow below the chin while the index finger reaches the lips.
    this.direction.set(mouthX-fingerX,mouthY-fingerY,mouthZ-fingerZ-.08*(1-blend));
    hushElbowGuide.set(side*.55,-1,0);
    this.poseJointedArm(side,this.direction,hushElbowGuide,0,0,blend,T.MathUtils.lerp(.96,1,blend));
    if(weight>.5){
     const hand=side<0?this.leftHand:this.rightHand;
     if(this.finger.parent!==hand)hand.add(this.finger);
     this.finger.position.set(fingerX,fingerY,fingerZ);
     this.finger.quaternion.copy(this.head.quaternion);
     this.finger.scale.setScalar(T.MathUtils.smoothstep(blend,.6,1));
    }
   }
  }
  this.icon=pose.icon;this.iconAlpha=pose.iconAlpha;
  if(this.holdingBouquet&&!type)this.aimAt(this.left,-.38,.70,-.37);
  if(this.wishing){
   this.aimAt(this.left,-.06,.78,-.32);
   this.aimAt(this.right,.06,.78,-.32);
   this.head.rotation.x=.2;
   for(const eye of this.eyes.children){
    const mesh=eye as T.Mesh;
    if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[0]=1;
   }
  }
  // Mittens stay rounded and tools keep their body-space orientation.
  for(const arm of [this.left,this.right]){
   arm.hand.quaternion.copy(arm.shoulder.quaternion);
   if(arm.hand.parent===arm.elbow)arm.hand.quaternion.multiply(arm.elbow.quaternion);
   arm.hand.quaternion.invert();
  }
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
function santaHat(head:T.Group,vocalist:boolean){
 const hat=new T.Group();hat.position.set(0,vocalist?.47:.4,vocalist?-.075:.045);hat.userData.costume='santa-hat';head.add(hat);
 const cone=new T.Mesh(santaHatNear,material(0xa91e2d));cone.userData.lowDetail=santaHatFar;hat.add(cone);
 const brim=new T.Mesh(new T.TorusGeometry(.30,.055,8,32),material(0xfff4e3));brim.rotation.x=Math.PI/2;hat.add(brim);sphere(hat,.085,[.26,.29,0],0xfff4e3);
}
