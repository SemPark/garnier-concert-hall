import * as T from 'three';
import {box,cylinder,sphere,material} from '../scene/primitives';
import {buildInstrument} from '../orchestra/instruments';
import {poseVillager,type Icon} from './villager';
import type {Gesture} from '../../shared/gestures';
export type Instrument='violin'|'viola'|'cello'|'bass'|'harp'|'piano'|'celesta'|'flute'|'piccolo'|'oboe'|'english-horn'|'clarinet'|'bass-clarinet'|'bassoon'|'contrabassoon'|'horn'|'trumpet'|'trombone'|'tuba'|'bass-drum'|'snare'|'cymbals'|'sleigh-bells'|'triangle'|'chimes'|'gong'|'timpani'|'xylophone'|'marimba'|'vibraphone'|'conductor';
export type HairStyle='man'|'bun'|'bob';
type Arm={shoulder:T.Group;hand:T.Group};
export const PERCUSSION:readonly Instrument[]=['bass-drum','snare','cymbals','sleigh-bells','triangle','chimes','gong','timpani','xylophone','marimba','vibraphone'];
const ARM_LENGTH=.4,HIP=new T.Vector3(0,.55,0),DOWN=new T.Vector3(0,-1,0);
const shadowGeometry=new T.CircleGeometry(.36,20),shadowMaterial=new T.MeshBasicMaterial({color:0x18100a,transparent:true,opacity:.2,depthWrite:false});
// One shared bell-shaped body for every character, so batching keeps one instance group.
// The top stays broad so the arms meet the body without shoulder pads.
const bellGeometry=new T.LatheGeometry([[0,0],[.27,0],[.285,.04],[.27,.17],[.255,.33],[.245,.46],[.225,.53],[.15,.57],[0,.585]].map(([x,y])=>new T.Vector2(x,y)),16);
// Rounded arm ends tuck into the body instead of showing a flat cut or a ball joint.
const armGeometry=new T.CapsuleGeometry(.066,ARM_LENGTH-.13,4,10);
// A short, chubby index finger for the hush gesture.
const fingerGeometry=new T.CapsuleGeometry(.024,.07,4,8);
/** Index finger seat on the right mitten: thumb side, toward the face, rising above the knuckles. */
export const FINGER_OFFSET=[-.035,.105,-.045] as const;
export function musicianSits(type:Instrument|undefined){return !!type&&type!=='bass'&&type!=='conductor'&&!PERCUSSION.includes(type);}
export class Avatar{
 readonly appearance:'woman'|'man';readonly hair:HairStyle;
 readonly root=new T.Group();readonly body=new T.Group();readonly head=new T.Group();readonly eyes=new T.Group();
 readonly leftArm=new T.Group();readonly rightArm=new T.Group();readonly leftHand=new T.Group();readonly rightHand=new T.Group();
 readonly finger:T.Mesh;readonly leftLeg=new T.Group();readonly rightLeg=new T.Group();readonly instrument=new T.Group();phase=0;instrumentType?:Instrument;
 /** Head-top icon of the current gesture, for the emote layer. */
 icon:Icon|null=null;iconAlpha=0;
 private sitAmount=0;private left:Arm;private right:Arm;
 private direction=new T.Vector3();private armRotation=new T.Quaternion();private hipOffset=new T.Vector3();private tilt=new T.Euler();
 constructor(color=0x252733,instrument?:Instrument,variant=0){
  this.appearance=variant%8>=4?'woman':'man';this.hair=this.appearance==='man'?'man':variant%2?'bun':'bob';
  this.instrumentType=instrument;this.root.add(this.body);this.body.add(this.head,this.leftArm,this.rightArm,this.leftLeg,this.rightLeg,this.instrument);
  const skin=[0xf2c8a2,0xe5b48d,0xf7d5b4,0xd49e78][variant%4],hair=[0x3b2c27,0x5a3423,0x232022,0xb4552a][Math.floor(variant/2)%4],cheek=0xf0938a;
  // Bell body with a small white collar, like a village resident.
  const torso=new T.Mesh(bellGeometry,material(color));torso.position.y=.47;torso.scale.z=.78;this.body.add(torso);
  sphere(this.body,.13,[0,1.02,-.055],0xf6efe0).scale.set(.15,.045,.11);
  if(this.appearance==='man')box(this.body,[.075,.06,.03],[0,.96,-.165],0xa23c3c);else sphere(this.body,.04,[0,.97,-.16],0xe8b647);
  // Big round head with dot eyes, catch-lights, blush and a button nose.
  this.head.position.y=1.26;// The skull sits a little above the neck so raised shoulders clear the chin.
  const skull=sphere(this.head,.35,[0,.03,0],skin);skull.scale.set(.37,.345,.35);
  for(const side of [-1,1]){sphere(this.head,.07,[side*.345,-.03,0],skin);sphere(this.head,.06,[side*.2,-.105,-.29],cheek).scale.set(.065,.04,.03);}
  this.head.add(this.eyes);
  for(const side of [-1,1]){const eye=sphere(this.eyes,.05,[side*.115,-.025,-.315],0x231c1a);eye.scale.set(.045,.058,.03);sphere(this.eyes,.016,[side*.1,0,-.336],0xffffff);}
  sphere(this.head,.04,[0,-.085,-.345],0xe8a77f).scale.set(.042,.03,.03);sphere(this.head,.03,[0,-.165,-.322],0x7a3b33).scale.set(.045,.014,.02);
  // The hair cap fully covers the crown, back and sides of the raised skull; the face stays clear.
  const cap=sphere(this.head,.365,[0,.08,.05],hair);cap.scale.set(.39,.33,.38);
  if(this.hair==='man')sphere(this.head,.15,[.13,.2,-.21],hair).scale.set(.2,.09,.13);
  else{
   sphere(this.head,.15,[-.12,.19,-.22],hair).scale.set(.2,.09,.13);
   if(this.hair==='bob'){for(const side of [-1,1])sphere(this.head,.15,[side*.31,.06,-.01],hair).scale.set(.08,.16,.19);sphere(this.head,.23,[0,-.04,.22],hair).scale.set(.31,.29,.18);}
   else sphere(this.head,.15,[0,.24,.29],hair);
  }
  this.left={shoulder:this.leftArm,hand:this.leftHand};this.right={shoulder:this.rightArm,hand:this.rightHand};
  for(const [side,arm]of [[-1,this.left],[1,this.right]] as const){
   arm.shoulder.position.set(side*.29,.99,0);arm.shoulder.add(arm.hand);arm.hand.position.y=-ARM_LENGTH;
   const limb=new T.Mesh(armGeometry,material(color));limb.position.y=-(ARM_LENGTH-.06)/2;arm.shoulder.add(limb);
   sphere(arm.hand,.082,[0,0,0],skin).scale.set(.082,.088,.078);
  }
  // Hidden by zero scale (not visibility) so batched musicians never show it.
  this.finger=new T.Mesh(fingerGeometry,material(skin));this.finger.position.set(...FINGER_OFFSET);this.finger.scale.setScalar(0);this.rightHand.add(this.finger);
  for(const [side,hip]of [[-1,this.leftLeg],[1,this.rightLeg]] as const){hip.position.set(side*.115,.55,0);cylinder(hip,.085,.42,[0,-.21,0],0x3d3a3f);sphere(hip,.12,[0,-.49,-.045],0x2b2422).scale.set(.11,.075,.155);}
  const shadow=new T.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;this.root.add(shadow);
  if(instrument)buildInstrument(instrument,this.instrument,this.leftHand,this.rightHand);
 }
 /** Orchestra bodies are settled once; only the head and rigid arms need live transforms. */
 settlePose(sitting:boolean){this.sitAmount=sitting?1:0;this.update(0,0,sitting,false,null,10,0);for(const group of [this.head,this.leftArm,this.rightArm])group.userData.animated=true;}
 /** Each arm is one rigid piece: rotate only at the shoulder, never stretch or bend. */
 private aimAt(arm:Arm,x:number,y:number,z:number,weight=1){this.direction.set(x,y,z).sub(arm.shoulder.position).normalize();this.armRotation.setFromUnitVectors(DOWN,this.direction);arm.shoulder.quaternion.slerp(this.armRotation,weight);}
 update(time:number,speed:number,sitting:boolean,performing:boolean,gesture?:Gesture|null,gestureAge=10,dt=1/60){
  const t=time+this.phase,play=performing?1:0,type=this.instrumentType;this.sitAmount=T.MathUtils.damp(this.sitAmount,sitting?1:0,12,dt);
  const pose=poseVillager({time,speed,sit:this.sitAmount,music:performing,musician:!!type,gesture,age:gestureAge},this.phase),sit=pose.sit;
  // Bend around the hips: the body pivots at the hip joint and the legs counter-rotate, so the feet stay put.
  this.tilt.set(-pose.lean,0,pose.sway);this.hipOffset.copy(HIP).applyEuler(this.tilt);
  // Rising for an ovation steps forward off the cushion instead of standing inside the chair.
  const rise=this.sitAmount-sit;
  // Leaning sideways rises onto the lower foot so neither foot sinks into the floor.
  this.body.position.set(-this.hipOffset.x,sit*.1+pose.lift+HIP.y-this.hipOffset.y+.115*Math.abs(Math.sin(pose.sway))*(1-sit),-sit*.12-rise*.5-this.hipOffset.z);this.body.rotation.copy(this.tilt);
  this.head.rotation.set(-pose.headPitch,pose.headYaw,pose.headRoll);this.eyes.scale.y=pose.blink;
  for(const [hip,sign]of [[this.leftLeg,1],[this.rightLeg,-1]] as const)hip.rotation.set(T.MathUtils.lerp(pose.swing*.5*sign,Math.PI/2,sit)+pose.lean,0,-pose.sway);
  this.leftArm.rotation.set(-pose.swing*.34,0,-.1);this.rightArm.rotation.set(pose.swing*.34,0,.1);
  // Floor-standing keyboards and harps must not rise with the seated torso.
  if(type==='piano'||type==='celesta'||type==='harp')this.instrument.position.y=-sit*.1;
  if(type==='violin'||type==='viola'){this.aimAt(this.left,-.15,1.04,-.35);this.aimAt(this.right,.17+Math.sin(t*2.8)*.055*play,.94,-.38);}
  if(type==='cello'||type==='bass'){this.aimAt(this.left,-.11,1.02,-.35);this.aimAt(this.right,.2+Math.sin(t*2.8)*.05*play,.86,-.35);}
  if(type==='flute'||type==='piccolo'){this.aimAt(this.left,-.08,1.1,-.33);this.aimAt(this.right,.23,1.07,-.37);}
  if(type&&['oboe','english-horn','clarinet','bass-clarinet','bassoon','contrabassoon','horn','trumpet','trombone','tuba'].includes(type)){this.aimAt(this.left,-.12,.99,-.36);this.aimAt(this.right,.14,.92,-.37);}
  if(type&&PERCUSSION.includes(type)){this.aimAt(this.left,-.24,.88+Math.sin(t*3.2)*.08*play,-.37);this.aimAt(this.right,.24,.88+Math.cos(t*3.2)*.08*play,-.37);}
  if(type==='harp'||type==='piano'||type==='celesta'){this.aimAt(this.left,-.2,.9+Math.sin(t*3.2)*.025*play,-.38);this.aimAt(this.right,.2,.9+Math.cos(t*3.2)*.025*play,-.38);}
  if(type==='conductor'){this.aimAt(this.left,-.6,1.08+Math.sin(t*2.2)*.12*play,-.2);this.aimAt(this.right,.6,1.13+Math.cos(t*2.2)*.13*play,-.2);}
  if(pose.weight>0){if(pose.left)this.aimAt(this.left,...pose.left,pose.weight);if(pose.right)this.aimAt(this.right,...pose.right,pose.weight);}
  this.icon=pose.icon;this.iconAlpha=pose.iconAlpha;
  // The finger rises only once the hand has reached the chin.
  this.finger.scale.setScalar(gesture==='shh'?T.MathUtils.smoothstep(pose.weight,.6,1):0);
  // Mittens stay rounded and tools keep their body-space orientation.
  for(const arm of [this.left,this.right])arm.hand.quaternion.copy(arm.shoulder.quaternion).invert();
 }
}
