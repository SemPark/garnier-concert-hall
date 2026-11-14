import * as T from 'three';
import {SpacePlanets,SpaceStars} from './SpaceSky';
import {SpaceNebula} from './SpaceNebula';
import {SpaceGalaxies,type GalaxySettings} from './SpaceGalaxies';
import {GOLDEN_HALL} from '../../shared/goldenHall';

/** Materials are cloned after batching; only uniforms change during the transition. */
export class HallTransition {
 progress=0;
 private target=0;
 private planets:SpacePlanets|null=null;
 private stars:SpaceStars|null=null;
 private nebula:SpaceNebula|null=null;
 private galaxies:SpaceGalaxies|null=null;
 private cutoff={value:32};
 private materials:{material:T.Material;opacity:number;emissive?:number}[]=[];
 private fog:T.FogExp2|null;
 private density:number;
 private background=new T.Color(0x24201b);
 private space=new T.Color(0x020308);

 constructor(private scene:T.Scene,private upper:T.Scene){
  this.fog=scene.fog instanceof T.FogExp2?scene.fog:null;
  this.density=this.fog?.density??0;
  if(scene.background instanceof T.Color)this.background.copy(scene.background);
  scene.background=this.background.clone();
  const copies=new Map<T.Material,T.Material>();
  upper.traverse(o=>{
   const object=o as T.Mesh;
   if(!object.material)return;
   const copy=(source:T.Material)=>{
    let material=copies.get(source);
    if(!material){
     material=source.clone();
     material.onBeforeCompile=source.onBeforeCompile;
     material.customProgramCacheKey=source.customProgramCacheKey;
     // Opaque architecture keeps depth writes and avoids sorted transparent layers.
     if(!material.transparent){
      material.alphaHash=true;
      const compile=source.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{
       compile.call(material,shader,renderer);
       shader.uniforms.hallCutoff=this.cutoff;
       shader.vertexShader='varying vec3 hallWorldPoint;\n'+shader.vertexShader;
       shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 hallWorldPosition=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
         hallWorldPosition=instanceMatrix*hallWorldPosition;
        #endif
        hallWorldPoint=(modelMatrix*hallWorldPosition).xyz;`);
       shader.fragmentShader=`uniform float hallCutoff;
       varying vec3 hallWorldPoint;
       float hallHash(vec3 p){
        p=fract(p*0.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);
       }
       float hallNoiseAt(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hallHash(i),hallHash(i+vec3(1,0,0)),f.x),
         mix(hallHash(i+vec3(0,1,0)),hallHash(i+vec3(1,1,0)),f.x),f.y),
         mix(mix(hallHash(i+vec3(0,0,1)),hallHash(i+vec3(1,0,1)),f.x),
         mix(hallHash(i+vec3(0,1,1)),hallHash(i+vec3(1,1,1)),f.x),f.y),f.z);
       }
       `+shader.fragmentShader;
       shader.fragmentShader=shader.fragmentShader.replace('#include <alphahash_fragment>',`
        if(opacity<1.0){
        float hallNoise=hallNoiseAt(hallWorldPoint*3.0);
        float hallCoverage=1.0-smoothstep(hallCutoff-1.5,hallCutoff,hallWorldPoint.y);
        diffuseColor.a*=hallCoverage;
        diffuseColor.rgb+=vec3(0.35,0.15,0.025)*4.0*hallCoverage*(1.0-hallCoverage);
        if(diffuseColor.a < 0.08+0.84*hallNoise)discard;
        }
        `);
      };
      material.customProgramCacheKey=()=>source.customProgramCacheKey()+'-hall-dissolve-v3';
     }
     copies.set(source,material);
     this.materials.push({material,opacity:source.opacity,emissive:(source as T.MeshStandardMaterial).emissiveIntensity});
    }
    return material;
   };
   object.material=Array.isArray(object.material)?object.material.map(copy):copy(object.material);
  });
 }
 setOpen(open:boolean,galaxySettings?:GalaxySettings){
  this.target=open?1:0;
  if(open&&typeof document!=='undefined'){
   this.planets??=new SpacePlanets(this.scene);
   this.stars??=new SpaceStars(this.scene);
   this.nebula??=new SpaceNebula(this.scene);
  }
  if(open&&galaxySettings&&typeof document!=='undefined'){
   this.galaxies??=new SpaceGalaxies(this.scene,galaxySettings);
  }
 }
 configureGalaxies(settings:GalaxySettings){this.galaxies?.configure(settings);}
 update(dt:number,concertSeconds=0){
  this.planets?.orbit(concertSeconds);
  this.galaxies?.animate(concertSeconds);
  if(this.progress===this.target)return;
  this.progress=T.MathUtils.clamp(this.progress+Math.sign(this.target-this.progress)*Math.min(Math.abs(this.target-this.progress),dt/5),0,1);
  const p=this.progress,pct=p*p*(3-2*p),remaining=1-pct;
  this.upper.visible=p<1;
  this.planets?.update(p);
  this.stars?.update(p);
  this.nebula?.update(p);
  this.galaxies?.update(p);
  this.cutoff.value=T.MathUtils.lerp(32,6.8,pct);
  if(this.upper.userData.transitionCutoff)this.upper.userData.transitionCutoff.value=p===0?Infinity:Math.max(GOLDEN_HALL.balconyHeight,this.cutoff.value);
  for(const entry of this.materials){
   entry.material.opacity=entry.opacity*remaining;
   if(entry.emissive!==undefined)(entry.material as T.MeshStandardMaterial).emissiveIntensity=entry.emissive*remaining*remaining;
  }
  (this.scene.background as T.Color).copy(this.background).lerp(this.space,pct);
  if(this.fog)this.fog.density=this.density*remaining;
  this.scene.userData.openHallProgress=p;
 }
 dispose(){this.planets?.dispose();this.stars?.dispose();this.nebula?.dispose();this.galaxies?.dispose();for(const {material} of this.materials)material.dispose();}
}
