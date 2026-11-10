import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** One ghost to draw this frame: where it is, which way it faces, and a stable id for its colour and rhythm. */
export type GhostSpot={x:number;y:number;z:number;yaw:number;id:string;sitting:boolean;
 /** Hall ghosts (not visitors) share one blue. */npc?:boolean;
 /** 0 none, else 1 + the index of a visitor gesture (wave, clap, bravo, ovation, bow, moved, shh, doze): see the shader. */gesture?:number};

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
attribute vec3 aGlow;attribute float aSeed;attribute float aArm;
varying vec3 vGlow;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vView;varying float vUp;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){
 // aSeed = rhythm (fraction) + 2 × gesture + 32 when seated. The gestures are the visitors' own eight:
 // 1 wave, 2 clap, 3 bravo, 4 turn round and bow, 5 bow, 6 moved (hands to the heart), 7 shh, 8 doze.
 float seed=fract(aSeed),gesture=mod(floor(aSeed/2.),16.),seated=step(31.5,aSeed);
 float wave=float(gesture==1.),clap=float(gesture==2.),cheer=float(gesture==3.),ovation=float(gesture==4.),bow=float(gesture==5.),moved=float(gesture==6.),shh=float(gesture==7.),doze=float(gesture==8.);
 float right=step(0.,aArm);
 vec3 p=position;vec3 n=normal;float below=clamp((-p.y-.4)/.3,0.,1.)*(1.-seated);
 if(seated>.5&&p.y<-.66&&aArm==0.){ // below the seat line the sheet slides forward over the cushion and drapes down like legs
  float k=smoothstep(0.,.1,-.66-p.y);p.z=p.z*mix(1.,.6,k)+.22*k;n=normalize(mix(n,vec3(0.,-.3,1.),k*.4));
 }
 if(aArm!=0.){
  vec3 pivot=vec3(aArm*.28,-.12,0.);vec3 d=p-pivot;float c,s;
  // Out to the side (z axis): bravo lifts both arms and pumps them; a wave raises the right one high and swings it.
  float side=cheer*(.75+.45*sin(uTime*9.+seed*20.))+wave*right*(2.3+.35*sin(uTime*7.+seed*9.));
  c=cos(aArm*side);s=sin(aArm*side);d.xy=mat2(c,s,-s,c)*d.xy;n.xy=mat2(c,s,-s,c)*n.xy;
  // Forward (x axis): clapping and hands-to-heart bring both arms up in front; shh lifts the right one to the face.
  float fwd=-1.25*clap-.9*moved-1.9*shh*right;
  c=cos(fwd);s=sin(fwd);d.yz=mat2(c,s,-s,c)*d.yz;n.yz=mat2(c,s,-s,c)*n.yz;
  // Inward (y axis): clapping hands meet and part; hands to the heart cross; the shh finger comes to the middle.
  float in_=-aArm*(clap*(.48+.2*sin(uTime*13.+seed*7.))+moved*.6+shh*right*.5);
  c=cos(in_);s=sin(in_);d.xz=mat2(c,-s,s,c)*d.xz;n.xz=mat2(c,-s,s,c)*n.xz;
  p=pivot+d;
 }
 // Whole body: bows forward from the middle (a deep slow bow; turning round to bow to those behind; nodding off).
 float pitch=bow*.45*max(0.,sin(uTime*1.6+seed*6.))+ovation*.4*max(0.,sin(uTime*1.6+seed*6.))+doze*(.18+.06*sin(uTime*.8+seed*6.))+moved*.08;
 if(pitch>0.){vec2 q=p.yz-vec2(-.4,0.);float c=cos(pitch),s=sin(pitch);p.yz=vec2(-.4,0.)+mat2(c,s,-s,c)*q;n.yz=mat2(c,s,-s,c)*n.yz;}
 float roll=doze*.12*sin(uTime*.5+seed*6.)+moved*.06*sin(uTime*1.2+seed*6.);
 if(roll!=0.){vec2 q=p.xy-vec2(0.,-.4);float c=cos(roll),s=sin(roll);p.xy=vec2(0.,-.4)+mat2(c,s,-s,c)*q;n.xy=mat2(c,s,-s,c)*n.xy;}
 if(ovation>.5){p.xz=-p.xz;n.xz=-n.xz;} // turned to face the people behind
 p.x+=sin(uTime*2.1+seed*6.)*.03*below; // hem flutters
 p.y+=sin(uTime*1.5+seed*6.)*.07*(1.-cheer)*(1.-seated*.8)+abs(sin(uTime*5.+seed*6.))*.14*cheer*(1.-seated*.6); // float, or happy bouncing
 p.x+=sin(uTime*2.5+seed*6.)*.05*cheer*(p.y+1.);   // and a little side-to-side sway
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

type Batch={mesh:T.InstancedMesh;glow:T.InstancedBufferAttribute;seed:T.InstancedBufferAttribute;used:number};

/**
 * Every other visitor is drawn as a small white ghost; only the viewer is a person. Bodies (arms included) are
 * instanced batches (near and far), so a full house costs two draw calls. Bobbing,
 * hem flutter and gestures run in the shader; the CPU only places each ghost 30 times a second.
 */
export class Ghosts{
 private time={value:0};
 private near:Batch;private far:Batch;
 private updatedAt=-Infinity;private frustum=new T.Frustum();private projection=new T.Matrix4();private sphere=new T.Sphere();
 private m=new T.Matrix4();private q=new T.Quaternion();private up=new T.Vector3(0,1,0);private v=new T.Vector3();private s=new T.Vector3(1,1,1);
 constructor(private scene:T.Scene){
  const mat=(face:number)=>new T.ShaderMaterial({uniforms:{uTime:this.time,uFace:{value:face}},vertexShader:vertex,fragmentShader:fragment});
  
  this.near=this.batch(body(32,6,7),mat(1));this.far=this.batch(body(16,3,4),mat(1));
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
  for(const b of [this.near,this.far])b.used=0;
  for(const g of ghosts){
   // Heads at the visitors' head height. Seated, that leaves only the last 0.1 m of sheet below the cushion (0.63 m);
   // it drapes over the front edge (see the vertex shader).
   if(g.sitting){this.s.set(1,1,1);this.v.set(g.x+Math.sin(g.yaw)*SEAT_FORWARD,g.y+SEATED_HEAD,g.z+Math.cos(g.yaw)*SEAT_FORWARD);}
   else{this.s.set(1,1,1);this.v.set(g.x,g.y+STANDING_HEAD,g.z);}if(!this.frustum.intersectsSphere(this.sphere.set(this.v,1)))continue;
   const h=hash(g.id),glow=g.npc?NPC_GLOW:GLOWS[h%GLOWS.length],seed=(h>>>8)%1000/1000+2*(g.gesture??0)+(g.sitting?32:0),distance=this.v.distanceTo(camera.position),far=distance>14;
   this.m.compose(this.v,this.q.setFromAxisAngle(this.up,g.yaw),this.s);
   this.put(far?this.far:this.near,this.m,glow,seed);
  }
  for(const b of [this.near,this.far]){
   b.mesh.count=b.used;b.mesh.visible=b.used>0;if(!b.used)continue;
   b.mesh.instanceMatrix.clearUpdateRanges();b.mesh.instanceMatrix.addUpdateRange(0,b.used*16);b.mesh.instanceMatrix.needsUpdate=true;
   b.glow.clearUpdateRanges();b.glow.addUpdateRange(0,b.used*3);b.glow.needsUpdate=true;b.seed.clearUpdateRanges();b.seed.addUpdateRange(0,b.used);b.seed.needsUpdate=true;
  }
 }
}
