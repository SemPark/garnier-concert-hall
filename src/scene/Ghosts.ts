import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {poseVillager} from '../character/villager';
import type {Gesture} from '../../shared/gestures';
import {buildFork,buildWineGlass,WINE_SCALE} from './DinnerDishes';
import {buildCoffeeCup} from '../character/CoffeeCup';
import {buildTeaGuest,type TeaGuest} from './GhostTeaParty';

/** One ghost to draw this frame: where it is, which way it faces, and a stable id for its colour and rhythm. */
export type GhostSpot={x:number;y:number;z:number;yaw:number;id:string;sitting:boolean;
 teaGuest?:TeaGuest;
 /** Hall ghosts (not visitors) share one blue. */npc?:boolean;
 /** A visitor gesture and its age in seconds: posed with the same hand targets and body lean as the people. */gesture?:Gesture|null;age?:number;
 /** What a diner has: the drink they lift while sipping and the colour of the bite on their fork. */drink?:'coffee'|'wine';bite?:number;
 /** The ghosts above the stage: wings and a halo. */angel?:boolean;
 /** Moving right now (visitors only): steps and arm swing instead of idle floating. */walking?:boolean};

/** Soft glow colours; each ghost keeps one, chosen from its id so every viewer sees the same colour. */
const GLOWS=[0xffd24a,0xff6fa8,0xb38cff,0x6cf2a0].map(c=>new T.Color(c));
/** The hall's own ghosts are all this blue, so visitors (the other four colours) stand out from them. */
/** Head centre above the floor, standing at a visitor's head height (1.40 m); seated so the short sheet rests on the cushion (0.63 m). */
const STANDING_HEAD=1.4,SEATED_HEAD=1.36;
/** Bottom of the sheet below the head centre (a short body). */
const BOTTOM=-.72;
/** Seated ghosts sit this far forward of the seat centre so their back (0.41 m deep) stays in front of the backrest. */
const SEAT_FORWARD=.21;
const NPC_GLOW=new T.Color(0x4fa8ff);
const hash=(id:string)=>{let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);return h>>>0;};

/** Cute ghost: round dome, straight sides, a zigzag hem of pointed tips, and two stubby arms grown from the sides; faces +z. */
function body(segments:number,domeRings:number,armSides:number){
 // Sized to the visitors: head as wide as theirs (≈0.75 m), arms as long as theirs (≈0.5 m), about as tall.
 // Rings only where the outline bends (dome and hem); the straight sides are a single band.
 const R=.37,bottom=BOTTOM,hem=bottom+.17,side=(y:number)=>R+.04*(-y/-bottom);
 const points=[new T.Vector2(.001,hem-.02),new T.Vector2(.27,hem-.08),new T.Vector2(side(bottom)+.002,bottom-.02),new T.Vector2(side(hem),hem),new T.Vector2(R,0)];
 for(let i=1;i<=domeRings;i++){const a=i/domeRings*Math.PI/2;points.push(new T.Vector2(Math.max(.001,R*Math.cos(a)),R*Math.sin(a)));}
 const g=new T.LatheGeometry(points,segments),p=g.attributes.position as T.BufferAttribute;
 for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>hem)continue;const w=Math.min(1,(hem-y)/.15),lobe=Math.abs(Math.sin(4*Math.atan2(p.getX(i),p.getZ(i))));p.setY(i,y+.11*(1-Math.sqrt(lobe))*w);}
 const parts:T.BufferGeometry[]=[g];
 // Arms like the visitors' (no hands): half the sleeve sunk into the side so only a half-round shows at the shoulder,
 // reaching forward a little, slightly open.
 for(const s of [-1,1]){const arm=new T.CapsuleGeometry(.095,.32,Math.max(2,armSides-4),armSides);arm.translate(0,-.22,0);arm.rotateX(-.8);arm.rotateZ(s*.25);arm.translate(s*(R-.06),-.12,.02);parts.push(arm);}
 // aArm: 0 body, -1/1 left/right arm, so the shader can swing the arms from the shoulder.
 parts.forEach((part,i)=>{part.deleteAttribute('uv');part.setAttribute('aArm',new T.Float32BufferAttribute(new Array(part.attributes.position.count).fill(i===0?0:i===1?-1:1),1));});
 const merged=mergeGeometries(parts)!;merged.computeVertexNormals();return merged;
}

