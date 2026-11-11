import {ATRIUM,LOBBY_ARCADE,LOBBY_FURNITURE} from '../../shared/grandStair';
import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import type {Pass} from 'three/addons/postprocessing/Pass.js';

export type RenderPassTimings={sceneRender:number;postProcessing:number};

/** Warm practical lighting lives in small pools, with deeper amber shade in the upper galleries. */
export function lobbyPracticalLights(scene:T.Scene){
 const spot=(color:number,power:number,position:number[],target:number[],angle:number)=>{
  const light=new T.SpotLight(color,power,32,angle,.85,2);light.position.fromArray(position);light.target.position.fromArray(target);scene.add(light,light.target);
 };
 spot(0xffbc7b,260,[0,15,27],[0,0,31],.68);
 spot(0xffc18a,115,[-12,7,24],[-11.8,1,24],.58);
 spot(0xffbf66,65,[-11.8,5.5,LOBBY_FURNITURE.cafeCounter.z],[-14,1.3,LOBBY_FURNITURE.cafeCounter.z],1.1);
 for(const side of [-1,1]){const fill=new T.PointLight(0xffc88e,25,20,2);fill.position.set(side*12.7,4.1,34);scene.add(fill);}
 if(typeof document==='undefined')return;
 const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=64;const ctx=haloCanvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,0,32,32,32);
 gradient.addColorStop(0,'rgba(255,225,180,.65)');gradient.addColorStop(.15,'rgba(255,195,120,.24)');gradient.addColorStop(1,'rgba(255,180,100,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const map=new T.CanvasTexture(haloCanvas);map.colorSpace=T.SRGBColorSpace;
 const glow=new T.SpriteMaterial({map,color:0xffc463,transparent:true,opacity:.45,depthWrite:false,blending:T.AdditiveBlending});
 // Brass wall lanterns share their meshes and baked wall wash; just two local fills light the side aisles.
 const brass=new T.MeshStandardMaterial({color:0xb98a47,metalness:.65,roughness:.35});
 const lamp=new T.MeshStandardMaterial({color:0xffe1a1,emissive:0xffbf66,emissiveIntensity:1.8,roughness:.5});
 const back=new T.CylinderGeometry(.18,.18,.045,12);back.rotateX(Math.PI/2);
 const arm=new T.CylinderGeometry(.035,.035,.45,8);arm.rotateX(Math.PI/2);
 const bowl=new T.CylinderGeometry(.16,.09,.12,12),shade=new T.SphereGeometry(.15,12,10),cap=new T.ConeGeometry(.2,.16,12);
 const washMat=new T.MeshBasicMaterial({map,color:0xffb85e,transparent:true,opacity:.32,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const plane=new T.PlaneGeometry(2.7,3.8);
 const sconce=(x:number,y:number,z:number,yaw:number)=>{
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;g.name='warm-lobby-wall-lantern';scene.add(g);
  const piece=(geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number)=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.userData.fullDetail=true;m.userData.preserveSilhouette=true;g.add(m);return m;};
  piece(back,brass,0,0,0);piece(arm,brass,0,0,.23);piece(bowl,brass,0,.03,.46);
  const light=piece(shade,lamp,0,.26,.46);light.scale.set(1,1.45,1);piece(cap,brass,0,.53,.46);
  piece(plane,washMat,0,.25,.045);const bloom=new T.Sprite(glow);bloom.position.set(0,.27,.48);bloom.scale.set(1.1,1.1,1);g.add(bloom);
 };
 // Keep the established mounting point just above each capital, where the arches spring.
 // Include both end columns so the corner arches receive the same fixture and height.
 for(const side of [-1,1])for(const z of LOBBY_ARCADE.columns)
  for(const [base,capital] of [[0,3.6],[ATRIUM.balconyY,2.6],[13.4,2.6]])
   sconce(side*(LOBBY_ARCADE.x-.25),base+capital+.25,z,-side*Math.PI/2);
 // End-arcade interior joints follow that same datum; the corner joints are supplied above.
 for(const z of [ATRIUM.front+ATRIUM.balconyDepth,ATRIUM.back-ATRIUM.balconyDepth])
  for(const x of LOBBY_ARCADE.endColumns.slice(1,-1))for(const base of [ATRIUM.balconyY,13.4])
   sconce(x,base+2.85,z+(z<30?.25:-.25),z<30?0:Math.PI);
 // Existing entrance-wall artwork lights remain on the wall.
 for(const x of [-10.2,-3.4,3.4,10.2])sconce(x,4.45,ATRIUM.front+.66,0);
 // Four broad, shadow-free fills supply the light shared by these fixtures.
 for(const side of [-1,1])for(const z of [25,42])spot(0xffd3a1,85,[side*11.5,6,z],[side*11.5,0,z],.8);
 // One shared halo texture supplies the chandelier's warm bloom without a forest of point lights.
 const halo=new T.Sprite(glow);halo.position.set(0,16,24);halo.scale.set(5,4,1);scene.add(halo);
}
/** Small highlight bloom, with a reduced blur budget on phones. The UI is ordinary DOM and stays sharp. */
export class LobbyLightPass{
 private composer:EffectComposer;private scenePass:RenderPass;private bloom:UnrealBloomPass;
 private timings?:RenderPassTimings;
 constructor(private renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera,private bloomRatio=.5,samples=4){
  // The scene is drawn into the composer's own buffers, where the canvas antialias setting does not reach, so they get
  // multisampling for smooth thin chair legs, rails and table rims. Both buffers need it: the composer swaps them every
  // frame, so with only one multisampled the scene alternated between smooth and jagged edges, which read as trembling.
  const size=renderer.getDrawingBufferSize(new T.Vector2());
  this.composer=new EffectComposer(renderer,new T.WebGLRenderTarget(Math.max(1,size.x),Math.max(1,size.y),{type:T.HalfFloatType,samples}));this.scenePass=new RenderPass(scene,camera);
  this.bloom=new UnrealBloomPass(new T.Vector2(256,256),.3,.7,1.2);
  const resize=this.bloom.setSize.bind(this.bloom);this.bloom.setSize=(w,h)=>resize(Math.max(1,w*this.bloomRatio|0),Math.max(1,h*this.bloomRatio|0));
  const output=new OutputPass();
  // Colour grade folded into the final pass (no extra full-screen pass): a touch warmer, a little more contrast and
  // saturation, so the gold and red velvet read richer and the candle shadows lose their grey haze.
  // OutputPass is a RawShaderMaterial: Three does not inject sampler precision.
  // iOS lowp samplers can lose HDR highlight channels, producing coloured specks.
  const shader=output.material.fragmentShader.replace('uniform sampler2D tDiffuse;', 'uniform highp sampler2D tDiffuse;'),end=shader.lastIndexOf('}');
  output.material.fragmentShader=shader.slice(0,end)+`
  {vec3 c=clamp(gl_FragColor.rgb,0.,1.);c*=vec3(1.03,1.,.94);c=(c-.5)*1.08+.5;float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.1);gl_FragColor.rgb=clamp(c,0.,1.);}
`+shader.slice(end);
  this.measurePass(this.scenePass,'sceneRender');
  this.measurePass(this.bloom,'postProcessing');
  this.measurePass(output,'postProcessing');
  this.composer.addPass(this.scenePass);this.composer.addPass(this.bloom);this.composer.addPass(output);
 }
 private measurePass(pass:Pass,stage:keyof RenderPassTimings){
  const render=pass.render.bind(pass);
  pass.render=(...args)=>{
   const timings=this.timings;
   if(!timings){render(...args);return;}
   const start=performance.now();
   render(...args);
   timings[stage]+=performance.now()-start;
  };
 }
 setBloomRatio(value:number){this.bloomRatio=value;}
 resize(width:number,height:number,ratio:number){this.composer.setPixelRatio(ratio);this.composer.setSize(width,height);}
 /** Change the scene buffer's multisampling (the buffer is rebuilt on the next frame). */
 setSamples(samples:number){for(const target of [this.composer.renderTarget1,this.composer.renderTarget2]){if(target.samples===samples)continue;target.samples=samples;target.dispose();}}
 render(scene:T.Scene,camera:T.Camera,timings?:RenderPassTimings){
  this.scenePass.scene=scene;this.scenePass.camera=camera;const auto=this.renderer.info.autoReset;this.renderer.info.reset();this.renderer.info.autoReset=false;
  this.timings=timings;
  try{this.composer.render();}finally{this.timings=undefined;this.renderer.info.autoReset=auto;}
 }
 dispose(){for(const pass of this.composer.passes)pass.dispose();this.composer.dispose();}
}
