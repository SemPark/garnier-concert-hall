import * as T from 'three';
import type {ConcertAudio} from '../audio/ConcertAudio';
import {STAGE,STAGE_FLOOR,stageRiseAt} from '../orchestra/layout';
import {GOLDEN_HALL} from '../../shared/goldenHall';
import {GALLERY_RAIL_HEIGHT} from '../../shared/gallery';

const RIBBON_Z=STAGE.back+.75;
const RIBBON_BASE=STAGE_FLOOR+stageRiseAt(0,RIBBON_Z)+.04;
const MAX_HEIGHT=GOLDEN_HALL.balconyHeight+GALLERY_RAIL_HEIGHT-RIBBON_BASE;

/** Sixteen camera-facing ribbons in one draw, no light/shadow or bloom pass. */
export class MusicLights {
 private readonly heights=new Float32Array(16);
 private readonly geometry=new T.InstancedBufferGeometry();
 private readonly material:T.ShaderMaterial;
 readonly mesh:T.Mesh;
 constructor(scene:T.Scene){
  const plane=new T.PlaneGeometry(1,1);
  this.geometry.index=plane.index;this.geometry.attributes=plane.attributes;this.geometry.instanceCount=16;
  this.geometry.setAttribute('ribbon',new T.InstancedBufferAttribute(Float32Array.from({length:16},(_,i)=>i),1));
  this.material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.NormalBlending,side:T.DoubleSide,
   uniforms:{heights:{value:this.heights},clock:{value:0}},
   vertexShader:`attribute float ribbon; uniform float heights[16]; varying vec2 vUv; varying float energy; varying float lane;
    void main(){vUv=uv;lane=ribbon;float h=heights[int(ribbon)];energy=smoothstep(0.0,0.65,h);
     vec3 right=normalize(vec3(viewMatrix[0][0],0.0,viewMatrix[2][0]));
     vec3 base=vec3((ribbon-7.5)*1.48,${RIBBON_BASE},${RIBBON_Z});
     vec3 p=base+right*position.x*1.25+vec3(0.0,(position.y+0.5)*max(h,0.001),0.0);
     gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0);}`,
   fragmentShader:`uniform float clock; varying vec2 vUv; varying float energy; varying float lane;
    void main(){float x=abs(vUv.x*2.0-1.0);
     // A filled frequency bar: retain its width and a readable, flat top.
     float edge=1.0-smoothstep(0.94,1.0,x);
     float tip=1.0-smoothstep(0.985,1.0,vUv.y);
     float foot=smoothstep(0.0,0.012,vUv.y);
     vec3 gold=mix(vec3(1.0,0.53,0.16),vec3(1.0,0.83,0.43),vUv.y);
     gold=mix(gold,vec3(1.0,0.94,0.72),smoothstep(0.965,0.985,vUv.y)*0.65);
     gl_FragColor=vec4(gold,edge*tip*foot*energy);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  this.mesh=new T.Mesh(this.geometry,this.material);this.mesh.name='Music frequency ribbons';
  this.mesh.frustumCulled=false;this.mesh.visible=false;scene.add(this.mesh);
 }
 update(time:number,dt:number,active:boolean,audio:ConcertAudio){
  this.mesh.visible=active;if(!active)return;
  const signal=audio.musicSpectrum(time);
  for(let i=0;i<16;i++){
   // Adjacent low bands at centre, progressively higher bands towards either wing.
   const band=i<8?14-i*2:(i-8)*2+1;
   const bassGain=1+.85*(1-T.MathUtils.smoothstep(band,0,7));
   const response=Math.min(1,signal.volume*signal.bands[band]*bassGain);
   const target=MAX_HEIGHT*response;
   this.heights[i]=T.MathUtils.lerp(this.heights[i],target,1-Math.exp(-Math.min(dt,.1)/(target>this.heights[i] ? .10 : .5)));
  }
  this.material.uniforms.clock.value=time;
 }
 dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
