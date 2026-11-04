import {ATRIUM,LOBBY_ARCADE} from '../../shared/grandStair';
import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

/** Warm practical lighting lives in small pools, with deeper amber shade in the upper galleries. */
export function lobbyPracticalLights(scene:T.Scene){
 const spot=(color:number,power:number,position:number[],target:number[],angle:number)=>{
  const light=new T.SpotLight(color,power,32,angle,.85,2);light.position.fromArray(position);light.target.position.fromArray(target);scene.add(light,light.target);
 };
 spot(0xffbc7b,260,[0,15,27],[0,0,31],.68);
 spot(0xffc18a,115,[-12,7,24],[-11.8,1,24],.58);
 for(const side of [-1,1]){const fill=new T.PointLight(0xffc88e,25,20,2);fill.position.set(side*12.7,4.1,34);scene.add(fill);}
 if(typeof document==='undefined')return;
 const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=64;const ctx=haloCanvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,0,32,32,32);
 gradient.addColorStop(0,'rgba(255,225,180,.65)');gradient.addColorStop(.15,'rgba(255,195,120,.24)');gradient.addColorStop(1,'rgba(255,180,100,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const map=new T.CanvasTexture(haloCanvas);map.colorSpace=T.SRGBColorSpace;
 const glow=new T.SpriteMaterial({map,color:0xffd3a0,transparent:true,opacity:.45,depthWrite:false,blending:T.AdditiveBlending});
 // Brass wall lanterns share their meshes and baked wall wash; just two local fills light the side aisles.
 const brass=new T.MeshStandardMaterial({color:0xb98a47,metalness:.65,roughness:.35});
 const lamp=new T.MeshStandardMaterial({color:0xffe5bd,emissive:0xffb65e,emissiveIntensity:4,roughness:.5});
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
/** Small highlight bloom, half-resolution on every device. The UI is ordinary DOM and stays sharp. */
export class LobbyLightPass{
 private composer:EffectComposer;private scenePass:RenderPass;private bloom:UnrealBloomPass;
 constructor(private renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera){
  this.composer=new EffectComposer(renderer);this.scenePass=new RenderPass(scene,camera);
  this.bloom=new UnrealBloomPass(new T.Vector2(256,256),.3,.7,1.2);
  const resize=this.bloom.setSize.bind(this.bloom);this.bloom.setSize=(w,h)=>resize(Math.max(1,w/2|0),Math.max(1,h/2|0));
  this.composer.addPass(this.scenePass);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
 }
 resize(width:number,height:number,ratio:number){this.composer.setPixelRatio(ratio);this.composer.setSize(width,height);}
 render(scene:T.Scene,camera:T.Camera){
  this.scenePass.scene=scene;this.scenePass.camera=camera;const auto=this.renderer.info.autoReset;this.renderer.info.reset();this.renderer.info.autoReset=false;
  try{this.composer.render();}finally{this.renderer.info.autoReset=auto;}
 }
 dispose(){for(const pass of this.composer.passes)pass.dispose();this.composer.dispose();}
}
