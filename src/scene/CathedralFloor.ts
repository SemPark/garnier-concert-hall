import * as T from 'three';

// Floor Tiles 06 (Rob Tuytel / Poly Haven, CC0): shared CC0 stone maps, tinted champagne for the Aurea lobby.
const sources={
 color:new URL('../assets/floor/color.webp',import.meta.url).href,
 normal:new URL('../assets/floor/normal.webp',import.meta.url).href,
 roughness:new URL('../assets/floor/roughness.webp',import.meta.url).href,
};
let shared:T.MeshStandardMaterial|undefined;
/** The lobby's marble checkerboard, for other floors that should match it. */
export function cathedralFloorMaterial(){return floorMaterial();}
function floorMaterial(){
 if(shared)return shared;
 shared=new T.MeshStandardMaterial({color:0xe8d8be,roughness:1,metalness:0,envMapIntensity:1});shared.normalScale.set(.6,.6);
 if(typeof document!=='undefined'){
  const loader=new T.TextureLoader();
  const load=(url:string,srgb=false)=>{const map=loader.load(url);map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;if(srgb)map.colorSpace=T.SRGBColorSpace;return map;};
  shared.map=load(sources.color,true);shared.normalMap=load(sources.normal);shared.roughnessMap=load(sources.roughness);
 }
 return shared;
}
/** One continuous checkerboard, with square tiles sized in world metres rather than stretched over the room. */
export function buildCathedralFloor(scene:T.Scene,width:number,length:number,centerZ:number){
 const geometry=new T.PlaneGeometry(width,length),uv=geometry.getAttribute('uv'),period=3;
 for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)*width-width/2)/period,(uv.getY(i)*length-centerZ-length/2)/period);
 const floor=new T.Mesh(geometry,floorMaterial());floor.rotation.x=-Math.PI/2;floor.position.set(0,.006,centerZ);floor.receiveShadow=true;floor.userData.fullDetail=true;floor.userData.landmark='cathedral-marble-checkerboard';scene.add(floor);return floor;
}
