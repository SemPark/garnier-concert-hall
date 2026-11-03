import * as T from 'three';

type Finish='stone'|'marble'|'wood';
type Maps={color:T.Texture;normal:T.Texture;rough:T.Texture};
const maps=new Map<Finish,Maps>(),materials=new Map<string,T.MeshStandardMaterial>();
function referenceStoneMaps(){
 let value=maps.get('stone');if(value||typeof document==='undefined')return value;
 const loader=new T.TextureLoader(),load=(url:string,srgb=false)=>{const tex=loader.load(url);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;if(srgb)tex.colorSpace=T.SRGBColorSpace;return tex;};
 value={color:load(new URL('../assets/wall/color.webp',import.meta.url).href,true),normal:load(new URL('../assets/wall/normal.webp',import.meta.url).href),rough:load(new URL('../assets/wall/roughness.webp',import.meta.url).href)};maps.set('stone',value);return value;
}
/** Small, repeatable surface maps shared by the entire building, without a network dependency. */
function surfaceMaps(kind:Finish){
 if(kind==='stone')return referenceStoneMaps();
 let value=maps.get(kind);if(value||typeof document==='undefined')return value;
 const size=256,heights=new Float32Array(size*size),tone=new Float32Array(size*size);
 const tau=Math.PI*2;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*tau,v=y/size*tau;
  const cloud=Math.sin(u*2+Math.sin(v*3))*.45+Math.cos(v*4-u)*.25+Math.sin(u*7+v*5)*.13;
  const vein=Math.pow(.5+.5*Math.sin(u*3+v*2+Math.sin(v*3)*1.5+Math.sin(u*2)*.6),18);
  const grain=.5+.5*Math.sin(u*31+Math.sin(v*2)*2+Math.sin(u*3+v)*.7);
  const micro=Math.sin(u*43+v*37)*Math.cos(v*29-u*17);
  const i=y*size+x;
  tone[i]=kind==='wood'?.89+grain*.1:kind==='marble'?.93+cloud*.035-vein*.095:.95+cloud*.035;
  heights[i]=kind==='wood'?grain*.13+micro*.005:kind==='marble'?cloud*.015-vein*.025:cloud*.12+micro*.012;

 }
 const make=(normal=false,rough=false)=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=y*size+x,p=i*4;
   if(normal){const dx=(heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size])*2,dy=(heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x])*2;const length=Math.sqrt(dx*dx+dy*dy+1);pixels.data[p]=(-dx/length*.5+.5)*255;pixels.data[p+1]=(-dy/length*.5+.5)*255;pixels.data[p+2]=(1/length*.5+.5)*255;}
   else{const n=rough?(kind==='marble'?.37:kind==='wood'?.62:.87)+(tone[i]-.95)*.5:tone[i];pixels.data[p]=pixels.data[p+1]=pixels.data[p+2]=n*255;}
   pixels.data[p+3]=255;
  }
  ctx.putImageData(pixels,0,0);const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;if(!normal&&!rough)tex.colorSpace=T.SRGBColorSpace;return tex;
 };
 value={color:make(),normal:make(true),rough:make(false,true)};maps.set(kind,value);return value;
}
export function surfaceMaterial(kind:Finish,color:number){
 const key=kind+'/'+color;let mat=materials.get(key);if(mat)return mat;
 const tex=surfaceMaps(kind);
 mat=new T.MeshStandardMaterial({color,map:tex?.color,normalMap:tex?.normal,roughnessMap:tex?.rough,roughness:1,metalness:kind==='wood'?.02:0,envMapIntensity:kind==='marble'?.65:.25});
 mat.normalScale.setScalar(kind==='stone'?.7:.45);
 // Project stone in world metres, including instanced transforms, without cloning geometry per pillar.
 if(kind==='stone'){mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 vec4 stoneSample=texture2D(map,vMapUv);
 float stoneTone=dot(stoneSample.rgb,vec3(.2126,.7152,.0722));
 diffuseColor.rgb*=vec3(clamp(stoneTone*1.8,.38,1.12));
 #endif`);shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
 vec4 stoneLocal=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 stoneLocal=instanceMatrix*stoneLocal;
 #endif
 vec3 stoneWorld=(modelMatrix*stoneLocal).xyz;
 vec3 stoneNormal=abs(inverseTransformDirection(transformedNormal,viewMatrix));
 vec2 stoneUv=(stoneNormal.y>.5?stoneWorld.xz:stoneNormal.x>.5?stoneWorld.zy:stoneWorld.xy)/3.6;
 #ifdef USE_MAP
 vMapUv=stoneUv;
 #endif
 #ifdef USE_NORMALMAP
 vNormalMapUv=stoneUv;
 #endif
 #ifdef USE_ROUGHNESSMAP
 vRoughnessMapUv=stoneUv;
 #endif`);};mat.customProgramCacheKey=()=>"aurea-reference-ashlar-v2";}
 mat.userData.surfaceFinish=kind;materials.set(key,mat);return mat;
}
/** Preserve a floor's inlaid colour image; give it the same polished stone response. */
export function inlaidMarble(map:T.Texture){
 const tex=surfaceMaps('marble');const mat=new T.MeshStandardMaterial({color:0xf2ede4,map,roughness:.52,normalMap:tex?.normal,envMapIntensity:.28});mat.normalScale.setScalar(.06);return mat;
}
const stoneColors=new Set([0xe7d5ad,0xc7bfa9,0xd0c5ad,0xe8d6ac,0xe3d2ac,0xf0dfb5,0xe9d9b4,0xc2a372,0xe6d6b4,0xe2d3a6]);
const goldColors=new Set([0xb58a47,0xd9bd7d,0xc69b49,0xe7c77a,0xc9a250]);
const gilt=new Map<number,T.MeshStandardMaterial>();
/** Apply world-size UVs once, before architecture is frozen/batched. Art and lettering stay untouched. */
export function finishArchitecture(scene:T.Scene,exclude:T.Object3D[]){
 const protectedSet=new Set<T.Object3D>();for(const root of exclude)root.traverse(o=>protectedSet.add(o));scene.updateMatrixWorld(true);

 scene.traverse(o=>{
  if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||protectedSet.has(o)||Array.isArray(o.material)||!o.material.visible)return;
  const original=o.material;if(!(original instanceof T.MeshLambertMaterial)||original.map||original.transparent)return;
  const color=original.color.getHex();
  if(o.userData.smoothStone){o.material=new T.MeshStandardMaterial({color,roughness:.75,envMapIntensity:.25});
  }else if(goldColors.has(color)){
   let mat=gilt.get(color);if(!mat){mat=new T.MeshStandardMaterial({color,metalness:.65,roughness:.36,envMapIntensity:.55});gilt.set(color,mat);}o.material=mat;
  }else if(stoneColors.has(color)){
   o.material=surfaceMaterial('stone',color);
  }
 });
}
/** Reuse texture maps for timber already carrying the hall's colour image. */
export function woodFinishMaps(){return surfaceMaps('wood');}
