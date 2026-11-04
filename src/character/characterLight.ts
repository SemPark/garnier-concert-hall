import * as T from 'three';

// Character-only camera fill. Room lights and the renderer's tone mapping are unchanged.
export const characterFrontLight={value:0};
export const FRONT_LIGHT={lobby:2.4,auditorium:1.8};
export type FrontLightPart='head'|'hair'|'body'|'cloth';
const PARTS:Record<FrontLightPart,{strength:number;focus:number;wrap:number;rim:number}>={
 head:{strength:.80,focus:1.6,wrap:.35,rim:.06},
 hair:{strength:.38,focus:1.5,wrap:.28,rim:.025},
 body:{strength:.30,focus:1.5,wrap:.30,rim:.035},
 cloth:{strength:.26,focus:1.25,wrap:.32,rim:0},
};
export type ClothContact='torso'|'sleeve'|'skirt'|'trousers'|'plain';
/** Baked, subtle contact shading, attached to the cloth so it follows poses and skirt morphs.
 * Adds one scalar attribute; positions, normals, indices and material colours stay untouched. */
export function prepareClothContact(geometry:T.BufferGeometry,role:ClothContact){
 if(geometry.userData.clothContact===role&&geometry.hasAttribute('clothContact'))return;
 const p=geometry.getAttribute('position');let minY=Infinity,maxY=-Infinity,maxX=0;
 for(let i=0;i<p.count;i++){minY=Math.min(minY,p.getY(i));maxY=Math.max(maxY,p.getY(i));maxX=Math.max(maxX,Math.abs(p.getX(i)));}
 const contact=new Float32Array(p.count),smooth=T.MathUtils.smoothstep;
 for(let i=0;i<p.count;i++){
  const t=(p.getY(i)-minY)/Math.max(maxY-minY,1e-6),side=Math.abs(p.getX(i))/Math.max(maxX,1e-6),hem=Math.exp(-((t/.075)**2));
  let shade=0;
  if(role==='torso')shade=.035*hem+.04*smooth(t,.58,.88)*smooth(side,.62,.9);
  if(role==='sleeve')shade=.055*smooth(t,.65,.96)+.015*hem;
  if(role==='skirt')shade=.03*hem+.035*smooth(t,.9,1);
  if(role==='trousers')shade=.025*hem+.03*smooth(t,.9,1);
  contact[i]=1-shade;
 }
 geometry.setAttribute('clothContact',new T.BufferAttribute(contact,1));geometry.userData.clothContact=role;
}

type Lit=T.MeshLambertMaterial|T.MeshStandardMaterial;
const isLit=(m:T.Material):m is Lit=>m instanceof T.MeshLambertMaterial||m instanceof T.MeshStandardMaterial;
const caches:Record<FrontLightPart,WeakMap<T.Material,T.Material>>={head:new WeakMap(),hair:new WeakMap(),body:new WeakMap(),cloth:new WeakMap()};

/** Tune the existing Lambert/Standard material; no extra lighting pass, texture, or mesh. */
export function applyFrontLight<M extends T.Material>(m:M,part:FrontLightPart){
 const p=PARTS[part],cloth=part==='cloth';m.userData.characterLight=part;
 m.onBeforeCompile=shader=>{
  shader.uniforms.characterFront=characterFrontLight;
  if(cloth){
   shader.vertexShader='attribute float clothContact;\nvarying float vClothContact;\n'+shader.vertexShader
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvClothContact = clothContact;');
   shader.fragmentShader='varying float vClothContact;\n'+shader.fragmentShader;
  }
  const lambert=T.ShaderChunk.lights_lambert_pars_fragment
   .replace('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',`float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + ${p.wrap.toFixed(2)} ) / ${(1+p.wrap).toFixed(2)} );`)
   .replace('vec3 irradiance = dotNL * directLight.color;',part==='head'
    ?'vec3 irradiance = dotNL * directLight.color * mix( vec3( 1.0, .94, .92 ), vec3( 1.0 ), smoothstep( 0.0, .6, dotNL ) );'
    :'vec3 irradiance = dotNL * directLight.color;');
  shader.fragmentShader='uniform float characterFront;\n'+shader.fragmentShader
   .replace('#include <lights_lambert_pars_fragment>',lambert)
   .replace('#include <opaque_fragment>',
    'float facing = saturate( dot( normal, normalize( vViewPosition ) ) );\n'+
    `outgoingLight += diffuseColor.rgb * ( characterFront * ${p.strength.toFixed(2)} * RECIPROCAL_PI ) * pow( facing, ${p.focus.toFixed(2)} );\n`+
    (p.rim?`outgoingLight += diffuseColor.rgb * ( characterFront * ${p.rim.toFixed(3)} * RECIPROCAL_PI ) * pow( 1.0 - facing, 3.0 );\n`:'')+
    (cloth?
     // Preserve the garment's albedo hue. Compress concentrated light rather than bleaching it;
     // a low diffuse floor opens the shadows while retaining the rounded form's contrast.
     'float clothAlbedo = dot( diffuseColor.rgb, vec3( .2126, .7152, .0722 ) );\n'+
     'float clothLight = max( 0.0, dot( outgoingLight, vec3( .2126, .7152, .0722 ) ) / max( clothAlbedo, .00001 ) );\n'+
     'float clothDiffuse = .16 + 1.15 * clothLight / ( 1.0 + .45 * clothLight );\n'+
     'outgoingLight = diffuseColor.rgb * clothDiffuse * vClothContact;\n':'')+
    '#include <opaque_fragment>');
 };
 m.customProgramCacheKey=()=>'character-fabric-v2-'+part;return m;
}
export function frontLitMaterial(m:T.Material,part:FrontLightPart){
 if(!isLit(m)||m.userData.characterLight)return m;
 let result=caches[part].get(m);if(!result){result=applyFrontLight(m.clone(),part);caches[part].set(m,result);}return result;
}
/** Material.clone drops shader hooks; keep exactly the same shading in instanced batches. */
export function keepFrontLight(source:T.Material,clone:T.Material){const part=source.userData.characterLight as FrontLightPart|undefined;if(part&&clone!==source)applyFrontLight(clone,part);}
