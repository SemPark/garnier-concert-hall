import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** One ghost to draw this frame: where it is, which way it faces, and a stable id for its colour and rhythm. */
export type GhostSpot={x:number;y:number;z:number;yaw:number;id:string;sitting:boolean;
 /** Hall ghosts (not visitors) share one blue. */npc?:boolean;
 /** 0 none, 1 cheer, 2 clap, 3 wave, 4 nod (see the vertex shader). */gesture?:number};

/** Soft glow colours; each ghost keeps one, chosen from its id so every viewer sees the same colour. */
const GLOWS=[0xffd24a,0xff6fa8,0xb38cff,0x6cf2a0].map(c=>new T.Color(c));
/** The hall's own ghosts are all this blue, so visitors (the other four colours) stand out from them. */
/** Head centre above the floor, matching a visitor's head standing (1.40 m) and seated (1.50 m, they sit up on the cushion). */
const STANDING_HEAD=1.4,SEATED_HEAD=1.5;
/** Seated ghosts sit this far forward of the seat centre so their back (0.41 m deep) stays in front of the backrest. */
const SEAT_FORWARD=.17;
const NPC_GLOW=new T.Color(0x4fa8ff);
const hash=(id:string)=>{let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);return h>>>0;};

/** Cute ghost: round dome, straight sides, a zigzag hem of pointed tips, and two stubby arms grown from the sides; faces +z. */
function body(segments:number,domeRings:number,armSides:number){
 // Sized to the visitors: head as wide as theirs (≈0.75 m), arms as long as theirs (≈0.5 m), about as tall.
 // Rings only where the outline bends (dome and hem); the straight sides are a single band.
 const R=.37,bottom=-.97,side=(y:number)=>R+.04*(-y/-bottom);
 const points=[new T.Vector2(.001,-.82),new T.Vector2(.27,-.88),new T.Vector2(side(bottom)+.002,bottom-.02),new T.Vector2(side(-.8),-.8),new T.Vector2(R,0)];
 for(let i=1;i<=domeRings;i++){const a=i/domeRings*Math.PI/2;points.push(new T.Vector2(Math.max(.001,R*Math.cos(a)),R*Math.sin(a)));}
 const g=new T.LatheGeometry(points,segments),p=g.attributes.position as T.BufferAttribute;
 for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>-.8)continue;const w=Math.min(1,(-.8-y)/.15),lobe=Math.abs(Math.sin(4*Math.atan2(p.getX(i),p.getZ(i))));p.setY(i,y+.13*(1-Math.sqrt(lobe))*w);}
 const parts:T.BufferGeometry[]=[g];
 // Arms like the visitors' (no hands): half the sleeve sunk into the side so only a half-round shows at the shoulder,
 // held a little open.
 for(const s of [-1,1]){const arm=new T.CapsuleGeometry(.068,.36,Math.max(2,armSides-4),armSides);arm.translate(0,-.23,0);arm.rotateZ(s*.5);arm.translate(s*(R-.04),-.12,.02);parts.push(arm);}
 // aArm: 0 body, -1/1 left/right arm, so the shader can swing the arms from the shoulder.
 parts.forEach((part,i)=>{part.deleteAttribute('uv');part.setAttribute('aArm',new T.Float32BufferAttribute(new Array(part.attributes.position.count).fill(i===0?0:i===1?-1:1),1));});
 const merged=mergeGeometries(parts)!;merged.computeVertexNormals();return merged;
}

