import * as T from 'three';

const base=(import.meta.env?.BASE_URL??'/')+'textures/space/';
export const SPACE_ORBIT_CENTER=new T.Vector3(0,10,10);
const PLANET_ORBIT_SECONDS=720;
const SATURN_SPIN_SECONDS=42;

// Unequal angular gaps and elevations keep every side populated without a ring-like grid.
// Separate the largest silhouettes; distances control their apparent size from the hall.
const PLANETS=[
 {name:'mercury',radius:2.6,yaw:331,elevation:34,distance:76,tilt:.03,detail:24,spinPeriod:84},
 {name:'venus',radius:6.2,yaw:231,elevation:23,distance:83,tilt:.08,detail:24,spinPeriod:-100},
 {name:'mars',radius:4.1,yaw:124,elevation:17,distance:80,tilt:.22,detail:24,spinPeriod:56},
 {name:'jupiter',radius:18,yaw:18,elevation:29,distance:105,tilt:.16,detail:48,spinPeriod:105},
 {name:'saturn',radius:9,yaw:177,elevation:37,distance:94,detail:48,spinPeriod:SATURN_SPIN_SECONDS},
 {name:'uranus',radius:8,yaw:73,elevation:40,distance:96,tilt:-.35,detail:24,spinPeriod:-59},
 {name:'neptune',radius:10,yaw:283,elevation:19,distance:94,tilt:.34,detail:24,spinPeriod:51},
] as const;
const SATURN_RING_INNER=11.25;
const SATURN_RING_OUTER=18;
const SATURN_RING_TILT=T.MathUtils.degToRad(34);
const SATURN_RING_OPENING=T.MathUtils.degToRad(15);
const SATURN_SCREEN_DIAGONAL=new T.Vector3(Math.cos(SATURN_RING_TILT),Math.sin(SATURN_RING_TILT),0);
const SATURN_LIGHT=new T.Vector3(-.35,.65,1).applyAxisAngle(new T.Vector3(0,0,1),-SATURN_RING_TILT)
 .applyAxisAngle(new T.Vector3(1,0,0),-SATURN_RING_OPENING).normalize();

/** Real planetary maps on low-poly spheres, with baked vertex lighting and no extra lights. */
export class SpacePlanets {
 readonly root=new T.Group();
 private textures:T.Texture[]=[];
 private materials:T.MeshBasicMaterial[]=[];
 private readonly loader=new T.TextureLoader();
 private readonly saturn:T.Group;
 private readonly saturnRing:T.Mesh;
 private readonly saturnView=new T.Vector3();
 private readonly saturnCenter=new T.Vector3();
 private readonly saturnTangent=new T.Vector3();
 private readonly saturnAxis=new T.Vector3();
 private readonly saturnForward=new T.Vector3();
 private readonly saturnBasis=new T.Matrix4();
 private readonly cameraRotation=new T.Quaternion();
 private readonly orbitRotation=new T.Quaternion();
 private seconds=0;
 constructor(scene:T.Scene){
  this.root.name='space-planets';this.root.visible=false;
  this.root.position.copy(SPACE_ORBIT_CENTER);
  scene.add(this.root);
  const planet=(spec:typeof PLANETS[number])=>{
   const {name,radius,yaw,elevation,distance,detail,spinPeriod}=spec;
   const group=new T.Group();
   group.name=name;
   const azimuth=T.MathUtils.degToRad(yaw),altitude=T.MathUtils.degToRad(elevation);
   group.position.set(
    Math.sin(azimuth)*Math.cos(altitude),
    Math.sin(altitude),
    -Math.cos(azimuth)*Math.cos(altitude),
   ).multiplyScalar(distance);
   if(name!=='saturn')group.rotation.z=spec.tilt;
   this.root.add(group);
   const geometry=new T.SphereGeometry(radius,detail,detail===48?32:16),normals=geometry.getAttribute('normal');
   const colors=new Float32Array(normals.count*3),n=new T.Vector3();
   // Keep Saturn lit from the same side of the view and the other planets lit from the hall.
   const light=name==='saturn'?SATURN_LIGHT:new T.Vector3(-Math.sin(azimuth),.65,Math.cos(azimuth))
    .applyQuaternion(group.quaternion.clone().invert()).normalize();
   for(let i=0;i<normals.count;i++){
    n.fromBufferAttribute(normals,i);
    const shade=.055+.945*Math.max(0,n.dot(light));
    colors.set([shade,shade,shade],i*3);
   }
   geometry.setAttribute('color',new T.BufferAttribute(colors,3));
   const material=new T.MeshBasicMaterial({vertexColors:true,fog:false});
   group.add(this.texturedMesh(geometry,material,name+'.jpg',spinPeriod));return group;
  };
  this.saturn=PLANETS.map(planet).find(group=>group.name==='saturn')!;
  const rings=new T.RingGeometry(SATURN_RING_INNER,SATURN_RING_OUTER,80);
  const positions=rings.getAttribute('position'),uv=rings.getAttribute('uv');
  const ringWidth=SATURN_RING_OUTER-SATURN_RING_INNER;
  for(let i=0;i<positions.count;i++){
   const radius=Math.hypot(positions.getX(i),positions.getY(i));
   uv.setXY(i,(radius-SATURN_RING_INNER)/ringWidth,.5);
  }
  // The sphere's equator and ring both lie in the tilted group's local XZ plane.
  rings.rotateX(-Math.PI/2);
  const material=new T.MeshBasicMaterial({side:T.DoubleSide,alphaTest:.15,fog:false});
  this.saturnRing=this.texturedMesh(rings,material,'saturn-ring.png');
  this.saturn.add(this.saturnRing);
 }
 frameSaturn(camera:T.Camera){
  if(!this.root.visible)return;
  // Keep the 3D equator's presentation relative to the observer as Saturn orbits.
  this.saturn.getWorldPosition(this.saturnCenter);
  camera.getWorldQuaternion(this.cameraRotation);
  camera.getWorldPosition(this.saturnView).sub(this.saturnCenter).normalize()
   .applyQuaternion(this.cameraRotation.invert());
  const view=this.saturnView;
  if(view.z<=0)return;
  const tangent=this.saturnTangent.copy(SATURN_SCREEN_DIAGONAL).addScaledVector(view,-view.dot(SATURN_SCREEN_DIAGONAL)).normalize();
  const axis=this.saturnAxis.crossVectors(view,tangent).multiplyScalar(Math.cos(SATURN_RING_OPENING))
   .addScaledVector(view,Math.sin(SATURN_RING_OPENING));
  this.saturnForward.crossVectors(tangent,axis);
  this.saturnBasis.makeBasis(tangent,axis,this.saturnForward);
  this.root.getWorldQuaternion(this.orbitRotation).invert();
  this.saturn.quaternion.setFromRotationMatrix(this.saturnBasis).premultiply(this.cameraRotation.invert())
   .premultiply(this.orbitRotation);
 }
 private texturedMesh(geometry:T.BufferGeometry,material:T.MeshBasicMaterial,file:string,spinPeriod?:number){
  const mesh=new T.Mesh(geometry,material);
  this.materials.push(material);
  material.colorWrite=false;
  material.depthWrite=false;
  // Three.js calls this after frustum culling. Keep the texture for later views.
  mesh.onBeforeRender=()=>{
   if(material.map){
    // Spin the surface around its axis without dragging the baked lighting or ring along.
    if(spinPeriod)material.map.offset.x=T.MathUtils.euclideanModulo(this.seconds/spinPeriod,1);
    return;
   }
   const map=this.loader.load(base+file,()=>{
    material.colorWrite=true;
    material.depthWrite=true;
   });
   map.colorSpace=T.SRGBColorSpace;
   if(spinPeriod)map.wrapS=T.RepeatWrapping;
   material.map=map;
   material.needsUpdate=true;
   this.textures.push(map);
  };
  return mesh;
 }
 orbit(seconds:number){
  if(!this.root.visible)return;
  this.seconds=seconds;
  // A positive texture offset moves surface features toward decreasing local longitude.
  this.saturnRing.rotation.y=-T.MathUtils.euclideanModulo(seconds/SATURN_SPIN_SECONDS,1)*Math.PI*2;
  this.root.rotation.y=T.MathUtils.euclideanModulo(seconds,PLANET_ORBIT_SECONDS)/PLANET_ORBIT_SECONDS*Math.PI*2;
 }
 update(progress:number){
  this.root.visible=progress>0;
  const brightness=T.MathUtils.smoothstep(progress,0,.65);
  for(const material of this.materials)material.color.setScalar(brightness);
 }
 dispose(){
  this.root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});
  for(const material of this.materials)material.dispose();
  for(const texture of this.textures)texture.dispose();
  this.root.removeFromParent();
 }
}

