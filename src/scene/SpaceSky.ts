import * as T from 'three';
import {GOLDEN_HALL} from '../../shared/goldenHall';

const base=(import.meta.env?.BASE_URL??'/')+'textures/space/';
export const SPACE_ORBIT_CENTER=new T.Vector3(0,10,10);
const PLANET_ORBIT_SECONDS=720;
const SATURN_SPIN_SECONDS=42;
const EARTH_RADIUS=21.4;
const EARTH_SPIN_SECONDS=120;
const MOON_RADIUS=EARTH_RADIUS*.273;
const MOON_ORBIT_RADIUS=34;
const MOON_ORBIT_SECONDS=96;
const MOON_ORBIT_TILT=.22;

// The gallery looks across the lower sky, while the floor sees over the rail toward Earth, Saturn and Jupiter.
// Vary azimuth and orbital radius to leave room between the silhouettes from both floors.
const PLANETS=[
 {name:'mercury',radius:4,yaw:290,elevation:16,distance:104,tilt:.03,detail:24,spinPeriod:84},
 {name:'venus',radius:8.2,yaw:207,elevation:9,distance:118,tilt:.08,detail:24,spinPeriod:-100},
 {name:'earth',radius:EARTH_RADIUS,yaw:249,elevation:27,distance:132,tilt:.41,detail:48,spinPeriod:EARTH_SPIN_SECONDS},
 {name:'mars',radius:5.95,yaw:113,elevation:13,distance:111,tilt:.22,detail:24,spinPeriod:56},
 {name:'jupiter',radius:29.7,yaw:15,elevation:32,distance:142,tilt:.16,detail:48,spinPeriod:105},
 {name:'saturn',radius:9,yaw:163,elevation:36,distance:121,detail:48,spinPeriod:SATURN_SPIN_SECONDS},
 {name:'uranus',radius:13.6,yaw:64,elevation:19,distance:140,tilt:-.35,detail:24,spinPeriod:-59},
 {name:'neptune',radius:17.4,yaw:325,elevation:23,distance:154,tilt:.34,detail:24,spinPeriod:51},
] as const;
const DISTANT_PLANETS=[
 {radius:.81,yaw:351,elevation:49,distance:155,color:0xa38fc8},
 {radius:4.81,yaw:47,elevation:9,distance:147,color:0x6eb2a3},
 {radius:1.09,yaw:87,elevation:12,distance:167,color:0xc9957a},
 {radius:3.54,yaw:114,elevation:29,distance:132,color:0x849dc1},
 {radius:1.26,yaw:132,elevation:46,distance:157,color:0xc5ad8a},
 {radius:3.33,yaw:186,elevation:13,distance:153,color:0x987dc2},
 {radius:1.62,yaw:213,elevation:23,distance:161,color:0x8db9ba},
 {radius:2.88,yaw:272,elevation:6,distance:160,color:0xc0776c},
 {radius:1.67,yaw:303,elevation:29,distance:136,color:0xbbbf88},
 {radius:2.25,yaw:342,elevation:13,distance:152,color:0x6b9fcb},
] as const;
const SATURN_RING_INNER=11.25;
const SATURN_RING_OUTER=18;
const SATURN_RING_TILT=T.MathUtils.degToRad(34);
const SATURN_RING_OPENING=T.MathUtils.degToRad(15);
const SATURN_SCREEN_DIAGONAL=new T.Vector3(Math.cos(SATURN_RING_TILT),Math.sin(SATURN_RING_TILT),0);
const SATURN_LIGHT=new T.Vector3(-.35,.65,1).applyAxisAngle(new T.Vector3(0,0,1),-SATURN_RING_TILT)
 .applyAxisAngle(new T.Vector3(1,0,0),-SATURN_RING_OPENING).normalize();

function facingBasis(normal:T.Vector3,up:T.Vector3){
 const right=new T.Vector3().crossVectors(up,normal).normalize();
 return new T.Matrix4().makeBasis(right,new T.Vector3().crossVectors(normal,right),normal);
}