const vertex=/* glsl */`
uniform float uTime;
attribute vec3 aGlow;attribute float aSeed;attribute float aArm;
varying vec3 vGlow;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vView;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){
 // aSeed = rhythm (fraction) + 2 × gesture + 16 when seated. Gestures copy the visitors' own:
 // 1 cheer (both arms up, bouncing), 2 clap, 3 wave one hand, 4 nod along to the music.
 float seed=fract(aSeed),gesture=mod(floor(aSeed/2.),8.),seated=step(15.5,aSeed);
 float cheer=float(gesture==1.),clap=float(gesture==2.),wave=float(gesture==3.),nod=float(gesture==4.);
 vec3 p=position;vec3 n=normal;float below=clamp((-p.y-.6)/.35,0.,1.)*(1.-seated);
 if(seated>.5&&p.y<-.86&&aArm==0.){ // below the seat line the sheet slides forward over the cushion and drapes down like legs
  float k=smoothstep(0.,.12,-.86-p.y);p.z=p.z*mix(1.,.6,k)+.22*k;n=normalize(mix(n,vec3(0.,-.3,1.),k*.4));
 }
 if(aArm!=0.){
  vec3 pivot=vec3(aArm*.3,-.12,0.);vec3 d=p-pivot;
  // Out to the side (z axis): cheering lifts both arms, waving raises the right one high and swings it.
  float side=cheer*(.75+.45*sin(uTime*9.+seed*20.))+wave*step(0.,aArm)*(2.3+.35*sin(uTime*7.+seed*9.));
  float c=cos(aArm*side),s=sin(aArm*side);d.xy=mat2(c,s,-s,c)*d.xy;n.xy=mat2(c,s,-s,c)*n.xy;
  // Clapping: arms forward (x axis), then in and out so the ends meet in front (y axis).
  if(clap>.5){float f=-1.25;c=cos(f);s=sin(f);d.yz=mat2(c,s,-s,c)*d.yz;n.yz=mat2(c,s,-s,c)*n.yz;
   float in_=-aArm*(.48+.2*sin(uTime*13.+seed*7.));c=cos(in_);s=sin(in_);d.xz=mat2(c,-s,s,c)*d.xz;n.xz=mat2(c,-s,s,c)*n.xz;}
  p=pivot+d;
 }
 if(nod>.5){ // a gentle bow on the beat, from the middle of the body
  float a=.16*max(0.,sin(uTime*3.2+seed*6.));vec2 q=p.yz-vec2(-.4,0.);float c=cos(a),s=sin(a);
  p.yz=vec2(-.4,0.)+mat2(c,-s,s,c)*q;n.yz=mat2(c,-s,s,c)*n.yz;
 }
 p.x+=sin(uTime*2.1+seed*6.)*.03*below; // hem flutters
 p.y+=sin(uTime*1.5+seed*6.)*.07*(1.-cheer)*(1.-seated*.8)+abs(sin(uTime*5.+seed*6.))*.14*cheer*(1.-seated*.6); // float, or happy bouncing
 p.x+=sin(uTime*2.5+seed*6.)*.05*cheer*(p.y+1.);   // and a little side-to-side sway
 vec4 world=modelMatrix*instanceMatrix*vec4(p,1.);
 vec4 mv=viewMatrix*world;gl_Position=projectionMatrix*mv;
 vLocal=position;vGlow=aGlow;vView=-mv.xyz;
 vNormal=normalize(mat3(viewMatrix)*mat3(modelMatrix)*mat3(instanceMatrix)*n);
 #include <logdepthbuf_vertex>
}`;
const fragment=/* glsl */`
uniform float uFace;uniform float uTime;
varying vec3 vGlow;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vView;
#include <common>
#include <logdepthbuf_pars_fragment>
float dot2(vec2 a,vec2 c,vec2 r){vec2 d=(a-c)/r;return dot(d,d);}
void main(){
 #include <logdepthbuf_fragment>
 float rim=1.-max(dot(normalize(vNormal),normalize(vView)),0.);
 vec3 cream=vec3(1.,.95,.88);
 vec3 tint=mix(cream,vGlow,.55);vec3 c=mix(tint,vGlow*1.6,smoothstep(.15,.9,rim))+vGlow*.12;
 if(uFace>.5&&vLocal.z>0.){
  vec2 f=vLocal.xy/1.23;
  // Proportions of a classic cute ghost: big oval eyes just above the middle, a simple smile below them.
  float eye=min(dot2(f,vec2(-.1,.03),vec2(.042,.06)),dot2(f,vec2(.1,.03),vec2(.042,.06)));
  float shine=min(dot2(f,vec2(-.088,.055),vec2(.013)),dot2(f,vec2(.112,.055),vec2(.013)));
  float cheek=min(dot2(f,vec2(-.175,-.045),vec2(.04,.024)),dot2(f,vec2(.175,-.045),vec2(.04,.024)));
  vec2 q=f-vec2(0.,-.035);float ang=atan(q.y,q.x),r=.032;
  // Small smile arc with round ends: distance to the arc between its two end angles, else to the nearer end.
  float smile=(ang>-2.5&&ang<-.64)?abs(length(q)-r):min(length(q-r*vec2(cos(-2.5),sin(-2.5))),length(q-r*vec2(cos(-.64),sin(-.64))));
  // Crisp edges at any distance: blend over one screen pixel only.
  float e=sqrt(eye),ew=fwidth(e)+1e-4,ch=sqrt(cheek),cw=fwidth(ch)+1e-4,sw=fwidth(sqrt(shine))+1e-4;
  float mw=fwidth(smile)+1e-4;
  c=mix(c,vec3(1.,.25,.33),(1.-smoothstep(1.-cw,1.+cw,ch))*.85);
  c=mix(c,vec3(.0),1.-smoothstep(.0055-mw,.0055+mw,smile));
  c=mix(c,vec3(0.),1.-smoothstep(1.-ew,1.+ew,e));
  c=mix(c,vec3(1.),1.-smoothstep(1.-sw,1.+sw,sqrt(shine)));
 }
 c*=.92+.08*sin(uTime*1.3+vGlow.r*9.);
 gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
}`;
const haloVertex=/* glsl */`
uniform float uTime;
attribute vec3 aGlow;attribute float aSeed;
varying vec3 vGlow;varying vec2 vUv;varying float vPulse;
void main(){
 vec4 center=viewMatrix*modelMatrix*instanceMatrix*vec4(0.,sin(uTime*1.5+fract(aSeed)*6.)*.07,0.,1.);
 center.xy+=position.xy*1.45;
 gl_Position=projectionMatrix*center;
 vUv=uv;vGlow=aGlow;vPulse=.75+.25*sin(uTime*1.1+fract(aSeed)*9.);
}`;
const haloFragment=/* glsl */`
varying vec3 vGlow;varying vec2 vUv;varying float vPulse;
void main(){float d=length(vUv-.5)*2.;float a=pow(max(1.-d,0.),2.2)*.45*vPulse;gl_FragColor=vec4(vGlow*a,1.);
 #include <colorspace_fragment>
}`;

