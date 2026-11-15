import * as T from 'three';
import { REAR_SCREENS } from '../../shared/gallery';
import { WALL_DATUM } from './HallWallBands';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {glowTexture} from './Candlelight';
import {box,cylinder,sphere} from './primitives';

/** Repeated fixtures share geometry/materials; a few broad lights illuminate each bank. */
export function buildHallPracticalLights(scene:T.Scene){
 // First-floor fixtures belong to the new centred wall composition.
 for(const z of [-20,6,32]){
  const light=new T.PointLight(0xffc17b,70,35,2);light.position.set(0,15,z);scene.add(light);
  for(const side of [-1,1]){
   const wash=new T.SpotLight(0xffbb70,90,26,.95,.85,2);wash.position.set(side*12,10.5,z);wash.target.position.set(side*15.6,2.5,z);scene.add(wash,wash.target);
  }
 }
 for(const side of [-1,1])for(const z of [-12,24]){
  const upper=new T.SpotLight(0xffc27e,65,28,1.1,.9,2);upper.position.set(side*10.8,18,z);upper.target.position.set(side*15.5,12,z);
  upper.userData.upperWallLight=upper.target.userData.upperWallLight=true;
  scene.add(upper,upper.target);
 }
 // Light across the performers, rather than bleaching the whole audience floor.
 for(const side of [-1,1]){
  const key=new T.SpotLight(0xffd19b,120,32,.85,.8,2);key.position.set(side*10,12,-15);key.target.position.set(-side*3,1,-21);scene.add(key,key.target);
 }
}

const fixtureGold=new T.MeshStandardMaterial({color:0xb68b48,metalness:.65,roughness:.42});
const fixtureGlass=new T.MeshStandardMaterial({color:0xffe1a1,emissive:0xffbf66,emissiveIntensity:1.5,roughness:.6});
const wallWashGeometry=new T.PlaneGeometry(1,1);
/** A new chased-brass sconce, centred on the panel's gilded spine. */
export function hallPanelSconce(parent:T.Object3D,x:number,y:number,z:number,washWidth=3.2,washHeight=6.4,washOffsetY=0){
 const root=new T.Group();root.position.set(x,y,z);root.userData.landmark='panel-centre-sconce';parent.add(root);
 box(root,[.27,.88,.075],[0,0,0],0xb68b48).material=fixtureGold;
 const glass=cylinder(root,.105,.46,[0,0,.20],0xffe6bb);glass.material=fixtureGlass;glass.userData.lampGlow=true;
 for(const yy of [-.27,.27])cylinder(root,.15,.07,[0,yy,.20],0xb68b48).material=fixtureGold;
 for(const yy of [-.38,.38])sphere(root,.065,[0,yy,.16],0xb68b48).material=fixtureGold;
 // The wall glow is only recorded here; buildHallLampHalos draws every lamp's glow in one batch.
 root.userData.wallWash=[washWidth,washHeight,washOffsetY];
 root.traverse(o=>{o.userData.fullDetail=true;});return root;
}
/** Shallow light and carved gold plate sit on the header, above the door leaf. */
export function hallDoorHeaderLight(parent:T.Object3D,y:number){
 const root=new T.Group();root.position.set(0,y,.46);root.userData.landmark='door-header-light';parent.add(root);
 box(root,[.57,.28,.085],[0,0,0],0xb68b48).material=fixtureGold;
 const glass=box(root,[.28,.14,.07],[0,0,.09],0xffe6bb);glass.material=fixtureGlass;glass.userData.lampGlow=true;
 for(const side of [-1,1]){const curl=new T.Mesh(new T.TorusGeometry(.10,.018,5,14,Math.PI*1.55),fixtureGold);curl.position.set(side*.27,.02,.04);curl.rotation.z=side<0?Math.PI:0;root.add(curl);}
 root.traverse(o=>{o.userData.fullDetail=true;});return root;
}
export function hallFlatCeilingLight(parent:T.Object3D,x:number,y:number,z:number){
 const rim=cylinder(parent,.235,.035,[x,y,z],0xb68b48);rim.material=fixtureGold;rim.userData.fullDetail=true;
 const disc=cylinder(parent,.193,.018,[x,y-.023,z],0xffe6bb);disc.material=fixtureGlass;disc.userData.lampGlow=true;disc.userData.landmark='flat-ceiling-light';disc.userData.fullDetail=true;return disc;
}

/** One shared glow batch for all wall/ceiling fixtures, using the candle halo texture. */
export function buildHallLampHalos(scene:T.Scene){
 if(typeof document==='undefined')return;const positions:number[]=[],point=new T.Vector3();
 scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.userData.lampGlow){o.getWorldPosition(point);positions.push(point.x,point.y,point.z);}});
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 const glow=new T.Points(geometry,new T.PointsMaterial({map:glowTexture(.6,.3),size:1.35,color:0xffc463,opacity:.8,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false}));glow.name='warm-fixture-halos';glow.renderOrder=2;scene.add(glow);
 // Every lamp's wall glow (a soft surface glow, no extra light) in one batch, one draw call.
 const glows:T.Matrix4[]=[],q=new T.Quaternion(),size=new T.Vector3(),front=new T.Vector3(),local=new T.Matrix4();
 scene.traverse(o=>{if(o.userData.landmark!=='panel-centre-sconce')return;
  const [w,h,offsetY]=o.userData.wallWash as [number,number,number];
  glows.push(o.matrixWorld.clone().multiply(local.compose(front.set(0,offsetY,-.01),q.identity(),size.set(w,h,1))));
});
 if(!glows.length)return;
 const batch=new T.InstancedMesh(wallWashGeometry,new T.MeshBasicMaterial({map:glowTexture(.55,.28),color:0xffbc70,opacity:.5,transparent:true,depthWrite:false,blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),glows.length);
 glows.forEach((m,i)=>batch.setMatrixAt(i,m));batch.frustumCulled=false;batch.name='warm-wall-glows';batch.renderOrder=1;batch.userData.fullDetail=true;scene.add(batch);
}

/** Reuse the hall's shallow upper fixture over the portrait and mirror bays. */
export function raiseLandingDisplayLights(scene: T.Scene) {
 const panelZ = (REAR_SCREENS.z + REAR_SCREENS.thickness / 2 + WALL_DATUM.rear) / 2;
 const fixtures: T.Object3D[] = [];
 const position = new T.Vector3();
 scene.updateMatrixWorld(true);
 scene.traverse(object => {
  if (object.userData.landmark !== 'panel-centre-sconce') return;
  object.getWorldPosition(position);
  if (Math.abs(Math.abs(position.x) - WALL_DATUM.halfWidth) < 1
    && Math.abs(position.z - panelZ) < 1 && position.y < 5) fixtures.push(object);
 });
 for (const fixture of fixtures) {
  const parent = fixture.parent;
  if (!parent) continue;
  const x = fixture.position.x;
  const z = fixture.position.z;
  fixture.removeFromParent();
  const upper = hallDoorHeaderLight(parent, 6.45);
  upper.position.x = x;
  upper.position.z = z + .12;
 }
}