function earthOrientation(position:T.Vector3,tilt:T.Quaternion){
 // Set the zero phase of the equirectangular map to Korea with north upright.
 const latitude=T.MathUtils.degToRad(36),longitude=T.MathUtils.degToRad(128);
 const korea=new T.Vector3(Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),-Math.cos(latitude)*Math.sin(longitude));
 const inverse=tilt.clone().invert();
 const eyeHeight=1.3+GOLDEN_HALL.balconyHeight/2;
 const towardsHall=new T.Vector3(0,eyeHeight-SPACE_ORBIT_CENTER.y,0).sub(position).applyQuaternion(inverse).normalize();
 const north=new T.Vector3(0,1,0);
 const textureBasis=facingBasis(korea,north);
 const hallBasis=facingBasis(towardsHall,north.applyQuaternion(inverse));
 return new T.Quaternion().setFromRotationMatrix(hallBasis.multiply(textureBasis.transpose()));
}

/** Real planetary maps on low-poly spheres, with baked vertex lighting and no extra lights. */
export class SpacePlanets {
 readonly root=new T.Group();
 private textures:T.Texture[]=[];
 private materials:T.MeshBasicMaterial[]=[];
 private readonly loader=new T.TextureLoader();
 private readonly saturn:T.Group;
 private readonly saturnRing:T.Mesh;
 private readonly moon:T.Mesh;
 private readonly moonOrbitStart=new T.Vector3(1,0,0);
 private readonly moonOrbitTangent=new T.Vector3();
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
  const moonLight=new T.Vector3();
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
   // Keep Saturn lit from the same side of the view and the other planets lit from the hall.
   const light=name==='saturn'?SATURN_LIGHT:new T.Vector3(-Math.sin(azimuth),.65,Math.cos(azimuth))
    .applyQuaternion(group.quaternion.clone().invert()).normalize();
   if(name==='earth'){
    moonLight.copy(light);
    const orientation=earthOrientation(group.position,group.quaternion);
    // Derive the moon's orbit from Earth's texture pole while keeping the initial approach side.
    const pole=new T.Vector3(0,1,0).applyQuaternion(orientation);
    this.moonOrbitStart.projectOnPlane(pole).normalize();
    // A positive texture scroll spins about -pole; the moon travels in the same direction.
    this.moonOrbitTangent.crossVectors(this.moonOrbitStart,pole)
     .applyAxisAngle(this.moonOrbitStart,-MOON_ORBIT_TILT);
    light.applyQuaternion(orientation.clone().invert());
    const surface=this.planetSurface(radius,detail,light,'earth.jpg',spinPeriod);
    surface.quaternion.copy(orientation);
    group.add(surface);
   }else{
    group.add(this.planetSurface(radius,detail,light,name+'.jpg',spinPeriod));
   }
   return group;
  };
  const planets=PLANETS.map(planet);
  const earth=planets.find(group=>group.name==='earth')!;
  this.moon=this.planetSurface(MOON_RADIUS,24,moonLight,'moon.jpg',MOON_ORBIT_SECONDS);
  this.moon.name='moon';
  this.moon.position.copy(this.moonOrbitStart).multiplyScalar(MOON_ORBIT_RADIUS);
  earth.add(this.moon);
  this.saturn=planets.find(group=>group.name==='saturn')!;
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
  this.addDistantPlanets();
 }
 private planetSurface(radius:number,detail:number,light:T.Vector3,file:string,spinPeriod:number){
  const geometry=new T.SphereGeometry(radius,detail,detail===48?32:16);
  const normals=geometry.getAttribute('normal'),colors=new Float32Array(normals.count*3),normal=new T.Vector3();
  for(let i=0;i<normals.count;i++){
   normal.fromBufferAttribute(normals,i);
   const shade=.055+.945*Math.max(0,normal.dot(light));
   colors.fill(shade,i*3,i*3+3);
  }
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  return this.texturedMesh(geometry,new T.MeshBasicMaterial({vertexColors:true,fog:false}),file,spinPeriod);
 }
 private addDistantPlanets(){
  const geometry=new T.SphereGeometry(1,12,8);
  const normals=geometry.getAttribute('normal'),colors=new Float32Array(normals.count*3);
  const normal=new T.Vector3(),light=new T.Vector3(-.52,.67,.53).normalize();
  for(let i=0;i<normals.count;i++){
   normal.fromBufferAttribute(normals,i);
   const shade=.12+.88*Math.max(0,normal.dot(light));
   const bands=.86+.14*Math.cos(normal.y*14+normal.x*2.5);
   colors.fill(shade*bands,i*3,i*3+3);
  }
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  const material=new T.MeshBasicMaterial({vertexColors:true,fog:false});
  this.materials.push(material);
  const mesh=new T.InstancedMesh(geometry,material,DISTANT_PLANETS.length);
  mesh.name='space-distant-planets';
  const transform=new T.Object3D();
  for(const [index,planet] of DISTANT_PLANETS.entries()){
   const yaw=T.MathUtils.degToRad(planet.yaw),altitude=T.MathUtils.degToRad(planet.elevation);
   transform.position.set(Math.sin(yaw)*Math.cos(altitude),Math.sin(altitude),-Math.cos(yaw)*Math.cos(altitude))
    .multiplyScalar(planet.distance);
   transform.rotation.set(0,-yaw,.22*Math.sin(index));
   transform.scale.setScalar(planet.radius);
   transform.updateMatrix();
   mesh.setMatrixAt(index,transform.matrix);
   mesh.setColorAt(index,new T.Color(planet.color));
  }
  this.root.add(mesh);
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
  const phase=T.MathUtils.euclideanModulo(seconds,MOON_ORBIT_SECONDS)/MOON_ORBIT_SECONDS*Math.PI*2;
  this.moon.position.copy(this.moonOrbitStart).multiplyScalar(Math.cos(phase)*MOON_ORBIT_RADIUS)
   .addScaledVector(this.moonOrbitTangent,Math.sin(phase)*MOON_ORBIT_RADIUS);
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
  this.root.traverse(o=>{
   if(o instanceof T.Mesh)o.geometry.dispose();
   if(o instanceof T.InstancedMesh)o.dispose();
  });
  for(const material of this.materials)material.dispose();
  for(const texture of this.textures)texture.dispose();
  this.root.removeFromParent();
 }
}

