import * as T from 'three';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {Ghosts,type GhostSpot} from './Ghosts';
import {material} from './primitives';
import {REAR_SCREENS} from '../../shared/gallery';
import {WALL_DATUM} from './HallWallBands';

function arch(width:number,height:number){
 const radius=width/2,shoulder=height/2-radius;
 const shape=new T.Shape();
 shape.moveTo(-radius,-height/2);
 shape.lineTo(radius,-height/2);
 shape.lineTo(radius,shoulder);
 shape.absarc(0,shoulder,radius,0,Math.PI,false);
 shape.closePath();
 return new T.ShapeGeometry(shape,16);
}


// The installed Three.js runtime exposes this shader; its companion types omit it.
const reflectorShader=(Reflector as typeof Reflector&{ReflectorShader:{uniforms:Record<string,T.IUniform>;vertexShader:string;fragmentShader:string}}).ReflectorShader;
/** Surface-only mist: no background scene, lights, textures or postprocessing. */
const mirrorShader={
 ...reflectorShader,
 uniforms:{...reflectorShader.uniforms,uTime:{value:0},uPresence:{value:0}},
 vertexShader:reflectorShader.vertexShader
  .replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 vSurface;')
  .replace('vUv = textureMatrix', 'vSurface = position.xy / vec2(1.20, 2.31) + 0.5; vUv = textureMatrix'),
 fragmentShader:reflectorShader.fragmentShader
  .replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 vSurface; uniform float uTime; uniform float uPresence;')
  .replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );', `
   vec2 p=(vSurface-0.5)*vec2(1.0,1.55);
   float t=uTime*0.15;
   float flow=sin(p.y*9.0+t+sin(p.x*8.0-t))*0.5;
   flow+=sin(p.x*12.0-p.y*5.0-t*1.3+flow)*0.3;
   float veil=0.5+0.5*sin(p.y*16.0+flow*3.0+t);
   float aura=exp(-dot(p,p)*3.2);
   float rim=pow(clamp(length(p*vec2(1.7,1.0)),0.0,1.0),2.0);
   vec3 mist=mix(vec3(0.055,0.04,0.105),vec3(0.19,0.14,0.32),aura);
   mist+=vec3(0.07,0.12,0.14)*veil*(0.3+rim)*0.65;
   mist+=vec3(0.12,0.075,0.14)*pow(0.5+0.5*sin(length(p)*29.0-t*1.8+flow),12.0)*rim;
   mist*=0.38+0.62*uPresence;
   float silhouette=base.a*uPresence;
   gl_FragColor=vec4(mix(mist,blendOverlay(base.rgb,color),silhouette),1.0);
  `)
};

/** A nearby, live reflection reveals the visitor's ghost form. */
export class HallMirror{
 readonly root=new T.Group();
 private readonly glass:Reflector;
 private readonly ghostsScene=new T.Scene();
 private readonly ghosts=new Ghosts(this.ghostsScene);
 private avatar:T.Object3D|null=null;
 private spot:GhostSpot|null=null;
 private updatedAt=-Infinity;
 private readonly reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private readonly reflectionEye = new T.PerspectiveCamera();
 private readonly normal = new T.Vector3();
 private readonly planePoint = new T.Vector3();
 private readonly direction = new T.Vector3();
 private readonly lookTarget = new T.Vector3();
 private readonly plane = new T.Plane();
 private readonly clearColor = new T.Color();
 constructor(scene:T.Scene){
  // Side-wall panel beside the stair door, below its lamp on the rear landing.
  const landingFaceZ = REAR_SCREENS.z + REAR_SCREENS.thickness / 2;
  const panelCenterZ = (landingFaceZ + WALL_DATUM.rear) / 2;
  this.root.position.set(WALL_DATUM.halfWidth-.29,1.94,panelCenterZ);
  this.root.rotation.y = -Math.PI / 2;
  this.ghostsScene.background=null;
  this.root.userData.landmark='hall-mirror';
  const frame=new T.Mesh(arch(1.44,3.57),material(0x9f763e));
  const bevel=new T.Mesh(arch(1.29,3.42),material(0x403126));bevel.position.z=.018;
  this.glass=new Reflector(arch(1.20,3.33),{textureWidth:1024,textureHeight:1024,multisample:0,color:0xc8d6de,clipBias:.003,shader:mirrorShader});
  this.glass.position.z=.031;
  const renderReflection = this.glass.onBeforeRender.bind(this.glass);
  this.glass.onBeforeRender=(renderer,world,camera,geometry,mat,group)=>{
   const now=performance.now();
   const uniforms=(this.glass.material as T.ShaderMaterial).uniforms;
   uniforms.uTime.value=this.reduced?0:now/1000;
   const distance=this.spot?Math.hypot(this.spot.x-this.root.position.x,this.spot.z-this.root.position.z):Infinity;
   // Use the visitor's distance so zooming the camera out cannot hide the reflection.
   const nearby = !!this.avatar && distance < 10;
   uniforms.uPresence.value = nearby ? T.MathUtils.smoothstep(10-distance,0,3) : 0;
   if(!this.spot||!nearby||now-this.updatedAt<1000/24)return;
   this.updatedAt=now;
   if (!(camera instanceof T.PerspectiveCamera)) return;
   // Reflect the actual viewer across the glass plane. The ghost keeps the
   // visitor's world position and pose, including lateral movement and distance.
   this.glass.getWorldPosition(this.planePoint);
   this.glass.getWorldDirection(this.normal);
   this.plane.setFromNormalAndCoplanarPoint(this.normal,this.planePoint);
   const eye = this.reflectionEye.copy(camera);
   eye.position.addScaledVector(this.normal,-2*this.plane.distanceToPoint(camera.position));
   camera.getWorldDirection(this.direction).reflect(this.normal);
   eye.lookAt(this.lookTarget.copy(eye.position).add(this.direction));
   eye.updateMatrixWorld();
   this.ghosts.update([this.spot],eye,now);
   renderer.getClearColor(this.clearColor);
   const clearAlpha = renderer.getClearAlpha();
   try {
    renderer.setClearColor(0x000000,0);
    renderReflection(renderer,this.ghostsScene,camera,geometry,mat,group);
   } finally {
    renderer.setClearColor(this.clearColor,clearAlpha);
   }
  };
  const back=new T.Mesh(arch(1.44,3.57),material(0x403126));back.rotation.y=Math.PI;back.position.z=-.025;
  this.root.add(frame,bevel,this.glass,back);scene.add(this.root);
 }
 setVisitor(avatar:T.Object3D|null,spot:GhostSpot|null){this.avatar=avatar;this.spot=spot;}
 dispose(){
  this.glass.dispose();
  this.ghostsScene.traverse(object=>{if(object instanceof T.Mesh){object.geometry.dispose();for(const mat of Array.isArray(object.material)?object.material:[object.material])mat.dispose();}});
 }
}