const vertex=/* glsl */`
uniform float uTime;
attribute vec3 aGlow;attribute float aSeed;attribute float aArm;attribute vec3 aLeft;attribute vec3 aRight;attribute vec3 aBody;
varying vec3 vGlow;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vView;varying float vUp;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){
 // aSeed = rhythm (fraction) + 32 when seated + 64 for a visitor + 128 while walking. Gestures arrive ready-made from
 // the people's own pose: aLeft/aRight are the directions the arms point, aBody is (bow forward, lean sideways, turn).
 float seed=fract(aSeed),flags=floor(aSeed/32.),seated=mod(flags,2.),visitor=mod(floor(flags/2.),2.),walk=floor(flags/4.);
 // Real visitors move only as their person does: no idle float or flutter, steps while walking.
 float idle=1.-visitor;
 vec3 p=position;vec3 n=normal;float below=clamp((-p.y-.4)/.3,0.,1.)*(1.-seated);
 if(seated>.5&&p.y<-.66&&aArm==0.){ // below the seat line the sheet slides forward over the cushion and drapes down like legs
  float k=smoothstep(0.,.1,-.66-p.y);p.z=p.z*mix(1.,.6,k)+.22*k;n=normalize(mix(n,vec3(0.,-.3,1.),k*.4));
 }
 if(aArm!=0.){
  vec3 pivot=vec3(aArm*.28,-.12,0.);vec3 d=p-pivot;
  float sw=walk*aArm*.5*sin(uTime*9.+seed*6.),c=cos(sw),s=sin(sw);d.yz=mat2(c,s,-s,c)*d.yz;n.yz=mat2(c,s,-s,c)*n.yz;
  // Turn the arm from where it rests to where the pose points it.
  vec3 rest=normalize(vec3(aArm*.172,-.675,.717)),to=aArm<0.?aLeft:aRight,axis=cross(rest,to);float sn=length(axis),cs=dot(rest,to);
  if(sn>1e-4){axis/=sn;d=d*cs+cross(axis,d)*sn+axis*dot(axis,d)*(1.-cs);n=n*cs+cross(axis,n)*sn+axis*dot(axis,n)*(1.-cs);}
  p=pivot+d;
 }
 // Whole body, about the hips like the people: lean sideways, turn (a seated ghost's draped hem stays on the chair), bow.
 float roll=aBody.y;
 if(roll!=0.){vec2 q=p.xy-vec2(0.,-.7);float c=cos(roll),s=sin(roll);p.xy=vec2(0.,-.7)+mat2(c,s,-s,c)*q;n.xy=mat2(c,s,-s,c)*n.xy;}
 float turn=aBody.z*(aArm!=0.?1.:mix(1.,smoothstep(-.7,-.5,position.y),seated));
 if(turn!=0.){float c=cos(turn),s=sin(turn);p.xz=mat2(c,-s,s,c)*p.xz;n.xz=mat2(c,-s,s,c)*n.xz;}
 float pitch=aBody.x;
 if(pitch!=0.){vec2 q=p.yz-vec2(-.7,0.);float c=cos(pitch),s=sin(pitch);p.yz=vec2(-.7,0.)+mat2(c,s,-s,c)*q;n.yz=mat2(c,s,-s,c)*n.yz;}
 p.x+=sin(uTime*2.1+seed*6.)*.03*below*max(idle,walk); // hem flutters
 p.y+=sin(uTime*1.5+seed*6.)*.07*(1.-seated*.8)*idle+abs(sin(uTime*9.+seed*6.))*.05*walk; // float, or steps
 vec4 world=modelMatrix*instanceMatrix*vec4(p,1.);
 vec4 mv=viewMatrix*world;gl_Position=projectionMatrix*mv;
 vLocal=position;vGlow=aGlow;vView=-mv.xyz;
 vNormal=normalize(mat3(viewMatrix)*mat3(modelMatrix)*mat3(instanceMatrix)*n);vUp=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*n).y;
 #include <logdepthbuf_vertex>
}`;
const fragment=/* glsl */`
uniform float uFace;uniform float uTime;
varying vec3 vGlow;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vView;varying float vUp;
#include <common>
#include <logdepthbuf_pars_fragment>
float dot2(vec2 a,vec2 c,vec2 r){vec2 d=(a-c)/r;return dot(d,d);}
void main(){
 #include <logdepthbuf_fragment>
 float rim=1.-max(dot(normalize(vNormal),normalize(vView)),0.);
 // A warm ivory like the hall's plaster in candlelight, lit softly from above; no glow of its own.
 vec3 c=vec3(.8,.7,.56)*(.6+.32*(.5+.5*vUp)+.08*rim);
 if(uFace>.5&&vLocal.z>0.){
  vec2 f=vLocal.xy/1.23;
  // Proportions of a classic cute ghost: big oval eyes just above the middle.
  float eye=min(dot2(f,vec2(-.1,.03),vec2(.042,.06)),dot2(f,vec2(.1,.03),vec2(.042,.06)));
  float shine=min(dot2(f,vec2(-.088,.055),vec2(.013)),dot2(f,vec2(.112,.055),vec2(.013)));
  // Crisp edges at any distance: blend over one screen pixel only.
  float e=sqrt(eye),ew=fwidth(e)+1e-4,sw=fwidth(sqrt(shine))+1e-4;
  c=mix(c,vec3(0.),1.-smoothstep(1.-ew,1.+ew,e));
  c=mix(c,vec3(1.),1.-smoothstep(1.-sw,1.+sw,sqrt(shine)));
 }
 gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
}`;

