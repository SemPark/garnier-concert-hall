import * as T from 'three';

// A soft white front light that only villagers receive, like a small camera-side spot. The hall and instruments
// are not lit by it. The head gets the most and the body less, each in a narrow
// patch where the surface faces the camera.
// Strength is set per room by World (same scale as a DirectionalLight intensity).
export const characterFrontLight={value:0};
export const FRONT_LIGHT={lobby:2.4,auditorium:1.8};

export type FrontLightPart='head'|'body';
// strength: share of the room strength; focus: higher = narrower patch; saturation: 1 = unchanged colour.
const PARTS:Record<FrontLightPart,{strength:number;focus:number;saturation:number}>={
 // Narrow patches: the face centre and the chest facing the camera get the light.
 head:{strength:1,focus:2.5,saturation:1.25},
 body:{strength:.55,focus:5,saturation:1},
};

// Soft look: wrap = how far room light bends round the body (0 = normal); rim = outline glow, share of the room strength.
const SOFT={wrap:.45,rim:.35};

type Lit=T.MeshLambertMaterial|T.MeshStandardMaterial;
const isLit=(m:T.Material):m is Lit=>m instanceof T.MeshLambertMaterial||m instanceof T.MeshStandardMaterial;
const caches:Record<FrontLightPart,WeakMap<T.Material,T.Material>>={head:new WeakMap(),body:new WeakMap()};

/** Add the front light to a material (also re-applied to batch clones, which lose shader hooks when cloned). */
export function applyFrontLight<M extends T.Material>(m:M,part:FrontLightPart){
 const p=PARTS[part];
 m.userData.characterLight=part;
 m.onBeforeCompile=shader=>{
  shader.uniforms.characterFront=characterFrontLight;
  // Soft, squishy shading: room lights wrap further round the body so light fades into shade gently;
  // on the head that soft edge turns faintly pink, like light glowing through skin.
  const lambert=T.ShaderChunk.lights_lambert_pars_fragment
   .replace('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',`float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + ${SOFT.wrap.toFixed(2)} ) / ${(1+SOFT.wrap).toFixed(2)} );`)
   .replace('vec3 irradiance = dotNL * directLight.color;',part==='head'
    ?'vec3 irradiance = dotNL * directLight.color * mix( vec3( 1.0, .86, .82 ), vec3( 1.0 ), smoothstep( 0.0, .6, dotNL ) );'
    :'vec3 irradiance = dotNL * directLight.color;');
  shader.fragmentShader='uniform float characterFront;\n'+shader.fragmentShader
   .replace('#include <lights_lambert_pars_fragment>',lambert)
   .replace('#include <opaque_fragment>',
   'float facing = saturate( dot( normal, normalize( vViewPosition ) ) );\n'+
   `outgoingLight += diffuseColor.rgb * ( characterFront * ${p.strength.toFixed(2)} * RECIPROCAL_PI ) * pow( facing, ${p.focus.toFixed(1)} );\n`+
   // A faint glow of the surface's own colour along the outline, like felt or velvet catching light.
   `outgoingLight += diffuseColor.rgb * ( characterFront * ${SOFT.rim.toFixed(2)} * RECIPROCAL_PI ) * pow( 1.0 - facing, 3.0 );\n`+
   (p.saturation!==1?`outgoingLight = max( mix( vec3( dot( outgoingLight, vec3( .2126, .7152, .0722 ) ) ), outgoingLight, ${p.saturation.toFixed(2)} ), 0.0 );\n`:'')+
   '#include <opaque_fragment>');
 };
 m.customProgramCacheKey=()=>'character-soft-light-'+part;
 return m;
}

export function frontLitMaterial(m:T.Material,part:FrontLightPart){
 if(!isLit(m)||m.userData.characterLight)return m;
 let result=caches[part].get(m);if(!result){result=applyFrontLight(m.clone(),part);caches[part].set(m,result);}
 return result;
}

/** Batches clone their source material; keep the front light on the clone. */
export function keepFrontLight(source:T.Material,clone:T.Material){const part=source.userData.characterLight as FrontLightPart|undefined;if(part&&clone!==source)applyFrontLight(clone,part);}
