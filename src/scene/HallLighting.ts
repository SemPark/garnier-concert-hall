import * as T from 'three';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {box,cylinder,sphere} from './primitives';

/** Repeated fixtures share geometry/materials; a few broad lights illuminate each bank. */
export function buildHallPracticalLights(scene:T.Scene){
 // First-floor fixtures belong to the new centred wall composition.
 for(const z of [-20,6,32]){
  const light=new T.PointLight(0xffcf8f,120,35,2);light.position.set(0,15,z);scene.add(light);
  for(const side of [-1,1]){
   const wash=new T.SpotLight(0xffc272,135,26,.95,.85,2);wash.position.set(side*12,10.5,z);wash.target.position.set(side*15.6,2.5,z);scene.add(wash,wash.target);
  }
 }
 for(const side of [-1,1])for(const z of [-12,24]){
  const upper=new T.SpotLight(0xffd18d,100,28,1.1,.9,2);upper.position.set(side*10.8,18,z);upper.target.position.set(side*15.5,12,z);scene.add(upper,upper.target);
 }
 // Light across the performers, rather than bleaching the whole audience floor.
 for(const side of [-1,1]){
  const key=new T.SpotLight(0xffdfb3,135,32,.85,.8,2);key.position.set(side*10,12,-15);key.target.position.set(-side*3,1,-21);scene.add(key,key.target);
 }
}

const fixtureGold=new T.MeshStandardMaterial({color:0xb68b48,metalness:.65,roughness:.42});
const fixtureGlass=new T.MeshStandardMaterial({color:0xffe6bb,emissive:0xffc678,emissiveIntensity:2.2,roughness:.6});
/** A new chased-brass sconce, centred on the panel's gilded spine. */
export function hallPanelSconce(parent:T.Object3D,x:number,y:number,z:number){
 const root=new T.Group();root.position.set(x,y,z);root.userData.landmark='panel-centre-sconce';parent.add(root);
 box(root,[.27,.88,.075],[0,0,0],0xb68b48).material=fixtureGold;
 const glass=cylinder(root,.105,.46,[0,0,.20],0xffe6bb);glass.material=fixtureGlass;
 for(const yy of [-.27,.27])cylinder(root,.15,.07,[0,yy,.20],0xb68b48).material=fixtureGold;
 for(const yy of [-.38,.38])sphere(root,.065,[0,yy,.16],0xb68b48).material=fixtureGold;
 root.traverse(o=>{o.userData.fullDetail=true;});return root;
}
/** Shallow light and carved gold plate sit on the header, above the door leaf. */
export function hallDoorHeaderLight(parent:T.Object3D,y:number){
 const root=new T.Group();root.position.set(0,y,.46);root.userData.landmark='door-header-light';parent.add(root);
 box(root,[.57,.28,.085],[0,0,0],0xb68b48).material=fixtureGold;
 const glass=box(root,[.28,.14,.07],[0,0,.09],0xffe6bb);glass.material=fixtureGlass;
 for(const side of [-1,1]){const curl=new T.Mesh(new T.TorusGeometry(.10,.018,5,14,Math.PI*1.55),fixtureGold);curl.position.set(side*.27,.02,.04);curl.rotation.z=side<0?Math.PI:0;root.add(curl);}
 root.traverse(o=>{o.userData.fullDetail=true;});return root;
}
export function hallFlatCeilingLight(parent:T.Object3D,x:number,y:number,z:number){
 const rim=cylinder(parent,.235,.035,[x,y,z],0xb68b48);rim.material=fixtureGold;rim.userData.fullDetail=true;
 const disc=cylinder(parent,.193,.018,[x,y-.023,z],0xffe6bb);disc.material=fixtureGlass;disc.userData.landmark='flat-ceiling-light';disc.userData.fullDetail=true;return disc;
}