type Batch={mesh:T.InstancedMesh;glow:T.InstancedBufferAttribute;seed:T.InstancedBufferAttribute;left:T.InstancedBufferAttribute;right:T.InstancedBufferAttribute;body:T.InstancedBufferAttribute;used:number};
/** Where the ghost's arms rest (see body()), and the people's shoulders their hand targets are measured from. */
const REST=[-1,1].map(s=>new T.Vector3(s*.172,-.675,.717).normalize()),SHOULDER_X=.16,SHOULDER_Y=.99;

const GOLD=new T.MeshBasicMaterial({color:0xe6bf5a}),FEATHER=new T.MeshBasicMaterial({color:0xefe6d2,side:T.DoubleSide});
/** Where a ghost's mouth would be: on the front of the sheet, below and between the eyes (head centre is the origin, facing +z). */
export const MOUTH=new T.Vector3(0,-.1,.38);
const SHOULDER=new T.Vector3(-.28,-.12,0),ARM=.48,BACK=new T.Vector3(0,0,-1),TINES_DOWN=new T.Vector3(0,-.5,.85).normalize(),TIP=.45;
/** Hand positions: over the plate, holding a glass above the table, and where the hand must be for the fork's bite
 * (0.15 m past the hand) or the tipped rim of the glass or cup to touch MOUTH. */
// The plate's centre is 0.82 m in front of the seat, its food 0.96 m above the seat height (see DinnerDishes); a seated
// ghost's head centre is 0.21 m forward and 1.36 m up. The fork's tip (0.15 m past the hand) lands on that centre.
const PLATE_CENTRE=new T.Vector3(0,-.4,.61),PLATE_HAND=new T.Vector3(-.07,-.3,.51),REACH=.22,HIPS=new T.Vector3(0,-.7,0),X=new T.Vector3(1,0,0),
 // The cup is held by its handle (see tableware): tipped, the near rim is 0.12 m across and 0.076 m back from the hand.
 CUP_AT_MOUTH=new T.Vector3(-.12,-.102,.466),
 // Held out in front first, far enough that the mug (0.07 m radius, 0.12 m inside the hand) stays clear of the sheet.
 CUP_HAND=new T.Vector3(-.3,-.28,.47);
