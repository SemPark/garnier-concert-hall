import * as T from 'three';
import {SPACE_ORBIT_CENTER} from './SpaceSky';

export type GalaxySettings={count:number;size:number;brightness:number;resolution:'desktop'|'mobile'};
const base=(import.meta.env?.BASE_URL??'/')+'textures/space/galaxies/';
const atlasSize=[1024,512] as const;
const crops=[[8,8,480,333],[520,8,480,269],[520,296,240,192]] as const;
const SPIRAL_SPIN_SECONDS=180;
const STAR_DRIFT_SECONDS=46;
const STARS_PER_GALAXY=5;

// The first six already cover the full circle on mobile; later entries fill gaps.
// Vary height, angular size and gain without concentrating all bright assets on one side.
const placements=[
 {asset:0,yaw:16,elevation:33,distance:112,width:10.2,tilt:-17,brightness:.62},
 {asset:1,yaw:166,elevation:17,distance:128,width:11.4,tilt:26,brightness:.64},
 {asset:2,yaw:262,elevation:33,distance:146,width:8.6,tilt:-23,brightness:.73},
 {asset:1,yaw:58,elevation:19,distance:104,width:10.5,tilt:-34,brightness:.61},
 {asset:0,yaw:216,elevation:49,distance:154,width:9.1,tilt:39,brightness:.56},
 {asset:0,yaw:137,elevation:49,distance:137,width:10.8,tilt:14,brightness:.59},
 {asset:1,yaw:307,elevation:14,distance:97,width:7.8,tilt:32,brightness:.51},
 {asset:2,yaw:27,elevation:56,distance:161,width:6.7,tilt:-41,brightness:.65},
 {asset:2,yaw:191,elevation:28,distance:143,width:5.9,tilt:12,brightness:.58},
 {asset:1,yaw:88,elevation:11,distance:123,width:7.2,tilt:-8,brightness:.53},
] as const;
export const MAX_GALAXIES=placements.length;

export function galaxySettingsForDevice(mobile:boolean):GalaxySettings{
 const defaults:GalaxySettings={count:mobile?6:8,size:1,brightness:.82,resolution:mobile?'mobile':'desktop'};
 try{
  const saved=JSON.parse(localStorage.getItem('pleee-galaxies-'+(mobile?'mobile':'desktop'))??'null');
  if(saved){
   // Upgrade the old default without resetting custom counts or the off setting.
   const oldDefault=!saved.layoutVersion&&saved.count===(mobile?2:3);
   const count=oldDefault?defaults.count:saved.count??defaults.count;
   return normalizeGalaxySettings({...defaults,...saved,count},defaults);
  }
 }catch{/* Storage may be unavailable. */}
 return defaults;
}

export function normalizeGalaxySettings(value:GalaxySettings,fallback:GalaxySettings):GalaxySettings{
 const bound=(number:number,previous:number,min:number,max:number)=>
  Number.isFinite(number)?T.MathUtils.clamp(number,min,max):previous;
 return {
  count:Math.round(bound(value.count,fallback.count,0,MAX_GALAXIES)),
  size:bound(value.size,fallback.size,.65,1.35),
  brightness:bound(value.brightness,fallback.brightness,0,1),
  resolution:value.resolution==='desktop'||value.resolution==='mobile'?value.resolution:fallback.resolution,
 };
}

