import * as T from 'three';
import {box,cylinder,sphere,material} from '../scene/primitives';
import {buildInstrument} from '../orchestra/instruments';
export type Instrument='violin'|'viola'|'cello'|'bass'|'harp'|'piano'|'celesta'|'flute'|'piccolo'|'oboe'|'english-horn'|'clarinet'|'bass-clarinet'|'bassoon'|'contrabassoon'|'horn'|'trumpet'|'trombone'|'tuba'|'bass-drum'|'snare'|'cymbals'|'sleigh-bells'|'triangle'|'chimes'|'gong'|'timpani'|'xylophone'|'conductor';
type Arm={shoulder:T.Group;hand:T.Group};
export const PERCUSSION:readonly Instrument[]=['bass-drum','snare','cymbals','sleigh-bells','triangle','chimes','gong','timpani','xylophone'];
const ARM_LENGTH=.4,DOWN=new T.Vector3(0,-1,0);
const shadowGeometry=new T.CircleGeometry(.35,20),shadowMaterial=new T.MeshBasicMaterial({color:0x18100a,transparent:true,opacity:.2,depthWrite:false});
const skirtGeometry=new T.CylinderGeometry(.205,.28,.25,12);
export function musicianSits(type:Instrument|undefined){return !!type&&type!=='bass'&&type!=='conductor'&&!PERCUSSION.includes(type);}
export class Avatar{
 readonly appearance:'woman'|'man';
 readonly root=new T.Group();readonly body=new T.Group();readonly head=new T.Group();
 readonly leftArm=new T.Group();readonly rightArm=new T.Group();readonly leftHand=new T.Group();readonly rightHand=new T.Group();
 readonly leftLeg=new T.Group();readonly rightLeg=new T.Group();readonly instrument=new T.Group();phase=0;instrumentType?:Instrument;
 private sitAmount=0;private left:Arm;private right:Arm;
 private direction=new T.Vector3();private armRotation=new T.Quaternion();
 constructor(color=0x252733,instrument?:Instrument,variant=0){
  this.appearance=variant%8>=4?'woman':'man';
  this.instrumentType=instrument;this.root.add(this.body);this.body.add(this.head,this.leftArm,this.rightArm,this.leftLeg,this.rightLeg,this.instrument);
  const skin=[0xe6b793,0xd9ab87,0xf0c6a2,0xc59675][variant%4],hair=[0x382c28,0x534037,0x302b2a,0x9a7350][variant%4];
  const torso=cylinder(this.body,.23,.48,[0,.78,0],color);torso.scale.x=.26;torso.scale.z=.19;
  box(this.body,[.13,.25,.025],[0,.87,-.19],0xf3e8cf);if(this.appearance==='man')box(this.body,[.08,.055,.025],[0,.94,-.211],0x1e1a1c);
  this.head.position.y=1.26;sphere(this.head,.35,[0,0,0],skin);const cap=sphere(this.head,.355,[0,.1,.04],hair);cap.scale.y*=.75;
  if(this.appearance==='woman'){
   for(const side of [-1,1])sphere(this.head,.15,[side*.285,-.11,-.02],hair).scale.set(.115,.3,.22);
   sphere(this.head,.15,[.14,.18,-.19],hair).scale.set(.19,.1,.15);
   sphere(this.head,.23,[0,-.03,.22],hair).scale.set(.3,.28,.18);
   if(variant%2)sphere(this.head,.14,[0,.1,.36],hair);else sphere(this.head,.13,[0,-.2,.28],hair).scale.y*=1.5;
   const skirt=new T.Mesh(skirtGeometry,material(color));skirt.position.y=.59;this.body.add(skirt);
  }
  for(const side of [-1,1]){sphere(this.head,.075,[side*.34,-.025,0],skin);const eye=sphere(this.head,.022,[side*.115,-.035,-.329],0x302a27);eye.scale.y*=1.25;}sphere(this.head,.035,[0,-.09,-.344],skin);
  this.left={shoulder:this.leftArm,hand:this.leftHand};this.right={shoulder:this.rightArm,hand:this.rightHand};
  for(const [side,arm]of [[-1,this.left],[1,this.right]] as const){
   arm.shoulder.position.set(side*.29,.99,0);arm.shoulder.add(arm.hand);arm.hand.position.y=-ARM_LENGTH;
   sphere(arm.shoulder,.076,[0,0,0],color);cylinder(arm.shoulder,.067,ARM_LENGTH-.04,[0,-(ARM_LENGTH-.04)/2,0],color);
   sphere(arm.hand,.066,[0,0,0],skin).scale.multiply(new T.Vector3(.9,1.08,.85));
  }
  for(const [side,hip]of [[-1,this.leftLeg],[1,this.rightLeg]] as const){hip.position.set(side*.115,.55,0);cylinder(hip,.08,.44,[0,-.22,0],color);box(hip,[.17,.1,.25],[0,-.49,-.045],0x242323);}
  const shadow=new T.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;this.root.add(shadow);
  if(instrument)buildInstrument(instrument,this.instrument,this.leftHand,this.rightHand);
 }
 /** Each arm is one rigid piece: rotate only at the shoulder, never stretch or bend. */
 private aimAt(arm:Arm,x:number,y:number,z:number,weight=1){this.direction.set(x,y,z).sub(arm.shoulder.position).normalize();this.armRotation.setFromUnitVectors(DOWN,this.direction);arm.shoulder.quaternion.slerp(this.armRotation,weight);}
 update(time:number,speed:number,sitting:boolean,performing:boolean,gesture?:'wave'|'clap'|null,gestureAge=10,dt=1/60){
  const t=time+this.phase,walk=Math.sin(t*8)*Math.min(speed/2.8,1),play=performing?1:0;this.sitAmount=T.MathUtils.damp(this.sitAmount,sitting?1:0,12,dt);const sit=this.sitAmount;
  this.body.position.set(0,sit*.1+Math.abs(walk)*.025*(1-sit),-sit*.12);this.body.rotation.z=0;this.head.rotation.z=Math.sin(t*1.3)*.02;
  for(const [hip,sign]of [[this.leftLeg,1],[this.rightLeg,-1]] as const)hip.rotation.set(T.MathUtils.lerp(walk*.45*sign,Math.PI/2,sit),0,0);
  this.leftArm.rotation.set(-walk*.28,0,-.06);this.rightArm.rotation.set(walk*.28,0,.06);
  const type=this.instrumentType;
  if(type==='violin'||type==='viola'){this.aimAt(this.left,-.15,1.04,-.35);this.aimAt(this.right,.17+Math.sin(t*2.8)*.055*play,.94,-.38);}
  if(type==='cello'||type==='bass'){this.aimAt(this.left,-.11,1.02,-.35);this.aimAt(this.right,.2+Math.sin(t*2.8)*.05*play,.86,-.35);}
  if(type==='flute'||type==='piccolo'){this.aimAt(this.left,-.08,1.1,-.33);this.aimAt(this.right,.23,1.07,-.37);}
  if(type&&['oboe','english-horn','clarinet','bass-clarinet','bassoon','contrabassoon','horn','trumpet','trombone','tuba'].includes(type)){this.aimAt(this.left,-.12,.99,-.36);this.aimAt(this.right,.14,.92,-.37);this.body.rotation.z=Math.sin(t*1.4)*.018*play;}
  if(type&&PERCUSSION.includes(type)){this.aimAt(this.left,-.24,.88+Math.sin(t*3.2)*.08*play,-.37);this.aimAt(this.right,.24,.88+Math.cos(t*3.2)*.08*play,-.37);}
  if(type==='harp'||type==='piano'||type==='celesta'){this.aimAt(this.left,-.2,.9+Math.sin(t*3.2)*.025*play,-.38);this.aimAt(this.right,.2,.9+Math.cos(t*3.2)*.025*play,-.38);}
  if(type==='conductor'){this.aimAt(this.left,-.6,1.08+Math.sin(t*2.2)*.12*play,-.2);this.aimAt(this.right,.6,1.13+Math.cos(t*2.2)*.13*play,-.2);}
  const weight=T.MathUtils.smoothstep(gestureAge,0,.25)*(1-T.MathUtils.smoothstep(gestureAge,2.3,2.8));
  if(weight>0){if(gesture==='wave'){const y=.93+Math.sin(gestureAge*10)*.18;this.aimAt(this.left,-.68,y,-.035,weight);this.aimAt(this.right,.68,y,-.035,weight);}if(gesture==='clap'){const d=.08+.18*(.5+.5*Math.cos(gestureAge*13.5));this.aimAt(this.left,-d,.94,-.30,weight);this.aimAt(this.right,d,.94,-.30,weight);}}
  // Mittens stay rounded and tools keep their body-space orientation.
  for(const arm of [this.left,this.right])arm.hand.quaternion.copy(arm.shoulder.quaternion).invert();
 }
}
