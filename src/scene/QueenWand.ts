import * as T from 'three';

const CAST_SECONDS=2.5;
const GIFT_RELEASE_MS=520;
const GIFT_ARRIVAL_MS=1260;
export class QueenWand {
 charges=0;
 private castAt=-Infinity;
 private giftAt:number|null=null;
 private readonly giftOrigin=new T.Vector3();
 private readonly giftDestination=new T.Vector3();
 private giftOriginReady=false;
 private finalCast=false;
 private readonly wand=new T.Group();
 private readonly hearts=new T.Group();
 private readonly tip=new T.Vector3(0,.415,0);
 private readonly gold=new T.MeshStandardMaterial({color:0xd4aa61,metalness:.55,roughness:.33});
 private readonly ruby=new T.MeshBasicMaterial({color:0xff406e});
 private readonly heartGeometry:T.ExtrudeGeometry;

 constructor(){
  const shape=new T.Shape();
  shape.moveTo(0,-.075);
  shape.bezierCurveTo(-.16,.03,-.068,.13,0,.065);
  shape.bezierCurveTo(.068,.13,.16,.03,0,-.075);
  this.heartGeometry=new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false,curveSegments:8});
  const shaft=new T.Mesh(new T.CylinderGeometry(.013,.018,.48,10),this.gold);
  shaft.position.y=.15;
  const jewel=new T.Mesh(this.heartGeometry,this.ruby);
  jewel.position.y=.415;
  this.wand.add(shaft,jewel);
  for(let i=0;i<9;i++)this.hearts.add(new T.Mesh(this.heartGeometry,this.ruby));
  this.wand.visible=this.hearts.visible=false;
 }
 get receiving(){return this.giftAt!==null;}
 receive(){
  if(this.charges||this.casting||this.receiving)return;
  this.giftAt=performance.now();
  this.giftOriginReady=false;
 }
 get casting(){return performance.now()-this.castAt<CAST_SECONDS*1000;}
 award(){
  if(this.charges===0&&!this.casting)this.charges=3;
 }
 discard(){
  if(!this.charges||this.casting||this.receiving)return false;
  this.charges=0;
  this.wand.visible=false;
  return true;
 }
 cast(){
  if(!this.charges||this.casting||this.receiving)return false;
  this.finalCast=--this.charges===0;
  this.castAt=performance.now();
  return true;
 }
 update(now:number,hand:T.Group,arm:T.Group,camera:T.Camera,scene:T.Scene,reduced:boolean,queenHand?:T.Vector3){
  if(this.giftAt!==null){
   const elapsed=now-this.giftAt;
   if(elapsed<GIFT_ARRIVAL_MS){
    this.showHandoff(elapsed,hand,arm,scene,reduced,queenHand);
    return;
   }
   this.giftAt=null;
   this.award();
  }
  if(this.wand.parent!==hand)hand.add(this.wand);
  this.wand.position.set(.025,0,-.065);
  if(this.hearts.parent!==scene)scene.add(this.hearts);
  const age=(now-this.castAt)/1000;
  const casting=age>=0&&age<CAST_SECONDS;
  this.wand.visible=this.charges>0||casting&&(!this.finalCast||age<1.55);
  // The player faces local -Z. Angle the tip away from the torso and hair.
  this.wand.rotation.set(casting?-.45:-.95,0,-.23);
  this.hearts.visible=casting;
  if(!casting)return;
  const lift=reduced?1:T.MathUtils.smoothstep(age,0,.36)*(1-T.MathUtils.smoothstep(age,1.85,CAST_SECONDS));
  arm.rotation.x=T.MathUtils.lerp(arm.rotation.x,1.95,lift);
  arm.rotation.z=T.MathUtils.lerp(arm.rotation.z,.37,lift);
  hand.quaternion.copy(arm.quaternion).invert();
  this.wand.localToWorld(this.hearts.position.copy(this.tip));
  const transform=this.finalCast&&age>=1.55;
  for(const [i,heart] of this.hearts.children.entries()){
   const progress=T.MathUtils.clamp((age-i*.055)/1.7,0,1);
   heart.visible=transform?i===0:progress>0&&progress<1;
   const angle=i*2.4;
   const radius=reduced?.35:.15+progress*.65;
   heart.position.set(Math.cos(angle)*radius,.1+progress*.56,Math.sin(angle)*radius);
   heart.quaternion.copy(camera.quaternion);
   if(transform){
    heart.position.set(0,reduced?0:(age-1.55)*.45,0);
    heart.scale.setScalar(Math.max(.001,1-(age-1.55)/.95));
   }else heart.scale.setScalar(Math.sin(Math.PI*progress)*(.55+i%3*.19));
  }
 }
 private showHandoff(elapsed:number,hand:T.Group,arm:T.Group,scene:T.Scene,reduced:boolean,queenHand?:T.Vector3){
  this.hearts.visible=false;
  if(queenHand&&(elapsed<GIFT_RELEASE_MS||!this.giftOriginReady)){
   this.giftOrigin.copy(queenHand);
   this.giftOriginReady=true;
  }
  this.wand.visible=this.giftOriginReady;
  if(!this.giftOriginReady)return;
  if(this.wand.parent!==scene)scene.add(this.wand);
  const progress=T.MathUtils.smoothstep(elapsed,GIFT_RELEASE_MS,GIFT_ARRIVAL_MS);
  const reach=T.MathUtils.smoothstep(elapsed,GIFT_RELEASE_MS-160,GIFT_ARRIVAL_MS-230);
  arm.rotation.x=T.MathUtils.lerp(arm.rotation.x,1.1,reach);
  hand.quaternion.copy(arm.quaternion).invert();
  hand.getWorldPosition(this.giftDestination);
  this.wand.position.copy(this.giftOrigin).lerp(this.giftDestination,progress);
  if(!reduced)this.wand.position.y+=Math.sin(progress*Math.PI)*.36;
  this.wand.rotation.set(-.58,0,-.25);
 }
 dispose(){
  this.wand.removeFromParent();
  this.hearts.removeFromParent();
  (this.wand.children[0] as T.Mesh).geometry.dispose();
  this.heartGeometry.dispose();
  this.gold.dispose();
  this.ruby.dispose();
 }
}
