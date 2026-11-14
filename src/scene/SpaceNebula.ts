import * as T from 'three';
import {SPACE_ORBIT_CENTER} from './SpaceSky';

/** A distant dust ridge with its silhouette, gas and lighting drawn from procedural noise. */
export class SpaceNebula {
 private readonly meshes:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>[]=[];

 constructor(scene:T.Scene){
  const geometry=new T.PlaneGeometry(135,88);
  const material=new T.ShaderMaterial({
   uniforms:{strength:{value:0},seed:{value:0},shape:{value:0}},
   transparent:true,depthWrite:false,toneMapped:false,
   vertexShader:`
    varying vec2 nebulaUv;
    void main(){
     nebulaUv=uv;
     gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
     gl_Position.z=gl_Position.w;
    }
   `,
   fragmentShader:`
    uniform float strength,seed;
    uniform float shape;
    varying vec2 nebulaUv;

    float hash(vec2 p){
     vec3 q=fract(vec3(p.xyx)*0.1031);
     q+=dot(q,q.yzx+33.33);
     return fract((q.x+q.y)*q.z);
    }

    float noise(vec2 p){
     vec2 i=floor(p),f=fract(p);
     vec2 w=f*f*(3.0-2.0*f);
     return mix(mix(hash(i),hash(i+vec2(1,0)),w.x),
                mix(hash(i+vec2(0,1)),hash(i+1.0),w.x),w.y);
    }

    float clouds(vec2 p){
     float detail=0.0,weight=0.52;
     for(int i=0;i<5;i++){
      detail+=weight*noise(p);
      p=mat2(1.71,1.12,-1.12,1.71)*p+7.1;
      weight*=0.48;
     }
     return detail;
    }

    float mound(float x,float center,float width){
     float d=(x-center)/width;
     return exp(-d*d);
    }

    void main(){
     vec2 p=nebulaUv*2.0-1.0;
     float boundary=1.0-smoothstep(0.78,1.0,max(abs(p.x),abs(p.y)));
     if(boundary<0.002)discard;
     vec2 warp=vec2(clouds(p*2.8+4.2+seed),clouds(p*3.1-7.3+seed))-0.48;
     vec2 q=p+warp*0.28;
     float broad=clouds(q*3.1+vec2(11.0,6.0)+seed);
     float curls=clouds(q*8.0+warp*3.7);
     float fine=clouds(q*29.0+vec2(curls*2.3,broad));
     float halo=exp(-dot(q*vec2(1.05,1.12),q*vec2(1.05,1.12))*1.75);
     float wisps=smoothstep(0.21,0.68,0.65*broad+0.35*curls);

     // Bent, branching dust fronts sit within the diffuse gas rather than at its edge.
     float x=q.x;
     float ridge=-0.36+0.12*x
      +0.20*mound(x,-0.55,0.14)+0.31*mound(x,-0.24,0.075)
      +0.52*mound(x,0.02,0.11)+0.26*mound(x,0.29,0.21)
      +0.19*mound(x,0.49,0.065);
     if(shape>1.5){
      ridge=-0.16+0.30*sin(x*3.0+0.7)+0.22*mound(x,-0.38,0.10)-0.17*mound(x,0.24,0.16);
     }else if(shape>0.5){
      ridge=-0.29-0.21*x+0.35*mound(x,-0.34,0.18)+0.41*mound(x,0.36,0.095)+0.16*mound(x,0.06,0.07);
     }
     ridge+=(clouds(vec2(x*17.0,2.7))-0.48)*0.17;
     float height=q.y-ridge+(curls-0.48)*0.10+(fine-0.48)*0.045;
     float dustFront=1.0-smoothstep(-0.06,0.04,height);
     float broken=smoothstep(0.24,0.65,curls*0.65+broad*0.35);
     float dust=dustFront*exp(-max(-height,0.0)*5.5)*broken;
     float veins=1.0-abs(2.0*clouds(vec2(q.x*17.0+q.y*5.0,q.y*8.0)+warp*4.0)-1.0);
     float fissures=smoothstep(0.78,0.96,veins)*(0.3+0.7*fine);
     float relief=smoothstep(0.17,0.77,curls*0.47+fine*0.53);

     vec3 gas=mix(vec3(0.014,0.029,0.12),vec3(0.035,0.32,0.43),smoothstep(0.25,0.69,broad));
     float purple=smoothstep(0.28,0.77,clouds(q*2.7+31.0));
     gas=mix(gas,vec3(0.21,0.055,0.27),purple*0.65);
     float cavity=1.0-smoothstep(0.43,0.63,broad-curls*0.18);
     float threads=pow(clamp(1.0-abs(2.0*fine-1.0),0.0,1.0),8.0);
     if(shape>1.5){
      gas=mix(vec3(0.015,0.035,0.12),vec3(0.035,0.28,0.23),smoothstep(0.25,0.69,broad));
      gas=mix(gas,vec3(0.16,0.11,0.25),purple*0.55);
     }else if(shape>0.5){
      gas=mix(vec3(0.035,0.012,0.10),vec3(0.34,0.065,0.15),smoothstep(0.25,0.69,broad));
      gas=mix(gas,vec3(0.12,0.12,0.32),purple*0.65);
     }
     gas*=0.18+0.52*wisps;
     gas*=mix(0.12,1.0,cavity);
     vec3 dustColor=mix(vec3(0.014,0.009,0.026),vec3(0.19,0.095,0.048),relief);
     dustColor*=1.0-fissures*0.76;
     float rim=exp(-abs(height)*48.0)*smoothstep(0.30,0.65,curls);
     float glow=exp(-abs(height)*15.0)*(0.10+0.36*threads);
     vec3 warm=mix(vec3(0.58,0.17,0.08),vec3(1.0,0.78,0.42),relief);
     if(shape>1.5){
      dustColor=mix(vec3(0.008,0.015,0.027),vec3(0.07,0.15,0.14),relief)*(1.0-fissures*0.76);
      warm=mix(vec3(0.15,0.35,0.38),vec3(0.77,0.90,0.81),relief);
     }else if(shape>0.5){
      dustColor=mix(vec3(0.024,0.007,0.019),vec3(0.20,0.07,0.08),relief)*(1.0-fissures*0.76);
      warm=mix(vec3(0.52,0.16,0.15),vec3(0.95,0.60,0.42),relief);
     }
     vec3 color=mix(gas,dustColor,dust*0.82)+warm*(0.34*rim+0.15*glow);
     color+=vec3(0.035,0.07,0.095)*threads*wisps*cavity;
     float outskirts=smoothstep(0.18,0.59,broad+0.18*curls);
     float opacity=max((0.10+wisps*0.42)*cavity,dust*0.72+rim*0.3);
     opacity*=halo*boundary*outskirts;
     gl_FragColor=vec4(color,opacity*strength);
     #include <colorspace_fragment>
    }
   `,
  });
  // Keep generous angular gaps between the three clouds as the planets orbit past them.
  const placements=[
   {name:'space-nebula',position:[-54,62,-109],scale:1,roll:-.10,seed:0,shape:0},
   {name:'space-nebula-rose',position:[119,84,24],scale:1.08,roll:.32,seed:17.3,shape:1},
   {name:'space-nebula-teal',position:[-63,72,118],scale:.86,roll:-.38,seed:43.7,shape:2},
  ];
  for(const [index,placement] of placements.entries()){
   const cloudMaterial=index===0?material:material.clone();
   cloudMaterial.uniforms.seed.value=placement.seed;
   cloudMaterial.uniforms.shape.value=placement.shape;
   const mesh=new T.Mesh(geometry,cloudMaterial);
   mesh.name=placement.name;
   mesh.position.fromArray(placement.position).add(SPACE_ORBIT_CENTER);
   mesh.lookAt(SPACE_ORBIT_CENTER);
   mesh.rotateZ(placement.roll);
   mesh.scale.setScalar(placement.scale);
   mesh.renderOrder=-1000.5;
   mesh.visible=false;
   scene.add(mesh);
   this.meshes.push(mesh);
  }
 }

 update(progress:number){
  for(const mesh of this.meshes){
   mesh.visible=progress>0.14;
   mesh.material.uniforms.strength.value=T.MathUtils.smoothstep(progress,0.14,0.95);
  }
 }

 dispose(){
  this.meshes[0].geometry.dispose();
  for(const mesh of this.meshes){
   mesh.material.dispose();
   mesh.removeFromParent();
  }
 }
}
