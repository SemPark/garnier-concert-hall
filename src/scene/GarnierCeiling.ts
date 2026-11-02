import * as T from 'three';
import {ATRIUM} from '../../shared/grandStair';
import {box} from './primitives';
/** Diego Delso's head-on photograph of the actual Grand Escalier ceiling, including all four Pils fields. */
export function buildGarnierCeiling(scene:T.Scene){
 const url=new URL('../assets/hall/garnier-stair-ceiling.webp',import.meta.url).href;
 const map=typeof document==='undefined'?null:new T.TextureLoader().load(url);if(map){map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;}
 const paint=new T.MeshBasicMaterial({map,color:0xffffff,side:T.DoubleSide,toneMapped:false});
 const y=ATRIUM.height-.04,mid=33;
 const mesh=new T.Mesh(new T.PlaneGeometry(21,21),paint);mesh.rotation.x=Math.PI/2;mesh.position.set(0,y,mid);mesh.userData.fullDetail=true;mesh.userData.cameraWall=true;mesh.userData.landmark='garnier-ceiling-painting';scene.add(mesh);
 for(const x of [-10.65,10.65])box(scene,[.24,.28,21.55],[x,y-.14,mid],0xc6a46a);
 for(const z of [mid-10.65,mid+10.65])box(scene,[21.55,.28,.24],[0,y-.14,z],0xc6a46a);
}