/** Seeded stars above the hall and around the horizon. */
export class SpaceStars {
 private readonly root=new T.Group();
 private readonly material:T.ShaderMaterial;

 constructor(scene:T.Scene){
  let seed=91753;
  const random=()=>{
   seed=(Math.imul(1664525,seed)+1013904223)>>>0;
   return seed/0x100000000;
  };
  this.material=new T.ShaderMaterial({
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
  const addStars=(name:string,count:number,radius:number,minY:number,maxY:number,minAngle:number,maxAngle:number)=>{
   const positions=new Float32Array(count*3),magnitude=new Float32Array(count);
   for(let i=0;i<count;i++){
    const y=T.MathUtils.lerp(minY,maxY,random());
    const angle=T.MathUtils.lerp(minAngle,maxAngle,random());
    const horizontal=Math.sqrt(1-y*y);
    positions[i*3]=radius*horizontal*Math.cos(angle);
    positions[i*3+1]=radius*y;
    positions[i*3+2]=radius*horizontal*Math.sin(angle);
    magnitude[i]=Math.pow(random(),3);
   }
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.BufferAttribute(positions,3));
   geometry.setAttribute('magnitude',new T.BufferAttribute(magnitude,1));
   const points=new T.Points(geometry,this.material);
   points.name=name;
   points.renderOrder=-1001;
   this.root.add(points);
  };
  const turn=Math.PI*2;
  addStars('space-background-stars',1400,152,.05,1,0,turn);
  // The lower sky overlaps the upper stars at the horizon. A smaller radius keeps the
  // tiles within the hall camera's far plane so Three.js can cull them by view direction.
  const sectors=8;
  for(let i=0;i<sectors;i++){
   const start=i*turn/sectors,end=(i+1)*turn/sectors;
   addStars('space-horizon-stars',84,92,-.44,.12,start,end);
   addStars('space-horizon-stars',84,92,-1,-.44,start,end);
  }
  this.root.position.copy(SPACE_ORBIT_CENTER);
  this.root.visible=false;
  scene.add(this.root);
 }

 update(progress:number){
  this.root.visible=progress>0;
  this.material.uniforms.strength.value=T.MathUtils.smoothstep(progress,.1,.85);
 }

 dispose(){
  for(const points of this.root.children as T.Points[])points.geometry.dispose();
  this.material.dispose();
  this.root.removeFromParent();
 }
}