const GLASS_HAND=new T.Vector3(-.2,-.3,.42),FORK_AT_MOUTH=new T.Vector3(-.134,-.138,.457),
 WINE_GRIP=.11,WINE_HEIGHT=.175*WINE_SCALE,
 // The vessel tips about its foot, which hangs `grip` below the hand.
 atMouth=(height:number,grip:number)=>new T.Vector3(-.03,MOUTH.y+grip-height*Math.cos(TIP),MOUTH.z+height*Math.sin(TIP)+.02),WINE_AT_MOUTH=atMouth(WINE_HEIGHT,WINE_GRIP);
/** Fork (with a bite), wine glass and cup for a ghost's hand while it eats or drinks; the people's own models. */
function tableware(){
 const kit=new T.Group(),fork=buildFork(),bite=new T.Mesh(new T.IcosahedronGeometry(.028,1),new T.MeshStandardMaterial({roughness:.6})),wine=buildWineGlass(),cup=new T.Group(),mug=buildCoffeeCup();
 // The mug hangs from its handle (0.12 m out, 0.105 m up on the model), which sits in the hand; the body is towards the middle.
 mug.scale.setScalar(1);mug.rotation.y=Math.PI;mug.position.set(.12,-.105,0);cup.add(mug);
 bite.position.set(0,.01,-.15);fork.add(bite);wine.scale.setScalar(WINE_SCALE);wine.position.y=-WINE_GRIP;kit.add(fork,wine,cup);return {kit,fork,bite,wine,cup};
}
/** Wings and a halo for a ghost that flies over the stage; set at the ghost's head centre, facing +z. */
function angelKit(){
 const kit=new T.Group(),wing=new T.Shape();
 // A compact upper wing with three rounded feather tips.
 wing.moveTo(0,-.15);
 wing.quadraticCurveTo(.07,.27,.42,.32);
 wing.quadraticCurveTo(.77,.39,.89,.21);
 wing.quadraticCurveTo(.96,-.13,.87,-.39);
 wing.quadraticCurveTo(.81,-.51,.73,-.42);
 wing.quadraticCurveTo(.67,-.34,.68,-.22);
 wing.quadraticCurveTo(.67,-.39,.59,-.50);
 wing.quadraticCurveTo(.51,-.61,.43,-.50);
 wing.quadraticCurveTo(.36,-.42,.39,-.27);
 wing.quadraticCurveTo(.31,-.42,.24,-.46);
 wing.quadraticCurveTo(.14,-.53,.08,-.39);
 wing.quadraticCurveTo(.01,-.31,0,-.15);
 const wingGeometry=new T.ShapeGeometry(wing,6);
 const wings=[-1,1].map(side=>{
  const mesh=new T.Mesh(wingGeometry,FEATHER);
  mesh.scale.set(side*.35,.9,1);
  mesh.position.set(side*.16,-.08,-.34);
  kit.add(mesh);
  return mesh;
 });
 const halo=new T.TorusGeometry(.2,.022,6,24);halo.rotateX(Math.PI/2);halo.rotateZ(.12);halo.translate(0,.53,0);
 kit.add(new T.Mesh(halo,GOLD));
 kit.matrixAutoUpdate=true;return {kit,wings};
}

/**
 * Every other visitor is drawn as a small white ghost; only the viewer is a person. Bodies (arms included) are
 * instanced batches (near and far), so a full house costs two draw calls. Bobbing,
 * hem flutter and gestures run in the shader; the CPU only places each ghost 30 times a second.
 */