/** Static, seeded stars in one point batch behind the hall and planets. */
export class SpaceStars {
 private readonly points:T.Points<T.BufferGeometry,T.ShaderMaterial>;

 constructor(scene:T.Scene){
  const count=1400,radius=152;
  const positions=new Float32Array(count*3);
  const magnitude=new Float32Array(count);
  let seed=91753;
  const random=()=>{
   seed=(Math.imul(1664525,seed)+1013904223)>>>0;
   return seed/0x100000000;
  };
  for(let i=0;i<count;i++){
   const y=.05+random()*.95;
   const angle=random()*Math.PI*2;
   const horizontal=Math.sqrt(1-y*y);
   positions[i*3]=radius*horizontal*Math.cos(angle);
   positions[i*3+1]=radius*y;
   positions[i*3+2]=radius*horizontal*Math.sin(angle);
   magnitude[i]=Math.pow(random(),3);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  geometry.setAttribute('magnitude',new T.BufferAttribute(magnitude,1));
  const material=new T.ShaderMaterial({
   uniforms:{strength:{value:0}},
   transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
   vertexShader:`
    attribute float magnitude;
    varying float brightness;
    void main(){
     brightness=magnitude;
     gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
     gl_Position.z=gl_Position.w;
     gl_PointSize=mix(1.1,3.0,magnitude);
    }
   `,
   fragmentShader:`
    uniform float strength;
    varying float brightness;
    void main(){
     float core=1.0-smoothstep(0.05,0.5,length(gl_PointCoord-0.5));
     vec3 color=mix(vec3(0.62,0.74,1.0),vec3(1.0,0.88,0.72),brightness);
     gl_FragColor=vec4(color,core*mix(0.18,0.80,brightness)*strength);
     #include <colorspace_fragment>
    }
   `,
  });
  this.points=new T.Points(geometry,material);
  this.points.name='space-background-stars';
  this.points.position.copy(SPACE_ORBIT_CENTER);
  this.points.renderOrder=-1001;
  this.points.visible=false;
  scene.add(this.points);
 }

 update(progress:number){
  this.points.visible=progress>0;
  this.points.material.uniforms.strength.value=T.MathUtils.smoothstep(progress,.1,.85);
 }

 dispose(){
  this.points.geometry.dispose();
  this.points.material.dispose();
  this.points.removeFromParent();
 }
}