/** Project fixed world-space placements, then draw at sky depth behind the hall and planets. */
export class SpaceGalaxies{
 private readonly geometry=new T.BufferGeometry();
 private readonly material=new T.ShaderMaterial({
  uniforms:{atlas:{value:null},strength:{value:0},size:{value:1},spinAngle:{value:0}},
  transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:`
   attribute vec3 center;
   attribute float gain;
   attribute float spiral;
   uniform float size,spinAngle;
   varying vec2 imageUV;
   varying float brightness;
   void main(){
    imageUV=uv;
    brightness=gain;
    // Rotate the entire quad in its own plane to preserve the atlas crop and aspect ratio.
    float angle=spinAngle*spiral;
    vec3 axis=normalize(center);
    vec3 offset=position*cos(angle)+cross(axis,position)*sin(angle)
     +axis*dot(axis,position)*(1.0-cos(angle));
    gl_Position=projectionMatrix*modelViewMatrix*vec4(center+offset*size,1.0);
    gl_Position.z=gl_Position.w;
   }
  `,
  fragmentShader:`
   uniform sampler2D atlas;
   uniform float strength;
   varying vec2 imageUV;
   varying float brightness;
   void main(){
    vec4 photo=texture2D(atlas,imageUV);
    gl_FragColor=vec4(photo.rgb,photo.a*strength*brightness);
    #include <colorspace_fragment>
   }
  `,
 });
 private readonly mesh=new T.Mesh(this.geometry,this.material);
 private readonly stars:T.Points<T.BufferGeometry,T.ShaderMaterial>;
 private readonly textures=new Map<GalaxySettings['resolution'],T.Texture>();
 private progress=0;
 private disposed=false;
 constructor(scene:T.Scene,private settings:GalaxySettings){
  const positions:number[]=[],centers:number[]=[],uvs:number[]=[],gains:number[]=[],spirals:number[]=[];
  const up=new T.Vector3(0,1,0),starPositions:number[]=[],starDrifts:number[]=[],starPhases:number[]=[];
  for(const item of placements){
   const [x,y,w,h]=crops[item.asset];
   const yaw=T.MathUtils.degToRad(item.yaw),pitch=T.MathUtils.degToRad(item.elevation);
   const forward=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
   const right=new T.Vector3().crossVectors(forward,up).normalize();
   const vertical=new T.Vector3().crossVectors(right,forward).normalize();
   const roll=T.MathUtils.degToRad(item.tilt);
   right.applyAxisAngle(forward,roll);
   vertical.applyAxisAngle(forward,roll);
   const center=forward.clone().multiplyScalar(item.distance);
   const halfWidth=item.distance*Math.tan(T.MathUtils.degToRad(item.width/2));
   const halfHeight=halfWidth*h/w;
   for(let i=0;i<STARS_PER_GALAXY;i++){
    const star=center.clone().multiplyScalar(.93)
     .addScaledVector(vertical,((i+.5)/STARS_PER_GALAXY-.5)*halfHeight*1.55);
    const drift=right.clone().multiplyScalar(halfWidth*(2.5+i*.15));
    starPositions.push(star.x,star.y,star.z);
    starDrifts.push(drift.x,drift.y,drift.z);
    starPhases.push((i*.618+item.yaw/360+1)%1);
   }
   for(const [u,v] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]){
    const offset=right.clone().multiplyScalar((u*2-1)*halfWidth).addScaledVector(vertical,(v*2-1)*halfHeight);
    positions.push(offset.x,offset.y,offset.z);
    centers.push(center.x,center.y,center.z);
    uvs.push((x+u*w)/atlasSize[0],1-(y+(1-v)*h)/atlasSize[1]);
    gains.push(item.brightness);
    spirals.push(item.asset===0?1:0);
   }
  }
  this.geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  this.geometry.setAttribute('center',new T.Float32BufferAttribute(centers,3));
  this.geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  this.geometry.setAttribute('gain',new T.Float32BufferAttribute(gains,1));
  this.geometry.setAttribute('spiral',new T.Float32BufferAttribute(spirals,1));
  this.mesh.name='space-galaxies';
  this.mesh.position.copy(SPACE_ORBIT_CENTER);
  this.mesh.frustumCulled=false;
  this.mesh.renderOrder=-1000;
  this.mesh.visible=false;
  scene.add(this.mesh);
  const starGeometry=new T.BufferGeometry();
  starGeometry.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));
  starGeometry.setAttribute('drift',new T.Float32BufferAttribute(starDrifts,3));
  starGeometry.setAttribute('phase',new T.Float32BufferAttribute(starPhases,1));
  this.stars=new T.Points(starGeometry,new T.ShaderMaterial({
   uniforms:{time:{value:0},strength:{value:0},pixelRatio:{value:1}},
   transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
   vertexShader:`
    attribute vec3 drift;
    attribute float phase;
    uniform float time, pixelRatio;
    varying float glow;
    void main(){
     float travel=fract(time+phase);
     glow=smoothstep(0.0,0.25,travel)*(1.0-smoothstep(0.75,1.0,travel));
     gl_Position=projectionMatrix*modelViewMatrix*vec4(position+drift*(travel-0.5),1.0);
     gl_PointSize=(1.8+phase*1.5)*pixelRatio;
    }
   `,
   fragmentShader:`
    uniform float strength;
    varying float glow;
    void main(){
     float core=1.0-smoothstep(0.05,0.5,length(gl_PointCoord-0.5));
     gl_FragColor=vec4(vec3(0.78,0.87,1.0),core*core*glow*strength);
     #include <colorspace_fragment>
    }
   `,
  }));
  this.stars.name='space-passing-stars';
  this.stars.frustumCulled=false;
  this.stars.renderOrder=this.mesh.renderOrder+1;
  this.stars.onBeforeRender=renderer=>{this.stars.material.uniforms.pixelRatio.value=renderer.getPixelRatio();};
  this.mesh.add(this.stars);
 }
 animate(seconds:number){
  if(!this.mesh.visible)return;
  this.material.uniforms.spinAngle.value=T.MathUtils.euclideanModulo(seconds,SPIRAL_SPIN_SECONDS)/SPIRAL_SPIN_SECONDS*Math.PI*2;
  this.stars.material.uniforms.time.value=T.MathUtils.euclideanModulo(seconds,STAR_DRIFT_SECONDS)/STAR_DRIFT_SECONDS;
 }
 configure(settings:GalaxySettings){
  this.settings=settings;
  this.update(this.progress);
 }
 update(progress:number){
  this.progress=progress;
  const {count,size,brightness,resolution}=this.settings;
  this.mesh.visible=false;
  if(progress<=0||count===0||brightness===0)return;
  let texture=this.textures.get(resolution);
  if(!texture){
   texture=new T.TextureLoader().load(base+resolution+'.webp',()=>{
    if(!this.disposed)this.update(this.progress);
   });
   texture.colorSpace=T.SRGBColorSpace;
   this.textures.set(resolution,texture);
  }
  if(!texture.image)return;
  this.geometry.setDrawRange(0,count*6);
  this.material.uniforms.atlas.value=texture;
  this.material.uniforms.size.value=size;
  this.material.uniforms.strength.value=brightness*T.MathUtils.smoothstep(progress,.12,1);
  this.stars.geometry.setDrawRange(0,count*STARS_PER_GALAXY);
  this.stars.material.uniforms.strength.value=.65*this.material.uniforms.strength.value;
  this.mesh.visible=true;
 }
 dispose(){
  this.disposed=true;
  this.mesh.removeFromParent();
  this.geometry.dispose();
  this.material.dispose();
  this.stars.geometry.dispose();
  this.stars.material.dispose();
  for(const texture of this.textures.values())texture.dispose();
 }
}