type Batch={mesh:T.InstancedMesh;glow:T.InstancedBufferAttribute;seed:T.InstancedBufferAttribute;used:number};

/**
 * Every other visitor is drawn as a small glowing ghost; only the viewer is a person. Bodies (arms included) and halos are
 * instanced batches (plus a coarse body for far ghosts), so a full house costs three draw calls. Bobbing,
 * tail sway and the glow pulse run in the shader; the CPU only places each ghost 30 times a second.
 */
export class Ghosts{
 private time={value:0};
 private near:Batch;private far:Batch;private halos:Batch;
 private updatedAt=-Infinity;private frustum=new T.Frustum();private projection=new T.Matrix4();private sphere=new T.Sphere();
 private m=new T.Matrix4();private q=new T.Quaternion();private up=new T.Vector3(0,1,0);private v=new T.Vector3();private s=new T.Vector3(1,1,1);
 constructor(private scene:T.Scene){
  const mat=(face:number)=>new T.ShaderMaterial({uniforms:{uTime:this.time,uFace:{value:face}},vertexShader:vertex,fragmentShader:fragment});
  
  this.near=this.batch(body(32,6,7),mat(1));this.far=this.batch(body(16,3,4),mat(1));
  this.halos=this.batch(new T.PlaneGeometry(1,1),new T.ShaderMaterial({uniforms:{uTime:this.time},vertexShader:haloVertex,fragmentShader:haloFragment,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
  this.halos.mesh.renderOrder=2;
 }
 private batch(geometry:T.BufferGeometry,material:T.Material,size=64):Batch{
  const mesh=new T.InstancedMesh(geometry,material,size);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.count=0;
  const glow=new T.InstancedBufferAttribute(new Float32Array(size*3),3),seed=new T.InstancedBufferAttribute(new Float32Array(size),1);
  glow.setUsage(T.DynamicDrawUsage);seed.setUsage(T.DynamicDrawUsage);geometry.setAttribute('aGlow',glow);geometry.setAttribute('aSeed',seed);
  this.scene.add(mesh);return {mesh,glow,seed,used:0};
 }
 private grow(b:Batch){
  const size=b.mesh.instanceMatrix.count;if(b.used<size)return;
  const old=b.mesh,next=this.batch(old.geometry,old.material as T.Material,size*2);
  next.mesh.instanceMatrix.array.set(old.instanceMatrix.array);(next.glow.array as Float32Array).set(b.glow.array);(next.seed.array as Float32Array).set(b.seed.array);
  next.mesh.renderOrder=old.renderOrder;old.removeFromParent();b.mesh=next.mesh;b.glow=next.glow;b.seed=next.seed;
 }
 private put(b:Batch,matrix:T.Matrix4,glow:T.Color,seed:number){
  this.grow(b);b.mesh.setMatrixAt(b.used,matrix);b.glow.setXYZ(b.used,glow.r,glow.g,glow.b);b.seed.setX(b.used,seed);b.used++;
 }
 update(ghosts:Iterable<GhostSpot>,camera:T.Camera,now=performance.now()){
  this.time.value=now/1000;
  if(now-this.updatedAt<1000/30)return;this.updatedAt=now;
  camera.updateMatrixWorld();this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  for(const b of [this.near,this.far,this.halos])b.used=0;
  for(const g of ghosts){
   // Heads at the visitors' head height. Seated, that leaves only the last 0.1 m of sheet below the cushion (0.63 m);
   // it drapes over the front edge (see the vertex shader).
   if(g.sitting){this.s.set(1,1,1);this.v.set(g.x+Math.sin(g.yaw)*SEAT_FORWARD,g.y+SEATED_HEAD,g.z+Math.cos(g.yaw)*SEAT_FORWARD);}
   else{this.s.set(1,1,1);this.v.set(g.x,g.y+STANDING_HEAD,g.z);}if(!this.frustum.intersectsSphere(this.sphere.set(this.v,1)))continue;
   const h=hash(g.id),glow=g.npc?NPC_GLOW:GLOWS[h%GLOWS.length],seed=(h>>>8)%1000/1000+2*(g.gesture??0)+(g.sitting?16:0),distance=this.v.distanceTo(camera.position),far=distance>14;
   this.m.compose(this.v,this.q.setFromAxisAngle(this.up,g.yaw),this.s);
   this.put(far?this.far:this.near,this.m,glow,seed);
   // The halo is a large additive quad (fill-rate on phones); beyond 26 m the body colour carries the glow alone.
   if(distance<26)this.put(this.halos,this.m,glow,seed);
  }
  for(const b of [this.near,this.far,this.halos]){
   b.mesh.count=b.used;b.mesh.visible=b.used>0;if(!b.used)continue;
   b.mesh.instanceMatrix.clearUpdateRanges();b.mesh.instanceMatrix.addUpdateRange(0,b.used*16);b.mesh.instanceMatrix.needsUpdate=true;
   b.glow.clearUpdateRanges();b.glow.addUpdateRange(0,b.used*3);b.glow.needsUpdate=true;b.seed.clearUpdateRanges();b.seed.addUpdateRange(0,b.used);b.seed.needsUpdate=true;
  }
 }
}
