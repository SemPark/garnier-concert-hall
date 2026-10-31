import * as T from 'three';
/** Original SVG images: one decoded texture/material per motif, reused around the hall. */
const sources={
 fresco:new URL('../assets/hall/ceiling-muses.webp',import.meta.url).href,
 damask:new URL('../assets/hall/box-damask.svg',import.meta.url).href,
 scroll:new URL('../assets/hall/gallery-scroll.svg',import.meta.url).href,
 relief:new URL('../assets/hall/wall-relief.svg',import.meta.url).href,
 pilaster:new URL('../assets/hall/pilaster-inlay.svg',import.meta.url).href,
 soffit:new URL('../assets/hall/gallery-soffit.svg',import.meta.url).href,
 ceiling1:new URL('../assets/hall/ceiling-1.svg',import.meta.url).href,
 ceiling2:new URL('../assets/hall/ceiling-2.svg',import.meta.url).href,
 walnut:new URL('../assets/hall/oak-grain.webp',import.meta.url).href,
};
export type HallImage=keyof typeof sources;
const materials=new Map<HallImage,T.MeshLambertMaterial>();
export function hallImageMaterial(kind:HallImage){
 let result=materials.get(kind);if(result)return result;
 // Geometry tests run without a DOM; the browser loads exactly the same shared maps.
 const map=typeof document==='undefined'?null:new T.TextureLoader().load(sources[kind]);
 if(map){map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;if(kind==='scroll'||kind==='walnut')map.wrapS=T.RepeatWrapping;if(kind==='walnut')map.wrapT=T.RepeatWrapping;map.userData.hallImage=kind;}
 result=new T.MeshLambertMaterial({map,color:kind==='walnut'?0x785d45:0xffffff,emissive:0x614a2b,emissiveIntensity:kind==='walnut'?.025:.07});
 result.userData.hallImage=kind;materials.set(kind,result);return result;
}
const face=new T.PlaneGeometry(1,1);
export function hallImage(parent:T.Object3D,kind:HallImage,width:number,height:number,x:number,y:number,z:number){
 const mesh=new T.Mesh(face,hallImageMaterial(kind));mesh.scale.set(width,height,1);mesh.position.set(x,y,z);mesh.userData.fullDetail=true;mesh.userData.cameraOccluder=true;mesh.userData.landmark=`hall-image-${kind}`;parent.add(mesh);return mesh;
}

export type WoodTone='oak'|'walnut'|'frame';
const woods=new Map<string,T.MeshLambertMaterial|T.MeshStandardMaterial>();
/** One 512px image is shared by architecture and the original detailed chair materials. */
export function woodMaterial(tone:WoodTone='oak',detailed=false){
 const key=`${tone}/${detailed}`;let result=woods.get(key);if(result)return result;
 const props={map:hallImageMaterial('walnut').map,color:{oak:0xe9cf9b,walnut:0x785d45,frame:0xd8b17f}[tone]};
 result=detailed?new T.MeshStandardMaterial({...props,roughness:.55,metalness:.035}):new T.MeshLambertMaterial(props);
 result.userData.hallImage='walnut';result.userData.woodTone=tone;woods.set(key,result);return result;
}
/** World-size UVs keep a hall-sized slab from stretching a single little patch of grain. */
export function applyWoodSurface(mesh:T.Mesh,tone:WoodTone='oak',topOnly=false){
 mesh.updateWorldMatrix(true,false);const geo=mesh.geometry.clone(),pos=geo.getAttribute('position'),normal=geo.getAttribute('normal'),uv=geo.getAttribute('uv');
 const nm=new T.Matrix3().getNormalMatrix(mesh.matrixWorld),p=new T.Vector3(),n=new T.Vector3();
 for(let i=0;i<pos.count;i++){
  p.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);n.fromBufferAttribute(normal,i).applyMatrix3(nm).normalize();
  if(Math.abs(n.y)>.5)uv.setXY(i,p.x/.9,p.z/4.8);
  else if(Math.abs(n.z)>.5)uv.setXY(i,p.x/.9,p.y/3);
  else uv.setXY(i,p.z/.9,p.y/3);
 }
 uv.needsUpdate=true;
 if(topOnly){
  const base=Array.isArray(mesh.material)?mesh.material[0]:mesh.material,indices=geo.getIndex();geo.clearGroups();let start=0,previous=-1;const count=indices?.count??pos.count;
  for(let i=0;i<count;i+=3){const index=indices?indices.getX(i):i;n.fromBufferAttribute(normal,index).applyMatrix3(nm).normalize();const material=n.y>.5?1:0;if(previous!==material){if(i>start)geo.addGroup(start,i-start,previous);start=i;previous=material;}}
  if(count>start)geo.addGroup(start,count-start,previous);mesh.material=[base,woodMaterial(tone)];
 }else mesh.material=woodMaterial(tone);
 mesh.geometry=geo;mesh.userData.woodSurface=true;
 return mesh;
}