export class Ghosts{
 private readonly teaGuests=new Map<TeaGuest,ReturnType<typeof buildTeaGuest>>();
 private time={value:0};
 private near:Batch;private far:Batch;
 private updatedAt=-Infinity;private frustum=new T.Frustum();private projection=new T.Matrix4();private sphere=new T.Sphere();
 private angels:ReturnType<typeof angelKit>[]=[];private tableware:ReturnType<typeof tableware>[]=[];private l=new T.Vector3();private r=new T.Vector3();private b=new T.Vector3();private d=new T.Vector3();private hand=new T.Vector3();private qa=new T.Quaternion();private qb=new T.Quaternion();private m=new T.Matrix4();private q=new T.Quaternion();private up=new T.Vector3(0,1,0);private v=new T.Vector3();private s=new T.Vector3(1,1,1);
 constructor(private scene:T.Scene){
  const mat=(face:number)=>new T.ShaderMaterial({uniforms:{uTime:this.time,uFace:{value:face}},vertexShader:vertex,fragmentShader:fragment});
  
  this.near=this.batch(body(32,6,7),mat(1));this.far=this.batch(body(16,3,4),mat(1));
 }
 private batch(geometry:T.BufferGeometry,material:T.Material,size=64):Batch{
  const mesh=new T.InstancedMesh(geometry,material,size);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.count=0;
  const vec=()=>new T.InstancedBufferAttribute(new Float32Array(size*3),3).setUsage(T.DynamicDrawUsage) as T.InstancedBufferAttribute;
  const glow=vec(),left=vec(),right=vec(),body=vec(),seed=new T.InstancedBufferAttribute(new Float32Array(size),1);
  seed.setUsage(T.DynamicDrawUsage);geometry.setAttribute('aGlow',glow);geometry.setAttribute('aSeed',seed);geometry.setAttribute('aLeft',left);geometry.setAttribute('aRight',right);geometry.setAttribute('aBody',body);
  this.scene.add(mesh);return {mesh,glow,seed,left,right,body,used:0};
 }
 private grow(b:Batch){
  const size=b.mesh.instanceMatrix.count;if(b.used<size)return;
  const old=b.mesh,next=this.batch(old.geometry,old.material as T.Material,size*2);
  next.mesh.instanceMatrix.array.set(old.instanceMatrix.array);(next.glow.array as Float32Array).set(b.glow.array);(next.seed.array as Float32Array).set(b.seed.array);
  for(const k of ['left','right','body'] as const){(next[k].array as Float32Array).set(b[k].array);b[k]=next[k];}
  next.mesh.renderOrder=old.renderOrder;old.removeFromParent();b.mesh=next.mesh;b.glow=next.glow;b.seed=next.seed;
 }
 private put(b:Batch,matrix:T.Matrix4,glow:T.Color,seed:number){
  this.grow(b);b.mesh.setMatrixAt(b.used,matrix);b.glow.setXYZ(b.used,glow.r,glow.g,glow.b);b.seed.setX(b.used,seed);
  b.left.setXYZ(b.used,this.l.x,this.l.y,this.l.z);b.right.setXYZ(b.used,this.r.x,this.r.y,this.r.z);b.body.setXYZ(b.used,this.b.x,this.b.y,this.b.z);b.used++;
 }
 /** Point one ghost arm the way the person's arm points at the same hand target (people face −z, ghosts +z). */
 private aim(out:T.Vector3,side:number,target:readonly [number,number,number]|null,weight:number){
  out.copy(REST[side<0?0:1]);if(!target||weight<=0)return;
  this.d.set(-(target[0]+side*SHOULDER_X),target[1]-SHOULDER_Y,-target[2]).normalize();
  out.applyQuaternion(this.qb.identity().slerp(this.qa.setFromUnitVectors(out,this.d),Math.min(1,weight)));
 }
 update(ghosts:Iterable<GhostSpot>,camera:T.Camera,now=performance.now()){
  this.time.value=now/1000;
  if(now-this.updatedAt<1000/30)return;this.updatedAt=now;
  camera.updateMatrixWorld();this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  for(const b of [this.near,this.far])b.used=0;let angels=0,holding=0;const time=now/1000;
  for(const guest of this.teaGuests.values()){guest.root.visible=false;guest.cup.visible=false;}
  for(const g of ghosts){
   // Heads at the visitors' head height. Seated, that leaves only the last 0.1 m of sheet below the cushion (0.63 m);
   // it drapes over the front edge (see the vertex shader).
   if(g.sitting){this.s.set(1,1,1);this.v.set(g.x+Math.sin(g.yaw)*SEAT_FORWARD,g.y+SEATED_HEAD,g.z+Math.cos(g.yaw)*SEAT_FORWARD);}
   else{this.s.set(1,1,1);this.v.set(g.x,g.y+STANDING_HEAD,g.z);}if(!this.frustum.intersectsSphere(this.sphere.set(this.v,g.teaGuest?1.7:1)))continue;
   const h=hash(g.id),glow=g.npc?NPC_GLOW:GLOWS[h%GLOWS.length],seed=(h>>>8)%1000/1000+(g.sitting?32:0)+(g.npc?0:64)+(g.walking&&!g.sitting?128:0),distance=this.v.distanceTo(camera.position),far=distance>14;
   this.m.compose(this.v,this.q.setFromAxisAngle(this.up,g.yaw),this.s);
   this.b.set(0,0,0);
   if(g.teaGuest){
    let guest=this.teaGuests.get(g.teaGuest);
    if(!guest){guest=buildTeaGuest(g.teaGuest);this.teaGuests.set(g.teaGuest,guest);this.scene.add(guest.root,guest.cup);}
    const age=g.age??0;
    const sip=T.MathUtils.smoothstep(age,.4,1.4)*(1-T.MathUtils.smoothstep(age,2.4,3.4));
    const toast=T.MathUtils.smoothstep(age,4,4.8)*(1-T.MathUtils.smoothstep(age,5.8,6.6));
    const greeting=T.MathUtils.smoothstep(age,7,7.6)*(1-T.MathUtils.smoothstep(age,8.7,9.4));
    this.d.copy(CUP_HAND).lerp(CUP_AT_MOUTH,sip);
    this.d.y+=toast*.42;this.d.z-=toast*.08;
    this.l.copy(this.d).sub(SHOULDER).normalize();this.r.copy(REST[1]);
    if(g.teaGuest==='hatter'){
     this.r.lerp(this.hand.set(.07,.42,.1).normalize(),greeting).normalize();
     guest.hat.rotation.z=-.035*greeting;
    }else{
     this.r.lerp(this.hand.set(.3,.23,.25).normalize(),greeting).normalize();
     for(const [i,ear] of guest.ears.entries()){
      const side=i===0?-1:1;
      ear.rotation.z=-side*.16+Math.sin(age*12+i)*.12*greeting;
      ear.rotation.x=Math.sin(age*9+i)*.10*greeting;
     }
    }
    const bob=Math.sin(time*1.5+(h>>>8)%1000/1000*6)*.014;
    guest.root.visible=true;guest.root.position.copy(this.v);guest.root.position.y+=bob;guest.root.rotation.y=g.yaw;
    guest.cup.visible=true;guest.cup.position.copy(this.d).applyQuaternion(this.q).add(this.v);guest.cup.position.y+=bob;
    guest.cup.rotation.set(0,g.yaw,0);guest.cup.rotateX(-TIP*sip);
   }else if(g.angel){
    this.l.copy(REST[0]);this.r.copy(REST[1]);
    const a=this.angels[angels++]??=(()=>{const k=angelKit();this.scene.add(k.kit);return k;})();
    // Same slow float as the body (see the shader).
    a.kit.visible=true;a.kit.position.copy(this.v).y+=Math.sin(time*1.5+(h>>>8)%1000/1000*6)*.07;a.kit.rotation.y=g.yaw;
    const flap=.45+.4*Math.sin(time*6+h);a.wings[0].rotation.y=-flap;a.wings[1].rotation.y=flap;
   }else if(g.gesture){
    const pose=poseVillager({time,speed:0,sit:g.sitting?1:0,music:false,musician:false,gesture:g.gesture,age:g.age??0}),w=pose.weight;
    // The person's right arm is the ghost's −x arm; the ghost has no neck, so head moves go into the body.
    this.aim(this.l,-1,pose.right,w);this.aim(this.r,1,pose.left,w);
    const age=g.age??0,step=T.MathUtils.smoothstep,eat=g.gesture==='eat';let lean=0;
    if(eat||g.gesture==='drink'){
     // At the table the hand is steered in the ghost's own space so the fork's bite or the rim of the cup ends at MOUTH.
     // up: 0 at the plate / held over the table, 1 at the mouth (the people's timing).
     const up=eat?step(age,.75,1.3)*(1-step(age,1.9,2.5)):step(age,.3,.9)*(1-step(age,2.2,2.8)),wine=g.drink==='wine';
     const low=eat?PLATE_HAND:wine?GLASS_HAND:CUP_HAND,high=eat?FORK_AT_MOUTH:wine?WINE_AT_MOUTH:CUP_AT_MOUTH;
     this.d.copy(REST[0]).multiplyScalar(ARM).add(SHOULDER).lerp(this.hand.copy(low).lerp(high,up),Math.min(1,w));
     // Reaching the middle of the plate takes a small lean forward; the arm is aimed from the leaned shoulder.
     const reach=eat?REACH*(1-up)*Math.min(1,w):0;
     this.l.copy(this.d).sub(this.hand.copy(SHOULDER).sub(HIPS).applyAxisAngle(X,reach).add(HIPS)).normalize().applyAxisAngle(X,-reach);lean=reach;
     if((eat||g.drink&&w>.85)&&distance<30){ // a drink appears once the hand is out in front, not on its way past the body
      const t=this.tableware[holding++]??=(()=>{const k=tableware();this.scene.add(k.kit);return k;})();
      t.kit.visible=true;t.kit.position.copy(this.d).applyQuaternion(this.q).add(this.v);t.kit.rotation.y=g.yaw;
      // The tines point down at the plate, then at the mouth.
      t.fork.visible=eat;if(eat)t.fork.quaternion.setFromUnitVectors(BACK,this.hand.copy(MOUTH).sub(FORK_AT_MOUTH).normalize().lerp(TINES_DOWN.copy(PLATE_CENTRE).sub(PLATE_HAND).normalize(),1-up).normalize());
      t.bite.visible=eat&&g.bite!==undefined&&age>.6&&age<1.5;if(g.bite!==undefined)(t.bite.material as T.MeshStandardMaterial).color.setHex(g.bite);
      t.wine.visible=!eat&&wine;t.cup.visible=!eat&&g.drink==='coffee';t.wine.rotation.x=t.cup.rotation.x=eat?0:-TIP*step(age,.7,1.2)*(1-step(age,2,2.5));
     }
    }
    this.b.set(pose.lean+lean+pose.headPitch*.5*w,-(pose.sway+pose.headRoll*.5)*w,pose.turn+(pose.turn?pose.headYaw:0));
   }else{this.l.copy(REST[0]);this.r.copy(REST[1]);}
   this.put(far?this.far:this.near,this.m,glow,seed);
  }
  for(let i=angels;i<this.angels.length;i++)this.angels[i].kit.visible=false;
  for(let i=holding;i<this.tableware.length;i++)this.tableware[i].kit.visible=false;
  for(const b of [this.near,this.far]){
   b.mesh.count=b.used;b.mesh.visible=b.used>0;if(!b.used)continue;
   b.mesh.instanceMatrix.clearUpdateRanges();b.mesh.instanceMatrix.addUpdateRange(0,b.used*16);b.mesh.instanceMatrix.needsUpdate=true;
   b.glow.clearUpdateRanges();b.glow.addUpdateRange(0,b.used*3);b.glow.needsUpdate=true;b.seed.clearUpdateRanges();b.seed.addUpdateRange(0,b.used);b.seed.needsUpdate=true;
   for(const a of [b.left,b.right,b.body]){a.clearUpdateRanges();a.addUpdateRange(0,b.used*3);a.needsUpdate=true;}
  }
 }
}
