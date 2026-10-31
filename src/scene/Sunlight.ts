import * as T from 'three';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {WALL_DATUM,WALL_LEVELS} from './HallWallBands';

/** Late-afternoon sun entering through the right-hand windows, slanting down across the hall. */
export const SUN_DIRECTION=new T.Vector3(-.62,-.74,.2).normalize();
const SUN_COLOR=new T.Color(1,.84,.58);
/** Every other right-side window, so each shaft reads on its own; the bays by the organ and rear gallery stay plain. */
export const SUN_WINDOWS=H.bayCenters.filter(z=>[-18,-6,6,18,30].includes(z)).map(z=>new T.Vector3(WALL_DATUM.halfWidth-.2,WALL_LEVELS.window+2.9,z));
const DUST_PER_BEAM=46;

/** Where a shaft from this window reaches the parterre floor. */
export function sunFloorPoint(window:T.Vector3){return window.clone().addScaledVector(SUN_DIRECTION,window.y/-SUN_DIRECTION.y);}

const beamMaterial=new T.ShaderMaterial({
 transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
 uniforms:{time:{value:0},color:{value:SUN_COLOR},strength:{value:1.6}},
 vertexShader:`attribute float seed;varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;varying float vSeed;
void main(){vUv=uv;vSeed=seed;vec4 world=modelMatrix*vec4(position,1.0);vNormal=normalize(mat3(modelMatrix)*normal);vView=cameraPosition-world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
 fragmentShader:`uniform float time;uniform vec3 color;uniform float strength;varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;varying float vSeed;
void main(){
 float along=vUv.y;
 float fade=smoothstep(0.0,0.04,along)*(1.0-0.55*smoothstep(0.3,1.0,along))*(1.0-smoothstep(0.93,1.0,along));
 // Faces seen edge-on vanish, so the shaft reads as a soft volume rather than a tube.
 float edge=pow(abs(dot(normalize(vNormal),normalize(vView))),1.3);
 // Window bars cast faint darker bands, and the air drifts slowly through the light.
 float bars=0.8+0.2*smoothstep(0.15,0.35,abs(fract(vUv.x*4.0)-0.5));
 float drift=0.78+0.22*sin(along*14.0-time*0.45+vSeed*7.0)*sin(vUv.x*18.85+time*0.2+vSeed*3.0);
 // Fade out when the camera is inside or right next to a shaft, and never burn to white.
 float a=min(strength*fade*edge*bars*drift*smoothstep(3.0,14.0,length(vView)),0.42);
 gl_FragColor=vec4(color*a,1.0);
}`,
});

const poolMaterial=new T.ShaderMaterial({
 transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 uniforms:{time:{value:0},color:{value:SUN_COLOR}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`uniform float time;uniform vec3 color;varying vec2 vUv;
void main(){vec2 p=vUv*2.0-1.0;float r=dot(p,p);float a=(1.0-smoothstep(0.15,1.0,r))*(0.38+0.04*sin(time*0.7));gl_FragColor=vec4(color*a,1.0);}`,
});

const dustMaterial=new T.ShaderMaterial({
 transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 uniforms:{time:{value:0},scale:{value:600},color:{value:new T.Color(1,.93,.78)}},
 vertexShader:`attribute vec3 seed;uniform float time;uniform float scale;varying float vAlpha;
void main(){
 vec3 p=position;
 // Each mote wanders in a slow loop and settles very gently, like dust in still air.
 p+=vec3(sin(time*0.21+seed.x*6.3),sin(time*0.17+seed.y*6.3)*0.6-mod(time*0.05+seed.z*3.0,1.2)+0.6,cos(time*0.19+seed.z*6.3))*0.45;
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 vAlpha=0.35+0.65*pow(0.5+0.5*sin(time*(0.8+seed.x)+seed.y*12.0),3.0);
 gl_PointSize=0.07*scale/max(0.5,-mv.z);gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform vec3 color;varying float vAlpha;
void main(){vec2 p=gl_PointCoord*2.0-1.0;float a=(1.0-smoothstep(0.0,1.0,dot(p,p)))*vAlpha*0.85;if(a<0.01)discard;gl_FragColor=vec4(color*a,1.0);}`,
});

function beamGeometry(length:number,seed:number){
 // Open, slightly widening shaft along +Y, as wide as a pane and taller than it is wide.
 const g=new T.CylinderGeometry(1.25,1,length,24,1,true);g.translate(0,length/2,0);g.scale(1,1,1.85);
 g.setAttribute('seed',new T.Float32BufferAttribute(new Array(g.getAttribute('position').count).fill(seed),1));
 return g;
}
/** Basis turning local +Y into the sun direction, local X across the window, local Z up its height. */
function beamBasis(){
 const across=new T.Vector3(0,0,1).addScaledVector(SUN_DIRECTION,-SUN_DIRECTION.z).normalize();
 const tall=new T.Vector3().crossVectors(across,SUN_DIRECTION).normalize();
 return new T.Matrix4().makeBasis(across,SUN_DIRECTION,tall);
}

export type Sunlight={root:T.Group;update(time:number):void;setViewport(heightPx:number,fov:number):void};
/** Added after architecture batching: these custom-shaded meshes must stay as they are. */
export function buildSunlight(scene:T.Scene):Sunlight{
 const root=new T.Group();root.userData.landmark='sunlight';scene.add(root);
 const basis=beamBasis(),dust:number[]=[],seeds:number[]=[];
 SUN_WINDOWS.forEach((window,i)=>{
  const floor=sunFloorPoint(window),length=window.distanceTo(floor);
  const beam=new T.Mesh(beamGeometry(length,(i*.37)%1),beamMaterial);beam.matrixAutoUpdate=false;
  beam.matrix.copy(basis).setPosition(window);beam.renderOrder=5;beam.frustumCulled=false;beam.userData.landmark='sun-shaft';root.add(beam);
  const pool=new T.Mesh(new T.PlaneGeometry(1,1),poolMaterial);pool.rotation.set(-Math.PI/2,0,Math.atan2(SUN_DIRECTION.x,SUN_DIRECTION.z));
  pool.scale.set(3.2,6.4,1);pool.position.set(floor.x,.04,floor.z);pool.renderOrder=4;pool.userData.landmark='sun-pool';root.add(pool);
  for(let n=0;n<DUST_PER_BEAM;n++){
   const p=window.clone().addScaledVector(SUN_DIRECTION,length*(.06+Math.random()*.6));
   p.add(new T.Vector3((Math.random()-.5)*2,(Math.random()-.5)*2.8,(Math.random()-.5)*2).applyMatrix4(new T.Matrix4().extractRotation(basis)));
   dust.push(p.x,p.y,p.z);seeds.push(Math.random(),Math.random(),Math.random());
  }
 });
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(dust,3));geometry.setAttribute('seed',new T.Float32BufferAttribute(seeds,3));
 const motes=new T.Points(geometry,dustMaterial);motes.frustumCulled=false;motes.renderOrder=6;motes.userData.landmark='sun-dust';root.add(motes);
 // A warm key light from the same side gently lifts the surfaces facing the windows.
 const sun=new T.DirectionalLight(0xffd9a0,.55);sun.position.copy(SUN_DIRECTION).multiplyScalar(-40);sun.target.position.set(0,0,10);root.add(sun,sun.target);
 return {
  root,
  update(time){beamMaterial.uniforms.time.value=time;poolMaterial.uniforms.time.value=time;dustMaterial.uniforms.time.value=time;},
  setViewport(heightPx,fov){dustMaterial.uniforms.scale.value=heightPx/(2*Math.tan(T.MathUtils.degToRad(fov)/2));},
 };
}
