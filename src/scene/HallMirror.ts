import * as T from 'three';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {Ghosts,type GhostSpot} from './Ghosts';
import {material} from './primitives';
import {REAR_SCREENS} from '../../shared/gallery';
import {WALL_DATUM} from './HallWallBands';
import {MIRROR_RASTER} from './quality';

const GLASS_WIDTH=1.20,GLASS_HEIGHT=3.33;
const glassCorners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>new T.Vector4(x*GLASS_WIDTH/2,y*GLASS_HEIGHT/2,0,1));

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
   vec3 ghost=base.rgb/max(base.a,0.001);
   gl_FragColor=vec4(mix(mist,blendOverlay(ghost,color),silhouette),1.0);
  `)
};

/** A nearby, live reflection reveals the visitor's ghost form. */
export class HallMirror{
 readonly root=new T.Group();
 readonly standingMarker:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;
 readonly standingPoint:T.Vector3;
 private readonly standingRing:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>;
 private readonly standingRipple:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>;
 private readonly glass:Reflector;
 private readonly ghostsScene=new T.Scene();
 private readonly ghosts=new Ghosts(this.ghostsScene);
 private avatar:T.Object3D|null=null;
 private spot:GhostSpot|null=null;
 private updatedAt=-Infinity;
 private readonly reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private readonly reflectionEye = new T.PerspectiveCamera();
 private readonly reflectionSource = new T.PerspectiveCamera();
 private readonly clipFromGlass = new T.Matrix4();
 private readonly clipCorners = glassCorners.map(()=>new T.Vector4());
 private readonly clipIntersection = new T.Vector4();
 private readonly crop = new T.Matrix4();
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
  this.standingPoint=new T.Vector3(this.root.position.x-2.15,0,panelCenterZ);
  this.standingMarker=new T.Mesh(new T.PlaneGeometry(1.46,1.46),new T.MeshBasicMaterial({visible:false}));
  this.standingMarker.position.copy(this.standingPoint);this.standingMarker.position.y=.036;
  this.standingMarker.rotation.x=-Math.PI/2;
  this.standingMarker.userData.mirrorStandingSpot=true;
  this.standingMarker.userData.fullDetail=true;
  this.standingRing=new T.Mesh(new T.RingGeometry(.40,.44,64),new T.MeshBasicMaterial({color:0xf0d29b,transparent:true,opacity:.85,depthWrite:false}));
  this.standingRipple=new T.Mesh(new T.RingGeometry(.43,.45,64),new T.MeshBasicMaterial({color:0xe5c786,transparent:true,opacity:.36,depthWrite:false}));
  this.standingRipple.position.z=.001;
  this.standingRing.raycast=()=>{};
  this.standingRipple.raycast=()=>{};
  this.standingMarker.add(this.standingRing,this.standingRipple);
  scene.add(this.standingMarker);
  this.ghostsScene.background=null;
  this.root.userData.landmark='hall-mirror';
  const frame=new T.Mesh(arch(1.44,3.57),material(0x9f763e));
  const bevel=new T.Mesh(arch(1.29,3.42),material(0x403126));bevel.position.z=.018;
  this.glass=new Reflector(arch(GLASS_WIDTH,GLASS_HEIGHT),{textureWidth:MIRROR_RASTER.width,textureHeight:MIRROR_RASTER.height,multisample:MIRROR_RASTER.samples,color:0xc8d6de,clipBias:.003,shader:mirrorShader});
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
   if (!(camera instanceof T.PerspectiveCamera)||!this.cropToGlass(camera)) return;
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
    renderReflection(renderer,this.ghostsScene,this.reflectionSource,geometry,mat,group);
   } finally {
    renderer.setClearColor(this.clearColor,clearAlpha);
   }
  };
  const back=new T.Mesh(arch(1.44,3.57),material(0x403126));back.rotation.y=Math.PI;back.position.z=-.025;
  this.root.add(frame,bevel,this.glass,back);scene.add(this.root);
 }
 /** Zoom the reflection projection to the part of the viewport occupied by the glass.
  * Reflector uses this same projection to compute its texture coordinates. */
 private cropToGlass(camera:T.PerspectiveCamera){
  this.clipFromGlass.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(this.glass.matrixWorld);
  for(const [index,corner] of glassCorners.entries())this.clipCorners[index].copy(corner).applyMatrix4(this.clipFromGlass);
  let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
  for(const [index,corner] of this.clipCorners.entries()){
   const next=this.clipCorners[(index+1)%this.clipCorners.length];
   const depth=corner.z+corner.w,nextDepth=next.z+next.w;
   // Clip edges crossing the near plane before dividing by w.
   if(depth>=0){
    const x=corner.x/corner.w,y=corner.y/corner.w;
    left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);
   }
   if((depth>=0)!==(nextDepth>=0)){
    const point=this.clipIntersection.copy(corner).lerp(next,depth/(depth-nextDepth));
    const x=point.x/point.w,y=point.y/point.w;
    left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);
   }
  }
  left=Math.max(-1,left-.01);right=Math.min(1,right+.01);
  bottom=Math.max(-1,bottom-.01);top=Math.min(1,top+.01);
  const width=right-left,height=top-bottom;
  if(width<=0||height<=0)return false;
  // The reflected camera reverses the horizontal axis on the glass plane.
  this.crop.set(2/width,0,0,(left+right)/width,0,2/height,0,-(bottom+top)/height,0,0,1,0,0,0,0,1);
  this.reflectionSource.copy(camera,false);
  this.reflectionSource.projectionMatrix.premultiply(this.crop);
  return true;
 }
 setVisitor(avatar:T.Object3D|null,spot:GhostSpot|null){this.avatar=avatar;this.spot=spot;}
 updateStandingMarker(time:number,occupied:boolean){
  const phase=this.reduced?.35:(time%2.4)/2.4;
  this.standingRing.material.opacity=occupied?.48:.86;
  this.standingRipple.visible=!occupied;
  this.standingRipple.scale.setScalar(1+phase*.55);
  this.standingRipple.material.opacity=.55*(1-phase)**1.5;
 }
 dispose(){
  this.standingMarker.removeFromParent();
  for(const mesh of [this.standingMarker,this.standingRing,this.standingRipple]){
   mesh.geometry.dispose();mesh.material.dispose();
  }
  this.glass.dispose();
  this.ghostsScene.traverse(object=>{if(object instanceof T.Mesh){object.geometry.dispose();for(const mat of Array.isArray(object.material)?object.material:[object.material])mat.dispose();}});
 }
}
